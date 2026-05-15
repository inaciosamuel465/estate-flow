import React, { useState, useMemo } from 'react';
import { User, Property } from '../src/types';
import ReactPlayer from 'react-player';

interface ClientHomeProps {
    properties: Property[];
    onPropertySelect: (id: number | string) => void;
    onLoginClick: () => void;
    onAdvertiseClick: () => void;
    currentUser: User | null;
    onUserDashboardClick: () => void;
    onLogoutClick?: () => void;
    onFavoriteClick: (id: number | string) => void;
    onChatClick: (title: string) => void;
    settings?: Record<string, string>;
}

const CATEGORIES = [
    { id: 'Todos', icon: 'grid_view', label: 'Todos' },
    { id: 'Casa', icon: 'house', label: 'Casas' },
    { id: 'Apartamento', icon: 'apartment', label: 'Apartamentos' },
    { id: 'Comercial', icon: 'storefront', label: 'Comercial' },
    { id: 'Luxo', icon: 'diamond', label: 'Coleção Luxo' },
];

const ClientHome: React.FC<ClientHomeProps> = ({
    properties,
    onPropertySelect,
    onLoginClick,
    onAdvertiseClick,
    currentUser,
    onUserDashboardClick,
    onLogoutClick,
    onFavoriteClick,
    onChatClick,
    settings = {}
}) => {
    // --- Estados de Filtro ---
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [searchText, setSearchText] = useState('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [filters, setFilters] = useState({
        minPrice: '',
        maxPrice: '',
        beds: 'any',
        baths: 'any',
        purpose: 'any' // 'sale', 'rent' or 'any'
    });

    // --- Music State ---
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);

    React.useEffect(() => {
        const handleInteraction = () => setHasInteracted(true);
        window.addEventListener('click', handleInteraction, { once: true });
        window.addEventListener('touchstart', handleInteraction, { once: true });
        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
    }, []);

    // --- Lógica de Filtragem ---
    const filteredProperties = useMemo(() => {
        return properties.filter(property => {
            // 0. Filtro de Status (Apenas ATIVOS aparecem para o cliente)
            if (property.status && property.status !== 'active') {
                return false;
            }

            // 1. Filtro de Texto (Hero Search)
            const title = property.title || '';
            const location = property.location || '';
            const matchText = searchText === '' ||
                title.toLowerCase().includes(searchText.toLowerCase()) ||
                location.toLowerCase().includes(searchText.toLowerCase());

            // 2. Filtro de Categoria (Visual Buttons)
            let matchCategory = true;
            if (selectedCategory !== 'Todos') {
                if (selectedCategory === 'Luxo') {
                    const priceStr = property.price || '';
                    matchCategory = property.tag === 'Luxo' || priceStr.includes('M') || parseInt(priceStr.replace(/\D/g, '')) > 1000000;
                } else {
                    matchCategory = property.type === selectedCategory;
                }
            }

            // 3. Filtros Avançados
            const priceStr = property.price || '';
            const numericPrice = parseInt(priceStr.replace(/\D/g, '')) || 0;
            const matchMinPrice = !filters.minPrice || numericPrice >= parseInt(filters.minPrice);
            const matchMaxPrice = !filters.maxPrice || numericPrice <= parseInt(filters.maxPrice);
            const matchBeds = filters.beds === 'any' || (property.beds || 0) >= parseInt(filters.beds);
            const matchBaths = filters.baths === 'any' || (property.baths || 0) >= parseInt(filters.baths);
            const matchPurpose = filters.purpose === 'any' || property.purpose === filters.purpose;

            return matchText && matchCategory && matchMinPrice && matchMaxPrice && matchBeds && matchBaths && matchPurpose;
        });
    }, [searchText, selectedCategory, properties, filters]);

    return (
        <>
        <div className="min-h-screen bg-[#F8F9FC] flex flex-col font-display selection:bg-primary/20 selection:text-primary pb-20 md:pb-0">

            {/* Styles for Animations & Patterns */}
            <style>{`
        @keyframes ken-burns {
            0% { transform: scale(1); }
            100% { transform: scale(1.15); }
        }
        .animate-ken-burns {
            animation: ken-burns 20s ease-out infinite alternate;
        }
        .bg-dot-pattern {
            background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
            background-size: 24px 24px;
        }
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>

            {/* --- NAVBAR --- */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-lg border-b border-white/10 transition-all duration-300">
                <div className="max-w-[1600px] mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
                    <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => {
                            const hero = document.getElementById('hero-section');
                            if (hero) hero.scrollIntoView({ behavior: 'smooth' });
                            setSelectedCategory('Todos');
                            setSearchText('');
                        }}
                    >
                        <div className="size-9 bg-white/90 text-slate-900 rounded-lg flex items-center justify-center shadow-lg shadow-black/5 group-hover:scale-105 transition-transform overflow-hidden">
                            {settings.logoUrl ? (
                                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <span className="material-symbols-outlined notranslate text-2xl">roofing</span>
                            )}
                        </div>
                        <span className="text-lg font-bold text-white tracking-wide drop-shadow-md">
                            {settings.companyName || 'EstateFlow'}
                        </span>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        <button
                            onClick={onAdvertiseClick}
                            className="text-white/90 font-semibold text-sm hover:text-white transition-colors px-4 py-2 hover:bg-white/10 rounded-full"
                        >
                            Anunciar Imóvel
                        </button>

                        {currentUser ? (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onUserDashboardClick}
                                    className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all border border-white/20 text-white group"
                                >
                                    <div className="size-8 rounded-full bg-slate-300 bg-cover bg-center ring-2 ring-white/20 group-hover:ring-white/50 transition-all" style={{ backgroundImage: `url("${currentUser.avatar}")` }}></div>
                                    <span className="text-sm font-semibold max-w-[100px] truncate">{currentUser.name.split(' ')[0]}</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm('Tem certeza que deseja sair?')) {
                                            if (onLogoutClick) onLogoutClick();
                                        }
                                    }}
                                    className="p-2 text-white/60 hover:text-rose-400 transition-colors"
                                    title="Sair"
                                >
                                    <span className="material-symbols-outlined notranslate">logout</span>
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={onLoginClick}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-slate-900 hover:bg-slate-100 text-sm font-bold shadow-lg shadow-black/10 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <span className="material-symbols-outlined notranslate text-[18px]">account_circle</span>
                                <span>Entrar</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1">

                {/* --- HERO SECTION LUXO --- */}
                <section id="hero-section" className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-slate-900" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300vw] h-[300vh] md:w-[150vw] md:h-[150vh] opacity-80 pointer-events-none">
                            <iframe
                                src="https://www.youtube.com/embed/UBdgfwoZpNE?autoplay=1&mute=1&loop=1&controls=0&playlist=UBdgfwoZpNE&playsinline=1&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3"
                                className="w-full h-full"
                                style={{ border: 'none', pointerEvents: 'none' }}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                title="Hero background video"
                            />
                        </div>
                        {/* Overlay invisível para bloquear qualquer toque no vídeo em celulares */}
                        <div className="absolute inset-0 z-20 w-full h-full bg-transparent" style={{ touchAction: 'none' }}></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#F8F9FC] via-slate-900/40 to-black/40 z-10"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 z-10 mix-blend-overlay"></div>

                    <div className="relative z-20 max-w-5xl mx-auto px-4 text-center flex flex-col items-center gap-8 pt-10">
                        <div className="animate-in fade-in slide-in-from-top-8 duration-1000 delay-100">
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white text-xs font-bold uppercase tracking-[0.25em] shadow-sm">
                                Exclusividade & Prestígio
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-[1.1] tracking-tight drop-shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                            Descubra o cenário <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-400">da sua nova vida.</span>
                        </h1>

                        <div className="w-full max-w-4xl mt-8 animate-in fade-in zoom-in duration-1000 delay-500">
                            <div className="p-3 bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl flex flex-col gap-3 ring-1 ring-white/10">
                                <div className="flex flex-col md:flex-row gap-2">
                                    <div className="flex-1 flex items-center px-6 h-16 bg-white rounded-2xl shadow-sm transition-all focus-within:ring-2 focus-within:ring-slate-900/10">
                                        <span className="material-symbols-outlined notranslate text-slate-400 text-2xl mr-3">search</span>
                                        <input
                                            className="w-full bg-transparent border-none focus:ring-0 text-slate-800 font-medium placeholder:text-slate-400 text-lg"
                                            placeholder="Qual bairro, cidade ou condomínio?"
                                            value={searchText}
                                            onChange={(e) => setSearchText(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                            className={`h-16 px-6 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 border shadow-sm ${showAdvancedFilters ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <span className="material-symbols-outlined notranslate">{showAdvancedFilters ? 'close' : 'filter_list'}</span>
                                            {showAdvancedFilters ? 'Fechar' : 'Filtros'}
                                        </button>
                                        <button
                                            onClick={() => document.getElementById('listings-grid')?.scrollIntoView({ behavior: 'smooth' })}
                                            className="h-16 px-10 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-lg shadow-xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            Buscar
                                        </button>
                                    </div>
                                </div>

                                {/* Advanced Filters Panel */}
                                {showAdvancedFilters && (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white/95 rounded-2xl animate-in slide-in-from-top-4 duration-300">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Finalidade</label>
                                            <select
                                                className="h-11 rounded-xl border-slate-200 text-sm font-semibold text-slate-700 bg-slate-50 focus:ring-primary focus:border-primary"
                                                value={filters.purpose}
                                                onChange={(e) => setFilters({ ...filters, purpose: e.target.value })}
                                            >
                                                <option value="any">Qualquer</option>
                                                <option value="sale">Venda</option>
                                                <option value="rent">Aluguel</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Preço Máximo</label>
                                            <input
                                                type="number"
                                                placeholder="Até R$"
                                                className="h-11 rounded-xl border-slate-200 text-sm font-semibold text-slate-700 bg-slate-50 focus:ring-primary focus:border-primary"
                                                value={filters.maxPrice}
                                                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Quartos</label>
                                            <select
                                                className="h-11 rounded-xl border-slate-200 text-sm font-semibold text-slate-700 bg-slate-50 focus:ring-primary focus:border-primary"
                                                value={filters.beds}
                                                onChange={(e) => setFilters({ ...filters, beds: e.target.value })}
                                            >
                                                <option value="any">Todos</option>
                                                <option value="1">1+</option>
                                                <option value="2">2+</option>
                                                <option value="3">3+</option>
                                                <option value="4">4+</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Banheiros</label>
                                            <select
                                                className="h-11 rounded-xl border-slate-200 text-sm font-semibold text-slate-700 bg-slate-50 focus:ring-primary focus:border-primary"
                                                value={filters.baths}
                                                onChange={(e) => setFilters({ ...filters, baths: e.target.value })}
                                            >
                                                <option value="any">Todos</option>
                                                <option value="1">1+</option>
                                                <option value="2">2+</option>
                                                <option value="3">3+</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- BARRA DE CATEGORIAS (Flutuante e Elegante) --- */}
                <div className="sticky top-24 z-40 px-4 md:px-8 -mt-8 mb-8">
                    <div className="max-w-[1600px] mx-auto">
                        <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/40 rounded-2xl p-2 flex items-center gap-2 overflow-x-auto no-scrollbar mx-auto max-w-fit">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`
                                flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap
                                ${selectedCategory === cat.id
                                            ? 'bg-slate-900 text-white shadow-md transform scale-105'
                                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}
                            `}
                                >
                                    <span className={`material-symbols-outlined notranslate text-[20px] ${selectedCategory === cat.id ? 'text-white' : 'text-slate-400'}`}>
                                        {cat.icon}
                                    </span>
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- GRID DE IMÓVEIS (Fundo com Textura) --- */}
                <section id="listings-grid" className="max-w-[1600px] mx-auto px-6 md:px-12 pb-24 relative">

                    {/* Background Pattern Decoration */}
                    <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none -z-10"></div>

                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Seleção Exclusiva</h2>
                            <p className="text-slate-500 text-sm mt-1">{filteredProperties.length} imóveis encontrados na sua região.</p>
                        </div>

                        {(searchText || selectedCategory !== 'Todos' || filters.minPrice || filters.maxPrice || filters.beds !== 'any' || filters.baths !== 'any' || filters.purpose !== 'any') && (
                            <button
                                onClick={() => {
                                    setSearchText('');
                                    setSelectedCategory('Todos');
                                    setFilters({ minPrice: '', maxPrice: '', beds: 'any', baths: 'any', purpose: 'any' });
                                    setShowAdvancedFilters(false);
                                }}
                                className="text-rose-500 text-xs font-bold hover:bg-rose-50 px-4 py-2 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                            >
                                Limpar Filtros
                            </button>
                        )}
                    </div>

                    {filteredProperties.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {filteredProperties.map((property, idx) => (
                                <div
                                    key={property.id}
                                    onClick={() => onPropertySelect(property.id as number)}
                                    className="group bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] transition-all duration-500 cursor-pointer flex flex-col relative h-full hover:-translate-y-2"
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    {/* Imagem */}
                                    <div className="relative aspect-[4/3] overflow-hidden">
                                        <img src={property.image} alt={property.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80"></div>

                                        {/* Tags Flutuantes */}
                                        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                                            <span className="px-3 py-1.5 bg-white/95 backdrop-blur-md text-slate-900 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm">
                                                {property.type}
                                            </span>
                                            {property.tag && property.tag !== property.type && (
                                                <span className="px-3 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm">
                                                    {property.tag}
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); onFavoriteClick(property.id); }}
                                            className={`absolute top-4 right-4 size-10 backdrop-blur-md rounded-full flex items-center justify-center transition-all shadow-sm group-hover:scale-110 
                                            ${currentUser?.favorites?.includes(String(property.id))
                                                    ? 'bg-rose-500 text-white'
                                                    : 'bg-white/20 hover:bg-white text-white hover:text-rose-500'
                                                }`}
                                        >
                                            <span className={`material-symbols-outlined notranslate text-[20px] ${currentUser?.favorites?.includes(String(property.id)) ? 'fill-current' : ''}`}>favorite</span>
                                        </button>

                                        <div className="absolute bottom-4 left-4 text-white">
                                            <p className="text-xl md:text-2xl font-bold drop-shadow-md tracking-tight">{property.price}</p>
                                        </div>
                                    </div>

                                    {/* Conteúdo */}
                                    < div className="p-6 flex flex-col flex-1" >
                                        <div className="mb-4">
                                            <h4 className="font-bold text-slate-800 text-lg leading-snug mb-1 line-clamp-1 group-hover:text-primary transition-colors">{property.title}</h4>
                                            <p className="text-slate-500 text-sm flex items-center gap-1 truncate font-medium">
                                                <span className="material-symbols-outlined notranslate text-[16px] text-slate-400">location_on</span> {property.location}
                                            </p>
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-slate-400 text-[10px] font-bold uppercase">Quartos</span>
                                                    <span className="text-slate-700 font-bold text-sm flex items-center gap-1">
                                                        <span className="material-symbols-outlined notranslate text-[14px]">bed</span> {property.beds}
                                                    </span>
                                                </div>
                                                <div className="w-px bg-slate-100 h-8"></div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-slate-400 text-[10px] font-bold uppercase">Banhos</span>
                                                    <span className="text-slate-700 font-bold text-sm flex items-center gap-1">
                                                        <span className="material-symbols-outlined notranslate text-[14px]">bathtub</span> {property.baths}
                                                    </span>
                                                </div>
                                                <div className="w-px bg-slate-100 h-8"></div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-slate-400 text-[10px] font-bold uppercase">Área</span>
                                                    <span className="text-slate-700 font-bold text-sm flex items-center gap-1">
                                                        <span className="material-symbols-outlined notranslate text-[14px]">square_foot</span> {property.area}m²
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
                            <div className="size-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-300">
                                <span className="material-symbols-outlined notranslate text-5xl">travel_explore</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">Nenhum imóvel encontrado</h3>
                            <p className="text-slate-500 mt-2 text-center max-w-md">
                                Ajuste os filtros ou tente uma nova busca para encontrar o imóvel ideal.
                            </p>
                            <button
                                onClick={() => { setSearchText(''); setSelectedCategory('Todos'); }}
                                className="mt-8 px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                            >
                                Ver Todos os Imóveis
                            </button>
                        </div>
                    )
                    }
                </section >

                {/* --- FOOTER CTA (Dark Elegance) --- */}
                < section className="bg-[#0b0e14] text-white py-24 px-6 relative overflow-hidden" >
                    {/* Abstract Shapes */}
                    < div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] translate-x-1/3 -translate-y-1/3 pointer-events-none" ></div >
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[150px] -translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <h2 className="text-3xl md:text-5xl font-extrabold mb-6 tracking-tight leading-tight">
                            Pronto para viver <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">uma nova história?</span>
                        </h2>
                        <p className="text-slate-400 mb-12 text-base md:text-lg max-w-2xl mx-auto font-light leading-relaxed">
                            Nossa inteligência artificial analisa milhares de dados para encontrar as melhores oportunidades de investimento e moradia antes de todo mundo.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => document.getElementById('listings-grid')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-10 py-4 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-lg shadow-xl shadow-white/5 transition-all transform hover:-translate-y-1"
                            >
                                Explorar Oportunidades
                            </button>
                            <button className="px-10 py-4 bg-transparent border border-white/10 hover:bg-white/5 rounded-xl font-bold text-lg transition-all text-white backdrop-blur-sm">
                                Consultoria Personalizada
                            </button>
                        </div>
                    </div>
                </section >
            </main >

            <footer className="bg-white border-t border-slate-100 py-12 px-6">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
                            <span className="material-symbols-outlined notranslate text-2xl">roofing</span>
                        </div>
                        <div>
                            <span className="text-xl font-bold text-slate-900 tracking-tight block leading-none">EstateFlow</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real Estate Intelligence</span>
                        </div>
                    </div>

                    <div className="text-slate-500 text-sm font-medium">
                        © 2024 EstateFlow Inc. <span className="mx-2">•</span> Todos os direitos reservados.
                    </div>

                    <div className="flex gap-4">
                        <a href="#" className="size-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300">
                            <span className="material-symbols-outlined notranslate text-[20px]">mail</span>
                        </a>
                        <a href="#" className="size-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300">
                            <span className="material-symbols-outlined notranslate text-[20px]">call</span>
                        </a>
                        <a href="#" className="size-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300">
                            <span className="material-symbols-outlined notranslate text-[20px]">public</span>
                        </a>
                    </div>
                </div>
            </footer>
            {/* --- MOBILE BOTTOM NAV --- */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 py-3 px-8 md:hidden flex justify-between items-center shadow-2xl safe-area-pb">
                <button
                    onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setSelectedCategory('Todos');
                    }}
                    className={`flex flex-col items-center gap-1 transition-colors ${selectedCategory === 'Todos' ? 'text-primary' : 'text-slate-400'}`}
                >
                    <span className={`material-symbols-outlined ${selectedCategory === 'Todos' ? 'fill-current' : ''}`}>home</span>
                    <span className="text-[10px] font-bold">Início</span>
                </button>

                <button
                    onClick={() => document.getElementById('listings-grid')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors"
                >
                    <span className="material-symbols-outlined">search</span>
                    <span className="text-[10px] font-bold">Buscar</span>
                </button>

                <button
                    onClick={onAdvertiseClick}
                    className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors"
                >
                    <span className="material-symbols-outlined">add_circle</span>
                    <span className="text-[10px] font-bold">Anunciar</span>
                </button>

                <button
                    onClick={currentUser ? onUserDashboardClick : onLoginClick}
                    className={`flex flex-col items-center gap-1 transition-colors ${currentUser ? 'text-primary' : 'text-slate-400'}`}
                >
                    {currentUser ? (
                        <div className="size-6 rounded-full bg-slate-200 bg-cover bg-center border border-current" style={{ backgroundImage: `url("${currentUser.avatar}")` }}></div>
                    ) : (
                        <span className="material-symbols-outlined">person</span>
                    )}
                    <span className="text-[10px] font-bold">{currentUser ? 'Perfil' : 'Entrar'}</span>
                </button>
            </nav>
        </div >

        {/* Music Player Yasashi */}
        <div className="absolute opacity-0 pointer-events-none w-[1px] h-[1px] overflow-hidden -z-50">
            <ReactPlayer
                url="https://www.youtube.com/watch?v=4kp4dtAsWZQ"
                playing={isMusicPlaying && hasInteracted}
                loop={true}
                volume={0.5}
                width="100%"
                height="100%"
                config={{
                    youtube: {
                        // @ts-ignore
                        playerVars: { autoplay: 1 }
                    }
                }}
            />
        </div>

        {/* Botão Flutuante de Música */}
        <div className="fixed bottom-[110px] md:bottom-24 left-6 z-[100]">
            <button
                onClick={() => setIsMusicPlaying(!isMusicPlaying)}
                className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95 ${
                    isMusicPlaying 
                    ? 'bg-slate-900 text-white dark:bg-primary border border-white/10' 
                    : 'bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
            >
                <span className="material-symbols-outlined text-[24px]">
                    {isMusicPlaying ? 'music_note' : 'music_off'}
                </span>
                <span className="text-sm font-bold hidden sm:inline">
                    {isMusicPlaying ? 'Música Ambiente' : 'Música Silenciada'}
                </span>
                {isMusicPlaying && (
                    <div className="flex gap-1 items-end h-4 ml-2">
                        <div className="w-1.5 bg-current animate-[bounce_1s_infinite_0ms] rounded-full h-full"></div>
                        <div className="w-1.5 bg-current animate-[bounce_1s_infinite_200ms] rounded-full h-2/3"></div>
                        <div className="w-1.5 bg-current animate-[bounce_1s_infinite_400ms] rounded-full h-full"></div>
                    </div>
                )}
            </button>
        </div>
        </>
    );
};

export default ClientHome;