import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash, randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import { assertTenantAccess, auditLog, fail, getSql, handleApiError, ok, requireAuth, requireRole, requireTenant } from './_lib/http.js';

async function ensureContractSchema(sql: ReturnType<typeof getSql>) {
  await sql`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS agency_cnpj TEXT`;
  await sql`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS address TEXT`;
  await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS company_id TEXT`;
  await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS template_type TEXT`;
  await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1`;
  await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS public_token_hash TEXT`;
  await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS public_token_expires_at TIMESTAMP`;
  await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP`;
  await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP`;
  await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signature_status TEXT DEFAULT 'pending'`;
  await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signature_image TEXT`;
  await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP`;
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
      message_id TEXT,
      error TEXT,
      entity_type TEXT,
      entity_id TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS message_id TEXT`;
  await sql`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`;
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

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function getBaseUrl(req: VercelRequest, explicit?: string) {
  const base = explicit || process.env.VITE_APP_URL || process.env.APP_URL || `https://${req.headers.host || 'localhost'}`;
  return String(base).replace(/\/+$/, '');
}

function escapeHtml(value: unknown) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeDomain(email: string) {
  const domain = email.split('@')[1]?.replace(/[^a-zA-Z0-9.-]/g, '') || 'estateflow.local';
  return domain || 'estateflow.local';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const path = new URL(req.url || '', 'http://localhost').pathname;
    const sql = getSql();
    await ensureContractSchema(sql);

    if (path === '/api/contracts/public' && req.method === 'GET') {
      const tenant = String(req.query.tenant || '').trim();
      const id = String(req.query.id || '').trim();
      const token = String(req.query.token || '').trim();
      if (!tenant || !id || !token) return fail(res, 400, 'tenant, id e token sao obrigatorios');

      const tokenHash = hashToken(token);
      const rows = await sql`
        SELECT
          c.*,
          co.slug as tenant_slug,
          co.name as company_name,
          co.logo_url as company_logo_url,
          p.title as property_title,
          p.image as property_image,
          p.location as property_location,
          p.address_details as property_address_details,
          u_client.name as client_name,
          u_client.phone as client_phone,
          u_client.email as client_email,
          u_client.document as client_doc,
          u_client.address as client_addr,
          u_owner.name as owner_name,
          u_owner.phone as owner_phone,
          u_owner.email as owner_email,
          u_owner.document as owner_doc,
          u_owner.address as owner_addr,
          cs.company_name as settings_company_name,
          cs.logo_url as settings_logo_url,
          cs.primary_color as primary_color,
          cs.agency_cnpj as agency_cnpj,
          cs.address as agency_address
        FROM contracts c
        JOIN companies co ON co.id = c.company_id
        LEFT JOIN properties p ON p.id::text = c.property_id AND p.company_id = c.company_id
        LEFT JOIN users u_client ON u_client.id = c.client_id AND u_client.company_id = c.company_id
        LEFT JOIN users u_owner ON u_owner.id = c.owner_id AND u_owner.company_id = c.company_id
        LEFT JOIN company_settings cs ON cs.company_id = c.company_id
        WHERE c.id = ${id}
          AND co.slug = ${tenant}
          AND c.public_token_hash = ${tokenHash}
          AND (c.public_token_expires_at IS NULL OR c.public_token_expires_at > NOW())
        LIMIT 1
      `;
      if (rows.length === 0) return fail(res, 404, 'Contrato nao encontrado ou link expirado');

      const row = rows[0];
      if (!row.viewed_at) {
        await sql`UPDATE contracts SET viewed_at = NOW() WHERE id = ${id} AND company_id = ${row.company_id}`;
      }
      const eventId = `cevt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await sql`
        INSERT INTO contract_events (id, company_id, contract_id, user_id, event_type, payload)
        VALUES (${eventId}, ${row.company_id}, ${id}, NULL, 'public_viewed', ${JSON.stringify({ tenant })}::jsonb)
      `;

      return ok(res, {
        data: {
          company: {
            id: row.company_id,
            slug: row.tenant_slug,
            name: row.settings_company_name || row.company_name,
          },
          settings: {
            companyName: row.settings_company_name || row.company_name,
            logoUrl: row.settings_logo_url || row.company_logo_url || '',
            primaryColor: row.primary_color || '',
            agencyCnpj: row.agency_cnpj || '',
            address: row.agency_address || '',
          },
          property: {
            id: row.property_id,
            title: row.property_title || 'Imovel',
            image: row.property_image || '',
            location: row.property_location || '',
            addressDetails: row.property_address_details || null,
          },
          contract: {
            id: row.id,
            companyId: row.company_id,
            propertyId: row.property_id,
            propertyTitle: row.property_title || 'Imovel',
            propertyImage: row.property_image || '',
            clientId: row.client_id,
            clientName: row.client_name || 'Cliente',
            clientPhone: row.client_phone || '',
            ownerId: row.owner_id || '',
            ownerName: row.owner_name || '',
            ownerPhone: row.owner_phone || '',
            type: row.type || 'rent',
            status: row.status || 'draft',
            value: Number(row.value || 0),
            commissionRate: Number(row.commission_rate || 0),
            dueDay: Number(row.due_day || 0),
            startDate: row.start_date,
            endDate: row.end_date,
            nextPaymentStatus: row.next_payment_status || 'pending',
            templateType: row.template_type,
            customContent: row.custom_content,
            signatureStatus: row.signature_status || 'pending',
            signatureImage: row.signature_image || undefined,
            signedAt: row.signed_at || undefined,
            ownerSignatureStatus: row.owner_signature_status || 'pending',
            ownerSignatureImage: row.owner_signature_image || undefined,
            ownerSignedAt: row.owner_signed_at || undefined,
            sentAt: row.sent_at || undefined,
            viewedAt: row.viewed_at || undefined,
            version: row.version || 1,
          },
        },
      });
    }

    if (path === '/api/contracts/public-sign' && req.method === 'POST') {
      const { tenant, contract_id, token, signature_image } = req.body || {};
      if (!tenant || !contract_id || !token || !signature_image) {
        return fail(res, 400, 'tenant, contract_id, token e signature_image sao obrigatorios');
      }

      const tokenHash = hashToken(String(token));
      const rows = await sql`
        SELECT c.id, c.company_id, c.signature_status
        FROM contracts c
        JOIN companies co ON co.id = c.company_id
        WHERE c.id = ${String(contract_id)}
          AND co.slug = ${String(tenant)}
          AND c.public_token_hash = ${tokenHash}
          AND (c.public_token_expires_at IS NULL OR c.public_token_expires_at > NOW())
        LIMIT 1
      `;
      if (rows.length === 0) return fail(res, 404, 'Contrato nao encontrado ou link expirado');

      const companyId = rows[0].company_id;
      await sql`
        UPDATE contracts
        SET signature_status = 'signed',
            signature_image = ${String(signature_image)},
            signed_at = NOW(),
            status = CASE WHEN status = 'draft' THEN 'active' ELSE status END
        WHERE id = ${String(contract_id)} AND company_id = ${companyId}
      `;
      await sql`
        UPDATE contract_signers
        SET status = 'signed', signature_image = ${String(signature_image)}, signed_at = NOW()
        WHERE contract_id = ${String(contract_id)} AND company_id = ${companyId} AND role IN ('client', 'tenant', 'signer')
      `;
      const eventId = `cevt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await sql`
        INSERT INTO contract_events (id, company_id, contract_id, user_id, event_type, payload)
        VALUES (${eventId}, ${companyId}, ${String(contract_id)}, NULL, 'public_signed', ${JSON.stringify({ tenant })}::jsonb)
      `;
      return ok(res, { data: { signed_at: new Date().toISOString() } });
    }

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
      let user: ReturnType<typeof requireAuth> | null = null;
      try {
        user = requireAuth(req);
      } catch {
        user = null;
      }
      if (user) requireRole(user, ['admin', 'master', 'superadmin']);

      const { contract_id, to_email, company_id, tenant_slug, base_url, contract_content } = req.body || {};
      const companyId = String(company_id || user?.company_id || '');
      if (!contract_id || !companyId) return fail(res, 400, 'contract_id e company_id sao obrigatorios');
      if (user) assertTenantAccess(user, companyId);

      const rows = await sql`
        SELECT
          c.*,
          co.slug as tenant_slug,
          co.name as company_name,
          p.title as property_title,
          u_client.name as client_name,
          u_client.email as client_email,
          u_owner.name as owner_name,
          cs.smtp_host,
          cs.smtp_port,
          cs.smtp_user,
          cs.smtp_password,
          cs.smtp_secure,
          cs.email_sender_name,
          cs.email_sender_address,
          cs.company_name as settings_company_name,
          cs.logo_url as settings_logo_url
        FROM contracts c
        JOIN companies co ON co.id = c.company_id
        LEFT JOIN properties p ON p.id::text = c.property_id AND p.company_id = c.company_id
        LEFT JOIN users u_client ON u_client.id = c.client_id AND u_client.company_id = c.company_id
        LEFT JOIN users u_owner ON u_owner.id = c.owner_id AND u_owner.company_id = c.company_id
        LEFT JOIN company_settings cs ON cs.company_id = c.company_id
        WHERE c.id = ${String(contract_id)} AND c.company_id = ${companyId}
        LIMIT 1
      `;
      if (rows.length === 0) return fail(res, 404, 'Contrato nao encontrado neste tenant');

      const contract = rows[0];
      const targetEmail = String(to_email || contract.client_email || '').trim();
      if (!targetEmail) return fail(res, 400, 'Cliente nao possui email cadastrado');

      const smtpReady = Boolean(contract.smtp_host && contract.smtp_user && contract.smtp_password);
      const tenantSlug = String(tenant_slug || contract.tenant_slug || '').trim();
      const token = randomBytes(32).toString('base64url');
      const tokenHash = hashToken(token);
      const signatureUrl = `${getBaseUrl(req, base_url)}/${tenantSlug}/contrato/${String(contract_id)}?token=${encodeURIComponent(token)}`;
      const uniqueSuffix = `${String(contract_id).slice(0, 8)}-${Date.now()}`;
      const subject = `Contrato #${uniqueSuffix} - Assinatura - ${contract.property_title || 'Imovel'}`;
      const logId = `elog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const senderEmail = String(contract.email_sender_address || contract.smtp_user || '').trim();
      const senderName = String(contract.email_sender_name || contract.settings_company_name || contract.company_name || 'EstateFlow').trim();

      await sql`
        UPDATE contracts
        SET public_token_hash = ${tokenHash},
            public_token_expires_at = NOW() + INTERVAL '30 days',
            sent_at = NOW(),
            signature_status = 'pending',
            signature_image = NULL,
            signed_at = NULL,
            custom_content = COALESCE(${contract_content || null}, custom_content)
        WHERE id = ${String(contract_id)} AND company_id = ${companyId}
      `;

      await sql`
        INSERT INTO contract_signers (id, company_id, contract_id, user_id, name, email, role, status)
        VALUES (${`csig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`}, ${companyId}, ${String(contract_id)}, ${contract.client_id || null}, ${contract.client_name || 'Cliente'}, ${targetEmail}, 'client', 'pending')
        ON CONFLICT (id) DO NOTHING
      `;

      if (!smtpReady) {
        await sql`
          INSERT INTO email_logs (id, company_id, user_id, to_email, subject, status, provider, error, entity_type, entity_id, metadata)
          VALUES (${logId}, ${companyId}, ${user?.id || null}, ${targetEmail}, ${subject}, 'pending_configuration', NULL, 'SMTP da imobiliaria nao configurado', 'contract', ${String(contract_id)}, ${JSON.stringify({ signatureUrl })}::jsonb)
        `;
        return fail(res, 409, 'Configure o SMTP da imobiliaria antes de enviar contratos por email', { log_id: logId, url: signatureUrl });
      }

      const transporter = nodemailer.createTransport({
        host: contract.smtp_host,
        port: Number(contract.smtp_port || 587),
        secure: contract.smtp_secure === true,
        auth: {
          user: contract.smtp_user,
          pass: contract.smtp_password,
        },
      });
      const messageId = `<contract-${uniqueSuffix}@${safeDomain(senderEmail)}>`;
      const escapedAgency = escapeHtml(senderName);
      const escapedClient = escapeHtml(contract.client_name || 'Cliente');
      const escapedProperty = escapeHtml(contract.property_title || 'imovel');
      const escapedUrl = escapeHtml(signatureUrl);
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;line-height:1.5;">
          <h1 style="font-size:20px;margin:0 0 12px;">Contrato para assinatura</h1>
          <p>Olá, <strong>${escapedClient}</strong>.</p>
          <p>A <strong>${escapedAgency}</strong> enviou o contrato do imóvel <strong>${escapedProperty}</strong> para leitura e assinatura digital.</p>
          <p style="margin:28px 0;">
            <a href="${escapedUrl}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:700;display:inline-block;">Abrir contrato</a>
          </p>
          <p style="font-size:13px;color:#475569;">Se o botão não abrir, copie e cole este link no navegador:</p>
          <p style="font-size:12px;word-break:break-all;color:#2563eb;">${escapedUrl}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
          <p style="font-size:12px;color:#64748b;margin:0;">Mensagem automática da ${escapedAgency}. Cada contrato possui um link individual e seguro.</p>
        </div>
      `;

      const info = await transporter.sendMail({
        from: `"${senderName.replace(/"/g, '')}" <${senderEmail}>`,
        to: targetEmail,
        subject,
        text: `Olá, ${contract.client_name || 'Cliente'}.\n\nA ${senderName} enviou o contrato do imóvel ${contract.property_title || ''} para assinatura digital.\n\nAbra o contrato neste link:\n${signatureUrl}\n\nMensagem automática.`,
        html,
        messageId,
        headers: {
          'X-EstateFlow-Contract-ID': String(contract_id),
          'X-Entity-Ref-ID': `contract-${String(contract_id)}-${Date.now()}`,
        },
      });

      await sql`
        INSERT INTO email_logs (id, company_id, user_id, to_email, subject, status, provider, message_id, error, entity_type, entity_id, metadata)
        VALUES (${logId}, ${companyId}, ${user?.id || null}, ${targetEmail}, ${subject}, 'sent', 'smtp', ${info.messageId || messageId}, NULL, 'contract', ${String(contract_id)}, ${JSON.stringify({ signatureUrl })}::jsonb)
      `;

      await auditLog(sql, { companyId, userId: user?.id, action: 'contract_signature_sent', entityType: 'contract', entityId: String(contract_id) });
      return ok(res, { data: { log_id: logId, status: 'sent', url: signatureUrl } });
    }

    return fail(res, 404, 'Not found');
  } catch (error) {
    return handleApiError(res, error);
  }
}
