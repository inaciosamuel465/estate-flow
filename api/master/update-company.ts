import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

function verifyToken(req: VercelRequest): { id: string; email: string; role: string } | null {
  const auth = req.headers.authorization;
  if (!auth) return null;
  try {
    const payload = JSON.parse(atob(auth.replace('Bearer ', '')));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Nao autorizado' });

  const { company_id, name, slug, subdomain, visible, subscription_status } = req.body;
  if (!company_id) return res.status(400).json({ error: 'company_id required' });

  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });
  const sql = neon(dbUrl);

  try {
    const company = await sql`SELECT id FROM companies WHERE id = ${company_id} LIMIT 1`;
    if (company.length === 0) return res.status(404).json({ error: 'Company not found' });

    if (slug) {
      const existing = await sql`SELECT id FROM companies WHERE slug = ${slug} AND id != ${company_id} LIMIT 1`;
      if (existing.length > 0) return res.status(400).json({ error: 'Slug ja esta em uso' });
    }

    await sql`
      UPDATE companies SET
        name = COALESCE(${name || null}, name),
        slug = COALESCE(${slug || null}, slug),
        subdomain = COALESCE(${subdomain || null}, subdomain),
        visible = COALESCE(${visible !== undefined ? visible : null}, visible),
        subscription_status = COALESCE(${subscription_status || null}, subscription_status),
        updated_at = NOW()
      WHERE id = ${company_id}
    `;

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
}
