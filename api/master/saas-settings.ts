import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { verifyRequest } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = verifyRequest(req);
  if (!user) return res.status(401).json({ error: 'Nao autorizado' });

  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });
  const sql = neon(dbUrl);

  if (req.method === 'GET') {
    const result = await sql`SELECT * FROM saas_settings WHERE id = 'global' LIMIT 1`;
    return res.status(200).json(result[0] || { plan_name: 'Mensal', plan_price: 170 });
  }

  if (req.method === 'POST') {
    const { plan_name, plan_price, billing_email_from, billing_email_cc } = req.body;
    await sql`
      INSERT INTO saas_settings (id, plan_name, plan_price, billing_email_from, billing_email_cc, updated_at)
      VALUES ('global', ${plan_name || 'Mensal'}, ${plan_price || 170}, ${billing_email_from || null}, ${billing_email_cc || null}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        plan_price = EXCLUDED.plan_price,
        billing_email_from = EXCLUDED.billing_email_from,
        billing_email_cc = EXCLUDED.billing_email_cc,
        updated_at = NOW()
    `;
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
