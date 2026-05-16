import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { verifyRequest } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = verifyRequest(req);
  if (!user) return res.status(401).json({ error: 'Nao autorizado' });

  const { image, company_id, category, filename } = req.body;
  if (!image || !company_id) {
    return res.status(400).json({ error: 'image e company_id são obrigatórios' });
  }

  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'Database URL not configured' });

  const sql = neon(dbUrl);

  try {
    const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const mimeMatch = image.match(/^data:(.+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const size = Math.round((image.length * 3) / 4);

    await sql`
      INSERT INTO uploads (id, company_id, filename, mime_type, data, size, category)
      VALUES (${id}, ${company_id}, ${filename || 'upload.png'}, ${mimeType}, ${image}, ${size}, ${category || 'general'})
    `;

    res.status(200).json({
      success: true,
      id,
      url: image,
      mimeType,
      size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to save upload' });
  }
}
