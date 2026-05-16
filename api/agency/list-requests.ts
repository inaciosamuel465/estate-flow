import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { verifyRequest } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = verifyRequest(req);
  if (user === null) return res.status(401).json({ error: 'Nao autorizado' });

  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });
  const sql = neon(dbUrl);

  try {
    const requests = await sql`SELECT * FROM agency_requests ORDER BY created_at DESC`;
    const safe = requests.map((r: any) => {
      const { admin_password, ...safe } = r;
      return safe;
    });
    res.status(200).json(safe);
  } catch (error) {
    console.error('List requests error:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
}
