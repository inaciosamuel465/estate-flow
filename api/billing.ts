import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assertTenantAccess, auditLog, fail, getSql, handleApiError, ok, requireAuth, requireRole, requireTenant } from '../server/api-lib/http.js';

async function ensureBillingSchema(sql: ReturnType<typeof getSql>) {
  await sql`
    CREATE TABLE IF NOT EXISTS tenant_payment_settings (
      company_id TEXT PRIMARY KEY,
      pix_key TEXT,
      mercado_pago_status TEXT DEFAULT 'not_configured',
      mercado_pago_public_key TEXT,
      mercado_pago_access_token_set BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS billing_charges (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      customer_id TEXT,
      customer_name TEXT,
      customer_email TEXT,
      property_id TEXT,
      contract_id TEXT,
      type TEXT DEFAULT 'rent',
      description TEXT,
      amount NUMERIC NOT NULL,
      due_date TEXT,
      status TEXT DEFAULT 'draft',
      payment_link_id TEXT,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS billing_events (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      charge_id TEXT,
      user_id TEXT,
      event_type TEXT NOT NULL,
      payload JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS payment_links (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      charge_id TEXT NOT NULL,
      provider TEXT,
      provider_reference TEXT,
      url TEXT,
      status TEXT DEFAULT 'created',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const path = new URL(req.url || '', 'http://localhost').pathname;
    const sql = getSql();
    await ensureBillingSchema(sql);

    if (path === '/api/billing/settings' && req.method === 'GET') {
      const user = requireAuth(req);
      const companyId = requireTenant(req, user);
      assertTenantAccess(user, companyId);

      const settings = await sql`
        SELECT company_id, pix_key, mercado_pago_status, mercado_pago_public_key, mercado_pago_access_token_set, updated_at
        FROM tenant_payment_settings
        WHERE company_id = ${companyId}
        LIMIT 1
      `;
      return ok(res, { data: settings[0] || null });
    }

    if (path === '/api/billing/settings' && req.method === 'POST') {
      const user = requireAuth(req);
      requireRole(user, ['admin', 'master', 'superadmin']);
      const companyId = requireTenant(req, user);
      assertTenantAccess(user, companyId);

      const { pix_key, mercado_pago_status, mercado_pago_public_key, mercado_pago_access_token_set } = req.body;
      await sql`
        INSERT INTO tenant_payment_settings (company_id, pix_key, mercado_pago_status, mercado_pago_public_key, mercado_pago_access_token_set, updated_at)
        VALUES (${companyId}, ${pix_key || null}, ${mercado_pago_status || 'not_configured'}, ${mercado_pago_public_key || null}, ${!!mercado_pago_access_token_set}, NOW())
        ON CONFLICT (company_id) DO UPDATE SET
          pix_key = EXCLUDED.pix_key,
          mercado_pago_status = EXCLUDED.mercado_pago_status,
          mercado_pago_public_key = EXCLUDED.mercado_pago_public_key,
          mercado_pago_access_token_set = EXCLUDED.mercado_pago_access_token_set,
          updated_at = NOW()
      `;
      await auditLog(sql, { companyId, userId: user.id, action: 'tenant_payment_settings_saved', entityType: 'tenant_payment_settings', entityId: companyId });
      return ok(res);
    }

    if (path === '/api/billing/charges' && req.method === 'GET') {
      const user = requireAuth(req);
      const companyId = requireTenant(req, user);
      assertTenantAccess(user, companyId);

      const charges = await sql`
        SELECT *
        FROM billing_charges
        WHERE company_id = ${companyId}
        ORDER BY created_at DESC
        LIMIT 200
      `;
      return ok(res, { data: charges });
    }

    if (path === '/api/billing/charges' && req.method === 'POST') {
      const user = requireAuth(req);
      requireRole(user, ['admin', 'master', 'superadmin']);
      const companyId = requireTenant(req, user);
      assertTenantAccess(user, companyId);

      const { customer_id, customer_name, customer_email, property_id, contract_id, type, description, amount, due_date } = req.body;
      if (!amount || Number(amount) <= 0) return fail(res, 400, 'amount deve ser maior que zero');

      const chargeId = `chg_${Date.now()}`;
      await sql`
        INSERT INTO billing_charges (id, company_id, customer_id, customer_name, customer_email, property_id, contract_id, type, description, amount, due_date, created_by)
        VALUES (${chargeId}, ${companyId}, ${customer_id || null}, ${customer_name || null}, ${customer_email || null}, ${property_id || null}, ${contract_id || null}, ${type || 'rent'}, ${description || null}, ${Number(amount)}, ${due_date || null}, ${user.id})
      `;
      await sql`
        INSERT INTO billing_events (id, company_id, charge_id, user_id, event_type, payload)
        VALUES (${'bevt_' + Date.now()}, ${companyId}, ${chargeId}, ${user.id}, 'created', ${{ amount: Number(amount), due_date: due_date || null }})
      `;
      await auditLog(sql, { companyId, userId: user.id, action: 'billing_charge_created', entityType: 'billing_charge', entityId: chargeId });
      return ok(res, { data: { id: chargeId } }, 201);
    }

    if (path === '/api/billing/send-charge' && req.method === 'POST') {
      const user = requireAuth(req);
      requireRole(user, ['admin', 'master', 'superadmin']);
      const companyId = requireTenant(req, user);
      assertTenantAccess(user, companyId);

      const { charge_id } = req.body;
      if (!charge_id) return fail(res, 400, 'charge_id obrigatorio');

      const charges = await sql`SELECT * FROM billing_charges WHERE id = ${charge_id} AND company_id = ${companyId} LIMIT 1`;
      if (charges.length === 0) return fail(res, 404, 'Cobranca nao encontrada neste tenant');

      const settings = await sql`SELECT * FROM tenant_payment_settings WHERE company_id = ${companyId} LIMIT 1`;
      const mpConfigured = settings[0]?.mercado_pago_status === 'production' || settings[0]?.mercado_pago_status === 'sandbox';
      if (!mpConfigured) {
        await sql`
          INSERT INTO billing_events (id, company_id, charge_id, user_id, event_type, payload)
          VALUES (${'bevt_' + Date.now()}, ${companyId}, ${charge_id}, ${user.id}, 'send_blocked_pending_configuration', ${{ provider: 'mercadopago' }})
        `;
        return fail(res, 409, 'Configure o Mercado Pago ou PIX da imobiliaria antes de enviar cobrancas');
      }

      const linkId = `plink_${Date.now()}`;
      await sql`
        INSERT INTO payment_links (id, company_id, charge_id, provider, status)
        VALUES (${linkId}, ${companyId}, ${charge_id}, 'mercadopago', 'pending_provider')
      `;
      await sql`UPDATE billing_charges SET status = 'sent', payment_link_id = ${linkId}, updated_at = NOW() WHERE id = ${charge_id} AND company_id = ${companyId}`;
      await auditLog(sql, { companyId, userId: user.id, action: 'billing_charge_sent', entityType: 'billing_charge', entityId: charge_id });
      return ok(res, { data: { payment_link_id: linkId, status: 'pending_provider' } });
    }

    return fail(res, 404, 'Not found');
  } catch (error) {
    return handleApiError(res, error);
  }
}
