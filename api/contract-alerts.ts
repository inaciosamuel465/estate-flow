import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { verifyRequest } from './_lib/auth.js';
import { assertTenantAccess, fail, getSql, handleApiError, ok } from './_lib/http.js';
import { createSmtpTransport, publicSmtpError, resolveSmtpConfig } from './_lib/smtp.js';

const ALERT_DAYS = [30, 15, 7];

type AlertChannel = 'agency_email' | 'client_email' | 'admin_push' | 'admin_notification';

function getAppUrl(req: VercelRequest) {
  return String(process.env.APP_URL || process.env.VITE_APP_URL || `https://${req.headers.host || 'localhost'}`).replace(/\/$/, '');
}

function escapeHtml(value: unknown) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('pt-BR');
}

function safeError(error: unknown) {
  const err = error as { message?: string; body?: string; code?: string };
  return String(err?.body || err?.message || err?.code || 'Falha ao processar alerta').replace(/[A-Za-z0-9_-]{24,}/g, '[token]').slice(0, 180);
}

async function ensureAlertSchema(sql: ReturnType<typeof getSql>) {
  await sql`
    CREATE TABLE IF NOT EXISTS contract_alert_logs (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      contract_id TEXT NOT NULL,
      days_before INTEGER NOT NULL,
      channel TEXT NOT NULL,
      recipient TEXT NOT NULL,
      alert_date DATE NOT NULL DEFAULT CURRENT_DATE,
      status TEXT NOT NULL DEFAULT 'pending',
      provider TEXT,
      message_id TEXT,
      error TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS contract_alert_logs_unique ON contract_alert_logs (company_id, contract_id, days_before, channel, recipient, alert_date)`;
  await sql`
    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      user_id TEXT,
      to_email TEXT,
      subject TEXT,
      status TEXT NOT NULL,
      provider TEXT,
      message_id TEXT,
      error TEXT,
      entity_type TEXT,
      entity_id TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      type TEXT,
      title TEXT,
      message TEXT,
      action_url TEXT,
      icon TEXT,
      priority TEXT DEFAULT 'medium',
      read BOOLEAN DEFAULT FALSE,
      company_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT`;
  await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS icon TEXT`;
  await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'`;
  await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS company_id TEXT`;
}

async function reserveAlert(
  sql: ReturnType<typeof getSql>,
  row: any,
  channel: AlertChannel,
  recipient: string
) {
  const id = `calert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inserted = await sql`
    INSERT INTO contract_alert_logs (id, company_id, contract_id, days_before, channel, recipient, status, metadata, updated_at)
    VALUES (${id}, ${row.company_id}, ${row.id}, ${Number(row.days_before)}, ${channel}, ${recipient}, 'pending', ${JSON.stringify({ propertyTitle: row.property_title || '' })}::jsonb, NOW())
    ON CONFLICT (company_id, contract_id, days_before, channel, recipient, alert_date)
    DO UPDATE SET status = 'pending', error = NULL, updated_at = NOW()
    WHERE contract_alert_logs.status <> 'sent'
    RETURNING id
  `;
  return inserted[0]?.id ? String(inserted[0].id) : null;
}

async function finishAlert(
  sql: ReturnType<typeof getSql>,
  id: string | null,
  status: string,
  details: { provider?: string; messageId?: string; error?: string } = {}
) {
  if (!id) return;
  await sql`
    UPDATE contract_alert_logs
    SET status = ${status},
        provider = ${details.provider || null},
        message_id = ${details.messageId || null},
        error = ${details.error || null},
        updated_at = NOW()
    WHERE id = ${id}
  `;
}

function buildContractUrl(req: VercelRequest, row: any) {
  const slug = String(row.company_slug || '').trim();
  return slug ? `${getAppUrl(req)}/${slug}/admin/contracts` : `${getAppUrl(req)}/admin/contracts`;
}

function emailTemplate(input: {
  heading: string;
  greeting: string;
  message: string;
  buttonLabel: string;
  url: string;
  footer: string;
}) {
  const url = escapeHtml(input.url);
  return `
    <!DOCTYPE html>
    <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
        <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:#0f172a;padding:28px;text-align:center;">
            <h1 style="color:#ffffff;font-size:22px;margin:0;">EstateFlow Suite</h1>
            <p style="color:#cbd5e1;font-size:13px;margin:8px 0 0;">Alerta de contrato</p>
          </div>
          <div style="padding:28px;line-height:1.55;">
            <h2 style="font-size:20px;margin:0 0 14px;">${escapeHtml(input.heading)}</h2>
            <p>${escapeHtml(input.greeting)}</p>
            <p>${escapeHtml(input.message)}</p>
            <p style="margin:28px 0;">
              <a href="${url}" target="_blank" rel="noopener noreferrer" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;display:inline-block;">${escapeHtml(input.buttonLabel)}</a>
            </p>
            <p style="font-size:12px;color:#475569;word-break:break-all;">${url}</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
            <p style="font-size:12px;color:#64748b;margin:0;">${escapeHtml(input.footer)}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function sendAlertEmail(sql: ReturnType<typeof getSql>, req: VercelRequest, row: any, channel: AlertChannel, to: string, clientCopy: boolean) {
  const logId = await reserveAlert(sql, row, channel, to);
  if (!logId) return { skipped: true, reason: 'duplicate' };

  const config = resolveSmtpConfig(row, String(row.settings_company_name || row.company_name || 'EstateFlow Suite'));
  if (!config) {
    await finishAlert(sql, logId, 'pending_configuration', { error: publicSmtpError() });
    return { skipped: true, reason: publicSmtpError() };
  }

  const propertyTitle = row.property_title || 'imovel';
  const days = Number(row.days_before);
  const endDate = formatDate(row.end_date);
  const contractUrl = buildContractUrl(req, row);
  const subject = clientCopy
    ? `Seu contrato vence em ${days} dias - ${propertyTitle}`
    : `Contrato vence em ${days} dias - ${propertyTitle}`;
  const text = clientCopy
    ? `Ola, ${row.client_name || 'cliente'}.\n\nSeu contrato de locacao do imovel ${propertyTitle} vence em ${days} dias, em ${endDate}. Entre em contato com a imobiliaria para alinhar renovacao ou encerramento.\n\n${contractUrl}`
    : `O contrato do imovel ${propertyTitle} vence em ${days} dias, em ${endDate}.\nCliente: ${row.client_name || '-'}\nEmail do cliente: ${row.client_email || '-'}\n\nAcesse: ${contractUrl}`;
  const html = emailTemplate({
    heading: clientCopy ? `Seu contrato vence em ${days} dias` : `Contrato vence em ${days} dias`,
    greeting: clientCopy ? `Ola, ${row.client_name || 'cliente'}.` : `Alerta para ${row.company_name || 'imobiliaria'}.`,
    message: clientCopy
      ? `O contrato de locacao do imovel ${propertyTitle} vence em ${days} dias, em ${endDate}. Entre em contato com a imobiliaria para alinhar renovacao ou encerramento.`
      : `O contrato do imovel ${propertyTitle} vence em ${days} dias, em ${endDate}. Cliente: ${row.client_name || '-'} (${row.client_email || '-'}).`,
    buttonLabel: clientCopy ? 'Abrir sistema no navegador' : 'Ver contrato no sistema',
    url: contractUrl,
    footer: `Mensagem automatica da ${config.senderName}.`,
  });

  try {
    const info = await createSmtpTransport(config).sendMail({
      from: `"${config.senderName.replace(/"/g, '')}" <${config.senderEmail}>`,
      to,
      subject,
      text,
      html,
      headers: { 'X-EstateFlow-Contract-ID': String(row.id) },
    });
    await finishAlert(sql, logId, 'sent', { provider: config.source === 'company' ? 'smtp' : 'smtp_env', messageId: info.messageId });
    await sql`
      INSERT INTO email_logs (id, company_id, user_id, to_email, subject, status, provider, message_id, entity_type, entity_id, metadata)
      VALUES (${`elog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`}, ${row.company_id}, NULL, ${to}, ${subject}, 'sent', ${config.source === 'company' ? 'smtp' : 'smtp_env'}, ${info.messageId || null}, 'contract_expiry', ${String(row.id)}, ${JSON.stringify({ days_before: days, channel })}::jsonb)
    `;
    return { sent: true };
  } catch (error) {
    const message = safeError(error);
    await finishAlert(sql, logId, 'failed', { provider: config.source === 'company' ? 'smtp' : 'smtp_env', error: message });
    return { failed: true, error: message };
  }
}

function parsePushKeys(value: unknown) {
  if (!value) return {};
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return typeof value === 'object' ? value as any : {};
}

async function sendAdminPush(sql: ReturnType<typeof getSql>, row: any, req: VercelRequest) {
  const recipient = `admins:${row.company_id}`;
  const logId = await reserveAlert(sql, row, 'admin_push', recipient);
  if (!logId) return { skipped: true, reason: 'duplicate' };

  const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '';
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY || '';
  if (!vapidPublic || !vapidPrivate) {
    await finishAlert(sql, logId, 'pending_configuration', { error: 'Push nao configurado' });
    return { skipped: true, reason: 'Push nao configurado' };
  }

  const subscriptions = await sql`
    SELECT ps.*
    FROM push_subscriptions ps
    JOIN users u ON u.id = ps.user_id AND u.company_id = ps.company_id
    WHERE ps.company_id = ${row.company_id}
      AND u.role = 'admin'
  `;

  if (subscriptions.length === 0) {
    await finishAlert(sql, logId, 'skipped', { error: 'Nenhum admin inscrito em push' });
    return { skipped: true, reason: 'Nenhum admin inscrito em push' };
  }

  webpush.setVapidDetails('mailto:contato@estateflow.com.br', vapidPublic, vapidPrivate);
  const payload = JSON.stringify({
    title: `Contrato vence em ${row.days_before} dias`,
    body: `${row.property_title || 'Imovel'} - ${row.client_name || 'cliente'}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    url: buildContractUrl(req, row),
  });

  let sent = 0;
  let failed = 0;
  let removed = 0;
  for (const sub of subscriptions as any[]) {
    const keys = parsePushKeys(sub.keys);
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: keys.p256dh || sub.p256dh, auth: keys.auth || sub.auth },
      }, payload);
      sent += 1;
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
        removed += 1;
      } else {
        failed += 1;
      }
    }
  }

  await finishAlert(sql, logId, sent > 0 ? 'sent' : 'failed', {
    provider: 'web_push',
    error: failed > 0 ? `${failed} falha(s), ${removed} removida(s)` : undefined,
  });
  return { sent, failed, removed };
}

async function createAdminNotifications(sql: ReturnType<typeof getSql>, row: any, req: VercelRequest) {
  const recipient = `notification:${row.company_id}`;
  const logId = await reserveAlert(sql, row, 'admin_notification', recipient);
  if (!logId) return { skipped: true, reason: 'duplicate' };

  const admins = await sql`SELECT id FROM users WHERE company_id = ${row.company_id} AND role = 'admin'`;
  if (admins.length === 0) {
    await finishAlert(sql, logId, 'skipped', { error: 'Nenhum admin cadastrado' });
    return { skipped: true, reason: 'Nenhum admin cadastrado' };
  }

  for (const admin of admins as any[]) {
    await sql`
      INSERT INTO notifications (user_id, type, title, message, action_url, icon, priority, company_id)
      VALUES (${String(admin.id)}, 'contract', ${`Contrato vence em ${row.days_before} dias`}, ${`O contrato de ${row.property_title || 'imovel'} vence em ${row.days_before} dias.`}, ${buildContractUrl(req, row)}, 'schedule', 'high', ${row.company_id})
    `;
  }
  await finishAlert(sql, logId, 'sent', { provider: 'database' });
  return { sent: admins.length };
}

async function loadDueContracts(sql: ReturnType<typeof getSql>, companyId?: string) {
  if (companyId) {
    return sql`
      SELECT
        c.*,
        (c.end_date::date - CURRENT_DATE)::int as days_before,
        co.name as company_name,
        co.email as company_email,
        co.slug as company_slug,
        p.title as property_title,
        u_client.name as client_name,
        u_client.email as client_email,
        cs.company_name as settings_company_name,
        cs.smtp_host,
        cs.smtp_port,
        cs.smtp_user,
        cs.smtp_password,
        cs.smtp_secure,
        cs.email_sender_name,
        cs.email_sender_address
      FROM contracts c
      JOIN companies co ON co.id = c.company_id
      LEFT JOIN properties p ON p.id::text = c.property_id AND p.company_id = c.company_id
      LEFT JOIN users u_client ON u_client.id = c.client_id AND u_client.company_id = c.company_id
      LEFT JOIN company_settings cs ON cs.company_id = c.company_id
      WHERE c.company_id = ${companyId}
        AND c.status = 'active'
        AND c.type IN ('rent', 'rental', 'locacao', 'locação')
        AND c.end_date IS NOT NULL
        AND (c.end_date::date - CURRENT_DATE)::int IN (30, 15, 7)
      ORDER BY c.end_date ASC
    `;
  }

  return sql`
    SELECT
      c.*,
      (c.end_date::date - CURRENT_DATE)::int as days_before,
      co.name as company_name,
      co.email as company_email,
      co.slug as company_slug,
      p.title as property_title,
      u_client.name as client_name,
      u_client.email as client_email,
      cs.company_name as settings_company_name,
      cs.smtp_host,
      cs.smtp_port,
      cs.smtp_user,
      cs.smtp_password,
      cs.smtp_secure,
      cs.email_sender_name,
      cs.email_sender_address
    FROM contracts c
    JOIN companies co ON co.id = c.company_id
    LEFT JOIN properties p ON p.id::text = c.property_id AND p.company_id = c.company_id
    LEFT JOIN users u_client ON u_client.id = c.client_id AND u_client.company_id = c.company_id
    LEFT JOIN company_settings cs ON cs.company_id = c.company_id
    WHERE c.status = 'active'
      AND c.type IN ('rent', 'rental', 'locacao', 'locação')
      AND c.end_date IS NOT NULL
      AND (c.end_date::date - CURRENT_DATE)::int IN (30, 15, 7)
    ORDER BY c.end_date ASC
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const path = new URL(req.url || '', 'http://localhost').pathname;
    if (path !== '/api/contract-alerts/run' && path !== '/api/contract-alerts') return fail(res, 404, 'Not found');
    if (!['GET', 'POST'].includes(req.method || '')) return fail(res, 405, 'Method not allowed');

    const sql = getSql();
    await ensureAlertSchema(sql);

    const cronSecret = process.env.CRON_SECRET || '';
    const authHeader = String(req.headers.authorization || '');
    const isCron = req.method === 'GET' && Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;
    const user = isCron ? null : verifyRequest(req);
    if (!isCron) {
      if (!user || !['admin', 'master', 'superadmin'].includes(user.role)) return fail(res, 401, 'Nao autorizado');
    }

    const companyId = String(req.body?.company_id || req.query.company_id || user?.company_id || '');
    if (companyId && user) assertTenantAccess(user, companyId);
    const dryRun = req.body?.dry_run === true || req.query.dry_run === '1';
    const contracts = await loadDueContracts(sql, companyId || undefined);

    const totals = { contracts: contracts.length, emailsSent: 0, pushSent: 0, notifications: 0, skipped: 0, failed: 0 };
    const items: any[] = [];

    for (const contract of contracts as any[]) {
      const agencyEmail = String(contract.company_email || contract.email_sender_address || '').trim();
      const clientEmail = String(contract.client_email || '').trim();
      const item: any = {
        contractId: contract.id,
        companyId: contract.company_id,
        propertyTitle: contract.property_title || '',
        daysBefore: Number(contract.days_before),
        dryRun,
      };

      if (dryRun) {
        item.planned = { agencyEmail: Boolean(agencyEmail), clientEmail: Boolean(clientEmail), push: true, notifications: true };
        items.push(item);
        continue;
      }

      if (agencyEmail) {
        const result = await sendAlertEmail(sql, req, contract, 'agency_email', agencyEmail, false);
        if ((result as any).sent) totals.emailsSent += 1;
        else if ((result as any).failed) totals.failed += 1;
        else totals.skipped += 1;
        item.agencyEmail = result;
      } else {
        totals.skipped += 1;
        item.agencyEmail = { skipped: true, reason: 'Imobiliaria sem email cadastrado' };
      }

      if (clientEmail) {
        const result = await sendAlertEmail(sql, req, contract, 'client_email', clientEmail, true);
        if ((result as any).sent) totals.emailsSent += 1;
        else if ((result as any).failed) totals.failed += 1;
        else totals.skipped += 1;
        item.clientEmail = result;
      } else {
        totals.skipped += 1;
        item.clientEmail = { skipped: true, reason: 'Cliente sem email cadastrado' };
      }

      const notificationResult = await createAdminNotifications(sql, contract, req);
      if ((notificationResult as any).sent) totals.notifications += Number((notificationResult as any).sent || 0);
      else totals.skipped += 1;
      item.notifications = notificationResult;

      const pushResult = await sendAdminPush(sql, contract, req);
      if ((pushResult as any).sent) totals.pushSent += Number((pushResult as any).sent || 0);
      else totals.skipped += 1;
      item.push = pushResult;

      items.push(item);
    }

    return ok(res, { data: { days: ALERT_DAYS, ...totals, items } });
  } catch (error) {
    return handleApiError(res, error);
  }
}
