import React, { useState, useEffect, useRef } from 'react';
import { Property } from '../src/types';
import { generateMarketingContent } from '../src/services/aiAnalyticsService';
import { saveMarketingCampaign, getMarketingCampaigns } from '../src/services/dataService';
import type { User } from '../src/types';
import { toPng } from 'html-to-image';

interface MarketingStudioProps {
    properties: Property[];
    currentUser: User | null;
}

const PLATFORMS = [
    { id: 'instagram', label: 'Instagram', icon: 'photo_camera', color: 'from-pink-500 via-purple-500 to-indigo-500' },
    { id: 'whatsapp', label: 'WhatsApp', icon: 'chat', color: 'from-emerald-500 to-green-600' },
    { id: 'facebook', label: 'Facebook', icon: 'thumb_up', color: 'from-blue-600 to-blue-800' },
    { id: 'tiktok', label: 'TikTok', icon: 'music_note', color: 'from-black via-slate-800 to-slate-900' },
];

const TEMPLATES = [
    { 
        id: 'classic-overlay', 
        label: 'Classic Overlay', 
        desc: 'Texto sobreposto à imagem com gradiente suave.',
        layout: 'classic'
    },
    { 
        id: 'luxury-card', 
        label: 'Luxury Card', 
        desc: 'Card inferior elegante com logo superior. Estilo luxo.',
        layout: 'card'
    },
    { 
        id: 'urgent-card', 
        label: 'Action Card', 
        desc: 'Foco em conversão e urgência. Cores quentes.',
        layout: 'card-urgent'
    },
    { 
        id: 'minimal-card', 
        label: 'Minimal Card', 
        desc: 'Design limpo, minimalista e direto ao ponto.',
        layout: 'card-minimal'
    },
];

const COLORS = [
    { label: 'Azul Flowe', hex: '#2b6cee', tailwind: 'bg-primary' },
    { label: 'Azul Escuro', hex: '#1e40af', tailwind: 'bg-blue-800' },
    { label: 'Preto', hex: '#000000', tailwind: 'bg-black' },
    { label: 'Branco', hex: '#ffffff', tailwind: 'bg-white' },
    { label: 'Vermelho', hex: '#dc2626', tailwind: 'bg-red-600' },
    { label: 'Verde Esmeralda', hex: '#047857', tailwind: 'bg-emerald-700' },
    { label: 'Dourado Escuro', hex: '#b8955c', tailwind: 'bg-[#b8955c]' },
    { label: 'Cinza Escuro', hex: '#1a202c', tailwind: 'bg-[#1a202c]' },
];

const TEXT_COLORS = [
    { label: 'Branco', value: 'text-white' },
    { label: 'Preto', value: 'text-black' },
    { label: 'Azul Flowe', value: 'text-primary' },
    { label: 'Dourado', value: 'text-[#d4af37]' },
    { label: 'Vermelho', value: 'text-red-600' },
];

const OPACITIES = [
    { label: 'Sólido (100%)', value: 1, blur: '0px' },
    { label: 'Vidro (90%)', value: 0.9, blur: '12px' },
    { label: 'Translúcido (80%)', value: 0.8, blur: '16px' },
    { label: 'Transparente (50%)', value: 0.5, blur: '24px' },
];

const ICONS = [
    { label: 'Localização', value: 'location_on' },
    { label: 'Quartos/Camas', value: 'bed' },
    { label: 'Banheiros/Suítes', value: 'shower' },
    { label: 'Área/Tamanho', value: 'square_foot' },
    { label: 'Câmera/Vistas', value: 'photo_camera' },
    { label: 'Bússola/Orientação', value: 'explore' },
    { label: 'Garagem', value: 'directions_car' },
    { label: 'Piscina', value: 'pool' },
];

// Helper para converter HEX para RGBA para transparência real
const hexToRgba = (hex: string, alpha: number) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const waitForImages = async (root: HTMLElement) => {
    const images = Array.from(root.querySelectorAll('img'));
    await Promise.all(images.map(img => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise<void>(resolve => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
        });
    }));
};

const MarketingStudio: React.FC<MarketingStudioProps> = ({ properties, currentUser }) => {
    const [selectedPropertyId, setSelectedPropertyId] = useState('');
    const [platform, setPlatform] = useState<'instagram' | 'whatsapp' | 'facebook' | 'tiktok'>('instagram');
    const [template, setTemplate] = useState('classic-overlay');
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCaption, setGeneratedCaption] = useState('');
    const [campaignHistory, setCampaignHistory] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'setup' | 'editor' | 'history'>('setup');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Modal state for history
    const [selectedCampaign, setSelectedCampaign] = useState<any>(null);

    const artboardRef = useRef<HTMLDivElement>(null);

    // Editor State
    const [editorState, setEditorState] = useState({
        brandName: 'ESTATE FLOW',
        badgeText: 'VENDA',
        badgeBgColor: 'bg-primary',
        badgeBgHex: '#2b6cee',
        badgeTextColor: 'text-white',
        title: 'SUA NOVA VIDA COMEÇA AQUI',
        subtitle: 'Imóvel Exclusivo',
        feature1Icon: 'location_on',
        feature1Label: 'Localização',
        feature1Value: 'Privilegiada',
        feature2Icon: 'bed',
        feature2Label: 'Quartos',
        feature2Value: '4 Suítes',
        feature3Icon: 'square_foot',
        feature3Label: 'Área',
        feature3Value: '250m²',
        price: 'Consulte o Valor',
        ctaText: 'FALE COM UM ESPECIALISTA',
        ctaBgColor: 'bg-[#1a202c]',
        ctaBgHex: '#1a202c',
        ctaTextColor: 'text-white',
        cardBgColor: 'bg-white',
        cardBgHex: '#ffffff',
        cardOpacity: 0.9, 
        cardBlur: '12px',
        cardTextColor: 'text-[#1a202c]',
    });

    const updateEditor = (field: keyof typeof editorState, value: any) => {
        setEditorState(prev => ({ ...prev, [field]: value }));
    };

    const handleColorChange = (type: 'badge' | 'cta' | 'card', hexColor: string) => {
        const colorObj = COLORS.find(c => c.hex === hexColor);
        if (!colorObj) return;
        
        if (type === 'badge') {
            updateEditor('badgeBgHex', hexColor);
            updateEditor('badgeBgColor', colorObj.tailwind);
        } else if (type === 'cta') {
            updateEditor('ctaBgHex', hexColor);
            updateEditor('ctaBgColor', colorObj.tailwind);
        } else if (type === 'card') {
            updateEditor('cardBgHex', hexColor);
            updateEditor('cardBgColor', colorObj.tailwind);
        }
    };

    const selectedProperty = properties.find(p => p.id.toString() === selectedPropertyId);
    const propertyImages = selectedProperty?.images?.length
        ? selectedProperty.images
        : selectedProperty?.image
            ? [selectedProperty.image]
            : ['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200'];
    const displayImage = propertyImages[selectedImageIndex] || propertyImages[0];

    const currentTemplate = TEMPLATES.find(t => t.id === template) || TEMPLATES[0];

    useEffect(() => {
        if (currentUser.id) {
            getMarketingCampaigns(String(currentUser.id)).then(setCampaignHistory).catch(() => {});
        }
    }, [currentUser.id]);

    useEffect(() => {
        if (selectedProperty) {
            updateEditor('title', selectedProperty.title.toUpperCase());
            updateEditor('price', selectedProperty.price || 'Consulte');
            updateEditor('feature1Value', selectedProperty.location || 'Exclusiva');
            if (selectedProperty.beds) updateEditor('feature2Value', `${selectedProperty.beds} Quartos`);
            if (selectedProperty.area) updateEditor('feature3Value', `${selectedProperty.area}m²`);
        }
    }, [selectedPropertyId]);

    const handleGenerate = async () => {
        if (!selectedProperty) { alert('Selecione um imóvel!'); return; }
        setIsGenerating(true);
        setActiveTab('editor');
        try {
            const result = await generateMarketingContent(selectedProperty, platform, 'story', 'professional');
            setGeneratedCaption(result.caption);
            if (result.headline) updateEditor('title', result.headline.toUpperCase());
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async () => {
        if (!artboardRef.current) return;
        setIsDownloading(true);
        try {
            await document.fonts.ready.catch(() => undefined);
            await waitForImages(artboardRef.current);
            const dataUrl = await toPng(artboardRef.current, {
                quality: 1.0,
                pixelRatio: 2,
                cacheBust: true,
                backgroundColor: '#0f172a',
                imagePlaceholder: displayImage,
            });
            const link = document.createElement('a');
            link.download = `campanha-${selectedProperty.title || 'flowe'}.png`;
            link.href = dataUrl;
            link.click();
        } catch (e) {
            console.error(e);
            alert('Erro ao baixar a imagem. Tente novamente.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSave = async () => {
        if (!generatedCaption || !selectedProperty || !currentUser.id) return;
        setIsSaving(true);
        
        let finalImageUrl = displayImage;
        
        try {
            if (artboardRef.current) {
                await document.fonts.ready.catch(() => undefined);
                await waitForImages(artboardRef.current);
                finalImageUrl = await toPng(artboardRef.current, {
                    quality: 0.95,
                    pixelRatio: 2,
                    cacheBust: true,
                    backgroundColor: '#0f172a',
                    imagePlaceholder: displayImage,
                });
            }
            await saveMarketingCampaign({
                userId: String(currentUser.id),
                propertyId: String(selectedProperty.id),
                propertyTitle: selectedProperty.title,
                platform, format: 'story', tone: 'professional', template,
                generatedText: generatedCaption,
                headline: editorState.title,
                imageUrl: finalImageUrl,
            });
            const updated = await getMarketingCampaigns(String(currentUser.id));
            setCampaignHistory(updated);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const renderPreview = () => {
        const { layout } = currentTemplate;
        
        const cardStyle = {
            backgroundColor: hexToRgba(editorState.cardBgHex, editorState.cardOpacity),
            backdropFilter: `blur(${editorState.cardBlur})`,
            WebkitBackdropFilter: `blur(${editorState.cardBlur})`, // Safari support
        };
        
        return (
            <div 
                ref={artboardRef}
                className="relative w-full max-w-[360px] aspect-[9/16] rounded-3xl overflow-hidden shadow-premium bg-slate-900 group"
            >
                <img src={displayImage} alt="" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                
                {layout === 'classic' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                        <div className="absolute top-6 left-6">
                            <span className={`${editorState.badgeBgColor} ${editorState.badgeTextColor} px-4 py-1.5 rounded text-sm font-bold tracking-wide uppercase shadow-lg`}>
                                {editorState.badgeText}
                            </span>
                        </div>
                        <div className="absolute bottom-10 left-6 right-6 text-white flex flex-col">
                            <h2 className="text-4xl font-bold leading-tight mb-2 tracking-tight">{editorState.title}</h2>
                            <p className="text-xl font-light mb-4">{editorState.subtitle}</p>
                            <div className="flex items-center gap-2 mb-6 opacity-90">
                                <span className="material-symbols-outlined">{editorState.feature1Icon}</span>
                                <span className="text-lg">{editorState.feature1Value}</span>
                            </div>
                            <h3 className="text-3xl font-bold">{editorState.price}</h3>
                        </div>
                    </>
                )}

                {layout === 'card' && (
                    <>
                        <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
                            <div className="flex flex-col items-center">
                                <div className="text-[#b8955c] font-black text-2xl tracking-widest leading-none">
                                    <span className="material-symbols-outlined text-4xl">architecture</span>
                                </div>
                                <span className="text-[#b8955c] text-[10px] font-bold uppercase tracking-widest w-20 text-center leading-tight mt-1">{editorState.brandName}</span>
                            </div>
                            <div className={`${editorState.badgeBgColor} ${editorState.badgeTextColor} px-4 py-2 text-xs font-bold uppercase tracking-widest shadow-lg text-right`}>
                                {editorState.badgeText.split(' ').map((word, i) => <div key={i}>{word}</div>)}
                            </div>
                        </div>

                        <div className={`absolute bottom-4 left-4 right-4 rounded-[2rem] p-6 shadow-2xl flex flex-col ${editorState.cardTextColor}`} style={cardStyle}>
                            <h2 className="text-2xl font-black mb-1 leading-tight text-center">{editorState.title}</h2>
                            <p className="text-sm font-medium mb-5 text-center opacity-80">{editorState.subtitle}</p>
                            
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex flex-col items-center gap-1">
                                    <span className="material-symbols-outlined text-[#b8955c] text-xl font-light">{editorState.feature1Icon}</span>
                                    <span className="text-[9px] uppercase tracking-wider opacity-60 font-bold text-center leading-tight">{editorState.feature1Label}<br/>{editorState.feature1Value}</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="material-symbols-outlined text-[#b8955c] text-xl font-light">{editorState.feature2Icon}</span>
                                    <span className="text-[9px] uppercase tracking-wider opacity-60 font-bold text-center leading-tight">{editorState.feature2Label}<br/>{editorState.feature2Value}</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="material-symbols-outlined text-[#b8955c] text-xl font-light">{editorState.feature3Icon}</span>
                                    <span className="text-[9px] uppercase tracking-wider opacity-60 font-bold text-center leading-tight">{editorState.feature3Label}<br/>{editorState.feature3Value}</span>
                                </div>
                                <div className="pl-4 border-l border-slate-300 dark:border-slate-700 flex flex-col justify-center">
                                    <span className="text-[10px] font-bold opacity-60">VALOR</span>
                                    <span className="text-lg font-black leading-none mt-1">{editorState.price}</span>
                                </div>
                            </div>

                            <button className={`w-full py-3.5 rounded-xl font-bold text-xs tracking-widest uppercase ${editorState.ctaBgColor} ${editorState.ctaTextColor}`}>
                                {editorState.ctaText}
                            </button>
                        </div>
                    </>
                )}

                {layout === 'card-urgent' && (
                    <>
                        <div className="absolute top-6 left-6 right-0 flex justify-between items-start">
                            <div className="flex flex-col items-center">
                                <div className="text-[#b8955c] font-black text-2xl tracking-widest leading-none">
                                    <span className="material-symbols-outlined text-4xl">architecture</span>
                                </div>
                                <span className="text-[#b8955c] text-[10px] font-bold uppercase tracking-widest w-20 text-center leading-tight mt-1">{editorState.brandName}</span>
                            </div>
                            <div className={`${editorState.badgeBgColor} ${editorState.badgeTextColor} pl-6 pr-4 py-3 text-sm font-black uppercase tracking-widest shadow-lg text-right`}>
                                {editorState.badgeText.split(' ').map((word, i) => <div key={i}>{word}</div>)}
                            </div>
                        </div>

                        <div className={`absolute bottom-4 left-4 right-4 rounded-[2rem] pt-6 shadow-2xl flex flex-col overflow-hidden ${editorState.cardTextColor}`} style={cardStyle}>
                            <div className="px-6 pb-6">
                                <h2 className={`text-xl font-black mb-1 leading-tight text-center ${editorState.badgeBgColor.replace('bg-', 'text-')}`}>{editorState.title}</h2>
                                <p className="text-sm font-bold mb-5 text-center">{editorState.subtitle}</p>
                                
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="material-symbols-outlined opacity-70 text-lg font-light">{editorState.feature1Icon}</span>
                                        <span className="text-[9px] uppercase opacity-70 text-center leading-tight">{editorState.feature1Label}<br/>{editorState.feature1Value}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="material-symbols-outlined opacity-70 text-lg font-light">{editorState.feature2Icon}</span>
                                        <span className="text-[9px] uppercase opacity-70 text-center leading-tight">{editorState.feature2Label}<br/>{editorState.feature2Value}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="material-symbols-outlined opacity-70 text-lg font-light">{editorState.feature3Icon}</span>
                                        <span className="text-[9px] uppercase opacity-70 text-center leading-tight">{editorState.feature3Label}<br/>{editorState.feature3Value}</span>
                                    </div>
                                    <div className="pl-4 border-l border-slate-300 dark:border-slate-700 flex flex-col justify-center">
                                        <span className="text-[10px] font-bold opacity-80">R$</span>
                                        <span className="text-xl font-black leading-none mt-1">{editorState.price.replace('R$', '').trim()}</span>
                                    </div>
                                </div>
                            </div>
                            <button className={`w-full py-4 font-black text-sm tracking-widest uppercase ${editorState.ctaBgColor} ${editorState.ctaTextColor}`}>
                                {editorState.ctaText}
                            </button>
                        </div>
                    </>
                )}

                {layout === 'card-minimal' && (
                    <>
                        <div className="absolute top-6 left-6">
                            <div className="flex flex-col items-center">
                                <div className="text-[#b8955c] font-black text-2xl tracking-widest leading-none">
                                    <span className="material-symbols-outlined text-4xl">architecture</span>
                                </div>
                                <span className="text-[#b8955c] text-[10px] font-bold uppercase tracking-widest w-20 text-center leading-tight mt-1">{editorState.brandName}</span>
                            </div>
                        </div>

                        <div className={`absolute bottom-4 left-4 right-4 rounded-3xl p-6 shadow-2xl flex flex-col ${editorState.cardTextColor}`} style={cardStyle}>
                            <h2 className="text-xl font-serif mb-8 text-center">{editorState.title}</h2>
                            
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex flex-col items-center gap-1">
                                    <span className="material-symbols-outlined opacity-80 text-xl font-light">{editorState.feature1Icon}</span>
                                    <span className="text-[8px] uppercase tracking-wider opacity-60 font-bold text-center leading-tight">{editorState.feature1Label}<br/>{editorState.feature1Value}</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="material-symbols-outlined opacity-80 text-xl font-light">{editorState.feature2Icon}</span>
                                    <span className="text-[8px] uppercase tracking-wider opacity-60 font-bold text-center leading-tight">{editorState.feature2Label}<br/>{editorState.feature2Value}</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="material-symbols-outlined opacity-80 text-xl font-light">{editorState.feature3Icon}</span>
                                    <span className="text-[8px] uppercase tracking-wider opacity-60 font-bold text-center leading-tight">{editorState.feature3Label}<br/>{editorState.feature3Value}</span>
                                </div>
                                <div className="pl-4 border-l border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center">
                                    <span className="text-[9px] font-bold opacity-80 uppercase text-center leading-tight">Consulte o<br/>Valor</span>
                                </div>
                            </div>

                            <button className={`w-full py-3.5 rounded-lg font-bold text-xs tracking-widest uppercase ${editorState.ctaBgColor} ${editorState.ctaTextColor}`}>
                                {editorState.ctaText}
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="bg-[#fcfcfd] dark:bg-[#08090d] min-h-full flex flex-col font-sans overflow-hidden">
            
            {/* TOP HEADER */}
            <header className="flex-none p-4 md:p-6 md:px-10 border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                    <div className="flex items-center gap-4">
                        <div className="size-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-white text-[28px]">design_services</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Marketing Studio Pro</h1>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Editor de Anúncios Interativo</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 overflow-x-auto w-full md:w-auto">
                        {(['setup', 'editor', 'history'] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`shrink-0 px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-white dark:bg-white/10 shadow-md text-primary dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                <span className="material-symbols-outlined text-[18px]">
                                    {tab === 'setup' ? 'photo_library' : tab === 'editor' ? 'tune' : 'history'}
                                </span>
                                {tab === 'setup' ? '1. Imóvel' : tab === 'editor' ? '2. Editor de Arte' : `Arquivos`}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-10 custom-scrollbar">
                <div className="max-w-[1800px] mx-auto">
                    
                    {activeTab === 'setup' && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">

                            <section className="glass-panel rounded-3xl p-4 md:p-8 shadow-xl">
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">real_estate_agent</span> 
                                    Selecione o Imóvel para a Campanha
                                </h3>
                                <select value={selectedPropertyId} onChange={e => { setSelectedPropertyId(e.target.value); setSelectedImageIndex(0); }}
                                    className="w-full h-14 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 text-base font-bold text-slate-900 dark:text-white outline-none">
                                    <option value="">Selecione o imóvel...</option>
                                    {properties.map(p => <option key={p.id} value={p.id.toString()}>{p.title} — {p.price}</option>)}
                                </select>

                                {selectedProperty && propertyImages.length > 0 && (
                                    <div className="mt-8">
                                        <p className="text-xs font-black text-slate-500 uppercase mb-4">Escolha a Foto de Fundo (Background)</p>
                                    <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
                                            {propertyImages.slice(0, 5).map((img, i) => (
                                                <button key={i} onClick={() => setSelectedImageIndex(i)}
                                                    className={`relative aspect-square rounded-2xl overflow-hidden transition-all ${selectedImageIndex === i ? 'ring-4 ring-primary shadow-lg scale-105' : 'opacity-60 hover:opacity-100'}`}>
                                                    <img src={img} alt="" crossOrigin="anonymous" className="w-full h-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>

                            {selectedProperty && (
                                <button onClick={handleGenerate} disabled={isGenerating}
                                    className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-3">
                                    {isGenerating ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined">auto_fix_high</span>}
                                    IR PARA O EDITOR DE ARTE
                                </button>
                            )}
                        </div>
                    )}

                    {activeTab === 'editor' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 h-full animate-in fade-in duration-500">
                            
                            {/* EDITOR CONTROLS */}
                            <div className="lg:col-span-7 space-y-6 lg:overflow-y-auto lg:pr-4 pb-20 custom-scrollbar lg:h-[calc(100vh-140px)] min-w-0">

                                <div className="glass-panel rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-white/5">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">1. Estilo Visual (Template)</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {TEMPLATES.map(t => (
                                            <button key={t.id} onClick={() => setTemplate(t.id)}
                                                className={`p-4 rounded-xl border-2 text-left transition-all ${template === t.id ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'border-slate-100 dark:border-white/10 hover:border-slate-300'}`}>
                                                <p className="font-bold text-sm text-slate-900 dark:text-white mb-1">{t.label}</p>
                                                <p className="text-[10px] text-slate-500">{t.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="glass-panel rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-white/5">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">2. Transparência do Card</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {OPACITIES.map(o => (
                                            <button key={o.value} onClick={() => { updateEditor('cardOpacity', o.value); updateEditor('cardBlur', o.blur); }}
                                                className={`py-3 px-4 rounded-xl border-2 text-xs font-bold transition-all ${editorState.cardOpacity === o.value ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary' : 'border-slate-100 dark:border-white/10 text-slate-600 dark:text-slate-300'}`}>
                                                {o.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-4">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Cor de Fundo do Card</label>
                                        <select value={editorState.cardBgHex} onChange={e => handleColorChange('card', e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none">
                                            {COLORS.map(c => <option key={c.hex} value={c.hex}>{c.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="glass-panel rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-white/5 space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">3. Textos Principais</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Badge (Ex: Venda, Oportunidade)</label>
                                            <input type="text" value={editorState.badgeText} onChange={e => updateEditor('badgeText', e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Nome da Marca/Logo</label>
                                            <input type="text" value={editorState.brandName} onChange={e => updateEditor('brandName', e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Título Principal</label>
                                        <input type="text" value={editorState.title} onChange={e => updateEditor('title', e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Subtítulo</label>
                                            <input type="text" value={editorState.subtitle} onChange={e => updateEditor('subtitle', e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Preço / Chamada</label>
                                            <input type="text" value={editorState.price} onChange={e => updateEditor('price', e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="glass-panel rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-white/5">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">4. Características (Ícones)</h3>
                                    {[1, 2, 3].map(num => (
                                        <div key={num} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                                            <select value={editorState[`feature${num}Icon` as keyof typeof editorState]} onChange={e => updateEditor(`feature${num}Icon` as any, e.target.value)} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-2 text-xs text-slate-900 dark:text-white outline-none">
                                                {ICONS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                                            </select>
                                            <input type="text" placeholder="Label" value={editorState[`feature${num}Label` as keyof typeof editorState]} onChange={e => updateEditor(`feature${num}Label` as any, e.target.value)} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none" />
                                            <input type="text" placeholder="Valor" value={editorState[`feature${num}Value` as keyof typeof editorState]} onChange={e => updateEditor(`feature${num}Value` as any, e.target.value)} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none" />
                                        </div>
                                    ))}
                                </div>

                                <div className="glass-panel rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-white/5 space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">5. Botão de Ação & Cores</h3>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Texto do Botão (CTA)</label>
                                        <input type="text" value={editorState.ctaText} onChange={e => updateEditor('ctaText', e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Cor de Fundo do Botão/Badge</label>
                                            <select value={editorState.badgeBgHex} onChange={e => { handleColorChange('badge', e.target.value); handleColorChange('cta', e.target.value); }} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none">
                                                {COLORS.map(c => <option key={c.hex} value={c.hex}>{c.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Cor do Texto Principal</label>
                                            <select value={editorState.cardTextColor} onChange={e => updateEditor('cardTextColor', e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none">
                                                {TEXT_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="pt-4">
                                    <p className="text-sm text-slate-500 mb-4">Legenda gerada pela IA (Editável):</p>
                                    <textarea value={generatedCaption} onChange={e => setGeneratedCaption(e.target.value)} className="w-full h-32 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 outline-none resize-none mb-4"></textarea>
                                    
                                    <button onClick={handleSave} disabled={isSaving}
                                        className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${saveSuccess ? 'bg-emerald-500 text-white' : 'bg-primary text-white shadow-lg'}`}>
                                        <span className="material-symbols-outlined">{saveSuccess ? 'done_all' : 'save'}</span>
                                        {saveSuccess ? 'SALVO COM SUCESSO' : 'SALVAR E ARQUIVAR ARTE'}
                                    </button>
                                </div>

                            </div>

                            {/* PREVIEW DISPLAY */}
                            <div className="lg:col-span-5 flex justify-center lg:sticky lg:top-0 min-w-0">
                                <div className="flex flex-col items-center gap-6 w-full">
                                    <div className="flex items-center justify-between w-full max-w-[360px] px-2">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Preview em Tempo Real</h3>
                                        <button onClick={handleDownload} disabled={isDownloading} className="text-primary text-xs font-bold flex items-center gap-1 hover:underline disabled:opacity-50">
                                            <span className="material-symbols-outlined text-[16px]">{isDownloading ? 'sync' : 'download'}</span> {isDownloading ? 'Baixando...' : 'Baixar Imagem'}
                                        </button>
                                    </div>
                                    
                                    {/* LIVE RENDER FUNCTION */}
                                    {renderPreview()}
                                    
                                </div>
                            </div>

                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {campaignHistory.length === 0 ? (
                                <div className="col-span-full text-center py-20 text-slate-500">Nenhuma campanha salva ainda.</div>
                            ) : (
                                campaignHistory.map(campaign => (
                                    <div key={campaign.id} className="glass-panel rounded-3xl overflow-hidden">
                                        <div className="aspect-[9/16] relative">
                                            <img src={campaign.generatedImage || campaign.imageUrl} alt="" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity backdrop-blur-sm">
                                                <button onClick={() => setSelectedCampaign(campaign)} className="bg-white text-slate-900 px-6 py-2 rounded-xl font-bold shadow-xl hover:scale-105 transition-transform">Ver Detalhes</button>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h4 className="font-bold text-sm truncate dark:text-white">{campaign.propertyTitle}</h4>
                                            <p className="text-xs text-slate-500 truncate mt-1">{campaign.headline}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* HISTORY DETAILS MODAL */}
            {selectedCampaign && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#0b0e14] rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row">
                        <div className="md:w-1/2 p-6 bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                            <img src={selectedCampaign.generatedImage || selectedCampaign.imageUrl} alt="" className="max-h-[70vh] rounded-2xl shadow-xl object-contain" />
                        </div>
                        <div className="md:w-1/2 p-8 flex flex-col h-[50vh] md:h-auto overflow-y-auto">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{selectedCampaign.propertyTitle}</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{new Date(selectedCampaign.createdAt).toLocaleDateString()}</p>
                                </div>
                                <button onClick={() => setSelectedCampaign(null)} className="size-8 flex items-center justify-center bg-slate-100 dark:bg-white/10 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Headline (Título)</p>
                                    <p className="font-serif text-lg text-slate-900 dark:text-white">"{selectedCampaign.headline}"</p>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Legenda para Redes Sociais</p>
                                        <button onClick={() => { navigator.clipboard.writeText(selectedCampaign.generatedText); alert('Copiado!'); }} className="text-primary text-xs font-bold flex items-center gap-1 hover:underline">
                                            <span className="material-symbols-outlined text-[14px]">content_copy</span> Copiar
                                        </button>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
                                        {selectedCampaign.generatedText}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-auto pt-6 flex gap-3">
                                <button onClick={() => setSelectedCampaign(null)} className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm">Fechar</button>
                                <a href={selectedCampaign.generatedImage || selectedCampaign.imageUrl} download={`campanha-${selectedCampaign.propertyId}.jpg`} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">download</span> Baixar
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketingStudio;
