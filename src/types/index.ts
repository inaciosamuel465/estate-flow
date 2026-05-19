export interface Company {
    id: string;
    name: string;
    slug?: string;
    subdomain?: string;
    cnpj?: string;
    email?: string;
    phone?: string;
    logo_url?: string;
    favicon_url?: string;
    primary_color?: string;
    secondary_color?: string;
    status: 'active' | 'inactive' | 'suspended';
    plan?: string;
    trial_ends_at?: string;
    subscription_status: 'active' | 'overdue' | 'canceled' | 'suspended' | 'trialing';
    created_at?: string;
    updated_at?: string;
}

export interface Subscription {
    id: string;
    company_id: string;
    plan_name: string;
    status: 'active' | 'overdue' | 'canceled' | 'suspended' | 'trialing';
    payment_gateway?: string;
    gateway_subscription_id?: string;
    started_at?: string;
    expires_at?: string;
    trial?: boolean;
    created_at?: string;
}

export interface Payment {
    id: string;
    company_id: string;
    subscription_id?: string;
    gateway_payment_id?: string;
    amount: number;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    payment_method?: string;
    paid_at?: string;
    created_at?: string;
}

export interface CompanySettings {
    company_id: string;
    company_name?: string;
    logo_url?: string;
    favicon_url?: string;
    background_image?: string;
    primary_color?: string;
    secondary_color?: string;
    smtp_host?: string;
    smtp_port?: number;
    smtp_user?: string;
    smtp_password?: string;
    smtp_secure?: boolean;
    email_sender_name?: string;
    email_sender_address?: string;
    whatsapp?: string;
    instagram?: string;
    facebook?: string;
    website?: string;
    custom_css?: string;
    hero_video_url?: string;
}

export interface MasterUser {
    id: string;
    name: string;
    email: string;
    password?: string;
    role: 'admin' | 'superadmin';
    created_at?: string;
}

export interface User {
    id: number | string;
    name: string;
    email: string;
    role: 'admin' | 'owner' | 'client' | 'visitor';
    phone?: string;
    avatar?: string;
    document?: string;
    address?: string;
    favorites?: string[];
    password?: string;
    company_id?: string;
}


export interface Property {
    id: number | string;
    title: string;
    price: string;
    location: string;
    image: string;
    beds: number;
    baths: number;
    area: number;
    tag?: string;
    type: string;
    purpose: 'sale' | 'rent';
    ownerId?: number;
    status?: 'active' | 'draft' | 'sold' | 'rented';
    stats?: {
        views: number;
        likes: number;
        leads: number;
    };
    description?: string;
    amenities?: string[];
    images?: string[];
    addressDetails?: {
        street: string;
        number: string;
        neighborhood: string;
        city: string;
        state: string;
        zip: string;
    };
    lat?: number;
    lng?: number;
    x?: number;
    y?: number;
    company_id?: string;
}

export interface AppSettings {
    logoUrl?: string;
    companyName?: string;
    primaryColor?: string;
    secondaryColor?: string;
    whatsappNumber?: string;
    smtpEmail?: string;
    smtpPassword?: string;
    smtpHost?: string;
    smtpPort?: string;
    [key: string]: string | undefined;
}

export interface Contract {
    id: number | string;
    propertyId: number | string;
    propertyTitle: string;
    propertyImage: string;
    type: 'rent' | 'sale';
    status: 'active' | 'completed' | 'late' | 'draft' | 'expiring';
    clientId: number | string;
    clientName: string;
    clientPhone: string;
    ownerId: number | string;
    ownerName: string;
    ownerPhone: string;
    value: number;
    commissionRate: number;
    dueDay: number;
    startDate: string;
    endDate?: string;
    installmentsTotal?: number;
    installmentsPaid?: number;
    lastPaymentDate?: string;
    nextPaymentStatus: 'pending' | 'paid' | 'overdue';
    templateType?: 'rent_residential' | 'sale_cash' | 'sale_installments' | 'rent_termination' | 'property_management' | 'key_delivery' | 'inspection_report' | 'season_rent' | 'commercial_rent' | 'season';
    signatureStatus?: 'pending' | 'signed';
    customContent?: string;
    signatureImage?: string;
    signedAt?: string;
    publicToken?: string;
    publicTokenExpiresAt?: string;
    sentAt?: string;
    viewedAt?: string;
    version?: number;
    ownerSignatureStatus?: 'pending' | 'signed';
    ownerSignatureImage?: string;
    ownerSignedAt?: string;
    company_id?: string;
}

export interface AppNotification {
    id: string | number;
    type: 'contract' | 'payment' | 'lead' | 'property' | 'system';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    actionUrl?: string;
    icon?: string;
    priority?: 'low' | 'medium' | 'high';
    company_id?: string;
}

export type PropertyProcessType = 'rent' | 'sale' | 'season';
export type PropertyProcessStatus = 'draft' | 'in_progress' | 'blocked' | 'completed' | 'canceled';
export type PropertyProcessStepStatus = 'pending' | 'active' | 'completed' | 'blocked';
export type InspectionRoomStatus = 'ok' | 'attention' | 'bad' | 'na';

export interface PropertyProcessStep {
    id: string;
    title: string;
    description?: string;
    status: PropertyProcessStepStatus;
    order: number;
    kind?: 'start' | 'client' | 'inspection' | 'contract' | 'keys' | 'active' | 'checkout' | 'done' | 'documents';
    completedAt?: string;
}

export interface PropertyProcessEvent {
    id: string;
    processId: string;
    eventType: string;
    title: string;
    description?: string;
    userId?: string;
    createdAt?: string;
}

export interface PropertyProcessDocument {
    id: string;
    processId: string;
    propertyId: string;
    documentType: 'inspection' | 'key_delivery' | 'summary' | 'custom';
    title: string;
    fileName?: string;
    fileData?: string;
    mimeType?: string;
    sentAt?: string;
    createdAt?: string;
}

export interface InspectionRoom {
    id: string;
    name: string;
    type: string;
    status: InspectionRoomStatus;
    checklist: Record<string, InspectionRoomStatus>;
    quickNotes: string[];
    notes?: string;
    images: string[];
}

export interface PropertyInspection {
    id: string;
    processId?: string;
    propertyId: string;
    contractId?: string;
    type: 'initial' | 'final' | 'checkout' | 'key_delivery';
    status: 'draft' | 'completed';
    rooms: InspectionRoom[];
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface PropertyProcess {
    id: string;
    companyId?: string;
    propertyId: string;
    propertyTitle: string;
    propertyImage?: string;
    flowType: PropertyProcessType;
    status: PropertyProcessStatus;
    currentStepId?: string;
    clientId?: string;
    clientName?: string;
    contractId?: string;
    notes?: string;
    steps: PropertyProcessStep[];
    events?: PropertyProcessEvent[];
    documents?: PropertyProcessDocument[];
    inspections?: PropertyInspection[];
    createdAt?: string;
    updatedAt?: string;
}
