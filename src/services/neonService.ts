import { neon, neonConfig } from '@neondatabase/serverless';
import { Property, Contract, User, AppNotification, PropertyInspection, PropertyProcess, PropertyProcessDocument, PropertyProcessStep } from '../types';

neonConfig.disableWarningInBrowsers = true;
const sql = neon(import.meta.env.VITE_DATABASE_URL || '');

function getCompanyId(): string | null {
    try {
        return localStorage.getItem('estateflow_company_id');
    } catch {
        return null;
    }
}

function requireCompanyId(operation = 'operaÃ§Ã£o'): string {
    const companyId = getCompanyId();
    if (!companyId) {
        throw new Error(`Tenant/company_id ausente para ${operation}.`);
    }
    return companyId;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getProperties(): Promise<Property[]> {
    const companyId = getCompanyId();
    if (!companyId) return [];
    const result = await sql`SELECT * FROM properties WHERE company_id = ${companyId} ORDER BY created_at DESC`;
    return result.map(row => ({
        ...row,
        addressDetails: row.address_details,
        ownerId: row.owner_id,
        createdAt: row.created_at,
        lat: row.lat ? Number(row.lat) : undefined,
        lng: row.lng ? Number(row.lng) : undefined,
        stats: {
            views: row.views_count || 0,
            leads: row.leads_count || 0,
            likes: row.stats?.likes || 0,
        }
    })) as unknown as Property[];
}

export async function addProperty(property: Property): Promise<string> {
    const id = property.id ? String(property.id) : Math.random().toString(36).substr(2, 9);
    const companyId = requireCompanyId('criar imÃ³vel');
    await sql`
        INSERT INTO properties (
            id, title, location, area, price, type, purpose, owner_id, status, 
            images, image, address_details, amenities, beds, baths, stats, description, tag,
            lat, lng, company_id
        ) VALUES (
            ${id}, ${property.title}, ${property.location}, ${property.area}, ${property.price}, 
            ${property.type}, ${property.purpose}, ${property.ownerId?.toString()}, ${property.status || 'active'}, 
            ${property.images || []},
            ${property.image || (property.images?.[0] || null)},
            ${property.addressDetails || {}}, 
            ${property.amenities || []}, 
            ${property.beds}, ${property.baths},
            ${property.stats || { views: 0, leads: 0, likes: 0 }},
            ${property.description || null},
            ${property.tag || null},
            ${property.lat || null},
            ${property.lng || null},
            ${companyId}
        )
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            location = EXCLUDED.location,
            price = EXCLUDED.price,
            status = EXCLUDED.status,
            images = EXCLUDED.images,
            image = EXCLUDED.image,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng
    `;
    return id;
}

export async function updateProperty(id: string, updates: Partial<Property>): Promise<void> {
    try {
        const companyId = requireCompanyId('atualizar imÃ³vel');
        const sets: string[] = [];
        const params: any[] = [];
        let paramIdx = 1;
        const addParam = (val: any) => {
            params.push(val);
            return `$${paramIdx++}`;
        };

        if (updates.title !== undefined) sets.push(`title = ${addParam(updates.title)}`);
        if (updates.status !== undefined) sets.push(`status = ${addParam(updates.status)}`);
        if (updates.price !== undefined) sets.push(`price = ${addParam(updates.price)}`);
        if (updates.description !== undefined) sets.push(`description = ${addParam(updates.description)}`);
        if (updates.tag !== undefined) sets.push(`tag = ${addParam(updates.tag)}`);
        if (updates.location !== undefined) sets.push(`location = ${addParam(updates.location)}`);
        if (updates.area !== undefined) sets.push(`area = ${addParam(updates.area)}`);
        if (updates.beds !== undefined) sets.push(`beds = ${addParam(updates.beds)}`);
        if (updates.baths !== undefined) sets.push(`baths = ${addParam(updates.baths)}`);
        if (updates.amenities !== undefined) sets.push(`amenities = ${addParam(updates.amenities)}`);
        if (updates.images !== undefined) {
            sets.push(`images = ${addParam(updates.images)}`);
            if (updates.image === undefined) {
                sets.push(`image = ${addParam(updates.images[0] || null)}`);
            }
        }
        if (updates.image !== undefined) sets.push(`image = ${addParam(updates.image)}`);
        if (updates.addressDetails !== undefined) sets.push(`address_details = ${addParam(updates.addressDetails)}`);
        if (updates.ownerId !== undefined) sets.push(`owner_id = ${addParam(updates.ownerId.toString())}`);
        if (updates.lat !== undefined) sets.push(`lat = ${addParam(updates.lat)}`);
        if (updates.lng !== undefined) sets.push(`lng = ${addParam(updates.lng)}`);
        if (sets.length === 0) return;

        params.push(id, companyId);
        await sql.query(`UPDATE properties SET ${sets.join(', ')} WHERE id = $${paramIdx} AND company_id = $${paramIdx + 1}`, params);
    } catch (error) {
        console.error('Error in updateProperty:', error);
        throw error;
    }
}

export async function deleteProperty(id: string): Promise<void> {
    const companyId = requireCompanyId('excluir imÃ³vel');
    await sql`DELETE FROM property_views WHERE property_id = ${id} AND company_id = ${companyId}`;
    await sql`DELETE FROM leads WHERE property_id = ${id} AND company_id = ${companyId}`;
    await sql`DELETE FROM properties WHERE id = ${id} AND company_id = ${companyId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY VIEWS — Rastreamento real de visualizações
// ─────────────────────────────────────────────────────────────────────────────

export async function trackPropertyView(propertyId: string, userId?: string, source = 'web'): Promise<void> {
    const companyId = requireCompanyId('registrar visualizaÃ§Ã£o');
    await sql`
        INSERT INTO property_views (property_id, user_id, source, company_id)
        VALUES (${propertyId}, ${userId || null}, ${source}, ${companyId})
    `;
    const cid = getCompanyId();
    await sql`UPDATE properties SET views_count = views_count + 1 WHERE id = ${propertyId}${cid ? sql` AND company_id = ${cid}` : sql``}`;
}

export async function getPropertyViewsCount(propertyId: string): Promise<number> {
    const companyId = requireCompanyId('contar visualizaÃ§Ãµes');
    const result = await sql`SELECT COUNT(*) as count FROM property_views WHERE property_id = ${propertyId} AND company_id = ${companyId}`;
    return Number(result[0]?.count || 0);
}

export async function getPropertyAnalytics(propertyId: string): Promise<{
    totalViews: number;
    viewsThisWeek: number;
    viewsToday: number;
    totalLeads: number;
}> {
    const companyId = requireCompanyId('consultar analytics do imÃ³vel');
    const [total, weekly, today, leads] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM property_views WHERE property_id = ${propertyId} AND company_id = ${companyId}`,
        sql`SELECT COUNT(*) as count FROM property_views WHERE property_id = ${propertyId} AND company_id = ${companyId} AND viewed_at >= NOW() - INTERVAL '7 days'`,
        sql`SELECT COUNT(*) as count FROM property_views WHERE property_id = ${propertyId} AND company_id = ${companyId} AND viewed_at >= NOW() - INTERVAL '1 day'`,
        sql`SELECT COUNT(*) as count FROM leads WHERE property_id = ${propertyId} AND company_id = ${companyId}`,
    ]);
    return {
        totalViews: Number(total[0]?.count || 0),
        viewsThisWeek: Number(weekly[0]?.count || 0),
        viewsToday: Number(today[0]?.count || 0),
        totalLeads: Number(leads[0]?.count || 0),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
    const companyId = getCompanyId();
    if (!companyId) return [];
    const result = await sql`SELECT * FROM users WHERE company_id = ${companyId} ORDER BY name ASC`;
    return result.map(row => ({ ...row, createdAt: row.created_at })) as unknown as User[];
}

export async function getUserById(id: string): Promise<User | null> {
    const companyId = getCompanyId();
    if (!companyId) return null;
    const result = await sql`SELECT * FROM users WHERE id = ${id} AND company_id = ${companyId}`;
    if (result.length === 0) return null;
    return { ...result[0], createdAt: result[0].created_at } as unknown as User;
}

export async function getUserByEmail(email: string): Promise<User | null> {
    const companyId = getCompanyId();
    if (!companyId) return null;
    const result = await sql`SELECT * FROM users WHERE email = ${email} AND company_id = ${companyId}`;
    if (result.length === 0) return null;
    return { ...result[0], createdAt: result[0].created_at } as unknown as User;
}

async function ensureTenantUserSchema(): Promise<void> {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id TEXT`;
    await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_company_email_idx ON users (company_id, lower(email))`;
}

export async function upsertUser(user: User): Promise<void> {
    const companyId = (user as any).company_id || requireCompanyId('salvar usuÃ¡rio');
    await ensureTenantUserSchema();
    await sql`
        INSERT INTO users (id, name, email, phone, role, document, address, favorites, password, avatar, company_id)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${(user as any).phone || null}, ${user.role}, 
                ${(user as any).document || null}, ${(user as any).address || null}, 
                ${user.favorites || []}, ${(user as any).password || null}, ${(user as any).avatar || null},
                ${companyId})
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            role = EXCLUDED.role,
            document = EXCLUDED.document,
            address = EXCLUDED.address,
            favorites = EXCLUDED.favorites,
            password = COALESCE(EXCLUDED.password, users.password),
            avatar = EXCLUDED.avatar
    `;
}

export async function deleteUser(id: string): Promise<void> {
    const cid = requireCompanyId('excluir usuÃ¡rio');
    await sql`DELETE FROM users WHERE id = ${id} AND company_id = ${cid}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACTS
// ─────────────────────────────────────────────────────────────────────────────

async function ensureContractSchema(): Promise<void> {
    await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signature_image TEXT`;
    await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP`;
    await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1`;
    await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS public_token_hash TEXT`;
    await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS public_token_expires_at TIMESTAMP`;
    await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP`;
    await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP`;
    await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_signature_image TEXT`;
    await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_signed_at TIMESTAMP`;
    await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_signature_status TEXT DEFAULT 'pending'`;
}

export async function getContracts(): Promise<Contract[]> {
    const companyId = getCompanyId();
    await ensureContractSchema();
    if (!companyId) return [];
    const result = await sql`
            SELECT c.*, p.title as property_title, p.image as property_image,
                   u_client.name as client_name, u_client.phone as client_phone,
                   u_owner.name as owner_name, u_owner.phone as owner_phone
            FROM contracts c
            LEFT JOIN properties p ON c.property_id = p.id::text
            LEFT JOIN users u_client ON c.client_id = u_client.id
            LEFT JOIN users u_owner ON c.owner_id = u_owner.id
            WHERE c.company_id = ${companyId}
            ORDER BY c.created_at DESC
          `;
    return result.map(row => ({
        ...row,
        propertyId: row.property_id,
        propertyTitle: row.property_title || 'Imóvel',
        propertyImage: row.property_image || '',
        clientId: row.client_id,
        clientName: row.client_name || 'Cliente',
        clientPhone: row.client_phone || '',
        ownerId: row.owner_id,
        ownerName: row.owner_name || 'Proprietário',
        ownerPhone: row.owner_phone || '',
        commissionRate: Number(row.commission_rate),
        dueDay: Number(row.due_day),
        value: Number(row.value),
        startDate: row.start_date,
        endDate: row.end_date,
        signatureStatus: row.signature_status || 'pending',
        signatureImage: row.signature_image || undefined,
        signedAt: row.signed_at || undefined,
        ownerSignatureStatus: row.owner_signature_status || 'pending',
        ownerSignatureImage: row.owner_signature_image || undefined,
        ownerSignedAt: row.owner_signed_at || undefined,
        nextPaymentStatus: row.next_payment_status || 'pending',
        templateType: row.template_type,
        customContent: row.custom_content,
        publicTokenExpiresAt: row.public_token_expires_at || undefined,
        sentAt: row.sent_at || undefined,
        viewedAt: row.viewed_at || undefined,
        version: row.version || 1,
        createdAt: row.created_at
    })) as unknown as Contract[];
}

export async function getContractById(id: string): Promise<Contract | null> {
    await ensureContractSchema();
    const companyId = requireCompanyId('consultar contrato');
    const result = await sql`
        SELECT c.*, p.title as property_title, p.image as property_image,
               u_client.name as client_name, u_client.phone as client_phone,
               u_owner.name as owner_name, u_owner.phone as owner_phone
        FROM contracts c
        LEFT JOIN properties p ON c.property_id = p.id::text
        LEFT JOIN users u_client ON c.client_id = u_client.id
        LEFT JOIN users u_owner ON c.owner_id = u_owner.id
        WHERE c.id = ${id} AND c.company_id = ${companyId}
    `;
    if (result.length === 0) return null;
    const row = result[0];
    return {
        ...row,
        propertyId: row.property_id,
        propertyTitle: row.property_title || 'Imóvel',
        propertyImage: row.property_image || '',
        clientId: row.client_id,
        clientName: row.client_name || 'Cliente',
        clientPhone: row.client_phone || '',
        ownerId: row.owner_id,
        ownerName: row.owner_name || 'Proprietário',
        ownerPhone: row.owner_phone || '',
        commissionRate: Number(row.commission_rate),
        dueDay: Number(row.due_day),
        value: Number(row.value),
        startDate: row.start_date,
        endDate: row.end_date,
        signatureStatus: row.signature_status || 'pending',
        signatureImage: row.signature_image || undefined,
        signedAt: row.signed_at || undefined,
        ownerSignatureStatus: row.owner_signature_status || 'pending',
        ownerSignatureImage: row.owner_signature_image || undefined,
        ownerSignedAt: row.owner_signed_at || undefined,
        nextPaymentStatus: row.next_payment_status || 'pending',
        templateType: row.template_type,
        customContent: row.custom_content,
        publicTokenExpiresAt: row.public_token_expires_at || undefined,
        sentAt: row.sent_at || undefined,
        viewedAt: row.viewed_at || undefined,
        version: row.version || 1,
        createdAt: row.created_at
    } as unknown as Contract;
}

export async function addContract(contract: Contract): Promise<string> {
    const id = Math.random().toString(36).substr(2, 12);
    const companyId = requireCompanyId('criar contrato');
    await sql`
        INSERT INTO contracts (
            id, property_id, client_id, owner_id, type, status, value,
            commission_rate, due_day, start_date, end_date, next_payment_status,
            template_type, custom_content, signature_status,
            installments_total, installments_paid, company_id
        ) VALUES (
            ${id}, ${contract.propertyId?.toString()}, ${contract.clientId?.toString()}, 
            ${contract.ownerId?.toString()}, ${contract.type}, ${contract.status || 'active'},
            ${Number(contract.value)}, ${Number(contract.commissionRate)}, ${Number(contract.dueDay)},
            ${contract.startDate}, ${contract.endDate || null}, ${contract.nextPaymentStatus || 'pending'},
            ${contract.templateType || null}, ${contract.customContent || null},
            ${contract.signatureStatus || 'pending'},
            ${contract.installmentsTotal || null}, ${contract.installmentsPaid || 0},
            ${companyId}
        )
    `;
    return id;
}

export async function updateContract(id: string, updates: Partial<Contract>): Promise<void> {
    await ensureContractSchema();
    const cid = requireCompanyId('atualizar contrato');
    const sets: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    const addParam = (val: any) => {
        params.push(val);
        return `$${paramIdx++}`;
    };

    if (updates.status !== undefined) {
        sets.push(`status = ${addParam(updates.status)}`);
    }
    if (updates.nextPaymentStatus !== undefined) {
        sets.push(`next_payment_status = ${addParam(updates.nextPaymentStatus)}`);
    }
    if (updates.signatureStatus !== undefined) {
        sets.push(`signature_status = ${addParam(updates.signatureStatus)}`);
    }
    if (updates.customContent !== undefined) {
        sets.push(`custom_content = ${addParam(updates.customContent)}`);
    }
    if ('signatureImage' in updates) {
        if (updates.signatureImage === null) {
            sets.push('signature_image = NULL');
            sets.push('signed_at = NULL');
        } else if (updates.signatureImage !== undefined) {
            sets.push(`signature_image = ${addParam(updates.signatureImage)}`);
            if (updates.signedAt !== undefined) {
                sets.push(`signed_at = ${addParam(updates.signedAt)}`);
            } else {
                sets.push('signed_at = NOW()');
            }
        }
    }
    if ('ownerSignatureImage' in updates) {
        if (updates.ownerSignatureImage === null) {
            sets.push('owner_signature_image = NULL');
            sets.push('owner_signed_at = NULL');
            sets.push(`owner_signature_status = ${addParam('pending')}`);
        } else if (updates.ownerSignatureImage !== undefined) {
            sets.push(`owner_signature_image = ${addParam(updates.ownerSignatureImage)}`);
            if (updates.ownerSignedAt !== undefined) {
                sets.push(`owner_signed_at = ${addParam(updates.ownerSignedAt)}`);
            } else {
                sets.push('owner_signed_at = NOW()');
            }
            sets.push(`owner_signature_status = ${addParam('signed')}`);
        }
    }
    if (updates.installmentsPaid !== undefined) {
        sets.push(`installments_paid = ${addParam(updates.installmentsPaid)}`);
    }
    if (updates.value !== undefined) {
        sets.push(`value = ${addParam(Number(updates.value))}`);
    }

    if (sets.length === 0) return;

    const whereClause = ` WHERE id = $${paramIdx} AND company_id = $${paramIdx + 1}`;
    params.push(id);
    params.push(cid);

    await sql.query(`UPDATE contracts SET ${sets.join(', ')}${whereClause}`, params);
}

export async function deleteContract(id: string): Promise<void> {
    const cid = requireCompanyId('excluir contrato');
    await sql`DELETE FROM contracts WHERE id = ${id} AND company_id = ${cid}`;
}

// PROPERTY OPERATIONS / PROCESS JOURNEYS

async function ensurePropertyProcessSchema(): Promise<void> {
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
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `;
    await sql`
        CREATE TABLE IF NOT EXISTS property_process_steps (
            id TEXT PRIMARY KEY,
            process_id TEXT NOT NULL,
            company_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'pending',
            step_order INTEGER DEFAULT 0,
            kind TEXT,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
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
            created_at TIMESTAMP DEFAULT NOW()
        )
    `;
    await sql`
        CREATE TABLE IF NOT EXISTS property_process_documents (
            id TEXT PRIMARY KEY,
            process_id TEXT NOT NULL,
            property_id TEXT NOT NULL,
            company_id TEXT NOT NULL,
            document_type TEXT DEFAULT 'custom',
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
            process_id TEXT,
            property_id TEXT NOT NULL,
            contract_id TEXT,
            type TEXT DEFAULT 'initial',
            status TEXT DEFAULT 'draft',
            items JSONB DEFAULT '[]'::jsonb,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `;
    await sql`
        CREATE TABLE IF NOT EXISTS inspection_images (
            id TEXT PRIMARY KEY,
            inspection_id TEXT NOT NULL,
            process_id TEXT,
            property_id TEXT NOT NULL,
            contract_id TEXT,
            company_id TEXT NOT NULL,
            room TEXT,
            category TEXT,
            image_url TEXT NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `;

    await sql`ALTER TABLE property_processes ADD COLUMN IF NOT EXISTS company_id TEXT`;
    await sql`ALTER TABLE property_processes ADD COLUMN IF NOT EXISTS property_id TEXT`;
    await sql`ALTER TABLE property_processes ADD COLUMN IF NOT EXISTS flow_type TEXT`;
    await sql`ALTER TABLE property_processes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress'`;
    await sql`ALTER TABLE property_processes ADD COLUMN IF NOT EXISTS current_step_id TEXT`;
    await sql`ALTER TABLE property_processes ADD COLUMN IF NOT EXISTS client_id TEXT`;
    await sql`ALTER TABLE property_processes ADD COLUMN IF NOT EXISTS contract_id TEXT`;
    await sql`ALTER TABLE property_processes ADD COLUMN IF NOT EXISTS notes TEXT`;
    await sql`ALTER TABLE property_processes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`;
    await sql`ALTER TABLE property_processes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;
    await sql`ALTER TABLE property_process_steps ADD COLUMN IF NOT EXISTS company_id TEXT`;
    await sql`ALTER TABLE property_process_steps ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`;
    await sql`ALTER TABLE property_process_documents ADD COLUMN IF NOT EXISTS file_data TEXT`;
    await sql`ALTER TABLE property_process_documents ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP`;
    await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS process_id TEXT`;
    await sql`ALTER TABLE property_inspections ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb`;
    await sql`ALTER TABLE inspection_images ADD COLUMN IF NOT EXISTS process_id TEXT`;
}

function toList<T = any>(value: any): T[] {
    if (!value) return [];
    if (Array.isArray(value)) return value as T[];
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

function mapPropertyProcessRow(row: any): PropertyProcess {
    return {
        id: row.id,
        companyId: row.company_id,
        propertyId: row.property_id,
        propertyTitle: row.property_title || 'Imovel',
        propertyImage: row.property_image || undefined,
        flowType: row.flow_type || 'rent',
        status: row.status || 'in_progress',
        currentStepId: row.current_step_id || undefined,
        clientId: row.client_id || undefined,
        clientName: row.client_name || undefined,
        contractId: row.contract_id || undefined,
        notes: row.notes || undefined,
        steps: [],
        events: [],
        documents: [],
        inspections: [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    } as PropertyProcess;
}

async function hydratePropertyProcesses(rows: any[]): Promise<PropertyProcess[]> {
    const companyId = requireCompanyId('carregar jornadas');
    const processes = rows.map(mapPropertyProcessRow);
    const ids = processes.map(item => item.id);
    if (ids.length === 0) return processes;

    const [steps, events, documents, inspections] = await Promise.all([
        sql.query(
            `SELECT * FROM property_process_steps WHERE company_id = $1 AND process_id = ANY($2::text[]) ORDER BY step_order ASC, created_at ASC`,
            [companyId, ids]
        ),
        sql.query(
            `SELECT * FROM property_process_events WHERE company_id = $1 AND process_id = ANY($2::text[]) ORDER BY created_at DESC`,
            [companyId, ids]
        ),
        sql.query(
            `SELECT * FROM property_process_documents WHERE company_id = $1 AND process_id = ANY($2::text[]) ORDER BY created_at DESC`,
            [companyId, ids]
        ),
        sql.query(
            `SELECT * FROM property_inspections WHERE company_id = $1 AND process_id = ANY($2::text[]) ORDER BY updated_at DESC, created_at DESC`,
            [companyId, ids]
        ),
    ]);

    return processes.map(processItem => ({
        ...processItem,
        steps: steps
            .filter((step: any) => step.process_id === processItem.id)
            .map((step: any) => ({
                id: step.id,
                title: step.title,
                description: step.description || undefined,
                status: step.status || 'pending',
                order: Number(step.step_order || 0),
                kind: step.kind || undefined,
                completedAt: step.completed_at || undefined,
            })) as PropertyProcessStep[],
        events: events
            .filter((event: any) => event.process_id === processItem.id)
            .map((event: any) => ({
                id: event.id,
                processId: event.process_id,
                eventType: event.event_type,
                title: event.title,
                description: event.description || undefined,
                userId: event.user_id || undefined,
                createdAt: event.created_at,
            })),
        documents: documents
            .filter((document: any) => document.process_id === processItem.id)
            .map((document: any) => ({
                id: document.id,
                processId: document.process_id,
                propertyId: document.property_id,
                documentType: document.document_type || 'custom',
                title: document.title,
                fileName: document.file_name || undefined,
                fileData: document.file_data || undefined,
                mimeType: document.mime_type || undefined,
                sentAt: document.sent_at || undefined,
                createdAt: document.created_at,
            })),
        inspections: inspections
            .filter((inspection: any) => inspection.process_id === processItem.id)
            .map((inspection: any) => ({
                id: inspection.id,
                processId: inspection.process_id || undefined,
                propertyId: inspection.property_id,
                contractId: inspection.contract_id || undefined,
                type: inspection.type || 'initial',
                status: inspection.status || 'draft',
                rooms: toList(inspection.items),
                notes: inspection.notes || undefined,
                createdAt: inspection.created_at,
                updatedAt: inspection.updated_at,
            })),
    }));
}

export async function getPropertyProcesses(): Promise<PropertyProcess[]> {
    const companyId = requireCompanyId('carregar jornadas');
    await ensurePropertyProcessSchema();
    const rows = await sql`
        SELECT pp.*, p.title as property_title, p.image as property_image, u.name as client_name
        FROM property_processes pp
        LEFT JOIN properties p ON pp.property_id = p.id::text AND p.company_id = pp.company_id
        LEFT JOIN users u ON pp.client_id = u.id AND u.company_id = pp.company_id
        WHERE pp.company_id = ${companyId}
        ORDER BY pp.updated_at DESC, pp.created_at DESC
    `;
    return hydratePropertyProcesses(rows);
}

async function getPropertyProcessById(id: string): Promise<PropertyProcess | null> {
    const companyId = requireCompanyId('carregar jornada');
    const rows = await sql`
        SELECT pp.*, p.title as property_title, p.image as property_image, u.name as client_name
        FROM property_processes pp
        LEFT JOIN properties p ON pp.property_id = p.id::text AND p.company_id = pp.company_id
        LEFT JOIN users u ON pp.client_id = u.id AND u.company_id = pp.company_id
        WHERE pp.id = ${id} AND pp.company_id = ${companyId}
    `;
    const hydrated = await hydratePropertyProcesses(rows);
    return hydrated[0] || null;
}

async function replacePropertyProcessSteps(processId: string, steps: PropertyProcessStep[]): Promise<void> {
    const companyId = requireCompanyId('salvar etapas da jornada');
    await sql`DELETE FROM property_process_steps WHERE process_id = ${processId} AND company_id = ${companyId}`;
    for (const step of steps) {
        await sql`
            INSERT INTO property_process_steps (
                id, process_id, company_id, title, description, status, step_order, kind, completed_at
            ) VALUES (
                ${step.id}, ${processId}, ${companyId}, ${step.title}, ${step.description || null},
                ${step.status || 'pending'}, ${Number(step.order || 0)}, ${step.kind || null},
                ${step.completedAt || null}
            )
        `;
    }
}

export async function createPropertyProcess(input: Partial<PropertyProcess> & { propertyId: string | number; flowType: string }): Promise<PropertyProcess> {
    const companyId = requireCompanyId('criar jornada');
    await ensurePropertyProcessSchema();
    const id = input.id || `proc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await sql`
        INSERT INTO property_processes (
            id, company_id, property_id, flow_type, status, current_step_id, client_id, contract_id, notes
        ) VALUES (
            ${id}, ${companyId}, ${String(input.propertyId)}, ${input.flowType},
            ${input.status || 'in_progress'}, ${input.currentStepId || null},
            ${input.clientId || null}, ${input.contractId || null}, ${input.notes || null}
        )
    `;
    await replacePropertyProcessSteps(id, input.steps || []);
    await sql`
        INSERT INTO property_process_events (id, process_id, company_id, event_type, title, description)
        VALUES (${`evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`}, ${id}, ${companyId}, 'created', 'Jornada iniciada', ${input.notes || null})
    `;
    const created = await getPropertyProcessById(id);
    if (!created) throw new Error('Jornada criada, mas nao foi possivel recarregar os dados.');
    return created;
}

export async function updatePropertyProcess(id: string, updates: Partial<PropertyProcess>): Promise<PropertyProcess> {
    const companyId = requireCompanyId('atualizar jornada');
    await ensurePropertyProcessSchema();
    const sets: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;
    const addParam = (value: any) => {
        params.push(value);
        return `$${paramIdx++}`;
    };

    if (updates.status !== undefined) sets.push(`status = ${addParam(updates.status)}`);
    if (updates.currentStepId !== undefined) sets.push(`current_step_id = ${addParam(updates.currentStepId)}`);
    if (updates.clientId !== undefined) sets.push(`client_id = ${addParam(updates.clientId)}`);
    if (updates.contractId !== undefined) sets.push(`contract_id = ${addParam(updates.contractId)}`);
    if (updates.notes !== undefined) sets.push(`notes = ${addParam(updates.notes)}`);
    sets.push('updated_at = NOW()');

    params.push(id, companyId);
    await sql.query(`UPDATE property_processes SET ${sets.join(', ')} WHERE id = $${paramIdx} AND company_id = $${paramIdx + 1}`, params);

    if (updates.steps) {
        await replacePropertyProcessSteps(id, updates.steps);
    }

    const updated = await getPropertyProcessById(id);
    if (!updated) throw new Error('Jornada nao encontrada para esta imobiliaria.');
    return updated;
}

export async function savePropertyInspection(inspection: PropertyInspection): Promise<string> {
    const companyId = requireCompanyId('salvar vistoria');
    await ensurePropertyProcessSchema();
    const id = inspection.id || `insp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await sql`
        INSERT INTO property_inspections (
            id, company_id, process_id, property_id, contract_id, type, status, items, notes, updated_at
        ) VALUES (
            ${id}, ${companyId}, ${inspection.processId || null}, ${String(inspection.propertyId)},
            ${inspection.contractId || null}, ${inspection.type || 'initial'}, ${inspection.status || 'draft'},
            ${JSON.stringify(inspection.rooms || [])}::jsonb, ${inspection.notes || null}, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            process_id = EXCLUDED.process_id,
            property_id = EXCLUDED.property_id,
            contract_id = EXCLUDED.contract_id,
            type = EXCLUDED.type,
            status = EXCLUDED.status,
            items = EXCLUDED.items,
            notes = EXCLUDED.notes,
            updated_at = NOW()
    `;
    await sql`DELETE FROM inspection_images WHERE inspection_id = ${id} AND company_id = ${companyId}`;
    return id;
}

export async function getPropertyInspections(processId?: string, propertyId?: string | number): Promise<PropertyInspection[]> {
    const companyId = requireCompanyId('carregar vistorias');
    await ensurePropertyProcessSchema();
    const clauses = ['company_id = $1'];
    const params: any[] = [companyId];
    let paramIdx = 2;
    if (processId) {
        clauses.push(`process_id = $${paramIdx++}`);
        params.push(processId);
    }
    if (propertyId) {
        clauses.push(`property_id = $${paramIdx++}`);
        params.push(String(propertyId));
    }
    const rows = await sql.query(
        `SELECT * FROM property_inspections WHERE ${clauses.join(' AND ')} ORDER BY updated_at DESC, created_at DESC`,
        params
    );
    return rows.map((row: any) => ({
        id: row.id,
        processId: row.process_id || undefined,
        propertyId: row.property_id,
        contractId: row.contract_id || undefined,
        type: row.type || 'initial',
        status: row.status || 'draft',
        rooms: toList(row.items),
        notes: row.notes || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }));
}

export async function saveInspectionImage(input: {
    inspectionId: string;
    processId?: string;
    propertyId: string | number;
    contractId?: string;
    room: string;
    category?: string;
    imageUrl: string;
    notes?: string;
}): Promise<string> {
    const companyId = requireCompanyId('salvar imagem da vistoria');
    await ensurePropertyProcessSchema();
    const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await sql`
        INSERT INTO inspection_images (
            id, inspection_id, process_id, property_id, contract_id, company_id, room, category, image_url, notes
        ) VALUES (
            ${id}, ${input.inspectionId}, ${input.processId || null}, ${String(input.propertyId)},
            ${input.contractId || null}, ${companyId}, ${input.room}, ${input.category || null},
            ${input.imageUrl}, ${input.notes || null}
        )
    `;
    return id;
}

export async function savePropertyDocument(input: {
    processId: string;
    propertyId: string | number;
    documentType: PropertyProcessDocument['documentType'];
    title: string;
    fileName: string;
    fileData: string;
    mimeType?: string;
}): Promise<string> {
    const companyId = requireCompanyId('salvar documento da jornada');
    await ensurePropertyProcessSchema();
    const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await sql`
        INSERT INTO property_process_documents (
            id, process_id, property_id, company_id, document_type, title, file_name, file_data, mime_type
        ) VALUES (
            ${id}, ${input.processId}, ${String(input.propertyId)}, ${companyId}, ${input.documentType},
            ${input.title}, ${input.fileName}, ${input.fileData}, ${input.mimeType || 'application/pdf'}
        )
    `;
    return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADS
// ─────────────────────────────────────────────────────────────────────────────

export interface Lead {
    id: string;
    propertyId: string;
    propertyTitle?: string;
    name: string;
    email?: string;
    phone?: string;
    message?: string;
    status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
    score: number;
    source: string;
    createdAt: string;
}

export async function addLead(lead: Omit<Lead, 'id' | 'createdAt'>): Promise<string> {
    const companyId = requireCompanyId('criar lead');
    const result = await sql`
        INSERT INTO leads (property_id, property_title, name, email, phone, message, status, score, source, company_id)
        VALUES (${lead.propertyId}, ${lead.propertyTitle || null}, ${lead.name}, ${lead.email || null}, 
                ${lead.phone || null}, ${lead.message || null}, ${lead.status || 'new'}, 
                ${lead.score || 50}, ${lead.source || 'website'}, ${companyId})
        RETURNING id
    `;
    await sql`UPDATE properties SET leads_count = leads_count + 1 WHERE id = ${lead.propertyId} AND company_id = ${companyId}`;
    return result[0].id;
}

export async function getLeads(limit = 100): Promise<Lead[]> {
    const companyId = getCompanyId();
    if (!companyId) return [];
    const result = await sql`
            SELECT l.*, p.title as property_title 
            FROM leads l
            LEFT JOIN properties p ON l.property_id = p.id
            WHERE l.company_id = ${companyId}
            ORDER BY l.created_at DESC
            LIMIT ${limit}
          `;
    return result.map(row => ({
        id: row.id,
        propertyId: row.property_id,
        propertyTitle: row.property_title || row.property_title_direct,
        name: row.name,
        email: row.email,
        phone: row.phone,
        message: row.message,
        status: row.status,
        score: Number(row.score),
        source: row.source,
        createdAt: row.created_at,
    })) as Lead[];
}

export async function updateLeadStatus(id: string, status: Lead['status']): Promise<void> {
    const cid = requireCompanyId('atualizar lead');
    await sql`UPDATE leads SET status = ${status}, updated_at = NOW() WHERE id = ${id} AND company_id = ${cid}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function addNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'> & { userId?: string }): Promise<void> {
    await sql`
        ALTER TABLE notifications 
        ADD COLUMN IF NOT EXISTS action_url TEXT,
        ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
        ADD COLUMN IF NOT EXISTS icon TEXT
    `;
    const companyId = requireCompanyId('criar notificaÃ§Ã£o');
    await sql`
        INSERT INTO notifications (user_id, type, title, message, action_url, icon, priority, company_id)
        VALUES (${notification.userId || null}, ${notification.type}, ${notification.title}, 
                ${notification.message}, ${notification.actionUrl || null}, 
                ${notification.icon || null}, ${notification.priority || 'medium'}, ${companyId})
    `;
}

export async function getNotifications(userId: string): Promise<AppNotification[]> {
    const companyId = requireCompanyId('consultar notificaÃ§Ãµes');
    const result = await sql`
        SELECT * FROM notifications WHERE user_id = ${userId} AND company_id = ${companyId}
        ORDER BY created_at DESC LIMIT 50
    `;
    return result.map(row => ({
        id: row.id,
        type: row.type,
        title: row.title,
        message: row.message,
        timestamp: row.created_at,
        read: row.read,
        actionUrl: row.action_url,
        icon: row.icon,
        priority: row.priority,
    })) as unknown as AppNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
    const companyId = requireCompanyId('marcar notificaÃ§Ã£o');
    await sql`UPDATE notifications SET read = TRUE WHERE id = ${id} AND company_id = ${companyId}`;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
    const companyId = requireCompanyId('marcar notificaÃ§Ãµes');
    await sql`UPDATE notifications SET read = TRUE WHERE user_id = ${userId} AND company_id = ${companyId}`;
}

export async function deleteNotificationById(id: string): Promise<void> {
    const companyId = requireCompanyId('excluir notificaÃ§Ã£o');
    await sql`DELETE FROM notifications WHERE id = ${id} AND company_id = ${companyId}`;
}

export async function clearNotifications(userId: string): Promise<void> {
    const companyId = requireCompanyId('limpar notificaÃ§Ãµes');
    await sql`DELETE FROM notifications WHERE user_id = ${userId} AND company_id = ${companyId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY LOG
// ─────────────────────────────────────────────────────────────────────────────

export async function logActivity(
    userId: string | undefined,
    userName: string | undefined,
    action: string,
    entityType?: string,
    entityId?: string,
    description?: string
): Promise<void> {
    try {
        const companyId = requireCompanyId('registrar atividade');
        await sql`
            INSERT INTO activity_log (user_id, user_name, action, entity_type, entity_id, description, company_id)
            VALUES (${userId || null}, ${userName || 'Sistema'}, ${action}, 
                    ${entityType || null}, ${entityId || null}, ${description || null}, ${companyId})
        `;
    } catch (e) {
        // Non-critical — log silently
        console.debug('Activity log error:', e);
    }
}

export async function getActivityLog(limit = 20): Promise<any[]> {
    const companyId = getCompanyId();
    if (!companyId) return [];
    const result = await sql`SELECT * FROM activity_log WHERE company_id = ${companyId} ORDER BY created_at DESC LIMIT ${limit}`;
    return result.map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        description: row.description,
        createdAt: row.created_at,
        time: new Date(row.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKETING CAMPAIGNS
// ─────────────────────────────────────────────────────────────────────────────

export async function saveMarketingCampaign(data: {
    userId: string;
    propertyId?: string;
    propertyTitle?: string;
    platform: string;
    format: string;
    tone?: string;
    template?: string;
    generatedText?: string;
    headline?: string;
    imageUrl?: string;
}): Promise<string> {
    const companyId = requireCompanyId('salvar campanha');
    const result = await sql`
        INSERT INTO marketing_campaigns 
            (user_id, property_id, property_title, platform, format, tone, template, generated_text, headline, image_url, company_id)
        VALUES 
            (${data.userId}, ${data.propertyId || null}, ${data.propertyTitle || null}, ${data.platform}, ${data.format},
             ${data.tone || null}, ${data.template || null}, ${data.generatedText || null}, 
             ${data.headline || null}, ${data.imageUrl || null}, ${companyId})
        RETURNING id
    `;
    return result[0].id;
}

export async function getMarketingCampaigns(userId: string): Promise<any[]> {
    const companyId = requireCompanyId('consultar campanhas');
    const result = await sql`
        SELECT * FROM marketing_campaigns WHERE user_id = ${userId} AND company_id = ${companyId}
        ORDER BY created_at DESC LIMIT 50
    `;
    return result.map(row => ({
        id: row.id,
        propertyTitle: row.property_title,
        platform: row.platform,
        format: row.format,
        generatedText: row.generated_text,
        headline: row.headline,
        generatedImage: row.image_url,
        template: row.template,
        date: new Date(row.created_at).toLocaleDateString('pt-BR'),
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS AGGREGATES
// ─────────────────────────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<{
    totalViews: number;
    viewsThisWeek: number;
    totalLeads: number;
    leadsThisWeek: number;
    activeProperties: number;
    totalRevenue: number;
}> {
    const companyId = getCompanyId();
    if (!companyId) {
        return {
            totalViews: 0,
            viewsThisWeek: 0,
            totalLeads: 0,
            leadsThisWeek: 0,
            activeProperties: 0,
            totalRevenue: 0,
        };
    }
    
    const [views, weeklyViews, leads, weeklyLeads, activeProps, revenue] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM property_views WHERE company_id = ${companyId}`,
        sql`SELECT COUNT(*) as count FROM property_views WHERE viewed_at >= NOW() - INTERVAL '7 days' AND company_id = ${companyId}`,
        sql`SELECT COUNT(*) as count FROM leads WHERE company_id = ${companyId}`,
        sql`SELECT COUNT(*) as count FROM leads WHERE created_at >= NOW() - INTERVAL '7 days' AND company_id = ${companyId}`,
        sql`SELECT COUNT(*) as count FROM properties WHERE status = 'active' AND company_id = ${companyId}`,
        sql`SELECT COALESCE(SUM(value), 0) as total FROM contracts WHERE status = 'active' AND company_id = ${companyId}`,
    ]);
    return {
        totalViews: Number(views[0]?.count || 0),
        viewsThisWeek: Number(weeklyViews[0]?.count || 0),
        totalLeads: Number(leads[0]?.count || 0),
        leadsThisWeek: Number(weeklyLeads[0]?.count || 0),
        activeProperties: Number(activeProps[0]?.count || 0),
        totalRevenue: Number(revenue[0]?.total || 0),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Record<string, string>> {
    try {
        const companyId = getCompanyId();
        const tenantPrefix = companyId ? `${companyId}:` : null;
        const result = companyId
            ? await sql`
                SELECT * FROM system_settings
                WHERE key NOT LIKE '%:%' OR key LIKE ${tenantPrefix + '%'}
                ORDER BY CASE WHEN key LIKE ${tenantPrefix + '%'} THEN 1 ELSE 0 END ASC
              `
            : await sql`SELECT * FROM system_settings WHERE key NOT LIKE '%:%'`;
        const settings: Record<string, string> = {};
        result.forEach(row => {
            const rawKey = String(row.key);
            const key = tenantPrefix && rawKey.startsWith(tenantPrefix)
                ? rawKey.slice(tenantPrefix.length)
                : rawKey;
            settings[key] = row.value;
        });
        return settings;
    } catch (e) {
        console.error('Error fetching settings:', e);
        return {};
    }
}

export async function updateSetting(key: string, value: string): Promise<void> {
    const companyId = requireCompanyId('atualizar configuraÃ§Ã£o');
    const scopedKey = `${companyId}:${key}`;
    await sql`
        INSERT INTO system_settings (key, value, updated_at)
        VALUES (${scopedKey}, ${value}, NOW())
        ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = EXCLUDED.updated_at
    `;
}
