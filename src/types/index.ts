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
    templateType?: 'rent_residential' | 'sale_cash' | 'season';
    signatureStatus?: 'pending' | 'signed';
    customContent?: string;
    signatureImage?: string;
    signedAt?: string;
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
