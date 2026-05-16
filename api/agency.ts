import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { verifyRequest } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = new URL(req.url || '', 'http://localhost').pathname;
  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });
  const sql = neon(dbUrl);

  // POST /api/agency/request — nova solicitação (pública)
  if (path === '/api/agency/request' && req.method === 'POST') {
    const { company_name, slug, cnpj, email, phone, admin_name, admin_email, admin_password } = req.body;
    if (!company_name || !slug || !admin_name || !admin_email || !admin_password) {
      return res.status(400).json({ error: 'company_name, slug, admin_name, admin_email e admin_password sao obrigatorios' });
    }

    try {
      const existingSlug = await sql`SELECT id FROM companies WHERE slug = ${slug} LIMIT 1`;
      if (existingSlug.length > 0) return res.status(400).json({ error: 'Slug ja esta em uso' });

      const existingRequest = await sql`SELECT id FROM agency_requests WHERE slug = ${slug} AND status = 'pending' LIMIT 1`;
      if (existingRequest.length > 0) return res.status(400).json({ error: 'Ja existe uma solicitacao pendente para este slug' });

      const existingEmail = await sql`SELECT id FROM agency_requests WHERE admin_email = ${admin_email} LIMIT 1`;
      if (existingEmail.length > 0) return res.status(400).json({ error: 'Este email ja possui uma solicitacao' });

      const msgUint8 = new TextEncoder().encode(admin_password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const id = 'req_' + Date.now();
      await sql`
        INSERT INTO agency_requests (id, company_name, slug, cnpj, email, phone, admin_name, admin_email, admin_password, status)
        VALUES (${id}, ${company_name}, ${slug.toLowerCase().replace(/[^a-z0-9-]/g, '')}, ${cnpj || null}, ${email || null}, ${phone || null}, ${admin_name}, ${admin_email}, ${hashedPassword}, 'pending')
      `;

      console.log(`Nova solicitacao de imobiliaria: ${company_name} (${slug}) - Admin: ${admin_email}`);
      return res.status(200).json({ success: true, message: 'Solicitacao enviada! Aguarde aprovacao do administrador.' });
    } catch (error) {
      console.error('Agency request error:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  // GET /api/agency/list-requests — listar solicitações (admin master)
  if (path === '/api/agency/list-requests' && req.method === 'GET') {
    const user = verifyRequest(req);
    if (user === null) return res.status(401).json({ error: 'Nao autorizado' });

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
    if (!user || user.role !== 'admin') return res.status(401).json({ error: 'Nao autorizado' });

    const { request_id, action, admin_note } = req.body;
    if (!request_id || !action) return res.status(400).json({ error: 'request_id e action sao obrigatorios' });
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'action deve ser approve ou reject' });

    try {
      const requests = await sql`SELECT * FROM agency_requests WHERE id = ${request_id} LIMIT 1`;
      if (requests.length === 0) return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      const reqData = requests[0];

      if (reqData.status !== 'pending') return res.status(400).json({ error: 'Solicitacao ja foi processada' });

      if (action === 'reject') {
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
        INSERT INTO company_settings (company_id, company_name)
        VALUES (${companyId}, ${reqData.company_name})
      `;

      const adminId = reqData.admin_email.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const existingUser = await sql`SELECT id FROM users WHERE id = ${adminId} LIMIT 1`;
      if (existingUser.length === 0) {
        await sql`
          INSERT INTO users (id, name, email, phone, role, password, company_id)
          VALUES (${adminId}, ${reqData.admin_name}, ${reqData.admin_email}, ${reqData.phone || null}, 'admin', ${reqData.admin_password}, ${companyId})
        `;
      }

      await sql`UPDATE agency_requests SET status = 'approved', updated_at = NOW() WHERE id = ${request_id}`;
      console.log(`Imobiliaria aprovada: ${reqData.company_name} (${reqData.slug}) - Admin: ${reqData.admin_email}`);
      return res.status(200).json({ success: true, message: `Imobiliaria ${reqData.company_name} criada com sucesso!` });
    } catch (error) {
      console.error('Approve error:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
