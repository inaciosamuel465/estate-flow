import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { verifyRequest } from '../server/api-lib/auth.js';

async function handleVideoProxy(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing video id' });
  }

  async function fetchDrive(url: string): Promise<Response> {
    return fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,video/mp4,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
  }

  try {
    let driveUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${id}`;
    let driveRes = await fetchDrive(driveUrl);

    if (!driveRes.ok) {
      return res.status(502).json({ error: 'Failed to fetch from Google Drive' });
    }

    const contentType = driveRes.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const html = await driveRes.text();
      const confirmMatch = html.match(/confirm=([^"&]+)/);
      if (confirmMatch) {
        driveUrl = `https://drive.google.com/uc?export=download&confirm=${confirmMatch[1]}&id=${id}`;
        driveRes = await fetchDrive(driveUrl);
      } else {
        return res.redirect(302, `https://drive.google.com/file/d/${id}/view`);
      }
    }

    const finalContentType = driveRes.headers.get('content-type') || 'video/mp4';
    const contentLength = driveRes.headers.get('content-length');

    if (finalContentType.startsWith('text/html')) {
      return res.redirect(302, `https://drive.google.com/file/d/${id}/view`);
    }

    res.setHeader('Content-Type', finalContentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Accept-Ranges', 'bytes');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    if (!driveRes.body) return res.end();

    const reader = driveRes.body.getReader();
    const pump = () => {
      reader.read().then(({ done, value }) => {
        if (done) return res.end();
        res.write(Buffer.from(value));
        pump();
      }).catch(() => res.end());
    };
    return pump();
  } catch (error) {
    console.error('Video proxy error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = new URL(req.url || '', 'http://localhost').pathname;
  const route = String(req.query.route || '');

  if ((path === '/api/video-proxy' || route === 'video-proxy') && req.method === 'GET') {
    return handleVideoProxy(req, res);
  }

  if (path === '/api/upload/serve' && req.method === 'GET') {
    const dbUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) return res.status(500).json({ error: 'Database URL not configured' });
    const sql = neon(dbUrl);
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

  if ((path === '/api/upload' || path === '/api/upload/') && req.method === 'POST') {
    const dbUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) return res.status(500).json({ error: 'Database URL not configured' });
    const sql = neon(dbUrl);
    const user = verifyRequest(req);
    if (!user) return res.status(401).json({ error: 'Nao autorizado' });

    const { image, company_id, category, filename } = req.body;
    if (!image || !company_id) {
      return res.status(400).json({ error: 'image e company_id sao obrigatorios' });
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
