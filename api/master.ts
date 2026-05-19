import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { signToken, verifyRequest } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = new URL(req.url || '', 'http://localhost').pathname;
  const route = String(req.query.route || '');
  const dbUrl = process.env.VITE_DATABASE_URL;

  // POST /api/email/send routed here to keep Hobby deployments under the function limit.
  if ((path === '/api/email/send' || route === 'email-send') && req.method === 'POST') {
    const user = verifyRequest(req);
    if (!user) return res.status(401).json({ error: 'Nao autorizado' });

    const { to, subject, text, html, company_id, from: customFrom } = req.body;
    if (!to || !subject || !html) return res.status(400).json({ error: 'Missing parameters' });
    if (company_id && user.company_id && company_id !== user.company_id && !['master', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ error: 'Tenant invalido' });
    }

    let smtpConfig: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
      senderName: string;
      senderEmail: string;
    } | null = null;

    if (company_id && dbUrl) {
      try {
        const sql = neon(dbUrl);
        const settings = await sql`SELECT * FROM company_settings WHERE company_id = ${company_id} LIMIT 1`;
        const s = settings[0];
        if (s?.smtp_host && s?.smtp_user && s?.smtp_password) {
          smtpConfig = {
            host: s.smtp_host,
            port: Number(s.smtp_port) || 587,
            secure: s.smtp_secure === true,
            user: s.smtp_user,
            pass: s.smtp_password,
            senderName: s.email_sender_name || 'EstateFlow',
            senderEmail: s.email_sender_address || s.smtp_user,
          };
        }
      } catch (error) {
        console.warn('Failed to load company SMTP, using fallback:', error);
      }
    }

    const config = smtpConfig || {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      senderName: 'EstateFlow Suite',
      senderEmail: process.env.SMTP_USER || '',
    };

    if (!config.host || !config.user || !config.pass) {
      return res.status(500).json({ error: 'SMTP nao configurado' });
    }

    try {
      const safeFrom = typeof customFrom === 'string' && customFrom.toLowerCase() === config.senderEmail.toLowerCase()
        ? customFrom
        : config.senderEmail;
      const info = await nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user: config.user, pass: config.pass },
        tls: { rejectUnauthorized: false },
      }).sendMail({
        from: `"${config.senderName}" <${safeFrom}>`,
        to,
        subject,
        text: text || undefined,
        html,
        headers: {
          'Message-ID': `<${Date.now()}.${Math.random().toString(36).substr(2)}@estateflow>`,
          'References': '',
          'In-Reply-To': '',
        },
      });
      return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }
  }

  // POST /api/admin/provision routed here to avoid an extra Serverless Function.
  if ((path === '/api/admin/provision' || route === 'admin-provision') && req.method === 'POST') {
    const user = verifyRequest(req);
    if (!user) return res.status(401).json({ error: 'Nao autorizado' });
    if (user.role !== 'admin' && user.role !== 'master' && user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Sem permissao' });
    }
    const companyId = String(req.body?.company_id || user.company_id || '');
    if (!companyId) return res.status(400).json({ error: 'company_id obrigatorio' });
    if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });

    try {
      const sql = neon(dbUrl);
      const provisionUsers = [
        { email: 'admin@estateflow.com', name: 'Administrador', role: 'admin', password: 'admin' },
        { email: 'cliente@teste.com', name: 'Joao Cliente', role: 'client', password: 'user123' },
        { email: 'proprietario@teste.com', name: 'Maria Proprietaria', role: 'owner', password: 'user123' },
      ];

      for (const provisionUser of provisionUsers) {
        const id = `${companyId}_${provisionUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const passwordHash = crypto.createHash('sha256').update(provisionUser.password).digest('hex');
        await sql`
          INSERT INTO users (id, email, name, role, password, company_id)
          VALUES (${id}, ${provisionUser.email}, ${provisionUser.name}, ${provisionUser.role}, ${passwordHash}, ${companyId})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            password = COALESCE(users.password, EXCLUDED.password),
            company_id = EXCLUDED.company_id
        `;
      }

      const settings = [
        { key: 'pixKey', value: 'financeiro@estateflow.com' },
        { key: 'pixBeneficiary', value: 'EstateFlow LTDA' },
      ];

      for (const item of settings) {
        await sql`
          INSERT INTO system_settings (key, value)
          VALUES (${`${companyId}:${item.key}`}, ${item.value})
          ON CONFLICT (key) DO NOTHING
        `;
      }

      return res.status(200).json({ success: true, message: 'Test data provisioned' });
    } catch (error) {
      console.error('Error provisioning:', error);
      return res.status(500).json({ error: 'Failed to provision' });
    }
  }

  // POST /api/master/login
  if (path === '/api/master/login' && req.method === 'POST') {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatorios' });
    if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });
    const sql = neon(dbUrl);

    try {
      const result = await sql`SELECT * FROM master_users WHERE email = ${email} LIMIT 1`;
      if (result.length === 0) return res.status(401).json({ error: 'Credenciais invalidas' });

      const user = result[0];
      const hashedInput = crypto.createHash('sha256').update(password).digest('hex');

      if (user.password !== hashedInput) return res.status(401).json({ error: 'Credenciais invalidas' });

      const { password: _, ...safeUser } = user;
      const token = signToken({ id: user.id, email: user.email, role: user.role, exp: Date.now() + 86400000 });
      return res.status(200).json({ success: true, user: safeUser, token });
    } catch (error) {
      console.error('Master login error:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // GET /api/master/saas-settings | POST /api/master/saas-settings
  if (path === '/api/master/saas-settings') {
    const user = verifyRequest(req);
    if (!user) {
      if (req.method === 'GET') {
        if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });
        const sql = neon(dbUrl);
        const saas = await sql`SELECT plan_name, plan_price, billing_email_from, billing_email_cc FROM saas_settings WHERE id = 'global' LIMIT 1`;
        return res.status(200).json(saas[0] || { plan_name: 'Mensal', plan_price: 170 });
      }
      return res.status(401).json({ error: 'Nao autorizado' });
    }

    if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });
    const sql = neon(dbUrl);

    if (req.method === 'GET') {
      const saas = await sql`SELECT plan_name, plan_price, billing_email_from, billing_email_cc FROM saas_settings WHERE id = 'global' LIMIT 1`;
      return res.status(200).json(saas[0] || { plan_name: 'Mensal', plan_price: 170 });
    }

    if (req.method === 'POST') {
      const { plan_name, plan_price, billing_email_from, billing_email_cc } = req.body;
      await sql`
        INSERT INTO saas_settings (id, plan_name, plan_price, billing_email_from, billing_email_cc, updated_at)
        VALUES ('global', ${plan_name || 'Mensal'}, ${plan_price || 170}, ${billing_email_from || null}, ${billing_email_cc || null}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          plan_name = EXCLUDED.plan_name, plan_price = EXCLUDED.plan_price,
          billing_email_from = EXCLUDED.billing_email_from, billing_email_cc = EXCLUDED.billing_email_cc, updated_at = NOW()
      `;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  // POST /api/master/send-billing-email
  if (path === '/api/master/send-billing-email' && req.method === 'POST') {
    const user = verifyRequest(req);
    if (!user) return res.status(401).json({ error: 'Nao autorizado' });
    if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });
    const sql = neon(dbUrl);

    const { company_id } = req.body;
    if (!company_id) return res.status(400).json({ error: 'company_id required' });

    try {
      await sql`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS billing_admin_id TEXT`;

      const [company, settings, billingAdminRow, adminRow] = await Promise.all([
        sql`SELECT id, name, slug, email, subscription_status, plan FROM companies WHERE id = ${company_id} LIMIT 1`,
        sql`SELECT * FROM saas_settings WHERE id = 'global' LIMIT 1`,
        sql`
          SELECT u.name, u.email
          FROM company_settings cs
          JOIN users u ON u.id = cs.billing_admin_id AND u.company_id = cs.company_id
          WHERE cs.company_id = ${company_id}
          LIMIT 1
        `,
        sql`SELECT name, email FROM users WHERE company_id = ${company_id} AND role = 'admin' ORDER BY name LIMIT 1`,
      ]);

      if (company.length === 0) return res.status(404).json({ error: 'Company not found' });

      const c = company[0];
      const s = settings[0] || { plan_name: 'Mensal', plan_price: 170, billing_email_from: '' };
      const admin = billingAdminRow[0] || adminRow[0] || null;
      const planPrice = Number(s.plan_price) || 170;
      const appUrl = process.env.VITE_APP_URL || 'https://estate-flow-amber.vercel.app';
      const plansUrl = c.slug ? `${appUrl.replace(/\/$/, '')}/${c.slug}/plans` : `${appUrl.replace(/\/$/, '')}/plans`;
      const to = admin?.email || c.email;
      const subject = `Cobrança EstateFlow - ${s.plan_name || 'Mensal'}`;
      const text = `Olá ${admin?.name || c.name},\n\nSegue o resumo da sua assinatura:\n\nPlano: ${s.plan_name || 'Mensal'}\nValor: R$ ${planPrice.toFixed(2)}\nStatus: ${c.subscription_status === 'active' ? 'Ativo' : 'Pendente'}\n\nPara gerenciar sua assinatura, acesse: ${plansUrl}\n\nEstateFlow Suite — Gestão Imobiliária`;
      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#1e293b;padding:32px;border-radius:16px 16px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:24px;">EstateFlow</h1>
          </div>
          <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-radius:0 0 16px 16px;">
            <h2 style="color:#1e293b;">Olá, ${admin?.name || c.name}!</h2>
            <p style="color:#64748b;">Segue o resumo da sua assinatura:</p>
            <div style="background:#f8fafc;border-radius:12px;padding:24px;margin:24px 0;">
              <p style="margin:0;color:#94a3b8;font-size:14px;">Plano</p>
              <p style="margin:4px 0 16px;font-size:20px;font-weight:bold;color:#1e293b;">${s.plan_name || 'Mensal'}</p>
              <p style="margin:0;color:#94a3b8;font-size:14px;">Valor</p>
              <p style="margin:4px 0 16px;font-size:24px;font-weight:bold;color:#0f172a;">R$ ${planPrice.toFixed(2)}</p>
              <p style="margin:0;color:#94a3b8;font-size:14px;">Status</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:bold;color:${c.subscription_status === 'active' ? '#10b981' : '#f59e0b'}">${c.subscription_status === 'active' ? 'Ativo' : 'Pendente'}</p>
            </div>
            <p style="color:#64748b;font-size:14px;">Para gerenciar sua assinatura, acesse o sistema:</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${plansUrl}" style="background:#4f46e5;color:#fff;padding:12px 32px;border-radius:12px;text-decoration:none;font-weight:bold;display:inline-block;">Gerenciar Assinatura</a>
            </div>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
            <p style="color:#94a3b8;font-size:12px;">EstateFlow Suite &mdash; Gestão Imobiliária</p>
          </div>
        </div>
      `;

      // Reuse the same email API that works for contract emails
      const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host || 'estate-flow-amber.vercel.app'}`;
      const sendRes = await fetch(`${baseUrl}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || '',
        },
        body: JSON.stringify({ to, subject, text, html, company_id }),
      });
      const sendData = await sendRes.json();

      if (sendData.success) {
        console.log(`[BILLING EMAIL] Sent to ${to}, messageId: ${sendData.messageId}`);
        return res.status(200).json({ success: true, message: `Email de cobrança enviado para ${to}` });
      } else {
        console.error('[BILLING EMAIL] API send failed:', sendData.error);
        return res.status(500).json({ success: false, error: `Falha ao enviar: ${sendData.error || 'erro desconhecido'}` });
      }
    } catch (error) {
      console.error('Send billing email error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /api/master/update-company
  if (path === '/api/master/update-company' && req.method === 'POST') {
    const user = verifyRequest(req);
    if (!user) return res.status(401).json({ error: 'Nao autorizado' });
    if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });
    const sql = neon(dbUrl);

    const { company_id, name, slug, subdomain, visible, subscription_status } = req.body;
    if (!company_id) return res.status(400).json({ error: 'company_id required' });

    try {
      const company = await sql`SELECT id FROM companies WHERE id = ${company_id} LIMIT 1`;
      if (company.length === 0) return res.status(404).json({ error: 'Company not found' });

      if (slug) {
        const existing = await sql`SELECT id FROM companies WHERE slug = ${slug} AND id != ${company_id} LIMIT 1`;
        if (existing.length > 0) return res.status(400).json({ error: 'Slug ja esta em uso' });
      }

      await sql`
        UPDATE companies SET
          name = COALESCE(${name || null}, name),
          slug = COALESCE(${slug || null}, slug),
          subdomain = COALESCE(${subdomain || null}, subdomain),
          visible = COALESCE(${visible !== undefined ? visible : null}, visible),
          subscription_status = COALESCE(${subscription_status || null}, subscription_status),
          updated_at = NOW()
        WHERE id = ${company_id}
      `;

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Update company error:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
