import nodemailer from 'nodemailer';

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  senderName: string;
  senderEmail: string;
  source: 'company' | 'env';
};

type CompanySmtpRow = {
  smtp_host?: string | null;
  smtp_port?: number | string | null;
  smtp_user?: string | null;
  smtp_password?: string | null;
  smtp_secure?: boolean | null;
  email_sender_name?: string | null;
  email_sender_address?: string | null;
  company_name?: string | null;
  settings_company_name?: string | null;
};

function clean(value: unknown) {
  return String(value || '').trim();
}

function envSmtpConfig(senderName = 'EstateFlow Suite'): SmtpConfig | null {
  const host = clean(process.env.SMTP_HOST);
  const user = clean(process.env.SMTP_USER);
  const pass = clean(process.env.SMTP_PASS);
  if (!host || !user || !pass) return null;

  return {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user,
    pass,
    senderName,
    senderEmail: clean(process.env.SMTP_FROM || process.env.SMTP_USER),
    source: 'env',
  };
}

export function resolveSmtpConfig(row?: CompanySmtpRow | null, fallbackSenderName = 'EstateFlow Suite'): SmtpConfig | null {
  const host = clean(row?.smtp_host);
  const user = clean(row?.smtp_user);
  const pass = clean(row?.smtp_password);

  if (host && user && pass) {
    const senderName = clean(row?.email_sender_name || row?.settings_company_name || row?.company_name) || fallbackSenderName;
    return {
      host,
      port: Number(row?.smtp_port || 587),
      secure: row?.smtp_secure === true,
      user,
      pass,
      senderName,
      senderEmail: clean(row?.email_sender_address || row?.smtp_user),
      source: 'company',
    };
  }

  return envSmtpConfig(fallbackSenderName);
}

export function createSmtpTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    tls: { rejectUnauthorized: false },
  });
}

export function publicSmtpError() {
  return 'SMTP nao configurado. Configure o SMTP da imobiliaria ou as variaveis SMTP globais.';
}

