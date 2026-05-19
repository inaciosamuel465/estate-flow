import { Property, Contract, User, AppNotification as Notification, PropertyInspection, PropertyProcess, PropertyProcessDocument } from "../types";
import * as neon from "./neonService";
import type { Lead } from "./neonService";

async function hashPassword(password: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTIES
// ─────────────────────────────────────────────────────────────────────────────

export const getProperties = async (): Promise<Property[]> => {
    return await neon.getProperties();
};

export const addProperty = async (property: Property): Promise<Property> => {
    const id = await neon.addProperty(property);
    return { ...property, id };
};

export const updateProperty = async (id: string, data: Partial<Property>): Promise<boolean> => {
    try {
        await neon.updateProperty(id, data);
        return true;
    } catch (error) {
        console.error("Erro ao atualizar propriedade:", error);
        return false;
    }
};

export const deleteProperty = async (id: string): Promise<boolean> => {
    try {
        await neon.deleteProperty(id);
        return true;
    } catch (error) {
        console.error("Erro ao excluir propriedade:", error);
        return false;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// VIEWS / ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

export const trackPropertyView = async (propertyId: string, userId?: string, source = 'web'): Promise<void> => {
    try {
        await neon.trackPropertyView(propertyId, userId, source);
    } catch (error) {
        console.error("Erro ao registrar visualização:", error);
    }
};

export const getPropertyAnalytics = async (propertyId: string) => {
    return await neon.getPropertyAnalytics(propertyId);
};

export const getDashboardStats = async () => {
    return await neon.getDashboardStats();
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACTS
// ─────────────────────────────────────────────────────────────────────────────

export const getContracts = async (): Promise<Contract[]> => {
    return await neon.getContracts();
};

export const getContractById = async (id: string): Promise<Contract | null> => {
    return await neon.getContractById(id);
};

export const addContract = async (contract: Contract): Promise<Contract> => {
    try {
        const id = await neon.addContract(contract);
        return { ...contract, id };
    } catch (error) {
        console.error("Erro ao criar contrato:", error);
        throw error;
    }
};

export const updateContract = async (id: string, data: Partial<Contract>): Promise<boolean> => {
    await neon.updateContract(id, data);
    return true;
};

export const deleteContract = async (id: string): Promise<boolean> => {
    try {
        await neon.deleteContract(id);
        return true;
    } catch (error) {
        console.error("Erro ao excluir contrato:", error);
        return false;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY OPERATIONS / PROCESS JOURNEYS
// ─────────────────────────────────────────────────────────────────────────────

const apiHeaders = () => ({
    'Content-Type': 'application/json',
    ...(localStorage.getItem('ef_token') ? { Authorization: `Bearer ${localStorage.getItem('ef_token')}` } : {}),
});

const currentCompanyId = () => localStorage.getItem('estateflow_company_id') || '';

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) throw new Error(data?.error || `Erro na API (${res.status})`);
    return data.data as T;
}

export const getPropertyProcesses = async (): Promise<PropertyProcess[]> => {
    return await neon.getPropertyProcesses();
};

export const createPropertyProcess = async (data: Partial<PropertyProcess> & { propertyId: string | number; flowType: string }): Promise<PropertyProcess> => {
    return await neon.createPropertyProcess(data);
};

export const updatePropertyProcess = async (id: string, data: Partial<PropertyProcess>): Promise<PropertyProcess> => {
    return await neon.updatePropertyProcess(id, data);
};

export const savePropertyInspection = async (inspection: PropertyInspection): Promise<string> => {
    return await neon.savePropertyInspection(inspection);
};

export const getPropertyInspections = async (processId?: string, propertyId?: string | number): Promise<PropertyInspection[]> => {
    return await neon.getPropertyInspections(processId, propertyId);
};

export const saveInspectionImage = async (input: {
    inspectionId: string;
    processId?: string;
    propertyId: string | number;
    contractId?: string;
    room: string;
    category?: string;
    imageUrl: string;
    notes?: string;
}): Promise<string> => {
    return await neon.saveInspectionImage(input);
};

export const savePropertyDocument = async (input: {
    processId: string;
    propertyId: string | number;
    documentType: PropertyProcessDocument['documentType'];
    title: string;
    fileName: string;
    fileData: string;
    mimeType?: string;
}): Promise<string> => {
    return await neon.savePropertyDocument(input);
};

export const sendPropertyDocumentEmail = async (input: {
    documentId: string;
    toEmail: string;
    subject?: string;
    message?: string;
}): Promise<void> => {
    await apiJson('/api/property-documents/send-email', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
            company_id: currentCompanyId(),
            document_id: input.documentId,
            to_email: input.toEmail,
            subject: input.subject,
            message: input.message,
        }),
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// LEADS
// ─────────────────────────────────────────────────────────────────────────────

export const getLeads = async (): Promise<Lead[]> => {
    return await neon.getLeads();
};

export const addLead = async (lead: Omit<Lead, 'id' | 'createdAt'>): Promise<string> => {
    return await neon.addLead(lead);
};

export const updateLeadStatus = async (id: string, status: Lead['status']): Promise<void> => {
    await neon.updateLeadStatus(id, status);
};

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

export const getUsers = async (): Promise<User[]> => {
    return await neon.getUsers();
};

export const addUser = async (data: Omit<User, 'id'> & { password?: string }): Promise<User | null> => {
    try {
        const newUser: User = {
            ...data,
            id: `user_${Date.now()}`
        } as User;
        if (data.password) {
            (newUser as any).password = await hashPassword(data.password);
        }
        await neon.upsertUser(newUser);
        return newUser;
    } catch (error) {
        console.error("Erro ao adicionar usuário:", error);
        return null;
    }
};

export const updateUser = async (id: string, data: Partial<User>): Promise<boolean> => {
    try {
        const user = await neon.getUserById(id);
        if (user) {
            const updateData = { ...data } as any;
            if (updateData.password) {
                updateData.password = await hashPassword(updateData.password);
            }
            await neon.upsertUser({ ...user, ...updateData } as User);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        return false;
    }
};

export const deleteUser = async (id: string): Promise<boolean> => {
    try {
        await neon.deleteUser(id);
        return true;
    } catch (error) {
        console.error("Erro ao excluir usuário:", error);
        return false;
    }
};

export const toggleFavorite = async (userId: string, propertyId: string | number): Promise<string[] | null> => {
    try {
        const user = await neon.getUserById(userId);
        if (!user) return null;

        const pid = String(propertyId);
        let currentFavorites = (user.favorites || []).map(f => String(f));
        const newFavorites = currentFavorites.includes(pid)
            ? currentFavorites.filter(id => id !== pid)
            : [...currentFavorites, pid];

        await neon.upsertUser({ ...user, favorites: newFavorites });
        return newFavorites;
    } catch (error) {
        console.error("Erro ao favoritar:", error);
        return null;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getNotifications = async (userId?: string): Promise<Notification[]> => {
    if (!userId) return [];
    return await neon.getNotifications(userId) as unknown as Notification[];
};

export const addNotification = async (notification: any): Promise<void> => {
    try {
        await neon.addNotification(notification);
        
        // Trigger Push Notification via API
        fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: notification.userId,
                companyId: localStorage.getItem('estateflow_company_id'),
                title: notification.title,
                body: notification.message,
                url: notification.actionUrl || '/'
            })
        }).catch(err => console.error('Push trigger error:', err));
        
    } catch (e) {
        console.error("Erro ao adicionar notificação:", e);
    }
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
    await neon.markNotificationRead(id);
};

export const markAllNotificationsAsRead = async (userId?: string): Promise<void> => {
    if (!userId) return;
    await neon.markAllNotificationsRead(userId);
};

export const deleteNotification = async (id: string): Promise<void> => {
    await neon.deleteNotificationById(id);
};

export const clearAllNotifications = async (userId?: string): Promise<void> => {
    if (!userId) return;
    await neon.clearNotifications(userId);
};

export const subscribeToNotifications = (
    callback: (notifications: Notification[]) => void, 
    userId?: string
): (() => void) => {
    if (!userId) {
        callback([]);
        return () => {};
    }
    const fetchData = async () => {
        try {
            const notifs = await neon.getNotifications(userId);
            callback(notifs as unknown as Notification[]);
        } catch (e) {
            callback([]);
        }
    };
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY LOG
// ─────────────────────────────────────────────────────────────────────────────

export const logActivity = async (
    userId: string | undefined,
    userName: string | undefined,
    action: string,
    entityType?: string,
    entityId?: string,
    description?: string
): Promise<void> => {
    await neon.logActivity(userId, userName, action, entityType, entityId, description);
};

export const getActivityLog = async (limit = 20): Promise<any[]> => {
    return await neon.getActivityLog(limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// MARKETING CAMPAIGNS
// ─────────────────────────────────────────────────────────────────────────────

export const saveMarketingCampaign = async (data: {
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
}): Promise<string> => {
    return await neon.saveMarketingCampaign(data);
};

export const getMarketingCampaigns = async (userId: string): Promise<any[]> => {
    return await neon.getMarketingCampaigns(userId);
};

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

export const getSettings = async (): Promise<Record<string, string>> => {
    return await neon.getSettings();
};

export const updateSetting = async (key: string, value: string): Promise<void> => {
    await neon.updateSetting(key, value);
};
