import { neon, neonConfig } from '@neondatabase/serverless';
import { Property, Contract, User, Conversation, ChatMessage, AppNotification } from '../types';

neonConfig.disableWarningInBrowsers = true;
const sql = neon(import.meta.env.VITE_DATABASE_URL || '');

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getProperties(): Promise<Property[]> {
    const result = await sql`SELECT * FROM properties ORDER BY created_at DESC`;
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
    await sql`
        INSERT INTO properties (
            id, title, location, area, price, type, purpose, owner_id, status, 
            images, image, address_details, amenities, beds, baths, stats, description, tag,
            lat, lng
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
            ${property.lng || null}
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
    await sql`
        INSERT INTO property_views (property_id, user_id, source)
        VALUES (${propertyId}, ${userId || null}, ${source})
    `;
    // Update the cached counter on properties table
    await sql`
        UPDATE properties SET views_count = views_count + 1 WHERE id = ${propertyId}
    `;
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
    const result = await sql`SELECT * FROM users ORDER BY name ASC`;
    return result.map(row => ({ ...row, createdAt: row.created_at })) as unknown as User[];
}

export async function getUserById(id: string): Promise<User | null> {
    const result = await sql`SELECT * FROM users WHERE id = ${id}`;
    if (result.length === 0) return null;
    return { ...result[0], createdAt: result[0].created_at } as unknown as User;
}

export async function getUserByEmail(email: string): Promise<User | null> {
    const result = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (result.length === 0) return null;
    return { ...result[0], createdAt: result[0].created_at } as unknown as User;
}

export async function upsertUser(user: User): Promise<void> {
    await sql`
        INSERT INTO users (id, name, email, phone, role, document, address, favorites, password, avatar)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${(user as any).phone || null}, ${user.role}, 
                ${(user as any).document || null}, ${(user as any).address || null}, 
                ${user.favorites || []}, ${(user as any).password || null}, ${(user as any).avatar || null})
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

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getContracts(): Promise<Contract[]> {
    const result = await sql`
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
        nextPaymentStatus: row.next_payment_status || 'pending',
        templateType: row.template_type,
        customContent: row.custom_content,
        createdAt: row.created_at
    })) as unknown as Contract[];
}

export async function addContract(contract: Contract): Promise<string> {
    const id = Math.random().toString(36).substr(2, 12);
    await sql`
        INSERT INTO contracts (
            id, property_id, client_id, owner_id, type, status, value,
            commission_rate, due_day, start_date, end_date, next_payment_status,
            template_type, custom_content, signature_status,
            installments_total, installments_paid
        ) VALUES (
            ${id}, ${contract.propertyId?.toString()}, ${contract.clientId?.toString()}, 
            ${contract.ownerId?.toString()}, ${contract.type}, ${contract.status || 'active'},
            ${Number(contract.value)}, ${Number(contract.commissionRate)}, ${Number(contract.dueDay)},
            ${contract.startDate}, ${contract.endDate || null}, ${contract.nextPaymentStatus || 'pending'},
            ${contract.templateType || null}, ${contract.customContent || null},
            ${contract.signatureStatus || 'pending'},
            ${contract.installmentsTotal || null}, ${contract.installmentsPaid || 0}
        )
    `;
    return id;
}

export async function updateContract(id: string, updates: Partial<Contract>): Promise<void> {
    if (updates.status !== undefined) 
        await sql`UPDATE contracts SET status = ${updates.status} WHERE id = ${id}`;
    if (updates.nextPaymentStatus !== undefined)
        await sql`UPDATE contracts SET next_payment_status = ${updates.nextPaymentStatus} WHERE id = ${id}`;
    if (updates.signatureStatus !== undefined)
        await sql`UPDATE contracts SET signature_status = ${updates.signatureStatus} WHERE id = ${id}`;
    if (updates.customContent !== undefined)
        await sql`UPDATE contracts SET custom_content = ${updates.customContent} WHERE id = ${id}`;
    if (updates.signatureImage !== undefined)
        await sql`UPDATE contracts SET signature_image = ${updates.signatureImage}, signed_at = NOW() WHERE id = ${id}`;
    if (updates.installmentsPaid !== undefined)
        await sql`UPDATE contracts SET installments_paid = ${updates.installmentsPaid} WHERE id = ${id}`;
    if (updates.value !== undefined)
        await sql`UPDATE contracts SET value = ${Number(updates.value)} WHERE id = ${id}`;
}

export async function deleteContract(id: string): Promise<void> {
    await sql`DELETE FROM contracts WHERE id = ${id}`;
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
    const result = await sql`
        INSERT INTO leads (property_id, property_title, name, email, phone, message, status, score, source)
        VALUES (${lead.propertyId}, ${lead.propertyTitle || null}, ${lead.name}, ${lead.email || null}, 
                ${lead.phone || null}, ${lead.message || null}, ${lead.status || 'new'}, 
                ${lead.score || 50}, ${lead.source || 'website'})
        RETURNING id
    `;
    // Update leads counter on property
    await sql`UPDATE properties SET leads_count = leads_count + 1 WHERE id = ${lead.propertyId}`;
    return result[0].id;
}

export async function getLeads(limit = 100): Promise<Lead[]> {
    const result = await sql`
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
    await sql`UPDATE leads SET status = ${status}, updated_at = NOW() WHERE id = ${id}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function addNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'> & { userId?: string }): Promise<void> {
    await sql`
        INSERT INTO notifications (user_id, type, title, message, action_url, icon, priority)
        VALUES (${notification.userId || null}, ${notification.type}, ${notification.title}, 
                ${notification.message}, ${notification.actionUrl || null}, 
                ${notification.icon || null}, ${notification.priority || 'medium'})
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
        await sql`
            INSERT INTO activity_log (user_id, user_name, action, entity_type, entity_id, description)
            VALUES (${userId || null}, ${userName || 'Sistema'}, ${action}, 
                    ${entityType || null}, ${entityId || null}, ${description || null})
        `;
    } catch (e) {
        // Non-critical — log silently
        console.debug('Activity log error:', e);
    }
}

export async function getActivityLog(limit = 20): Promise<any[]> {
    const result = await sql`
        SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ${limit}
    `;
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
    const result = await sql`
        INSERT INTO marketing_campaigns 
            (user_id, property_id, property_title, platform, format, tone, template, generated_text, headline, image_url)
        VALUES 
            (${data.userId}, ${data.propertyId || null}, ${data.propertyTitle || null}, ${data.platform}, ${data.format},
             ${data.tone || null}, ${data.template || null}, ${data.generatedText || null}, 
             ${data.headline || null}, ${data.imageUrl || null})
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
// CONVERSATIONS & MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

export async function getConversations(userId: string): Promise<Conversation[]> {
    let result;
    if (userId === 'all') {
        result = await sql`SELECT * FROM conversations ORDER BY last_update DESC`;
    } else {
        result = await sql`
            SELECT * FROM conversations 
            WHERE ${userId} = ANY(participants)
            ORDER BY last_update DESC
        `;
    }

    const conversations = await Promise.all(result.map(async (row) => {
        // Fetch messages for this conversation
        const msgs = await getMessages(row.id);
        
        return {
            id: row.id,
            userId: row.user_id,
            userName: row.user_name,
            userAvatar: row.user_avatar,
            userRole: row.user_role,
            lastMessage: row.last_message,
            lastMessageTime: row.last_update ? new Date(row.last_update).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
            unreadCount: row.unread_count || 0,
            messages: msgs
        };
    }));
    
    return conversations as unknown as Conversation[];
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
    const result = await sql`
        SELECT * FROM messages 
        WHERE conversation_id = ${conversationId}
        ORDER BY timestamp ASC
    `;
    return result.map(row => ({
        id: row.id,
        sender: row.sender_id === 'agent' ? 'agent' : 'user',
        text: row.text,
        time: new Date(row.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        read: row.read || false,
        attachment: row.attachment ? JSON.parse(row.attachment) : undefined
    })) as unknown as ChatMessage[];
}

export async function markConversationAsRead(conversationId: string): Promise<void> {
    try {
        await sql`UPDATE conversations SET unread_count = 0 WHERE id = ${conversationId}`;
    } catch (e) {
        console.error('Error marking conversation as read:', e);
    }
}

export async function saveMessage(conversationId: string, message: ChatMessage, conversationData?: Partial<Conversation>): Promise<void> {
    const timestamp = new Date().toISOString();
    
    // Ensure conversation exists
    if (conversationData) {
        const participants = [String(conversationData.userId), 'agent'];
        await sql`
            INSERT INTO conversations (id, user_id, user_name, user_avatar, user_role, last_message, last_update, unread_count, participants)
            VALUES (${conversationId}, ${conversationData.userId || 0}, ${conversationData.userName}, 
                    ${conversationData.userAvatar}, ${conversationData.userRole}, ${message.text}, 
                    ${timestamp}, ${message.sender === 'user' ? 1 : 0}, ${participants})
            ON CONFLICT (id) DO UPDATE SET
                last_message = EXCLUDED.last_message,
                last_update = EXCLUDED.last_update,
                unread_count = CASE 
                    WHEN EXCLUDED.unread_count > 0 THEN conversations.unread_count + EXCLUDED.unread_count
                    ELSE conversations.unread_count
                END
        `;
    }

    await sql`
        INSERT INTO messages (conversation_id, sender_id, text, timestamp, attachment)
        VALUES (${conversationId}, ${message.sender}, ${message.text}, ${timestamp}, 
                ${message.attachment ? JSON.stringify(message.attachment) : null})
    `;
    
    // Update last message in conversation if not already updated by upsert
    if (!conversationData) {
        await sql`
            UPDATE conversations 
            SET last_message = ${message.text}, 
                last_update = ${timestamp},
                unread_count = CASE WHEN ${message.sender} = 'user' THEN unread_count + 1 ELSE unread_count END
            WHERE id = ${conversationId}
        `;
    }
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
    const [views, weeklyViews, leads, weeklyLeads, activeProps, revenue] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM property_views`,
        sql`SELECT COUNT(*) as count FROM property_views WHERE viewed_at >= NOW() - INTERVAL '7 days'`,
        sql`SELECT COUNT(*) as count FROM leads`,
        sql`SELECT COUNT(*) as count FROM leads WHERE created_at >= NOW() - INTERVAL '7 days'`,
        sql`SELECT COUNT(*) as count FROM properties WHERE status = 'active'`,
        sql`SELECT COALESCE(SUM(value), 0) as total FROM contracts WHERE status = 'active'`,
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
