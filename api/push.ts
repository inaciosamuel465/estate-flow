import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import webpush from 'web-push';
import { verifyRequest } from './_lib/auth';

type PushUser = { id: string; email: string; role: string; company_id?: string };

async function ensurePushSchema(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_id TEXT,
      company_id TEXT NOT NULL DEFAULT 'default',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS user_id TEXT`;
  await sql`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT 'default'`;
  await sql`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON push_subscriptions (endpoint)`;
}

async function resolvePushUser(req: VercelRequest, sql: ReturnType<typeof neon>, companyId?: string): Promise<PushUser | null> {
  const tokenUser = verifyRequest(req);
  if (tokenUser) return tokenUser;

  const headerUserId = req.headers['x-estateflow-user-id'];
  const userId = Array.isArray(headerUserId) ? headerUserId[0] : headerUserId;
  if (!userId || !companyId) return null;

  const rows = await sql`
    SELECT id, email, role, company_id
    FROM users
    WHERE id = ${String(userId)} AND company_id = ${companyId}
    LIMIT 1
  `;
  const user = rows[0];
  if (!user) return null;
  if (!['admin', 'master', 'superadmin'].includes(String(user.role))) return null;
  return {
    id: String(user.id),
    email: String(user.email || ''),
    role: String(user.role),
    company_id: user.company_id ? String(user.company_id) : undefined,
  };
}

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
  await ensurePushSchema(sql);

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
          user_id = EXCLUDED.user_id,
          company_id = EXCLUDED.company_id,
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          updated_at = NOW()
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
    const { title, body, url, userId, companyId, company_id } = req.body;
    const requestedCompanyId = String(companyId || company_id || '');
    const user = await resolvePushUser(req, sql, requestedCompanyId);
    if (!user) return res.status(401).json({ error: 'Sessao invalida. Entre novamente e tente disparar o push.' });

    const scopedCompanyId = requestedCompanyId || user.company_id;
    if (!scopedCompanyId && user.role !== 'master' && user.role !== 'superadmin') {
      return res.status(400).json({ error: 'companyId obrigatorio' });
    }

    try {
      let result;
      if (userId) {
        result = scopedCompanyId
          ? await sql`SELECT * FROM push_subscriptions WHERE user_id = ${userId} AND company_id = ${scopedCompanyId}`
          : await sql`SELECT * FROM push_subscriptions WHERE user_id = ${userId}`;
      } else {
        result = scopedCompanyId
          ? await sql`SELECT * FROM push_subscriptions WHERE company_id = ${scopedCompanyId}`
          : await sql`SELECT * FROM push_subscriptions`;
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
    const { title, body, url, companyId, company_id } = req.body;
    const requestedCompanyId = String(companyId || company_id || '');
    const user = await resolvePushUser(req, sql, requestedCompanyId);
    if (!user) return res.status(401).json({ error: 'Sessao invalida. Entre novamente e tente enviar o anuncio.' });

    const scopedCompanyId = requestedCompanyId || user.company_id;
    if (!scopedCompanyId && user.role !== 'master' && user.role !== 'superadmin') {
      return res.status(400).json({ error: 'companyId obrigatorio' });
    }

    try {
      const subscriptions = scopedCompanyId
        ? await sql`SELECT * FROM push_subscriptions WHERE company_id = ${scopedCompanyId}`
        : await sql`SELECT * FROM push_subscriptions`;
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
