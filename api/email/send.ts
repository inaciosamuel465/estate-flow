import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { neon } from '@neondatabase/serverless';
import { verifyRequest } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = verifyRequest(req);
  if (!user) return res.status(401).json({ error: 'Nao autorizado' });

  const { to, subject, text, html, company_id, from: customFrom } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  // SMTP config: try company settings first, fallback to ENV
  let smtpConfig: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    senderName: string;
    senderEmail: string;
  } | null = null;

  if (company_id) {
    try {
      const dbUrl = process.env.VITE_DATABASE_URL;
      if (dbUrl) {
        const sql = neon(dbUrl);
        const settings = await sql`
          SELECT * FROM company_settings WHERE company_id = ${company_id} LIMIT 1
        `;
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
      }
    } catch (e) {
      console.warn('Failed to load company SMTP, using fallback:', e);
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

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    tls: { rejectUnauthorized: false }
  });

  try {
    const mailFrom = customFrom
      ? `"${config.senderName}" <${customFrom}>`
      : `"${config.senderName}" <${config.senderEmail}>`;

    const info = await transporter.sendMail({
      from: mailFrom,
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

    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
}
