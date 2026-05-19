import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { verifyRequest } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = new URL(req.url || '', 'http://localhost').pathname;
  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });
  const sql = neon(dbUrl);

  await sql`
    CREATE TABLE IF NOT EXISTS tenant_admin_invites (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      user_id TEXT,
      email TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      used_at TIMESTAMP
    )
  `;
  await sql`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS billing_admin_id TEXT`;

  // POST /api/agency/request — nova solicitação (pública)
  if (path === '/api/agency/request' && req.method === 'POST') {
    const { company_name, slug, cnpj, email, phone, admin_name, admin_email } = req.body;
    if (!company_name || !slug || !admin_name || !admin_email) {
      return res.status(400).json({ error: 'company_name, slug, admin_name e admin_email sao obrigatorios' });
    }

    try {
      const safeSlug = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!safeSlug) return res.status(400).json({ error: 'Slug invalido' });

      const existingSlug = await sql`SELECT id FROM companies WHERE slug = ${safeSlug} LIMIT 1`;
      if (existingSlug.length > 0) return res.status(400).json({ error: 'Slug ja esta em uso' });

      const existingRequest = await sql`SELECT id FROM agency_requests WHERE slug = ${safeSlug} AND status = 'pending' LIMIT 1`;
      if (existingRequest.length > 0) return res.status(400).json({ error: 'Ja existe uma solicitacao pendente para este slug' });

      const existingEmail = await sql`SELECT id FROM agency_requests WHERE admin_email = ${admin_email} LIMIT 1`;
      if (existingEmail.length > 0) return res.status(400).json({ error: 'Este email ja possui uma solicitacao' });

      const requestTokenHash = crypto.createHash('sha256').update(crypto.randomBytes(24).toString('hex')).digest('hex');

      const id = 'req_' + Date.now();
      await sql`
        INSERT INTO agency_requests (id, company_name, slug, cnpj, email, phone, admin_name, admin_email, admin_password, status)
        VALUES (${id}, ${company_name}, ${safeSlug}, ${cnpj || null}, ${email || null}, ${phone || null}, ${admin_name}, ${admin_email}, ${requestTokenHash}, 'pending')
      `;

      console.log(`Nova solicitacao de imobiliaria: ${company_name} (${safeSlug}) - Admin: ${admin_email}`);
      return res.status(200).json({ success: true, message: 'Solicitacao enviada. O master revisara e enviara o convite de ativacao.' });
    } catch (error) {
      console.error('Agency request error:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  // GET /api/agency/list-requests — listar solicitações (admin master)
  if (path === '/api/agency/list-requests' && req.method === 'GET') {
    const user = verifyRequest(req);
    const isMasterUser = !!user && (['master', 'superadmin'].includes(user.role) || (user.role === 'admin' && !user.company_id));
    if (!isMasterUser) return res.status(401).json({ error: 'Nao autorizado' });

    try {
      const requests = await sql`SELECT * FROM agency_requests ORDER BY created_at DESC`;
      const safe = requests.map((r: any) => {
        const { admin_password, ...rest } = r;
        return rest;
      });
      return res.status(200).json(safe);
    } catch (error) {
      console.error('List requests error:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  // POST /api/agency/approve — aprovar/rejeitar solicitação (admin master)
  if (path === '/api/agency/approve' && req.method === 'POST') {
    const user = verifyRequest(req);
    const isMasterUser = !!user && (['master', 'superadmin'].includes(user.role) || (user.role === 'admin' && !user.company_id));
    if (!isMasterUser) return res.status(401).json({ error: 'Nao autorizado' });

    const { request_id, action, admin_note } = req.body;
    if (!request_id || !action) return res.status(400).json({ error: 'request_id e action sao obrigatorios' });
    const normalizedAction = action === 'approved' ? 'approve' : action === 'rejected' ? 'reject' : action;
    if (!['approve', 'reject'].includes(normalizedAction)) return res.status(400).json({ error: 'action deve ser approve ou reject' });

    try {
      const requests = await sql`SELECT * FROM agency_requests WHERE id = ${request_id} LIMIT 1`;
      if (requests.length === 0) return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      const reqData = requests[0];

      if (reqData.status !== 'pending') return res.status(400).json({ error: 'Solicitacao ja foi processada' });

      if (normalizedAction === 'reject') {
        await sql`UPDATE agency_requests SET status = 'rejected', admin_note = ${admin_note || null}, updated_at = NOW() WHERE id = ${request_id}`;
        return res.status(200).json({ success: true, message: 'Solicitacao rejeitada.' });
      }

      const companyId = 'comp_' + Date.now();
      await sql`
        INSERT INTO companies (id, name, slug, email, phone, cnpj, status, plan, subscription_status, visible)
        VALUES (${companyId}, ${reqData.company_name}, ${reqData.slug}, ${reqData.email || null}, ${reqData.phone || null}, ${reqData.cnpj || null}, 'active', 'free', 'trialing', true)
      `;
      await sql`
        INSERT INTO subscriptions (id, company_id, plan_name, status, trial)
        VALUES (${'sub_' + companyId}, ${companyId}, 'free', 'trialing', true)
      `;
      await sql`
        INSERT INTO company_settings (company_id, company_name, billing_admin_id)
        VALUES (${companyId}, ${reqData.company_name}, null)
        ON CONFLICT (company_id) DO UPDATE SET company_name = EXCLUDED.company_name
      `;

      const adminId = `${companyId}_${reqData.admin_email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const existingUser = await sql`SELECT id FROM users WHERE id = ${adminId} AND company_id = ${companyId} LIMIT 1`;
      if (existingUser.length === 0) {
        await sql`
          INSERT INTO users (id, name, email, phone, role, password, company_id)
          VALUES (${adminId}, ${reqData.admin_name}, ${reqData.admin_email}, ${reqData.phone || null}, 'admin', null, ${companyId})
        `;
      }

      const rawInviteToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawInviteToken).digest('hex');
      await sql`
        INSERT INTO tenant_admin_invites (id, company_id, user_id, email, token_hash, status, expires_at)
        VALUES (${'invite_' + Date.now()}, ${companyId}, ${adminId}, ${reqData.admin_email}, ${tokenHash}, 'pending', NOW() + INTERVAL '7 days')
      `;

      await sql`UPDATE agency_requests SET status = 'approved', updated_at = NOW() WHERE id = ${request_id}`;
      console.log(`Imobiliaria aprovada: ${reqData.company_name} (${reqData.slug}) - Admin: ${reqData.admin_email}`);
      const appUrl = (process.env.VITE_APP_URL || '').replace(/\/$/, '');
      const activationUrl = `${appUrl}/${reqData.slug}/login?invite=${rawInviteToken}`;
      return res.status(200).json({
        success: true,
        message: `Imobiliaria ${reqData.company_name} criada. Envie o convite de ativacao ao admin.`,
        activation_url: activationUrl,
      });
    } catch (error) {
      console.error('Approve error:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  // POST /api/agency/activate-admin - define senha do admin convidado
  if (path === '/api/agency/activate-admin' && req.method === 'POST') {
    const { token, password, company_id } = req.body;
    if (!token || !password || String(password).length < 6) {
      return res.status(400).json({ error: 'token e senha valida sao obrigatorios' });
    }

    try {
      const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
      const invites = await sql`
        SELECT * FROM tenant_admin_invites
        WHERE token_hash = ${tokenHash}
          AND status = 'pending'
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
      `;
      if (invites.length === 0) return res.status(400).json({ error: 'Convite invalido ou expirado' });

      const invite = invites[0];
      if (company_id && invite.company_id !== company_id) {
        return res.status(403).json({ error: 'Convite nao pertence a esta imobiliaria' });
      }
      const passwordHash = crypto.createHash('sha256').update(String(password)).digest('hex');
      await sql`
        UPDATE users
        SET password = ${passwordHash}
        WHERE id = ${invite.user_id} AND company_id = ${invite.company_id}
      `;
      await sql`
        UPDATE tenant_admin_invites
        SET status = 'used', used_at = NOW()
        WHERE id = ${invite.id}
      `;
      return res.status(200).json({ success: true, message: 'Senha criada. Voce ja pode acessar o painel da imobiliaria.' });
    } catch (error) {
      console.error('Activate admin error:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
