import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { verifyRequest } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = verifyRequest(req);
  if (!user || user.role !== 'admin') return res.status(401).json({ error: 'Nao autorizado' });

  const { request_id, action, admin_note } = req.body;
  if (!request_id || !action) return res.status(400).json({ error: 'request_id e action sao obrigatorios' });
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'action deve ser approve ou reject' });

  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });
  const sql = neon(dbUrl);

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

    res.status(200).json({ success: true, message: `Imobiliaria ${reqData.company_name} criada com sucesso!` });
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
}
