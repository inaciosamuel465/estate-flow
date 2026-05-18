import { neon, neonConfig } from '@neondatabase/serverless';
import { Property, Contract, User, AppNotification } from '../types';

neonConfig.disableWarningInBrowsers = true;
const sql = neon(import.meta.env.VITE_DATABASE_URL || '');

function getCompanyId(): string | null {
    try {
        return localStorage.getItem('estateflow_company_id');
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getProperties(): Promise<Property[]> {
    const companyId = getCompanyId();
    const result = companyId
        ? await sql`SELECT * FROM properties WHERE company_id = ${companyId} ORDER BY created_at DESC`
        : await sql`SELECT * FROM properties ORDER BY created_at DESC`;
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
    const companyId = getCompanyId() || 'default';
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
        if (updates.title !== undefined) await sql`UPDATE properties SET title = ${updates.title} WHERE id = ${id}`;
        if (updates.status !== undefined) await sql`UPDATE properties SET status = ${updates.status} WHERE id = ${id}`;
        if (updates.price !== undefined) await sql`UPDATE properties SET price = ${updates.price} WHERE id = ${id}`;
        if (updates.description !== undefined) await sql`UPDATE properties SET description = ${updates.description} WHERE id = ${id}`;
        if (updates.tag !== undefined) await sql`UPDATE properties SET tag = ${updates.tag} WHERE id = ${id}`;
        if (updates.location !== undefined) await sql`UPDATE properties SET location = ${updates.location} WHERE id = ${id}`;
        if (updates.area !== undefined) await sql`UPDATE properties SET area = ${updates.area} WHERE id = ${id}`;
        if (updates.beds !== undefined) await sql`UPDATE properties SET beds = ${updates.beds} WHERE id = ${id}`;
        if (updates.baths !== undefined) await sql`UPDATE properties SET baths = ${updates.baths} WHERE id = ${id}`;
        if (updates.amenities !== undefined) await sql`UPDATE properties SET amenities = ${updates.amenities} WHERE id = ${id}`;
        if (updates.images !== undefined) {
            await sql`UPDATE properties SET images = ${updates.images} WHERE id = ${id}`;
            if (updates.image === undefined) {
                await sql`UPDATE properties SET image = ${updates.images[0] || null} WHERE id = ${id}`;
            }
        }
        if (updates.image !== undefined) await sql`UPDATE properties SET image = ${updates.image} WHERE id = ${id}`;
        if (updates.addressDetails !== undefined) await sql`UPDATE properties SET address_details = ${updates.addressDetails} WHERE id = ${id}`;
        if (updates.ownerId !== undefined) await sql`UPDATE properties SET owner_id = ${updates.ownerId.toString()} WHERE id = ${id}`;
        if (updates.lat !== undefined) await sql`UPDATE properties SET lat = ${updates.lat} WHERE id = ${id}`;
        if (updates.lng !== undefined) await sql`UPDATE properties SET lng = ${updates.lng} WHERE id = ${id}`;
    } catch (error) {
        console.error('Error in updateProperty:', error);
        throw error;
    }
}

export async function deleteProperty(id: string): Promise<void> {
    await sql`DELETE FROM property_views WHERE property_id = ${id}`;
    await sql`DELETE FROM leads WHERE property_id = ${id}`;
    await sql`DELETE FROM properties WHERE id = ${id}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY VIEWS — Rastreamento real de visualizações
// ─────────────────────────────────────────────────────────────────────────────

export async function trackPropertyView(propertyId: string, userId?: string, source = 'web'): Promise<void> {
    const companyId = getCompanyId() || 'default';
    await sql`
        INSERT INTO property_views (property_id, user_id, source, company_id)
        VALUES (${propertyId}, ${userId || null}, ${source}, ${companyId})
    `;
    const cid = getCompanyId();
    await sql`UPDATE properties SET views_count = views_count + 1 WHERE id = ${propertyId}${cid ? sql` AND company_id = ${cid}` : sql``}`;
}

export async function getPropertyViewsCount(propertyId: string): Promise<number> {
    const result = await sql`SELECT COUNT(*) as count FROM property_views WHERE property_id = ${propertyId}`;
    return Number(result[0]?.count || 0);
}

export async function getPropertyAnalytics(propertyId: string): Promise<{
    totalViews: number;
    viewsThisWeek: number;
    viewsToday: number;
    totalLeads: number;
}> {
    const [total, weekly, today, leads] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM property_views WHERE property_id = ${propertyId}`,
        sql`SELECT COUNT(*) as count FROM property_views WHERE property_id = ${propertyId} AND viewed_at >= NOW() - INTERVAL '7 days'`,
        sql`SELECT COUNT(*) as count FROM property_views WHERE property_id = ${propertyId} AND viewed_at >= NOW() - INTERVAL '1 day'`,
        sql`SELECT COUNT(*) as count FROM leads WHERE property_id = ${propertyId}`,
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
    const result = companyId
        ? await sql`SELECT * FROM users WHERE company_id = ${companyId} ORDER BY name ASC`
        : await sql`SELECT * FROM users ORDER BY name ASC`;
    return result.map(row => ({ ...row, createdAt: row.created_at })) as unknown as User[];
}

export async function getUserById(id: string): Promise<User | null> {
    const companyId = getCompanyId();
    const result = companyId
        ? await sql`SELECT * FROM users WHERE id = ${id} AND company_id = ${companyId}`
        : await sql`SELECT * FROM users WHERE id = ${id}`;
    if (result.length === 0) return null;
    return { ...result[0], createdAt: result[0].created_at } as unknown as User;
}

export async function getUserByEmail(email: string): Promise<User | null> {
    const companyId = getCompanyId();
    const result = companyId
        ? await sql`SELECT * FROM users WHERE email = ${email} AND company_id = ${companyId}`
        : await sql`SELECT * FROM users WHERE email = ${email}`;
    if (result.length === 0) return null;
    return { ...result[0], createdAt: result[0].created_at } as unknown as User;
}

async function ensureTenantUserSchema(): Promise<void> {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id TEXT`;
    await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_company_email_idx ON users (company_id, lower(email))`;
}

export async function upsertUser(user: User): Promise<void> {
    const companyId = (user as any).company_id || getCompanyId() || 'default';
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
    const cid = getCompanyId();
    await sql`DELETE FROM users WHERE id = ${id}${cid ? sql` AND company_id = ${cid}` : sql``}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACTS
// ─────────────────────────────────────────────────────────────────────────────

async function ensureContractSchema(): Promise<void> {
    await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signature_image TEXT`;
    await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP`;
    await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_signature_image TEXT`;
    await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_signed_at TIMESTAMP`;
    await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_signature_status TEXT DEFAULT 'pending'`;
}

export async function getContracts(): Promise<Contract[]> {
    const companyId = getCompanyId();
    await ensureContractSchema();
    const result = companyId
        ? await sql`
            SELECT c.*, p.title as property_title, p.image as property_image,
                   u_client.name as client_name, u_client.phone as client_phone,
                   u_owner.name as owner_name, u_owner.phone as owner_phone
            FROM contracts c
            LEFT JOIN properties p ON c.property_id = p.id::text
            LEFT JOIN users u_client ON c.client_id = u_client.id
            LEFT JOIN users u_owner ON c.owner_id = u_owner.id
            WHERE c.company_id = ${companyId}
            ORDER BY c.created_at DESC
          `
        : await sql`
            SELECT c.*, p.title as property_title, p.image as property_image,
                   u_client.name as client_name, u_client.phone as client_phone,
                   u_owner.name as owner_name, u_owner.phone as owner_phone
            FROM contracts c
            LEFT JOIN properties p ON c.property_id = p.id::text
            LEFT JOIN users u_client ON c.client_id = u_client.id
            LEFT JOIN users u_owner ON c.owner_id = u_owner.id
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
        createdAt: row.created_at
    })) as unknown as Contract[];
}

export async function getContractById(id: string): Promise<Contract | null> {
    await ensureContractSchema();
    const result = await sql`
        SELECT c.*, p.title as property_title, p.image as property_image,
               u_client.name as client_name, u_client.phone as client_phone,
               u_owner.name as owner_name, u_owner.phone as owner_phone
        FROM contracts c
        LEFT JOIN properties p ON c.property_id = p.id::text
        LEFT JOIN users u_client ON c.client_id = u_client.id
        LEFT JOIN users u_owner ON c.owner_id = u_owner.id
        WHERE c.id = ${id}
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
        createdAt: row.created_at
    } as unknown as Contract;
}

export async function addContract(contract: Contract): Promise<string> {
    const id = Math.random().toString(36).substr(2, 12);
    const companyId = getCompanyId() || 'default';
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
    const cid = getCompanyId();
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

    const whereClause = cid ? ` WHERE id = $${paramIdx} AND company_id = $${paramIdx + 1}` : ` WHERE id = $${paramIdx}`;
    params.push(id);
    if (cid) params.push(cid);

    await sql.query(`UPDATE contracts SET ${sets.join(', ')}${whereClause}`, params);
}

export async function deleteContract(id: string): Promise<void> {
    const cid = getCompanyId();
    await sql`DELETE FROM contracts WHERE id = ${id}${cid ? sql` AND company_id = ${cid}` : sql``}`;
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
    const companyId = getCompanyId() || 'default';
    const result = await sql`
        INSERT INTO leads (property_id, property_title, name, email, phone, message, status, score, source, company_id)
        VALUES (${lead.propertyId}, ${lead.propertyTitle || null}, ${lead.name}, ${lead.email || null}, 
                ${lead.phone || null}, ${lead.message || null}, ${lead.status || 'new'}, 
                ${lead.score || 50}, ${lead.source || 'website'}, ${companyId})
        RETURNING id
    `;
    const cid = getCompanyId();
    await sql`UPDATE properties SET leads_count = leads_count + 1 WHERE id = ${lead.propertyId}${cid ? sql` AND company_id = ${cid}` : sql``}`;
    return result[0].id;
}

export async function getLeads(limit = 100): Promise<Lead[]> {
    const companyId = getCompanyId();
    const result = companyId
        ? await sql`
            SELECT l.*, p.title as property_title 
            FROM leads l
            LEFT JOIN properties p ON l.property_id = p.id
            WHERE l.company_id = ${companyId}
            ORDER BY l.created_at DESC
            LIMIT ${limit}
          `
        : await sql`
            SELECT l.*, p.title as property_title 
            FROM leads l
            LEFT JOIN properties p ON l.property_id = p.id
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
    const cid = getCompanyId();
    await sql`UPDATE leads SET status = ${status}, updated_at = NOW() WHERE id = ${id}${cid ? sql` AND company_id = ${cid}` : sql``}`;
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
    const companyId = getCompanyId() || 'default';
    await sql`
        INSERT INTO notifications (user_id, type, title, message, action_url, icon, priority, company_id)
        VALUES (${notification.userId || null}, ${notification.type}, ${notification.title}, 
                ${notification.message}, ${notification.actionUrl || null}, 
                ${notification.icon || null}, ${notification.priority || 'medium'}, ${companyId})
    `;
}

export async function getNotifications(userId: string): Promise<AppNotification[]> {
    const result = await sql`
        SELECT * FROM notifications WHERE user_id = ${userId}
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
    await sql`UPDATE notifications SET read = TRUE WHERE id = ${id}`;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
    await sql`UPDATE notifications SET read = TRUE WHERE user_id = ${userId}`;
}

export async function deleteNotificationById(id: string): Promise<void> {
    await sql`DELETE FROM notifications WHERE id = ${id}`;
}

export async function clearNotifications(userId: string): Promise<void> {
    await sql`DELETE FROM notifications WHERE user_id = ${userId}`;
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
        const companyId = getCompanyId() || 'default';
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
    const result = companyId
        ? await sql`SELECT * FROM activity_log WHERE company_id = ${companyId} ORDER BY created_at DESC LIMIT ${limit}`
        : await sql`SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ${limit}`;
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
    const companyId = getCompanyId() || 'default';
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
    const result = await sql`
        SELECT * FROM marketing_campaigns WHERE user_id = ${userId}
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
    
    const [views, weeklyViews, leads, weeklyLeads, activeProps, revenue] = await Promise.all([
        companyId
            ? sql`SELECT COUNT(*) as count FROM property_views WHERE company_id = ${companyId}`
            : sql`SELECT COUNT(*) as count FROM property_views`,
        companyId
            ? sql`SELECT COUNT(*) as count FROM property_views WHERE viewed_at >= NOW() - INTERVAL '7 days' AND company_id = ${companyId}`
            : sql`SELECT COUNT(*) as count FROM property_views WHERE viewed_at >= NOW() - INTERVAL '7 days'`,
        companyId
            ? sql`SELECT COUNT(*) as count FROM leads WHERE company_id = ${companyId}`
            : sql`SELECT COUNT(*) as count FROM leads`,
        companyId
            ? sql`SELECT COUNT(*) as count FROM leads WHERE created_at >= NOW() - INTERVAL '7 days' AND company_id = ${companyId}`
            : sql`SELECT COUNT(*) as count FROM leads WHERE created_at >= NOW() - INTERVAL '7 days'`,
        companyId
            ? sql`SELECT COUNT(*) as count FROM properties WHERE status = 'active' AND company_id = ${companyId}`
            : sql`SELECT COUNT(*) as count FROM properties WHERE status = 'active'`,
        companyId
            ? sql`SELECT COALESCE(SUM(value), 0) as total FROM contracts WHERE status = 'active' AND company_id = ${companyId}`
            : sql`SELECT COALESCE(SUM(value), 0) as total FROM contracts WHERE status = 'active'`,
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
        const result = await sql`SELECT * FROM system_settings`;
        const settings: Record<string, string> = {};
        result.forEach(row => {
            settings[row.key] = row.value;
        });
        return settings;
    } catch (e) {
        console.error('Error fetching settings:', e);
        return {};
    }
}

export async function updateSetting(key: string, value: string): Promise<void> {
    await sql`
        INSERT INTO system_settings (key, value, updated_at)
        VALUES (${key}, ${value}, NOW())
        ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = EXCLUDED.updated_at
    `;
}
