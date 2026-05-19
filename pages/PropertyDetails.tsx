import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { User, Property } from '../src/types';
import ImageGallery from '../components/ImageGallery';
import { trackPropertyView, addLead } from '../src/services/dataService';

// --- Interface de Dados ---
interface PropertyData {
    id: number | string;
    title: string;
    address: string;
    city: string;
    price: number;
    condoFee: number;
    tax: number;
    description: string;
    specs: {
        bedrooms: number;
        bathrooms: number;
        area: number;
        parking: number;
        year: number;
    };
    amenities: string[];
    images: string[];
    agency: {
        name: string;
        phoneDisplay: string;
        phoneNumber: string; // Formato raw para APIs
        email: string;
        logo: string;
        reviews: number;
        rating: number;
    };
    coords: { lat: number; lng: number; };
}

// --- Dados da Imobiliária (Fixo) ---
const AGENCY_DATA = {
    name: "EstateFlow Imobiliária",
    phoneDisplay: "(15) 99724-1175",
    phoneNumber: "5515997241175", // Número solicitado
    email: "contato@estateflow.com",
    logo: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=200&auto=format&fit=crop",
    reviews: 1240,
    rating: 4.9
};

interface PropertyDetailsProps {
    propertyId?: number | string | null;
    properties?: Property[]; // Adicionado para dados reais
    onBack?: () => void;
    isPublic?: boolean;
    currentUser?: User | null;
    settings?: Record<string, string>;
}

const PropertyDetails: React.FC<PropertyDetailsProps> = ({ propertyId, properties = [], onBack, isPublic = false, currentUser, settings = {} }) => {
    const propertyData = useMemo(() => {
        // 1. Tentar encontrar nos dados reais do Firebase/Neon
        const realProperty = properties.find(p => String(p.id) === String(propertyId));

        if (realProperty) {
            let parsedImages: string[] = [];
            const rawImages = (realProperty as any).images;
            if (Array.isArray(rawImages)) {
                parsedImages = rawImages.filter(Boolean);
            } else if (typeof rawImages === 'string') {
                try {
                    const parsed = JSON.parse(rawImages);
                    if (Array.isArray(parsed)) parsedImages = parsed.filter(Boolean);
                } catch (e) { }
            }

            let finalImages = parsedImages.length > 0 ? parsedImages : (realProperty.image ? [realProperty.image] : []);
            if (finalImages.length === 0 || !finalImages[0]) {
                finalImages = ["/images/fallback-imovel.jpg"];
            }

            return {
                id: realProperty.id,
                title: realProperty.title,
                address: realProperty.addressDetails?.street || realProperty.location.split(',')[0],
                city: realProperty.addressDetails?.city || realProperty.location.split(',')[1]?.trim() || 'São Paulo, SP',
                price: typeof realProperty.price === 'string' ? parseInt(realProperty.price.replace(/\D/g, '')) : realProperty.price,
                condoFee: 0,
                tax: 0,
                description: realProperty.description || "Sem descrição disponível.",
                specs: {
                    bedrooms: realProperty.beds || 0,
                    bathrooms: realProperty.baths || 0,
                    area: realProperty.area || 0,
                    parking: 1, // Default
                    year: 2024
                },
                amenities: realProperty.amenities || [],
                images: finalImages,
                agency: {
                    ...AGENCY_DATA,
                    name: settings.companyName || AGENCY_DATA.name,
                    logo: settings.logoUrl || AGENCY_DATA.logo,
                },
                coords: { 
                    lat: realProperty.lat ? Number(realProperty.lat) : 0, 
                    lng: realProperty.lng ? Number(realProperty.lng) : 0 
                }
            } as PropertyData;
        }

        return null;
    }, [propertyId, properties]);

    const [activeTab, setActiveTab] = useState<'photos' | 'video' | 'tour' | 'floorplan'>('photos');
    const [showRealMap, setShowRealMap] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
    const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    // Calculadora de Financiamento
    const [calcDownPayment, setCalcDownPayment] = useState(20);
    const [calcMonths, setCalcMonths] = useState(360);
    const [calcRate, setCalcRate] = useState(0.8); // % ao mês
    const financedAmount = propertyData ? propertyData.price * (1 - calcDownPayment / 100) : 0;
    const monthlyPayment = financedAmount > 0
        ? (financedAmount * (calcRate / 100)) / (1 - Math.pow(1 + calcRate / 100, -calcMonths))
        : 0;

    // Estado para o Modal de Negociação
    const [showNegotiationModal, setShowNegotiationModal] = useState(false);

    // --- Handlers de Ação ---

    const handleShare = () => {
        // Cria o link direto para este imóvel usando o ID
        const url = `${window.location.origin}${window.location.pathname}?id=${propertyData.id}`;
        navigator.clipboard.writeText(url);
        alert(`Link do anúncio copiado!\n${url}`);
    };

    const handleCall = () => {
        if (!propertyData) return;
        window.location.href = `tel:${propertyData.agency.phoneNumber}`;
    };

    const handleEmail = () => {
        if (!propertyData) return;
        window.location.href = `mailto:${propertyData.agency.email}?subject=Interesse no Imóvel: ${propertyData.title}`;
    };

    const openLightbox = (index: number) => {
        setCurrentImageIndex(index);
        setLightboxOpen(true);
    };

    const closeLightbox = () => setLightboxOpen(false);

    const nextImage = useCallback((e?: React.MouseEvent) => {
        if (!propertyData) return;
        e?.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % propertyData.images.length);
    }, [propertyData?.images?.length]);

    const prevImage = useCallback((e?: React.MouseEvent) => {
        if (!propertyData) return;
        e?.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + propertyData.images.length) % propertyData.images.length);
    }, [propertyData?.images?.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!lightboxOpen) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') nextImage();
            if (e.key === 'ArrowLeft') prevImage();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxOpen, nextImage, prevImage]);

    // Track property view in Neon when page loads for a real property
    useEffect(() => {
        const realProperty = properties.find(p => String(p.id) === String(propertyId));
        if (realProperty && propertyId) {
            trackPropertyView(
                String(propertyId),
                currentUser?.id ? String(currentUser.id) : undefined,
                isPublic ? 'public' : 'admin'
            ).catch(() => {});
        }
    }, [propertyId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormStatus('sending');
        try {
            // Calcular score de intenção baseado em dados do formulário
            const messageScore = contactForm.message.length > 50 ? 20 : contactForm.message.length > 20 ? 10 : 0;
            const phoneScore = contactForm.phone ? 20 : 0;
            const baseScore = 60; // base para quem preencheu o formulário
            const intentScore = Math.min(100, baseScore + messageScore + phoneScore);

            // Salvar lead no banco
            await addLead({
                propertyId: String(propertyId || propertyData?.id),
                propertyTitle: propertyData?.title,
                name: contactForm.name,
                email: contactForm.email,
                phone: contactForm.phone,
                message: contactForm.message || `Solicitação de informações via página do imóvel`,
                status: 'new',
                score: intentScore,
                source: isPublic ? 'website_public' : 'website_admin',
            });

            // Disparar email de confirmação ao lead e notificação ao admin
            const agencyEmail = propertyData?.agency?.email || '';
            if (agencyEmail || contactForm.email) {
                const firstPathSegment = window.location.pathname.split('/').filter(Boolean)[0] || '';
                const adminAnalyticsUrl = firstPathSegment
                    ? `${window.location.origin}/${firstPathSegment}/admin/ai-analytics`
                    : `${window.location.origin}/`;
                const emailPayload = {
                    // Email para o admin/imobiliária
                    to: agencyEmail,
                    subject: `🏠 Novo Lead: ${propertyData?.title}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #1e293b;">Novo Lead Recebido!</h2>
                            <p style="color: #64748b;">Um cliente demonstrou interesse em <strong>${propertyData?.title}</strong>.</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Nome</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${contactForm.name}</td></tr>
                                <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Email</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${contactForm.email}</td></tr>
                                <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Telefone</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${contactForm.phone}</td></tr>
                                <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Mensagem</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${contactForm.message || 'N/A'}</td></tr>
                                <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Score de Intenção</td><td style="padding: 8px; border: 1px solid #e2e8f0; color: ${intentScore >= 80 ? '#dc2626' : '#d97706'};"><strong>${intentScore}/100</strong></td></tr>
                            </table>
                            <a href="${adminAnalyticsUrl}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Ver Lead no CRM</a>
                        </div>
                    `
                };
                fetch('/api/email/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(emailPayload)
                }).catch(() => {}); // Não bloquear o fluxo se o email falhar
            }

            setFormStatus('success');
            setTimeout(() => setFormStatus('idle'), 4000);
            setContactForm({ name: '', email: '', phone: '', message: '' });
        } catch (e) {
            console.error('Lead save error:', e);
            setFormStatus('error');
            setTimeout(() => setFormStatus('idle'), 3000);
        }
    };

    // --- Handlers de Negociação ---

    const handleNegotiateClick = () => {
        // Abre o modal de escolha
        setShowNegotiationModal(true);
    };

    const handleWhatsApp = () => {
        // Monta mensagem pré-definida com dados do imóvel
        const message = `Olá, tenho interesse no imóvel: ${propertyData.title}. \nValor: R$ ${propertyData.price.toLocaleString('pt-BR')}. \nLocalização: ${propertyData.city}. \nGostaria de mais informações.`;

        // Cria link da API do WhatsApp
        const url = `https://wa.me/${propertyData.agency.phoneNumber}?text=${encodeURIComponent(message)}`;

        // Abre em nova aba
        window.open(url, '_blank');
        setShowNegotiationModal(false);
    };

    if (!propertyData) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="size-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-4xl">error</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Imóvel não encontrado</h1>
                <p className="text-slate-500 mb-8 max-w-md">O anúncio que você procura não existe ou foi removido da nossa base de dados.</p>
                <button
                    onClick={onBack}
                    className="h-12 px-8 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                    Voltar para Início
                </button>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 h-full overflow-y-auto flex flex-col font-display text-slate-900 antialiased transition-colors duration-200">

            {/* Top Navigation */}
            <header className={`sticky top-0 z-40 w-full border-b border-solid border-slate-200 bg-white/90 backdrop-blur-md ${isPublic ? 'shadow-sm' : ''}`}>
                <div className="flex items-center justify-between whitespace-nowrap px-4 lg:px-10 py-3 max-w-[1440px] mx-auto">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="mr-2 p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined notranslate">arrow_back</span>
                                {isPublic && <span className="text-sm font-bold">Voltar</span>}
                            </button>
                        )}
                        {!isPublic && (
                            <div className="flex items-center gap-2 text-slate-900">
                                <div className="size-8 text-primary">
                                    <span className="material-symbols-outlined notranslate text-[32px]">roofing</span>
                                </div>
                                <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">EstateFlow</h2>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {isPublic ? (
                            <button
                                onClick={handleNegotiateClick}
                                className="bg-primary text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
                            >
                                <span className="material-symbols-outlined notranslate text-[18px]">handshake</span>
                                Negociar Agora
                            </button>
                        ) : (
                            <div className="bg-center bg-no-repeat bg-cover rounded-full size-9 ring-2 ring-slate-200 cursor-pointer" style={{ backgroundImage: `url("${propertyData.agency.logo}")` }}></div>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-grow w-full max-w-[1280px] mx-auto px-4 lg:px-8 py-6 pb-32 md:pb-6">
                {/* Breadcrumbs */}
                <div className="flex flex-wrap gap-2 items-center mb-4 text-sm">
                    <button onClick={onBack} className="text-slate-500 hover:text-primary font-medium transition-colors">Imóveis</button>
                    <span className="material-symbols-outlined notranslate text-slate-400 text-[16px]">chevron_right</span>
                    <span className="text-slate-900 font-medium truncate max-w-[200px]">{propertyData.title}</span>
                </div>

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500/10 text-green-600 border border-green-500/20 uppercase tracking-wide">Venda</span>
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-600 uppercase tracking-wide">Imóvel #{propertyData.id}</span>
                        </div>
                        <h1 className="text-2xl md:text-4xl font-bold text-slate-900 leading-tight mb-2">{propertyData.title}</h1>
                        <div className="flex items-center gap-1 text-slate-500">
                            <span className="material-symbols-outlined notranslate text-[20px]">location_on</span>
                            <p className="text-base font-medium">{propertyData.address} - {propertyData.city}</p>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={handleShare}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition-colors active:scale-95"
                        >
                            <span className="material-symbols-outlined notranslate text-[20px]">share</span> Compartilhar
                        </button>
                        <button
                            onClick={() => {
                                if (!currentUser) { alert("Faça login para salvar."); return; }
                                setIsSaved(!isSaved);
                            }}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-bold transition-colors active:scale-95 ${isSaved ? 'text-rose-500' : 'text-slate-700'}`}
                        >
                            <span className={`material-symbols-outlined notranslate text-[20px] ${isSaved ? 'fill-current' : ''}`}>favorite</span> {isSaved ? 'Salvo' : 'Salvar'}
                        </button>
                    </div>
                </div>

                {/* Media Tabs */}
                <div className="border-b border-slate-200 mb-6">
                    <div className="flex gap-6 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'photos', icon: 'image', label: 'Fotos' },
                            { id: 'video', icon: 'videocam', label: 'Vídeo' },
                            { id: 'tour', icon: 'view_in_ar', label: 'Tour 360°' },
                            { id: 'floorplan', icon: 'floor_lamp', label: 'Planta' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`group flex items-center gap-2 pb-3 border-b-[3px] transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                                    }`}
                            >
                                <span className={`material-symbols-outlined notranslate text-[20px] ${activeTab === tab.id ? 'fill-current' : ''} group-hover:scale-110 transition-transform`}>{tab.icon}</span>
                                <span className="text-sm font-bold">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Gallery / Media Content */}
                <div className="mb-8 h-[400px] md:h-[500px] bg-slate-100 rounded-2xl overflow-hidden relative shadow-md">
                    {activeTab === 'photos' && (
                        <div className="h-full relative group">
                            {/* --- MOBILE: SWIPE GALLERY --- */}
                            <div className="md:hidden flex h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth remove-scroll-visual">
                                {propertyData.images.map((img, idx) => (
                                    <div key={idx} className="flex-shrink-0 w-full h-full snap-center relative">
                                        <img src={img} className="w-full h-full object-cover" alt={`${propertyData.title} foto ${idx + 1}`} />
                                    </div>
                                ))}
                                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur text-white text-xs px-3 py-1 rounded-full font-bold">
                                    {propertyData.images.length} Fotos
                                </div>
                            </div>

                            {/* --- DESKTOP: GRID GALLERY --- */}
                            <div className="hidden md:grid grid-cols-4 gap-3 h-full p-0">
                                <div
                                    onClick={() => openLightbox(0)}
                                    className="col-span-2 row-span-2 relative group overflow-hidden cursor-pointer h-full rounded-l-xl"
                                >
                                    <img src={propertyData.images[0]} alt="Imagem Principal" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                </div>
                                {propertyData.images.slice(1, 5).map((img, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => openLightbox(idx + 1)}
                                        className="relative group overflow-hidden cursor-pointer h-full"
                                    >
                                        <img src={img} alt={`Foto ${idx + 2}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>

                                        {idx === 3 && idx === propertyData.images.slice(1, 5).length - 1 && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:bg-black/60 transition-colors">
                                                <span className="text-white font-bold text-lg flex items-center gap-2">
                                                    <span className="material-symbols-outlined notranslate">grid_view</span> Ver todas
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab !== 'photos' && (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined notranslate text-6xl mb-4 opacity-20">
                                {activeTab === 'video' ? 'videocam_off' : activeTab === 'tour' ? '360' : 'architecture'}
                            </span>
                            <p className="font-medium">Mídia não disponível na demonstração</p>
                            <button onClick={() => setActiveTab('photos')} className="mt-4 text-primary font-bold hover:underline">Voltar para Fotos</button>
                        </div>
                    )}
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                            {[
                                { icon: 'bed', label: 'Quartos', val: propertyData.specs.bedrooms },
                                { icon: 'bathtub', label: 'Banheiros', val: propertyData.specs.bathrooms },
                                { icon: 'square_foot', label: 'Área', val: `${propertyData.specs.area} m²` },
                                { icon: 'garage', label: 'Vagas', val: propertyData.specs.parking },
                                { icon: 'calendar_month', label: 'Ano', val: propertyData.specs.year }
                            ].map(stat => (
                                <div key={stat.label} className="flex flex-col items-center justify-center text-center gap-1">
                                    <span className="material-symbols-outlined notranslate text-primary text-[24px]">{stat.icon}</span>
                                    <span className="text-sm text-slate-500 font-medium">{stat.label}</span>
                                    <span className="text-lg font-bold text-slate-900">{stat.val}</span>
                                </div>
                            ))}
                        </div>

                        {/* About Section */}
                        <div id="about" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Sobre o Imóvel</h3>
                            <div className={`prose max-w-none text-slate-600 leading-relaxed overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[1000px]' : 'max-h-[150px] relative'}`}>
                                <p className="whitespace-pre-line">{propertyData.description}</p>
                                {!isExpanded && (
                                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent"></div>
                                )}
                            </div>
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="mt-2 text-primary font-bold text-sm flex items-center gap-1 hover:underline focus:outline-none"
                            >
                                {isExpanded ? 'Ler menos' : 'Ler mais'} <span className={`material-symbols-outlined notranslate text-[16px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>
                        </div>

                        {/* Amenities Section */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-6">Características e Amenidades</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
                                {propertyData.amenities.map(feat => (
                                    <div key={feat} className="flex items-center gap-3">
                                        <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                            <span className="material-symbols-outlined notranslate text-[14px] font-bold">check</span>
                                        </div>
                                        <span className="text-slate-700 text-sm">{feat}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Financials Section */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Financeiro</h3>
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                                    <span className="text-slate-600">Preço de Venda</span>
                                    <span className="text-lg font-bold text-slate-900">R$ {propertyData.price.toLocaleString('pt-BR')}</span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-slate-600">Condomínio</span>
                                        <span className="text-xs text-slate-400">Mensal</span>
                                    </div>
                                    <span className="text-lg font-medium text-slate-900">R$ {propertyData.condoFee.toLocaleString('pt-BR')}</span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-slate-600">IPTU</span>
                                        <span className="text-xs text-slate-400">Mensal est.</span>
                                    </div>
                                    <span className="text-lg font-medium text-slate-900">R$ {propertyData.tax.toLocaleString('pt-BR')}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-slate-900 font-bold text-lg">Custo Mensal Total</span>
                                    <span className="text-2xl font-extrabold text-primary">R$ {(propertyData.condoFee + propertyData.tax).toLocaleString('pt-BR')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Location Section */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Localização</h3>
                            {propertyData.coords.lat !== 0 && propertyData.coords.lng !== 0 ? (
                                <div className="w-full h-80 rounded-xl overflow-hidden relative bg-slate-200 border border-slate-200">
                                    {showRealMap ? (
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            frameBorder="0"
                                            style={{ border: 0 }}
                                            src={`https://maps.google.com/maps?q=${propertyData.coords.lat},${propertyData.coords.lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                            allowFullScreen
                                            loading="lazy"
                                            title="Localização do Imóvel"
                                        ></iframe>
                                    ) : (
                                        <>
                                            <div className="w-full h-full bg-cover bg-center filter grayscale opacity-60" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?q=80&w=800&auto=format&fit=crop")' }}></div>
                                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                                <button
                                                    onClick={() => setShowRealMap(true)}
                                                    className="px-6 py-3 bg-white text-slate-900 rounded-full font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-2 group"
                                                >
                                                    <span className="material-symbols-outlined notranslate text-primary group-hover:animate-bounce">map</span> Explorar Vizinhança
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
                                    <div className="size-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                                        <span className="material-symbols-outlined">location_off</span>
                                    </div>
                                    <p className="text-slate-600 font-bold">Mapa Indisponível</p>
                                    <p className="text-sm text-slate-500 max-w-xs mt-1">O endereço exato deste imóvel não pôde ser geolocalizado, mas você pode conferir os detalhes acima.</p>
                                    <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 w-full">
                                        <p className="text-xs text-slate-400 uppercase font-bold mb-1">Endereço Informado</p>
                                        <p className="text-sm text-slate-800">{propertyData.address} - {propertyData.city}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Sticky Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 flex flex-col gap-6">
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl shadow-slate-200/50">
                                <div className="mb-6">
                                    <p className="text-sm text-slate-500 mb-1">Valor Total</p>
                                    <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">R$ {propertyData.price.toLocaleString('pt-BR')}</h2>
                                </div>
                                <div className="flex flex-col gap-3 mb-6">
                                    {isPublic ? (
                                        <button
                                            onClick={handleNegotiateClick}
                                            className="w-full py-3.5 px-4 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold text-base shadow-lg shadow-primary/25 transition-all flex justify-center items-center gap-2 active:scale-95 animate-pulse-slow"
                                        >
                                            <span className="material-symbols-outlined notranslate text-[20px]">handshake</span> Negociar Agora
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
                                            className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-base shadow-lg shadow-primary/25 transition-all flex justify-center items-center gap-2 active:scale-95"
                                        >
                                            <span className="material-symbols-outlined notranslate">calendar_today</span> Agendar Visita
                                        </button>
                                    )}
                                    <button
                                        onClick={handleShare}
                                        className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-bold text-base transition-colors flex justify-center items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined notranslate">share</span> Compartilhar
                                    </button>
                                </div>
                                {/* Agency Profile */}
                                <div className="pt-6 border-t border-slate-100">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="relative">
                                            <div className="size-14 rounded-full bg-slate-300 bg-cover bg-center border-2 border-white" style={{ backgroundImage: `url("${propertyData.agency.logo}")` }}></div>
                                            <div className="absolute -bottom-0 -right-0 size-4 bg-green-500 rounded-full border-2 border-white"></div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 leading-tight">{propertyData.agency.name}</h4>
                                            <p className="text-xs text-slate-500 mt-1">Imobiliária Parceira</p>
                                            <div className="flex gap-1 mt-1 text-yellow-400 text-sm items-center">
                                                <span className="material-symbols-outlined notranslate text-[16px] fill-current">star</span>
                                                <span className="font-bold text-slate-700 ml-1">{propertyData.agency.rating}</span>
                                                <span className="text-slate-400 ml-1 font-medium">({propertyData.agency.reviews} avaliações)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-sm gap-2">
                                        <button
                                            onClick={handleCall}
                                            className="flex-1 py-2 text-slate-600 bg-slate-50 hover:bg-primary hover:text-white rounded-lg font-bold flex justify-center items-center gap-2 transition-all"
                                        >
                                            <span className="material-symbols-outlined notranslate text-[18px]">call</span> Ligar
                                        </button>
                                        <button
                                            onClick={handleEmail}
                                            className="flex-1 py-2 text-slate-600 bg-slate-50 hover:bg-primary hover:text-white rounded-lg font-bold flex justify-center items-center gap-2 transition-all"
                                        >
                                            <span className="material-symbols-outlined notranslate text-[18px]">mail</span> Email
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div id="contact-form" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="material-symbols-outlined text-primary text-[20px]">contact_mail</span>
                                    <h4 className="font-bold text-slate-900">Solicitar Informações</h4>
                                </div>
                                <p className="text-xs text-slate-400 mb-4">Resposta garantida em até 2 horas.
                                </p>
                                {formStatus === 'success' ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in">
                                        <div className="size-14 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-3">
                                            <span className="material-symbols-outlined notranslate text-3xl">check_circle</span>
                                        </div>
                                        <p className="text-slate-900 font-bold text-lg">Mensagem Enviada!</p>
                                        <p className="text-sm text-slate-500 mt-1">Nossa equipe entrará em contato em breve.</p>
                                        <button
                                            onClick={handleWhatsApp}
                                            className="mt-4 w-full py-2.5 bg-[#25D366] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-all"
                                        >
                                            <span className="material-symbols-outlined notranslate text-[18px]">chat</span>
                                            Falar no WhatsApp também
                                        </button>
                                    </div>
                                ) : formStatus === 'error' ? (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                        <div className="size-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-3">
                                            <span className="material-symbols-outlined notranslate text-2xl">error_outline</span>
                                        </div>
                                        <p className="text-rose-600 font-bold">Erro ao enviar</p>
                                        <p className="text-sm text-slate-500 mt-1">Tente novamente ou entre pelo WhatsApp.</p>
                                        <button onClick={handleWhatsApp} className="mt-3 w-full py-2.5 bg-[#25D366] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined notranslate text-[18px]">chat</span> WhatsApp
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleContactSubmit} className="flex flex-col gap-3">
                                        <input
                                            className="w-full h-11 px-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                                            placeholder="Seu Nome *"
                                            type="text"
                                            required
                                            value={contactForm.name}
                                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                        />
                                        <input
                                            className="w-full h-11 px-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                                            placeholder="WhatsApp / Telefone *"
                                            type="tel"
                                            required
                                            value={contactForm.phone}
                                            onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                                        />
                                        <input
                                            className="w-full h-11 px-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                                            placeholder="Email"
                                            type="email"
                                            value={contactForm.email}
                                            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                        />
                                        <textarea
                                            className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
                                            placeholder="Mensagem (opcional): Qual sua dúvida ou interesse?"
                                            rows={3}
                                            value={contactForm.message}
                                            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                        />
                                        <button
                                            className="mt-1 w-full h-11 rounded-xl bg-primary hover:bg-blue-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95"
                                            type="submit"
                                            disabled={formStatus === 'sending'}
                                        >
                                            {formStatus === 'sending' ? (
                                                <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined notranslate text-[18px]">send</span>
                                                    Quero Saber Mais
                                                </>
                                            )}
                                        </button>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="h-px flex-1 bg-slate-100" />
                                            <span className="text-xs text-slate-400 font-medium">ou</span>
                                            <div className="h-px flex-1 bg-slate-100" />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleWhatsApp}
                                            className="w-full py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                                        >
                                            <span className="material-symbols-outlined notranslate text-[18px]">chat</span>
                                            Conversar pelo WhatsApp
                                        </button>
                                    </form>
                                )}
                            </div>

                            {/* Calculadora de Financiamento */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-emerald-600 text-[20px]">calculate</span>
                                    <h4 className="font-bold text-slate-900">Simulador de Financiamento</h4>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>Entrada: <strong className="text-slate-800">{calcDownPayment}%</strong></span>
                                            <span>R$ {(propertyData ? propertyData.price * calcDownPayment / 100 : 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                                        </div>
                                        <input
                                            type="range" min={10} max={80} step={5}
                                            value={calcDownPayment}
                                            onChange={e => setCalcDownPayment(Number(e.target.value))}
                                            className="w-full h-2 accent-primary cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>Prazo: <strong className="text-slate-800">{calcMonths / 12} anos</strong></span>
                                            <span>{calcMonths} parcelas</span>
                                        </div>
                                        <input
                                            type="range" min={60} max={420} step={60}
                                            value={calcMonths}
                                            onChange={e => setCalcMonths(Number(e.target.value))}
                                            className="w-full h-2 accent-primary cursor-pointer"
                                        />
                                    </div>
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                        <p className="text-xs text-emerald-700 font-medium mb-1">Parcela Estimada</p>
                                        <p className="text-2xl font-extrabold text-emerald-700">
                                            R$ {monthlyPayment.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}<span className="text-sm font-bold">/mês</span>
                                        </p>
                                        <p className="text-xs text-emerald-600 mt-1">Financiado: R$ {financedAmount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} | Taxa {calcRate}% a.m.</p>
                                    </div>
                                    <button
                                        onClick={handleNegotiateClick}
                                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                                    >
                                        <span className="material-symbols-outlined notranslate text-[18px]">handshake</span>
                                        Quero Este Financiamento
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* --- MOBILE STICKY ACTION BAR --- */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-50 flex items-center gap-3 safe-area-pb shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                <div className="flex-1">
                    <p className="text-xs text-slate-500 font-bold uppercase">Preço de Venda</p>
                    <p className="text-xl font-extrabold text-slate-900">R$ {propertyData.price.toLocaleString('pt-BR')}</p>
                </div>
                <button
                    onClick={handleNegotiateClick}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 active:scale-95 transition-transform flex items-center gap-2"
                >
                    <span className="material-symbols-outlined notranslate text-[20px]">handshake</span> Negociar
                </button>
            </div>

            {/* Footer */}
            <footer className="mt-12 py-10 border-t border-slate-200 bg-white">
                <div className="max-w-[1280px] mx-auto px-4 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2 text-slate-900">
                            <span className="material-symbols-outlined notranslate text-primary text-[24px]">roofing</span>
                            <span className="font-bold text-lg">EstateFlow</span>
                        </div>
                        <div className="flex gap-6 text-sm text-slate-500">
                            <span className="text-slate-400">Privacidade</span>
                            <span className="text-slate-400">Termos</span>
                            <span className="text-slate-400">Ajuda</span>
                        </div>
                        <p className="text-sm text-slate-400">© 2024 EstateFlow Inc.</p>
                    </div>
                </div>
            </footer>

            {/* Lightbox Overlay (Substituído pela Galeria Avançada) */}
            {lightboxOpen && (
                <ImageGallery
                    images={propertyData.images}
                    initialIndex={currentImageIndex}
                    onClose={() => setLightboxOpen(false)}
                />
            )}

            {/* Modal de Negociação */}
            {showNegotiationModal && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200" onClick={() => setShowNegotiationModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative scale-100 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setShowNegotiationModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <span className="material-symbols-outlined notranslate">close</span>
                        </button>

                        <div className="text-center mb-6">
                            <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                                <span className="material-symbols-outlined notranslate text-4xl">handshake</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Como deseja negociar?</h3>
                            <p className="text-sm text-slate-500 mt-2">Escolha a melhor forma de falar com nossos especialistas sobre o imóvel <b>{propertyData.title}</b>.</p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleWhatsApp}
                                className="w-full py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-500/20 active:scale-95"
                            >
                                <span className="material-symbols-outlined notranslate text-2xl">chat</span>
                                Conversar pelo WhatsApp
                            </button>

                        </div>

                        <div className="mt-6 text-center">
                            <p className="text-xs text-slate-400">Nosso tempo médio de resposta é de 5 minutos.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyDetails;
