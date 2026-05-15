import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import webpush from 'web-push';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, body, url, userId } = req.body;

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
    let result;
    if (userId) {
      // Send to specific user (can have multiple devices/subscriptions)
      result = await sql`SELECT * FROM push_subscriptions WHERE user_id = ${userId}`;
    } else {
      // Send to all (e.g., new property alert)
      result = await sql`SELECT * FROM push_subscriptions`;
    }

    const subscriptions = result;
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
          // Subscription expired
          await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
        } else {
          console.error('Error sending push to:', sub.endpoint, error);
        }
      }
    });

    await Promise.all(sendPromises);
    res.status(200).json({ success: true, count: subscriptions.length });
  } catch (error) {
    console.error('Error in push send:', error);
    res.status(500).json({ error: 'Failed to send push' });
  }
}
