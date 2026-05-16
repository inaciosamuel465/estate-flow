import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import webpush from 'web-push';
import { verifyRequest } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = verifyRequest(req);
  if (!user) return res.status(401).json({ error: 'Nao autorizado' });

  const { title, body, url } = req.body;

  const dbUrl = process.env.VITE_DATABASE_URL;
  const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

  if (!dbUrl || !vapidPublic || !vapidPrivate) {
    return res.status(500).json({ error: 'Push not configured' });
  }

  webpush.setVapidDetails(
    'mailto:contato@estateflow.com.br',
    vapidPublic,
    vapidPrivate
  );

  const sql = neon(dbUrl);

  try {
    const subscriptions = await sql`SELECT * FROM push_subscriptions`;
    const payload = JSON.stringify({ title, body, url });

    const sendPromises = subscriptions.map(async (sub: any) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSub, payload);
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
        }
      }
    });

    await Promise.all(sendPromises);
    res.status(200).json({ success: true, count: subscriptions.length });
  } catch (error) {
    console.error('Error in push broadcast:', error);
    res.status(500).json({ error: 'Failed to broadcast push' });
  }
}
