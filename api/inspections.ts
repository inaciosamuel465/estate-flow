import type { VercelRequest, VercelResponse } from '@vercel/node';
import { assertTenantAccess, fail, getSql, handleApiError, ok, requireAuth } from '../server/api-lib/http.js';

async function ensureInspectionSchema(sql: ReturnType<typeof getSql>) {
  await sql`
    CREATE TABLE IF NOT EXISTS property_inspections (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      property_id TEXT NOT NULL,
      contract_id TEXT,
      process_id TEXT,
      type TEXT DEFAULT 'initial',
      status TEXT DEFAULT 'draft',
      paint_status TEXT,
      floor_status TEXT,
      door_status TEXT,
      window_status TEXT,
      electrical_status TEXT,
      hydraulic_status TEXT,
      lighting_status TEXT,
      wall_status TEXT,
      furniture_status TEXT,
      cleaning_status TEXT,
      property_issues TEXT,
      room_living TEXT,
      room_kitchen TEXT,
      room_bathroom TEXT,
      room_bedroom TEXT,
      room_external TEXT,
      room_garage TEXT,
      items JSONB DEFAULT '[]',
      notes TEXT,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS inspection_images (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      inspection_id TEXT NOT NULL,
      property_id TEXT NOT NULL,
      contract_id TEXT,
      room TEXT,
      category TEXT,
      image_url TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS process_id TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS paint_status TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS floor_status TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS door_status TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS window_status TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS electrical_status TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS hydraulic_status TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS lighting_status TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS wall_status TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS furniture_status TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS cleaning_status TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS property_issues TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS room_living TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS room_kitchen TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS room_bathroom TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS room_bedroom TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS room_external TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS room_garage TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS notes TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS created_by TEXT`;
  await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;
  await sql`ALTER TABLE inspection_images ADD COLUMN IF NOT EXISTS process_id TEXT`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const path = new URL(req.url || '', 'http://localhost').pathname;
    const action = String(req.query.action || '');
    const sql = getSql();
    await ensureInspectionSchema(sql);

    if (path === '/api/inspections' && req.method === 'GET') {
      const user = requireAuth(req);
      const companyId = String(req.query.company_id || user.company_id || '');
      if (!companyId) return fail(res, 400, 'company_id obrigatorio');
      assertTenantAccess(user, companyId);

      const propertyId = String(req.query.property_id || '');
      const contractId = String(req.query.contract_id || '');
      const processId = String(req.query.process_id || '');
      const rows = await sql.query(
        `
          SELECT pi.*,
                 COALESCE(json_agg(ii.*) FILTER (WHERE ii.id IS NOT NULL), '[]') as images
          FROM property_inspections pi
          LEFT JOIN inspection_images ii ON ii.inspection_id = pi.id AND ii.company_id = pi.company_id
          WHERE pi.company_id = $1
            AND ($2 = '' OR pi.property_id = $2)
            AND ($3 = '' OR pi.contract_id = $3)
            AND ($4 = '' OR pi.process_id = $4)
          GROUP BY pi.id
          ORDER BY pi.created_at DESC
        `,
        [companyId, propertyId, contractId, processId],
      );
      return ok(res, { data: rows });
    }

    if (path === '/api/inspections' && req.method === 'POST') {
      const user = requireAuth(req);
      const companyId = String(req.body?.company_id || user.company_id || '');
      if (!companyId) return fail(res, 400, 'company_id obrigatorio');
      assertTenantAccess(user, companyId);

      const {
        id,
        property_id,
        contract_id,
        process_id,
        type,
        status,
        paint_status,
        floor_status,
        door_status,
        window_status,
        electrical_status,
        hydraulic_status,
        lighting_status,
        wall_status,
        furniture_status,
        cleaning_status,
        property_issues,
        room_living,
        room_kitchen,
        room_bathroom,
        room_bedroom,
        room_external,
        room_garage,
        items,
        notes,
      } = req.body || {};
      if (!property_id) return fail(res, 400, 'property_id obrigatorio');

      const property = await sql`SELECT id FROM properties WHERE id::text = ${String(property_id)} AND company_id = ${companyId} LIMIT 1`;
      if (property.length === 0) return fail(res, 404, 'Imovel nao encontrado neste tenant');
      if (contract_id) {
        const contract = await sql`SELECT id FROM contracts WHERE id = ${String(contract_id)} AND company_id = ${companyId} LIMIT 1`;
        if (contract.length === 0) return fail(res, 404, 'Contrato nao encontrado neste tenant');
      }
      if (process_id) {
        const process = await sql`SELECT id FROM property_processes WHERE id = ${String(process_id)} AND company_id = ${companyId} LIMIT 1`;
        if (process.length === 0) return fail(res, 404, 'Jornada nao encontrada neste tenant');
      }

      const inspectionId = String(id || `insp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
      await sql`
        INSERT INTO property_inspections (
          id, company_id, property_id, contract_id, process_id, type, status, paint_status, floor_status,
          door_status, window_status, electrical_status, hydraulic_status, lighting_status,
          wall_status, furniture_status, cleaning_status, property_issues, room_living,
          room_kitchen, room_bathroom, room_bedroom, room_external, room_garage, items, notes, created_by, updated_at
        )
        VALUES (
          ${inspectionId}, ${companyId}, ${String(property_id)}, ${contract_id ? String(contract_id) : null}, ${process_id ? String(process_id) : null},
          ${type || 'initial'}, ${status || 'draft'}, ${paint_status || null}, ${floor_status || null},
          ${door_status || null}, ${window_status || null}, ${electrical_status || null}, ${hydraulic_status || null},
          ${lighting_status || null}, ${wall_status || null}, ${furniture_status || null}, ${cleaning_status || null},
          ${property_issues || null}, ${room_living || null}, ${room_kitchen || null}, ${room_bathroom || null},
          ${room_bedroom || null}, ${room_external || null}, ${room_garage || null}, ${JSON.stringify(items || [])}::jsonb,
          ${notes || null}, ${user.id}, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          type = EXCLUDED.type,
          status = EXCLUDED.status,
          paint_status = EXCLUDED.paint_status,
          floor_status = EXCLUDED.floor_status,
          door_status = EXCLUDED.door_status,
          window_status = EXCLUDED.window_status,
          electrical_status = EXCLUDED.electrical_status,
          hydraulic_status = EXCLUDED.hydraulic_status,
          lighting_status = EXCLUDED.lighting_status,
          wall_status = EXCLUDED.wall_status,
          furniture_status = EXCLUDED.furniture_status,
          cleaning_status = EXCLUDED.cleaning_status,
          property_issues = EXCLUDED.property_issues,
          room_living = EXCLUDED.room_living,
          room_kitchen = EXCLUDED.room_kitchen,
          room_bathroom = EXCLUDED.room_bathroom,
          room_bedroom = EXCLUDED.room_bedroom,
          room_external = EXCLUDED.room_external,
          room_garage = EXCLUDED.room_garage,
          items = EXCLUDED.items,
          notes = EXCLUDED.notes,
          updated_at = NOW()
      `;
      return ok(res, { data: { id: inspectionId } });
    }

    if ((path === '/api/inspections/images' || action === 'images') && req.method === 'POST') {
      const user = requireAuth(req);
      const companyId = String(req.body?.company_id || user.company_id || '');
      if (!companyId) return fail(res, 400, 'company_id obrigatorio');
      assertTenantAccess(user, companyId);

      const { inspection_id, property_id, contract_id, room, category, image_url, notes } = req.body || {};
      const processId = req.body?.process_id ? String(req.body.process_id) : null;
      if (!inspection_id || !property_id || !image_url) return fail(res, 400, 'inspection_id, property_id e image_url sao obrigatorios');
      const inspection = await sql`
        SELECT id FROM property_inspections
        WHERE id = ${String(inspection_id)} AND property_id = ${String(property_id)} AND company_id = ${companyId}
        LIMIT 1
      `;
      if (inspection.length === 0) return fail(res, 404, 'Vistoria nao encontrada neste tenant');

      const imageId = `iimg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await sql`
        INSERT INTO inspection_images (id, company_id, inspection_id, property_id, contract_id, process_id, room, category, image_url, notes)
        VALUES (${imageId}, ${companyId}, ${String(inspection_id)}, ${String(property_id)}, ${contract_id ? String(contract_id) : null}, ${processId}, ${room || null}, ${category || null}, ${String(image_url)}, ${notes || null})
      `;
      return ok(res, { data: { id: imageId } });
    }

    return fail(res, 404, 'Not found');
  } catch (error) {
    return handleApiError(res, error);
  }
}
