import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as nodemailer from 'nodemailer';
import { assertTenantAccess, fail, getSql, handleApiError, ok, requireAuth } from './_lib/http.js';

async function ensureDocumentSchema(sql: ReturnType<typeof getSql>) {
  await sql`
    CREATE TABLE IF NOT EXISTS property_process_documents (
      id TEXT PRIMARY KEY,
      process_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      property_id TEXT NOT NULL,
      document_type TEXT NOT NULL,
      title TEXT NOT NULL,
      file_name TEXT,
      file_data TEXT,
      mime_type TEXT DEFAULT 'application/pdf',
      sent_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
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
}

function getOptionalUser(req: VercelRequest) {
  try {
    return requireAuth(req);
  } catch {
    return null;
  }
}

function base64Payload(dataUrl: string) {
  return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');
    const path = new URL(req.url || '', 'http://localhost').pathname;
    const sql = getSql();
    await ensureDocumentSchema(sql);

    const user = getOptionalUser(req);
    const companyId = String(req.body?.company_id || user?.company_id || '');
    if (!companyId) return fail(res, 400, 'company_id obrigatorio');
    if (user) assertTenantAccess(user, companyId);

    if (path === '/api/property-documents/generate') {
      const { process_id, property_id, document_type, title, file_name, file_data, mime_type } = req.body || {};
      if (!process_id || !property_id || !document_type || !title || !file_data) {
        return fail(res, 400, 'process_id, property_id, document_type, title e file_data sao obrigatorios');
      }
      const process = await sql`
        SELECT id FROM property_processes
        WHERE id = ${String(process_id)} AND property_id = ${String(property_id)} AND company_id = ${companyId}
        LIMIT 1
      `;
      if (process.length === 0) return fail(res, 404, 'Jornada nao encontrada neste tenant');

      const documentId = `pdoc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await sql`
        INSERT INTO property_process_documents (id, process_id, company_id, property_id, document_type, title, file_name, file_data, mime_type)
        VALUES (${documentId}, ${String(process_id)}, ${companyId}, ${String(property_id)}, ${String(document_type)}, ${String(title)}, ${file_name || `${documentId}.pdf`}, ${String(file_data)}, ${mime_type || 'application/pdf'})
      `;
      return ok(res, { data: { id: documentId } }, 201);
    }

    if (path === '/api/property-documents/send-email') {
      const { document_id, to_email, subject, message } = req.body || {};
      if (!document_id || !to_email) return fail(res, 400, 'document_id e to_email sao obrigatorios');
      const docs = await sql`
        SELECT pd.*, p.title as property_title, cs.smtp_host, cs.smtp_port, cs.smtp_user, cs.smtp_password, cs.smtp_secure,
               cs.email_sender_name, cs.email_sender_address, cs.company_name
        FROM property_process_documents pd
        JOIN property_processes pp ON pp.id = pd.process_id AND pp.company_id = pd.company_id
        JOIN properties p ON p.id::text = pd.property_id AND p.company_id = pd.company_id
        LEFT JOIN company_settings cs ON cs.company_id = pd.company_id
        WHERE pd.id = ${String(document_id)} AND pd.company_id = ${companyId}
        LIMIT 1
      `;
      if (docs.length === 0) return fail(res, 404, 'Documento nao encontrado neste tenant');
      const doc = docs[0];
      const smtpReady = Boolean(doc.smtp_host && doc.smtp_user && doc.smtp_password);
      const logId = `elog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const mailSubject = subject || `${doc.title} - ${doc.property_title || 'Imóvel'}`;
      if (!smtpReady) {
        await sql`
          INSERT INTO email_logs (id, company_id, user_id, to_email, subject, status, provider, error, entity_type, entity_id)
          VALUES (${logId}, ${companyId}, ${user?.id || null}, ${String(to_email)}, ${mailSubject}, 'pending_configuration', NULL, 'SMTP da imobiliaria nao configurado', 'property_document', ${String(document_id)})
        `;
        return fail(res, 409, 'Configure o SMTP da imobiliaria antes de enviar documentos por email', { log_id: logId });
      }

      const senderEmail = String(doc.email_sender_address || doc.smtp_user);
      const senderName = String(doc.email_sender_name || doc.company_name || 'EstateFlow');
      const transporter = nodemailer.createTransport({
        host: doc.smtp_host,
        port: Number(doc.smtp_port || 587),
        secure: doc.smtp_secure === true,
        auth: { user: doc.smtp_user, pass: doc.smtp_password },
      });
      const info = await transporter.sendMail({
        from: `"${senderName.replace(/"/g, '')}" <${senderEmail}>`,
        to: String(to_email),
        subject: mailSubject,
        text: message || `Segue em anexo o documento ${doc.title}.`,
        html: `<p>${message || `Segue em anexo o documento <strong>${doc.title}</strong>.`}</p>`,
        attachments: [{
          filename: doc.file_name || `${doc.title}.pdf`,
          content: Buffer.from(base64Payload(String(doc.file_data || '')), 'base64'),
          contentType: doc.mime_type || 'application/pdf',
        }],
      });
      await sql`UPDATE property_process_documents SET sent_at = NOW() WHERE id = ${String(document_id)} AND company_id = ${companyId}`;
      await sql`
        INSERT INTO email_logs (id, company_id, user_id, to_email, subject, status, provider, message_id, entity_type, entity_id)
        VALUES (${logId}, ${companyId}, ${user?.id || null}, ${String(to_email)}, ${mailSubject}, 'sent', 'smtp', ${info.messageId || null}, 'property_document', ${String(document_id)})
      `;
      return ok(res, { data: { log_id: logId, status: 'sent' } });
    }

    return fail(res, 404, 'Not found');
  } catch (error) {
    return handleApiError(res, error);
  }
}
