import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import webpush from 'web-push';
import { verifyRequest } from '../server/api-lib/auth.js';

type PushUser = { id: string; email: string; role: string; company_id?: string };
type PushSendResult = {
  count: number;
  sent: number;
  failed: number;
  removed: number;
  errors: Array<{ statusCode?: number; message: string }>;
};

function getDbUrl() {
  return process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || '';
}

function getVapidConfig() {
  return {
    publicKey: process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
  };
}

function getPushUrl(req: VercelRequest, url?: string) {
  const appUrl = String(process.env.APP_URL || process.env.VITE_APP_URL || '').replace(/\/$/, '');
  const origin = appUrl || `https://${req.headers.host || 'localhost'}`;
  const target = String(url || '/').trim();
  if (/^https?:\/\//i.test(target)) return target;
  return `${origin}${target.startsWith('/') ? target : `/${target}`}`;
}

function safePushError(error: unknown) {
  const err = error as { statusCode?: number; body?: string; message?: string; code?: string };
  const raw = String(err?.body || err?.message || err?.code || 'Falha ao enviar push');
  return raw.replace(/https?:\/\/\S+/g, '[url]').replace(/[A-Za-z0-9_-]{24,}/g, '[token]').slice(0, 180);
}

function isMasterRole(role?: string) {
  return role === 'master' || role === 'superadmin';
}

function isAdminRole(role?: string) {
  return role === 'admin' || role === 'master' || role === 'superadmin';
}

function parseKeys(value: unknown): { p256dh?: string; auth?: string } {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (typeof value === 'object') return value as { p256dh?: string; auth?: string };
  return {};
}

function normalizeSubscription(input: any) {
  const subscription = input?.subscription || input || {};
  const keys = parseKeys(subscription.keys);
  return {
    endpoint: String(subscription.endpoint || '').trim(),
    keys: {
      p256dh: String(keys.p256dh || subscription.p256dh || '').trim(),
      auth: String(keys.auth || subscription.auth || '').trim(),
    },
  };
}

async function ensurePushSchema(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      endpoint TEXT UNIQUE NOT NULL,
      keys JSONB DEFAULT '{}',
      p256dh TEXT,
      auth TEXT,
      user_id TEXT,
      company_id TEXT,
      role TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS p256dh TEXT`;
  await sql`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS auth TEXT`;
  await sql`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS user_id TEXT`;
  await sql`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS company_id TEXT`;
  await sql`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS role TEXT`;
  await sql`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS keys JSONB DEFAULT '{}'`;
  await sql`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON push_subscriptions (endpoint)`;
  await sql`CREATE INDEX IF NOT EXISTS push_subscriptions_company_idx ON push_subscriptions (company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS push_subscriptions_user_company_idx ON push_subscriptions (user_id, company_id)`;
}

async function resolvePushUser(req: VercelRequest, sql: ReturnType<typeof neon>, companyId?: string): Promise<PushUser | null> {
  const tokenUser = verifyRequest(req);
  if (tokenUser) {
    if (!companyId || isMasterRole(tokenUser.role) || !tokenUser.company_id || tokenUser.company_id === companyId) return tokenUser;
    return null;
  }

  const headerUserId = req.headers['x-estateflow-user-id'];
  const bodyUserId = (req as any).body?.userId || (req as any).body?.user_id;
  const userId = (Array.isArray(headerUserId) ? headerUserId[0] : headerUserId) || bodyUserId;
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

async function getAdminSubscriptions(sql: ReturnType<typeof neon>, companyId?: string, userId?: string) {
  if (companyId && userId) {
    return sql`
      SELECT ps.*
      FROM push_subscriptions ps
      JOIN users u ON u.id::text = ps.user_id
      WHERE ps.company_id = ${companyId}
        AND u.company_id::text = ${companyId}
        AND u.role = 'admin'
        AND ps.user_id = ${String(userId)}
    `;
  }

  if (companyId) {
    return sql`
      SELECT ps.*
      FROM push_subscriptions ps
      JOIN users u ON u.id::text = ps.user_id
      WHERE ps.company_id = ${companyId}
        AND u.company_id::text = ${companyId}
        AND u.role = 'admin'
    `;
  }

  return sql`
    SELECT ps.*
    FROM push_subscriptions ps
    JOIN users u ON u.id::text = ps.user_id
    WHERE u.role = 'admin'
  `;
}

async function countAdminSubscriptions(sql: ReturnType<typeof neon>, companyId?: string) {
  if (companyId) {
    return sql`
      SELECT COUNT(*)::int as count
      FROM push_subscriptions ps
      JOIN users u ON u.id::text = ps.user_id
      WHERE ps.company_id = ${companyId}
        AND u.company_id::text = ${companyId}
        AND u.role = 'admin'
    `;
  }

  return sql`
    SELECT COUNT(*)::int as count
    FROM push_subscriptions ps
    JOIN users u ON u.id::text = ps.user_id
    WHERE u.role = 'admin'
  `;
}

function webPushSubscription(row: any) {
  const keys = parseKeys(row.keys);
  const p256dh = String(keys.p256dh || row.p256dh || '').trim();
  const auth = String(keys.auth || row.auth || '').trim();
  if (!row.endpoint || !p256dh || !auth) return null;
  return {
    endpoint: String(row.endpoint),
    keys: { p256dh, auth },
  };
}

async function sendToSubscriptions(
  sql: ReturnType<typeof neon>,
  subscriptions: any[],
  payload: string
): Promise<PushSendResult> {
  const result: PushSendResult = { count: subscriptions.length, sent: 0, failed: 0, removed: 0, errors: [] };

  for (const sub of subscriptions) {
    const target = webPushSubscription(sub);
    if (!target) {
      result.failed += 1;
      result.errors.push({ message: 'Inscricao de push incompleta removida.' });
      await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
      result.removed += 1;
      continue;
    }

    try {
      await webpush.sendNotification(target, payload);
      result.sent += 1;
    } catch (error: any) {
      if (error?.statusCode === 410 || error?.statusCode === 404) {
        await sql`DELETE FROM push_subscriptions WHERE endpoint = ${target.endpoint}`;
        result.removed += 1;
        continue;
      }

      result.failed += 1;
      if (result.errors.length < 3) {
        result.errors.push({ statusCode: error?.statusCode, message: safePushError(error) });
      }
      console.warn('[Push] Falha em uma inscricao:', {
        statusCode: error?.statusCode,
        message: safePushError(error),
      });
    }
  }

  return result;
}

function pushPayload(req: VercelRequest, input: { title?: string; body?: string; url?: string }) {
  return JSON.stringify({
    title: input.title || 'EstateFlow Suite',
    body: input.body || 'Nova notificacao do EstateFlow.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    url: getPushUrl(req, input.url),
  });
}

async function handleSend(req: VercelRequest, res: VercelResponse, sql: ReturnType<typeof neon>, broadcast: boolean) {
  const { title, body, message, url, userId, companyId, company_id } = req.body || {};
  const requestedCompanyId = String(companyId || company_id || req.query.companyId || req.query.company_id || '');
  const user = await resolvePushUser(req, sql, requestedCompanyId);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Sessao invalida. Entre novamente e tente enviar o push.' });
  }
  if (!isAdminRole(user.role)) {
    return res.status(403).json({ success: false, error: 'Push permitido apenas para administradores.' });
  }

  const scopedCompanyId = requestedCompanyId || user.company_id || '';
  if (!scopedCompanyId && !isMasterRole(user.role)) {
    return res.status(400).json({ success: false, error: 'companyId obrigatorio para enviar push.' });
  }

  const vapid = getVapidConfig();
  if (!vapid.publicKey || !vapid.privateKey) {
    return res.status(503).json({
      success: false,
      error: 'Push nao configurado. Configure VITE_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.',
      code: 'missing_vapid',
    });
  }

  webpush.setVapidDetails('mailto:contato@estateflow.com.br', vapid.publicKey, vapid.privateKey);

  const subscriptions = await getAdminSubscriptions(sql, scopedCompanyId || undefined, !broadcast && userId ? String(userId) : undefined) as any[];

  if (subscriptions.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      sent: 0,
      failed: 0,
      removed: 0,
      message: 'Nenhum administrador inscrito para esta imobiliaria. Ative o push no celular usando uma conta admin e tente novamente.',
    });
  }

  const result = await sendToSubscriptions(sql, subscriptions as any[], pushPayload(req, { title, body: body || message, url }));
  return res.status(200).json({
    success: true,
    ...result,
    message: result.failed > 0
      ? `Push enviado para ${result.sent} dispositivo(s), com ${result.failed} falha(s).`
      : `Push enviado para ${result.sent} dispositivo(s).`,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const path = new URL(req.url || '', 'http://localhost').pathname;
    const dbUrl = getDbUrl();
    const vapid = getVapidConfig();

    if ((path === '/api/push/vapidPublicKey' || path === '/api/push/vapid-key') && req.method === 'GET') {
      if (!vapid.publicKey) {
        return res.status(503).json({ success: false, error: 'VAPID public key nao configurada.', code: 'missing_vapid_public' });
      }
      return res.status(200).json({ success: true, publicKey: vapid.publicKey });
    }

    if (!dbUrl) {
      return res.status(503).json({ success: false, error: 'Banco de dados nao configurado.', code: 'missing_database' });
    }

    const sql = neon(dbUrl);
    await ensurePushSchema(sql);

    if (path === '/api/push/diagnostics' && req.method === 'GET') {
      const companyId = String(req.query.companyId || req.query.company_id || '');
      const user = await resolvePushUser(req, sql, companyId || undefined);
      if (!user) return res.status(401).json({ success: false, error: 'Nao autorizado' });
      if (!isAdminRole(user.role)) return res.status(403).json({ success: false, error: 'Apenas administradores podem diagnosticar push.' });
      const scopedCompanyId = companyId || user.company_id || '';
      const rows = await countAdminSubscriptions(sql, scopedCompanyId || undefined);
      return res.status(200).json({
        success: true,
        configured: {
          database: true,
          vapidPublic: Boolean(vapid.publicKey),
          vapidPrivate: Boolean(vapid.privateKey),
        },
        companyId: scopedCompanyId || null,
        subscriptions: Number(rows[0]?.count || 0),
      });
    }

    if (path === '/api/push/subscribe' && req.method === 'POST') {
      const subscription = normalizeSubscription(req.body);
      const userId = req.body?.userId || req.body?.user_id || null;
      const companyId = String(req.body?.companyId || req.body?.company_id || '').trim();

      if (!subscription.endpoint || !subscription.keys.p256dh || !subscription.keys.auth) {
        return res.status(400).json({ success: false, error: 'Inscricao de push incompleta.' });
      }
      if (!companyId) {
        return res.status(400).json({ success: false, error: 'Empresa nao identificada para salvar o push. Recarregue o painel da imobiliaria.' });
      }

      const user = await resolvePushUser(req, sql, companyId);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Sessao invalida. Entre novamente e ative o push.' });
      }
      if (!isAdminRole(user.role)) {
        return res.status(403).json({ success: false, error: 'Push permitido apenas para administradores.' });
      }

      await sql`
        INSERT INTO push_subscriptions (endpoint, p256dh, auth, keys, user_id, company_id, role)
        VALUES (${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth}, ${JSON.stringify(subscription.keys)}::jsonb, ${String(user.id || userId)}, ${companyId}, ${user.role})
        ON CONFLICT (endpoint) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          company_id = EXCLUDED.company_id,
          role = EXCLUDED.role,
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          keys = EXCLUDED.keys,
          updated_at = NOW()
      `;
      return res.status(200).json({ success: true, message: 'Dispositivo inscrito com sucesso.' });
    }

    if ((path === '/api/push/send' || path === '/api/push/test/welcome' || path === '/api/push/test/alert' || path === '/api/push/test/news') && req.method === 'POST') {
      if (path.includes('/test/welcome')) {
        req.body = { ...req.body, title: 'Bem-vindo ao EstateFlow', body: 'Teste de push recebido com sucesso.', url: '/' };
      }
      if (path.includes('/test/alert')) {
        req.body = { ...req.body, title: 'Alerta EstateFlow', body: 'Este e um alerta de teste.', url: '/' };
      }
      if (path.includes('/test/news')) {
        req.body = { ...req.body, title: 'Novidade EstateFlow', body: 'Broadcast de teste enviado.', url: '/' };
      }
      return handleSend(req, res, sql, false);
    }

    if ((path === '/api/push/broadcast' || path === '/api/broadcast/push') && req.method === 'POST') {
      return handleSend(req, res, sql, true);
    }

    return res.status(404).json({ success: false, error: 'Not found' });
  } catch (error) {
    console.error('[Push] Erro interno:', error);
    return res.status(500).json({ success: false, error: 'Erro interno no servico de push.', details: safePushError(error) });
  }
}
