import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { company_name, slug, cnpj, email, phone, admin_name, admin_email, admin_password } = req.body;

  if (!company_name || !slug || !admin_name || !admin_email || !admin_password) {
    return res.status(400).json({ error: 'company_name, slug, admin_name, admin_email e admin_password sao obrigatorios' });
  }

  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });
  const sql = neon(dbUrl);

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

    // Notify master admin via email (log for now)
    console.log(`Nova solicitacao de imobiliaria: ${company_name} (${slug}) - Admin: ${admin_email}`);

    res.status(200).json({ success: true, message: 'Solicitacao enviada! Aguarde aprovacao do administrador.' });
  } catch (error) {
    console.error('Agency request error:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
}
