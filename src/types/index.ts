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
}

export interface AppSettings {
    logoUrl?: string;
    companyName?: string;
    primaryColor?: string;
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
}
