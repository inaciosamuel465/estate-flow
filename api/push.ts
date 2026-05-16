import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import webpush from 'web-push';
import { verifyRequest } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = new URL(req.url || '', 'http://localhost').pathname;
  const dbUrl = process.env.VITE_DATABASE_URL;
  const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

  // GET /api/push/vapidPublicKey
  if (path === '/api/push/vapidPublicKey' && req.method === 'GET') {
    if (!vapidPublic) return res.status(500).json({ error: 'VAPID public key not configured' });
    return res.status(200).json({ publicKey: vapidPublic });
  }

  if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });
  const sql = neon(dbUrl);

  // POST /api/push/subscribe
  if (path === '/api/push/subscribe' && req.method === 'POST') {
    const { subscription, userId, companyId } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription missing' });
    }

    try {
      await sql`
        INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_id, company_id)
        VALUES (${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth}, ${userId || null}, ${companyId || 'default'})
        ON CONFLICT (endpoint) DO UPDATE SET
          user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
      `;
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving subscription:', error);
      return res.status(500).json({ error: 'Failed to save subscription' });
    }
  }

  if (!vapidPublic || !vapidPrivate) {
    return res.status(500).json({ error: 'Push not configured' });
  }

  webpush.setVapidDetails('mailto:contato@estateflow.com.br', vapidPublic, vapidPrivate);

  // POST /api/push/send
  if (path === '/api/push/send' && req.method === 'POST') {
    const user = verifyRequest(req);
    if (!user) return res.status(401).json({ error: 'Nao autorizado' });

    const { title, body, url, userId } = req.body;

    try {
      let result;
      if (userId) {
        result = await sql`SELECT * FROM push_subscriptions WHERE user_id = ${userId}`;
      } else {
        result = await sql`SELECT * FROM push_subscriptions`;
      }

      const subscriptions = result;
      const payload = JSON.stringify({ title, body, url });

      const sendPromises = subscriptions.map(async (sub: any) => {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          }, payload);
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
          }
        }
      });

      await Promise.all(sendPromises);
      return res.status(200).json({ success: true, count: subscriptions.length });
    } catch (error) {
      console.error('Error in push send:', error);
      return res.status(500).json({ error: 'Failed to send push' });
    }
  }

  // POST /api/push/broadcast
  if (path === '/api/push/broadcast' && req.method === 'POST') {
    const user = verifyRequest(req);
    if (!user) return res.status(401).json({ error: 'Nao autorizado' });

    const { title, body, url } = req.body;

    try {
      const subscriptions = await sql`SELECT * FROM push_subscriptions`;
      const payload = JSON.stringify({ title, body, url });

      const sendPromises = subscriptions.map(async (sub: any) => {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          }, payload);
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
          }
        }
      });

      await Promise.all(sendPromises);
      return res.status(200).json({ success: true, count: subscriptions.length });
    } catch (error) {
      console.error('Error in push broadcast:', error);
      return res.status(500).json({ error: 'Failed to broadcast push' });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
