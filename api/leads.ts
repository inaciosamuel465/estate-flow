import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assertTenantAccess, auditLog, fail, getSql, handleApiError, ok, requireAuth, requireTenant } from './_lib/http.js';

async function ensureLeadSchema(sql: ReturnType<typeof getSql>) {
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id TEXT`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to TEXT`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS property_title TEXT`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 50`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'website'`;
  await sql`
    CREATE TABLE IF NOT EXISTS lead_events (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      user_id TEXT,
      event_type TEXT NOT NULL,
      payload JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const path = new URL(req.url || '', 'http://localhost').pathname;
    const sql = getSql();
    await ensureLeadSchema(sql);

    if (path === '/api/leads/create' && req.method === 'POST') {
      const { company_id, property_id, name, email, phone, message, source } = req.body;
      if (!company_id || !property_id || !name || (!email && !phone)) {
        return fail(res, 400, 'company_id, property_id, name e contato sao obrigatorios');
      }

      const property = await sql`
        SELECT id, title, owner_id
        FROM properties
        WHERE id = ${property_id} AND company_id = ${company_id}
        LIMIT 1
      `;
      if (property.length === 0) return fail(res, 404, 'Imovel nao encontrado neste tenant');

      const inserted = await sql`
        INSERT INTO leads (property_id, property_title, name, email, phone, message, status, score, source, assigned_to, company_id)
        VALUES (${property_id}, ${property[0].title || null}, ${name}, ${email || null}, ${phone || null}, ${message || null}, 'new', 60, ${source || 'property_page'}, ${property[0].owner_id || null}, ${company_id})
        RETURNING id
      `;
      const leadId = String(inserted[0].id);
      await sql`
        UPDATE properties
        SET leads_count = COALESCE(leads_count, 0) + 1
        WHERE id = ${property_id} AND company_id = ${company_id}
      `;
      await sql`
        INSERT INTO lead_events (id, company_id, lead_id, event_type, payload)
        VALUES (${'levt_' + Date.now()}, ${company_id}, ${leadId}, 'created', ${{
          property_id,
          source: source || 'property_page',
        }})
      `;

      return ok(res, { data: { id: leadId, assigned_to: property[0].owner_id || null } }, 201);
    }

    if (path === '/api/leads/list' && req.method === 'GET') {
      const user = requireAuth(req);
      const companyId = requireTenant(req, user);
      assertTenantAccess(user, companyId);

      const leads = await sql`
        SELECT *
        FROM leads
        WHERE company_id = ${companyId}
        ORDER BY created_at DESC
        LIMIT 200
      `;
      return ok(res, { data: leads });
    }

    if (path === '/api/leads/update-status' && req.method === 'POST') {
      const user = requireAuth(req);
      const companyId = requireTenant(req, user);
      assertTenantAccess(user, companyId);

      const { lead_id, status } = req.body;
      if (!lead_id || !status) return fail(res, 400, 'lead_id e status sao obrigatorios');

      const updated = await sql`
        UPDATE leads
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${lead_id} AND company_id = ${companyId}
        RETURNING id
      `;
      if (updated.length === 0) return fail(res, 404, 'Lead nao encontrado neste tenant');

      await sql`
        INSERT INTO lead_events (id, company_id, lead_id, user_id, event_type, payload)
        VALUES (${'levt_' + Date.now()}, ${companyId}, ${lead_id}, ${user.id}, 'status_changed', ${{ status }})
      `;
      await auditLog(sql, { companyId, userId: user.id, action: 'lead_status_changed', entityType: 'lead', entityId: lead_id });
      return ok(res, { data: { id: lead_id, status } });
    }

    return fail(res, 404, 'Not found');
  } catch (error) {
    return handleApiError(res, error);
  }
}
