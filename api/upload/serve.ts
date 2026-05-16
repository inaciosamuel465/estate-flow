import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id as string;
  if (!id) return res.status(400).json({ error: 'id is required' });

  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'Database URL not configured' });

  const sql = neon(dbUrl);

  try {
    const result = await sql`SELECT * FROM uploads WHERE id = ${id} LIMIT 1`;
    if (result.length === 0) return res.status(404).json({ error: 'Not found' });

    const upload = result[0];
    const base64Data = upload.data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', upload.mime_type);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Serve error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
}
