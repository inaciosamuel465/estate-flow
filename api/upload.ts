import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { verifyRequest } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = new URL(req.url || '', 'http://localhost').pathname;
  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'Database URL not configured' });
  const sql = neon(dbUrl);

  // GET /api/upload/serve — serve file by id
  if (path === '/api/upload/serve' && req.method === 'GET') {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: 'id is required' });

    try {
      const result = await sql`SELECT * FROM uploads WHERE id = ${id} LIMIT 1`;
      if (result.length === 0) return res.status(404).json({ error: 'Not found' });

      const upload = result[0];
      const base64Data = upload.data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      res.setHeader('Content-Type', upload.mime_type);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      return res.status(200).send(buffer);
    } catch (error) {
      console.error('Serve error:', error);
      return res.status(500).json({ error: 'Failed to serve file' });
    }
  }

  // POST /api/upload — upload file
  if ((path === '/api/upload' || path === '/api/upload/') && req.method === 'POST') {
    const user = verifyRequest(req);
    if (!user) return res.status(401).json({ error: 'Nao autorizado' });

    const { image, company_id, category, filename } = req.body;
    if (!image || !company_id) {
      return res.status(400).json({ error: 'image e company_id são obrigatórios' });
    }

    try {
      const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const mimeMatch = image.match(/^data:(.+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      const size = Math.round((image.length * 3) / 4);

      await sql`
        INSERT INTO uploads (id, company_id, filename, mime_type, data, size, category)
        VALUES (${id}, ${company_id}, ${filename || 'upload.png'}, ${mimeType}, ${image}, ${size}, ${category || 'general'})
      `;

      return res.status(200).json({ success: true, id, url: image, mimeType, size });
    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ error: 'Failed to save upload' });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
