import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { verifyRequest } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = verifyRequest(req);
  if (!user) return res.status(401).json({ error: 'Nao autorizado' });

  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });

  const sql = neon(dbUrl);

  try {
    // 1. Create default users if they don't exist
    const users = [
      { email: 'admin@estateflow.com', name: 'Administrador', role: 'admin', password: 'admin' },
      { email: 'cliente@teste.com', name: 'João Cliente', role: 'client', password: 'user123' },
      { email: 'proprietario@teste.com', name: 'Maria Proprietária', role: 'owner', password: 'user123' }
    ];

    for (const user of users) {
      await sql`
        INSERT INTO users (email, name, role, status)
        VALUES (${user.email}, ${user.name}, ${user.role}, 'active')
        ON CONFLICT (email) DO NOTHING
      `;
    }

    // 2. Ensure system_settings has PIX keys
    const settings = [
      { key: 'pixKey', value: 'financeiro@estateflow.com' },
      { key: 'pixBeneficiary', value: 'EstateFlow LTDA' }
    ];

    for (const s of settings) {
      await sql`
        INSERT INTO system_settings (key, value)
        VALUES (${s.key}, ${s.value})
        ON CONFLICT (key) DO NOTHING
      `;
    }

    res.status(200).json({ success: true, message: 'Test data provisioned' });
  } catch (error) {
    console.error('Error provisioning:', error);
    res.status(500).json({ error: 'Failed to provision' });
  }
}
