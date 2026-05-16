import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subscription, userId, companyId } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Subscription missing' });
  }

  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).json({ error: 'Database URL not configured' });
  }

  const sql = neon(dbUrl);

  try {
    await sql`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_id, company_id)
      VALUES (
        ${subscription.endpoint}, 
        ${subscription.keys.p256dh}, 
        ${subscription.keys.auth}, 
        ${userId || null},
        ${companyId || 'default'}
      )
      ON CONFLICT (endpoint) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth
    `;
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
}
