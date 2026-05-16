import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { verifyRequest } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = verifyRequest(req);
  if (!user) return res.status(401).json({ error: 'Nao autorizado' });

  const companyId = req.query.company_id as string;
  if (!companyId) return res.status(400).json({ error: 'company_id is required' });

  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });

  const sql = neon(dbUrl);

  try {
    const [company, subscription, payments] = await Promise.all([
      sql`SELECT id, name, subscription_status, plan, trial_ends_at FROM companies WHERE id = ${companyId} LIMIT 1`,
      sql`SELECT * FROM subscriptions WHERE company_id = ${companyId} ORDER BY created_at DESC LIMIT 1`,
      sql`SELECT * FROM payments WHERE company_id = ${companyId} ORDER BY created_at DESC LIMIT 10`,
    ]);

    if (company.length === 0) return res.status(404).json({ error: 'Company not found' });

    res.status(200).json({
      company: company[0],
      subscription: subscription[0] || null,
      payments: payments,
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}
