import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing video id' });
  }

  async function fetchDrive(url: string): Promise<Response> {
    return fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,video/mp4,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
  }

  try {
    let driveUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${id}`;
    let driveRes = await fetchDrive(driveUrl);

    // Google sometimes returns a confirmation page for large files
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

    if (driveRes.body) {
      res.setHeader('Content-Type', finalContentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Accept-Ranges', 'bytes');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      if (finalContentType.startsWith('text/html')) {
        return res.redirect(302, `https://drive.google.com/file/d/${id}/view`);
      }

      const reader = driveRes.body.getReader();
      const pump = () => {
        reader.read().then(({ done, value }) => {
          if (done) return res.end();
          res.write(Buffer.from(value));
          pump();
        }).catch(() => res.end());
      };
      pump();
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Video proxy error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}
