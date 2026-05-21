import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assertTenantAccess, fail, getSql, handleApiError, ok, requireAuth } from '../server/api-lib/http.js';

async function ensureProcessSchema(sql: ReturnType<typeof getSql>) {
  await sql`
    CREATE TABLE IF NOT EXISTS property_processes (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      property_id TEXT NOT NULL,
      flow_type TEXT NOT NULL,
      status TEXT DEFAULT 'in_progress',
      current_step_id TEXT,
      client_id TEXT,
      contract_id TEXT,
      notes TEXT,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS property_process_steps (
      id TEXT PRIMARY KEY,
      process_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      step_key TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      kind TEXT,
      status TEXT DEFAULT 'pending',
      step_order INTEGER DEFAULT 0,
      completed_at TIMESTAMP,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS property_process_events (
      id TEXT PRIMARY KEY,
      process_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      user_id TEXT,
      payload JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
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
    CREATE TABLE IF NOT EXISTS property_inspections (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      property_id TEXT NOT NULL,
      contract_id TEXT,
      process_id TEXT,
      type TEXT DEFAULT 'initial',
      status TEXT DEFAULT 'draft',
      items JSONB DEFAULT '[]',
      notes TEXT,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS process_id TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'`;
}

function getOptionalUser(req: VercelRequest) {
  try {
    return requireAuth(req);
  } catch {
    return null;
  }
}

function normalizeStep(input: any, index: number) {
  return {
    step_key: String(input.id || input.step_key || `step_${index + 1}`),
    title: String(input.title || `Etapa ${index + 1}`),
    description: input.description ? String(input.description) : null,
    kind: input.kind ? String(input.kind) : null,
    status: String(input.status || (index === 0 ? 'active' : 'pending')),
    step_order: Number(input.order || input.step_order || index + 1),
    completed_at: input.completedAt || input.completed_at || null,
  };
}

function mapStep(row: any) {
  return {
    id: row.step_key,
    title: row.title,
    description: row.description || undefined,
    kind: row.kind || undefined,
    status: row.status || 'pending',
    order: Number(row.step_order || 0),
    completedAt: row.completed_at || undefined,
  };
}

async function loadProcesses(sql: ReturnType<typeof getSql>, companyId: string, processId = '') {
  const rows = await sql.query(
    `
      SELECT pp.*,
             p.title as property_title,
             p.image as property_image,
             u.name as client_name,
             COALESCE((
               SELECT json_agg(ps.* ORDER BY ps.step_order)
               FROM property_process_steps ps
               WHERE ps.process_id = pp.id AND ps.company_id = pp.company_id
             ), '[]') as steps,
             COALESCE((
               SELECT json_agg(pe.* ORDER BY pe.created_at DESC)
               FROM property_process_events pe
               WHERE pe.process_id = pp.id AND pe.company_id = pp.company_id
             ), '[]') as events,
             COALESCE((
               SELECT json_agg(pd.* ORDER BY pd.created_at DESC)
               FROM property_process_documents pd
               WHERE pd.process_id = pp.id AND pd.company_id = pp.company_id
             ), '[]') as documents,
             COALESCE((
               SELECT json_agg(pi.* ORDER BY pi.updated_at DESC)
               FROM property_inspections pi
               WHERE pi.process_id = pp.id AND pi.company_id = pp.company_id
             ), '[]') as inspections
      FROM property_processes pp
      JOIN properties p ON p.id::text = pp.property_id AND p.company_id = pp.company_id
      LEFT JOIN users u ON u.id = pp.client_id AND u.company_id = pp.company_id
      WHERE pp.company_id = $1 AND ($2 = '' OR pp.id = $2)
      ORDER BY pp.updated_at DESC
    `,
    [companyId, processId],
  );

  return rows.map((row: any) => ({
    id: row.id,
    companyId: row.company_id,
    propertyId: row.property_id,
    propertyTitle: row.property_title || 'Imóvel',
    propertyImage: row.property_image || '',
    flowType: row.flow_type,
    status: row.status || 'in_progress',
    currentStepId: row.current_step_id || undefined,
    clientId: row.client_id || undefined,
    clientName: row.client_name || undefined,
    contractId: row.contract_id || undefined,
    notes: row.notes || '',
    steps: (row.steps || []).map(mapStep),
    events: (row.events || []).map((event: any) => ({
      id: event.id,
      processId: event.process_id,
      eventType: event.event_type,
      title: event.title,
      description: event.description || undefined,
      userId: event.user_id || undefined,
      createdAt: event.created_at,
    })),
    documents: (row.documents || []).map((doc: any) => ({
      id: doc.id,
      processId: doc.process_id,
      propertyId: doc.property_id,
      documentType: doc.document_type,
      title: doc.title,
      fileName: doc.file_name,
      fileData: doc.file_data,
      mimeType: doc.mime_type,
      sentAt: doc.sent_at || undefined,
      createdAt: doc.created_at,
    })),
    inspections: (row.inspections || []).map((inspection: any) => ({
      id: inspection.id,
      processId: inspection.process_id || undefined,
      propertyId: inspection.property_id,
      contractId: inspection.contract_id || undefined,
      type: inspection.type || 'initial',
      status: inspection.status || 'draft',
      rooms: inspection.items || [],
      notes: inspection.notes || undefined,
      createdAt: inspection.created_at,
      updatedAt: inspection.updated_at,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const path = new URL(req.url || '', 'http://localhost').pathname;
    const parts = path.split('/').filter(Boolean);
    const processIdFromPath = String(req.query.id || (parts[1] === 'property-processes' ? parts[2] || '' : ''));
    const isEventsPath = req.query.events === '1' || (parts[1] === 'property-processes' && parts[3] === 'events');
    const sql = getSql();
    await ensureProcessSchema(sql);

    const user = getOptionalUser(req);
    const companyId = String(req.body?.company_id || req.query.company_id || user?.company_id || '');
    if (!companyId) return fail(res, 400, 'company_id obrigatorio');
    if (user) assertTenantAccess(user, companyId);

    if (req.method === 'GET') {
      const processes = await loadProcesses(sql, companyId, processIdFromPath);
      if (processIdFromPath) {
        if (processes.length === 0) return fail(res, 404, 'Jornada nao encontrada neste tenant');
        return ok(res, { data: processes[0] });
      }
      return ok(res, { data: processes });
    }

    if (!processIdFromPath && req.method === 'POST') {
      const { property_id, flow_type, status, current_step_id, client_id, contract_id, notes, steps } = req.body || {};
      if (!property_id || !flow_type) return fail(res, 400, 'property_id e flow_type sao obrigatorios');
      const property = await sql`SELECT id FROM properties WHERE id::text = ${String(property_id)} AND company_id = ${companyId} LIMIT 1`;
      if (property.length === 0) return fail(res, 404, 'Imovel nao encontrado neste tenant');

      const processId = `proc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const normalizedSteps = Array.isArray(steps) ? steps.map(normalizeStep) : [normalizeStep({ id: 'start', title: 'Início', status: 'active' }, 0)];
      const currentStep = current_step_id || normalizedSteps.find((step: any) => step.status === 'active')?.step_key || normalizedSteps[0]?.step_key;

      await sql`
        INSERT INTO property_processes (id, company_id, property_id, flow_type, status, current_step_id, client_id, contract_id, notes, created_by, updated_at)
        VALUES (${processId}, ${companyId}, ${String(property_id)}, ${String(flow_type)}, ${status || 'in_progress'}, ${currentStep}, ${client_id || null}, ${contract_id || null}, ${notes || null}, ${user?.id || null}, NOW())
      `;
      for (const step of normalizedSteps) {
        await sql`
          INSERT INTO property_process_steps (id, process_id, company_id, step_key, title, description, kind, status, step_order, completed_at)
          VALUES (${`${processId}_${step.step_key}`}, ${processId}, ${companyId}, ${step.step_key}, ${step.title}, ${step.description}, ${step.kind}, ${step.status}, ${step.step_order}, ${step.completed_at})
        `;
      }
      await sql`
        INSERT INTO property_process_events (id, process_id, company_id, event_type, title, description, user_id)
        VALUES (${`pevt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`}, ${processId}, ${companyId}, 'created', 'Jornada iniciada', ${notes || null}, ${user?.id || null})
      `;
      const loaded = await loadProcesses(sql, companyId, processId);
      return ok(res, { data: loaded[0] }, 201);
    }

    if (processIdFromPath && req.method === 'PATCH') {
      const existing = await sql`SELECT id FROM property_processes WHERE id = ${processIdFromPath} AND company_id = ${companyId} LIMIT 1`;
      if (existing.length === 0) return fail(res, 404, 'Jornada nao encontrada neste tenant');
      const { status, current_step_id, client_id, contract_id, notes, steps } = req.body || {};
      await sql`
        UPDATE property_processes
        SET status = COALESCE(${status || null}, status),
            current_step_id = COALESCE(${current_step_id || null}, current_step_id),
            client_id = COALESCE(${client_id || null}, client_id),
            contract_id = COALESCE(${contract_id || null}, contract_id),
            notes = COALESCE(${notes ?? null}, notes),
            updated_at = NOW()
        WHERE id = ${processIdFromPath} AND company_id = ${companyId}
      `;
      if (Array.isArray(steps)) {
        await sql`DELETE FROM property_process_steps WHERE process_id = ${processIdFromPath} AND company_id = ${companyId}`;
        for (const step of steps.map(normalizeStep)) {
          await sql`
            INSERT INTO property_process_steps (id, process_id, company_id, step_key, title, description, kind, status, step_order, completed_at)
            VALUES (${`${processIdFromPath}_${step.step_key}`}, ${processIdFromPath}, ${companyId}, ${step.step_key}, ${step.title}, ${step.description}, ${step.kind}, ${step.status}, ${step.step_order}, ${step.completed_at})
          `;
        }
      }
      const loaded = await loadProcesses(sql, companyId, processIdFromPath);
      return ok(res, { data: loaded[0] });
    }

    if (processIdFromPath && isEventsPath && req.method === 'POST') {
      const { event_type, title, description, payload } = req.body || {};
      if (!event_type || !title) return fail(res, 400, 'event_type e title sao obrigatorios');
      const existing = await sql`SELECT id FROM property_processes WHERE id = ${processIdFromPath} AND company_id = ${companyId} LIMIT 1`;
      if (existing.length === 0) return fail(res, 404, 'Jornada nao encontrada neste tenant');
      const eventId = `pevt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await sql`
        INSERT INTO property_process_events (id, process_id, company_id, event_type, title, description, user_id, payload)
        VALUES (${eventId}, ${processIdFromPath}, ${companyId}, ${String(event_type)}, ${String(title)}, ${description || null}, ${user?.id || null}, ${JSON.stringify(payload || {})}::jsonb)
      `;
      return ok(res, { data: { id: eventId } });
    }

    return fail(res, 404, 'Not found');
  } catch (error) {
    return handleApiError(res, error);
  }
}
