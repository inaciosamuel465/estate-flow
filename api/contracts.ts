import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assertTenantAccess, auditLog, fail, getSql, handleApiError, ok, requireAuth, requireRole, requireTenant } from './_lib/http.js';

async function ensureContractSchema(sql: ReturnType<typeof getSql>) {
  await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS company_id TEXT`;
  await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_signature_status TEXT DEFAULT 'pending'`;
  await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_signature_image TEXT`;
  await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_signed_at TIMESTAMP`;
  await sql`
    CREATE TABLE IF NOT EXISTS contract_templates (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'rental',
      content TEXT NOT NULL,
      variables JSONB DEFAULT '[]',
      version INTEGER DEFAULT 1,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS contract_events (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      contract_id TEXT NOT NULL,
      user_id TEXT,
      event_type TEXT NOT NULL,
      payload JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS contract_signers (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      contract_id TEXT NOT NULL,
      user_id TEXT,
      name TEXT,
      email TEXT,
      role TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      signed_at TIMESTAMP,
      signature_image TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      user_id TEXT,
      to_email TEXT,
      subject TEXT,
      status TEXT NOT NULL,
      provider TEXT,
      error TEXT,
      entity_type TEXT,
      entity_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS document_files (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      file_name TEXT,
      file_url TEXT,
      mime_type TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const path = new URL(req.url || '', 'http://localhost').pathname;
    const sql = getSql();
    await ensureContractSchema(sql);

    if (path === '/api/contracts/templates' && req.method === 'GET') {
      const user = requireAuth(req);
      const companyId = requireTenant(req, user);
      assertTenantAccess(user, companyId);

      const templates = await sql`
        SELECT * FROM contract_templates
        WHERE company_id = ${companyId}
        ORDER BY active DESC, updated_at DESC
      `;
      return ok(res, { data: templates });
    }

    if (path === '/api/contracts/templates' && req.method === 'POST') {
      const user = requireAuth(req);
      requireRole(user, ['admin', 'master', 'superadmin']);
      const companyId = requireTenant(req, user);
      assertTenantAccess(user, companyId);

      const { id, name, type, content, variables, active } = req.body;
      if (!name || !content) return fail(res, 400, 'name e content sao obrigatorios');

      const templateId = id || `ctpl_${Date.now()}`;
      await sql`
        INSERT INTO contract_templates (id, company_id, name, type, content, variables, active, updated_at)
        VALUES (${templateId}, ${companyId}, ${name}, ${type || 'rental'}, ${content}, ${variables || []}, ${active !== false}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          content = EXCLUDED.content,
          variables = EXCLUDED.variables,
          active = EXCLUDED.active,
          updated_at = NOW()
      `;
      await auditLog(sql, { companyId, userId: user.id, action: 'contract_template_saved', entityType: 'contract_template', entityId: templateId });
      return ok(res, { data: { id: templateId } });
    }

    if (path === '/api/contracts/events' && req.method === 'POST') {
      const user = requireAuth(req);
      const companyId = requireTenant(req, user);
      assertTenantAccess(user, companyId);

      const { contract_id, event_type, payload } = req.body;
      if (!contract_id || !event_type) return fail(res, 400, 'contract_id e event_type sao obrigatorios');

      const contract = await sql`SELECT id FROM contracts WHERE id = ${contract_id} AND company_id = ${companyId} LIMIT 1`;
      if (contract.length === 0) return fail(res, 404, 'Contrato nao encontrado neste tenant');

      const eventId = `cevt_${Date.now()}`;
      await sql`
        INSERT INTO contract_events (id, company_id, contract_id, user_id, event_type, payload)
        VALUES (${eventId}, ${companyId}, ${contract_id}, ${user.id}, ${event_type}, ${payload || {}})
      `;
      return ok(res, { data: { id: eventId } });
    }

    if (path === '/api/contracts/send-signature' && req.method === 'POST') {
      const user = requireAuth(req);
      requireRole(user, ['admin', 'master', 'superadmin']);
      const companyId = requireTenant(req, user);
      assertTenantAccess(user, companyId);

      const { contract_id, to_email } = req.body;
      if (!contract_id || !to_email) return fail(res, 400, 'contract_id e to_email sao obrigatorios');

      const contract = await sql`SELECT id FROM contracts WHERE id = ${contract_id} AND company_id = ${companyId} LIMIT 1`;
      if (contract.length === 0) return fail(res, 404, 'Contrato nao encontrado neste tenant');

      const settings = await sql`
        SELECT smtp_host, smtp_user, email_sender_address
        FROM company_settings
        WHERE company_id = ${companyId}
        LIMIT 1
      `;
      const smtpReady = Boolean(settings[0]?.smtp_host && settings[0]?.smtp_user && settings[0]?.email_sender_address);
      const logId = `elog_${Date.now()}`;
      await sql`
        INSERT INTO email_logs (id, company_id, user_id, to_email, subject, status, provider, error, entity_type, entity_id)
        VALUES (${logId}, ${companyId}, ${user.id}, ${to_email}, 'Assinatura de contrato', ${smtpReady ? 'queued' : 'pending_configuration'}, ${smtpReady ? 'smtp' : null}, ${smtpReady ? null : 'SMTP da imobiliaria nao configurado'}, 'contract', ${contract_id})
      `;

      if (!smtpReady) {
        return fail(res, 409, 'Configure o SMTP da imobiliaria antes de enviar contratos por email', { log_id: logId });
      }

      await auditLog(sql, { companyId, userId: user.id, action: 'contract_signature_queued', entityType: 'contract', entityId: contract_id });
      return ok(res, { data: { log_id: logId, status: 'queued' } });
    }

    return fail(res, 404, 'Not found');
  } catch (error) {
    return handleApiError(res, error);
  }
}
