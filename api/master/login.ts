import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { signToken } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha obrigatorios' });
  }

  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).json({ error: 'Database URL not configured' });
  }

  const sql = neon(dbUrl);

  try {
    const result = await sql`SELECT * FROM master_users WHERE email = ${email} LIMIT 1`;

    if (result.length === 0) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    const user = result[0];

    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedInput = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (user.password !== hashedInput) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    const { password: _, ...safeUser } = user;

    const token = signToken({ id: user.id, email: user.email, role: user.role, exp: Date.now() + 86400000 });

    return res.status(200).json({
      success: true,
      user: safeUser,
      token
    });
  } catch (error) {
    console.error('Master login error:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
