import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import nodemailer from 'nodemailer';
import { verifyRequest } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = verifyRequest(req);
  if (!user) return res.status(401).json({ error: 'Nao autorizado' });

  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });
  const sql = neon(dbUrl);

  const { company_id } = req.body;
  if (!company_id) return res.status(400).json({ error: 'company_id required' });

  try {
    const [company, settings, adminRow] = await Promise.all([
      sql`SELECT id, name, email, subscription_status, plan FROM companies WHERE id = ${company_id} LIMIT 1`,
      sql`SELECT * FROM saas_settings WHERE id = 'global' LIMIT 1`,
      sql`SELECT name, email FROM users WHERE company_id = ${company_id} AND role = 'admin' LIMIT 1`,
    ]);

    if (company.length === 0) return res.status(404).json({ error: 'Company not found' });

    const c = company[0];
    const s = settings[0] || { plan_name: 'Mensal', plan_price: 170, billing_email_from: '' };
    const admin = adminRow[0] || null;
    const planPrice = Number(s.plan_price) || 170;
    const appUrl = process.env.VITE_APP_URL || 'https://estate-flow-amber.vercel.app';

    const to = admin?.email || c.email;
    const subject = `Cobrança EstateFlow - ${s.plan_name || 'Mensal'}`;
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
            <a href="${appUrl}/plans" style="background:#4f46e5;color:#fff;padding:12px 32px;border-radius:12px;text-decoration:none;font-weight:bold;display:inline-block;">Gerenciar Assinatura</a>
          </div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
          <p style="color:#94a3b8;font-size:12px;">EstateFlow Suite — Gestão Imobiliária</p>
        </div>
      </div>
    `;

    // Try to send email via SMTP if configured
    const smtpHost = process.env.SMTP_HOST;
    if (smtpHost) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' },
        tls: { rejectUnauthorized: false },
      });
      const info = await transporter.sendMail({
        from: `"EstateFlow" <${process.env.SMTP_USER || 'noreply@estateflow.com'}>`,
        to,
        subject,
        html,
      });
      console.log(`[BILLING EMAIL] Sent to ${to}, messageId: ${info.messageId}`);
      res.status(200).json({ success: true, message: `Email de cobrança enviado para ${to}` });
    } else {
      // Fallback: log and return success (dev mode)
      console.log(`[BILLING EMAIL] To: ${to}, Subject: ${subject}, Company: ${c.name}, Plan: R$ ${planPrice.toFixed(2)}`);
      res.status(200).json({ success: true, message: `Email de cobrança registrado para ${to} (SMTP não configurado)` });
    }
  } catch (error) {
    console.error('Send billing email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
