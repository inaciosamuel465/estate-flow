import React, { useState, useMemo, useEffect } from 'react';

import { Property } from '../src/types';

interface InteractiveMapProps {
  onSelectProperty?: (id: number | string) => void;
  properties?: Property[];
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ onSelectProperty, properties = [] }) => {
  // --- Estados de Controle ---
  const [activePropertyId, setActivePropertyId] = useState<number | null>(null);
  const [mapMode, setMapMode] = useState<'simulated' | 'real'>('simulated');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // --- Estados de Navegação do Mapa Simulado ---
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // --- Estados do Google Maps Real ---
  const [realMapCenter, setRealMapCenter] = useState({ lat: -23.5615, lng: -46.6560 });

  // --- Filtros e Camadas ---
  const [filters, setFilters] = useState({ search: '', type: 'Todos' });
  const [layers, setLayers] = useState({ aiScan: true, heat: false, transit: false });

  // --- Mapeamento de Propriedades Reais para o Formato do Mapa ---
  const mappedProperties = useMemo(() => {
    return properties.map(p => {
      // Cálculo simples de X/Y para o mapa simulado baseado em lat/lng (se existirem)
      // Usando SP como referência base se não houver coords
      const lat = p.lat || -23.5505;
      const lng = p.lng || -46.6333;
      
      // Mapeamento linear básico para SP (aprox)
      const x = ((lng - (-46.8)) / (-46.3 - (-46.8))) * 100;
      const y = ((lat - (-23.4)) / (-23.7 - (-23.4))) * 100;

      return {
        ...p,
        formattedPrice: typeof p.price === 'string' ? p.price : `R$ ${(p.price / 1000).toFixed(0)}k`,
        address: p.location,
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
        isHot: p.tag === 'Destaque' || p.tag === 'Oportunidade',
        rating: 4.5 + Math.random() * 0.5 // Mock rating
      };
    });
  }, [properties]);

  // --- Imóvel Ativo ---
  const activeProperty = useMemo(() => 
    mappedProperties.find(p => p.id === activePropertyId), 
  [activePropertyId, mappedProperties]);

  // --- Lista Filtrada ---
  const filteredList = useMemo(() => {
    return mappedProperties.filter(p => {
      const matchSearch = p.address.toLowerCase().includes(filters.search.toLowerCase()) || 
                          p.title.toLowerCase().includes(filters.search.toLowerCase());
      const matchType = filters.type === 'Todos' || p.type === filters.type;
      return matchSearch && matchType;
    });
  }, [filters, mappedProperties]);

  // --- Lógica de Foco (Centralizar Mapa) ---
  const focusOnProperty = (property: Property) => {
    setActivePropertyId(property.id);
    
    // Atualiza mapa real
    if (property.lat && property.lng) {
        setRealMapCenter({ lat: property.lat, lng: property.lng });
    }

    const targetX = (50 - property.x) * 10 * zoom; 
    const targetY = (50 - property.y) * 10 * zoom;
    setOffset({ x: targetX, y: targetY });
  };

  // --- Handlers de Drag (Mapa Simulado) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mapMode === 'real') return;
    setIsDragging(true);
    setStartPan({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || mapMode === 'real') return;
    e.preventDefault();
    setOffset({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // --- Ação de Navegação ---
  const handleViewDetails = (id: number | string) => {
    if (onSelectProperty) {
      onSelectProperty(id);
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden relative text-slate-900">
      
      {/* 1. SIDEBAR (Lista de Imóveis e Filtros) - Agora ROLÁVEL e Organizada */}
      <aside 
        className={`
            absolute md:relative z-20 h-full bg-white border-r border-slate-200 flex flex-col transition-all duration-300 shadow-xl
            ${sidebarOpen ? 'w-full md:w-80 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0 overflow-hidden'}
        `}
      >
        {/* Cabeçalho da Sidebar */}
        <div className="p-4 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-slate-900 font-bold text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">real_estate_agent</span>
                    Imóveis
                </h2>
                <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-500">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>
            
            {/* Filtros */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 h-10">
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
                    <input 
                        type="text"
                        placeholder="Buscar rua, bairro..."
                        className="bg-transparent border-none text-slate-700 text-sm w-full focus:ring-0 placeholder:text-slate-400"
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({...prev, search: e.target.value}))}
                    />
                </div>
                <div className="flex gap-2">
                    {['Todos', 'Apartamento', 'Casa'].map(t => (
                        <button 
                            key={t}
                            onClick={() => setFilters(prev => ({...prev, type: t}))}
                            className={`flex-1 py-1.5 text-xs font-bold rounded border transition-colors ${filters.type === t ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Lista Rolável (Scrollable Area) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar bg-slate-50">
            {filteredList.map(property => (
                <div 
                    key={property.id}
                    onClick={() => focusOnProperty(property)}
                    className={`
                        flex flex-col gap-2 p-3 rounded-xl border cursor-pointer transition-all
                        ${activePropertyId === property.id ? 'bg-white border-primary ring-1 ring-primary/30 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}
                    `}
                >
                    <div className="flex gap-3">
                        <div className="w-20 h-20 bg-cover bg-center rounded-lg shrink-0" style={{ backgroundImage: `url("${property.image}")` }}></div>
                        <div className="flex flex-col justify-center min-w-0">
                            <div className="flex justify-between items-start">
                                <h3 className="text-slate-900 font-bold text-sm truncate">{property.formattedPrice}</h3>
                                {property.isHot && <span className="text-[10px] bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded font-bold border border-rose-100">HOT</span>}
                            </div>
                            <p className="text-slate-500 text-xs truncate">{property.address}</p>
                            <div className="flex items-center gap-2 mt-2 text-slate-500 text-[10px]">
                                <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">bed</span> {property.bedrooms}</span>
                                <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">bathtub</span> {property.bathrooms}</span>
                                <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">square_foot</span> {property.area}m²</span>
                            </div>
                        </div>
                    </div>
                    {/* Botão de Ver Detalhes (Aparece se ativo) */}
                    {activePropertyId === property.id && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(property.id);
                            }}
                            className="w-full mt-1 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            Ver Detalhes Completos <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </button>
                    )}
                </div>
            ))}
            {filteredList.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-sm">Nenhum imóvel encontrado.</div>
            )}
        </div>
      </aside>

      {/* 2. ÁREA DO MAPA (Viewport) */}
      <main className="flex-1 relative overflow-hidden bg-slate-100">
        
        {/* Toggle Sidebar Button (Mobile/Collapsed) */}
        {!sidebarOpen && (
            <button 
                onClick={() => setSidebarOpen(true)}
                className="absolute top-4 left-4 z-30 bg-white border border-slate-200 p-2 rounded-lg text-slate-700 shadow-xl hover:bg-slate-50"
            >
                <span className="material-symbols-outlined">menu</span>
            </button>
        )}

        {/* CONTROLES FLUTUANTES (Top Right) */}
        <div className="absolute top-4 right-4 z-30 flex flex-col gap-3 items-end">
            
            {/* Seletor de Modo */}
            <div className="bg-white/90 backdrop-blur border border-slate-200 p-1 rounded-lg flex shadow-xl">
                <button 
                    onClick={() => setMapMode('simulated')}
                    className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors ${mapMode === 'simulated' ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    <span className="material-symbols-outlined text-[16px]">satellite_alt</span> IA Satélite
                </button>
                <button 
                    onClick={() => setMapMode('real')}
                    className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors ${mapMode === 'real' ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    <span className="material-symbols-outlined text-[16px]">map</span> Google Maps
                </button>
            </div>

            {/* Camadas (Apenas modo Simulado) */}
            {mapMode === 'simulated' && (
                <div className="bg-white/90 backdrop-blur border border-slate-200 p-1.5 rounded-lg flex flex-col gap-1 shadow-xl">
                    <button 
                        onClick={() => setLayers(l => ({...l, aiScan: !l.aiScan}))}
                        className={`size-9 flex items-center justify-center rounded transition-colors ${layers.aiScan ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
                        title="Scan IA"
                    >
                        <span className="material-symbols-outlined">radar</span>
                    </button>
                    <button 
                        onClick={() => setLayers(l => ({...l, heat: !l.heat}))}
                        className={`size-9 flex items-center justify-center rounded transition-colors ${layers.heat ? 'bg-rose-50 text-rose-600' : 'text-slate-400 hover:bg-slate-100'}`}
                        title="Mapa de Calor"
                    >
                        <span className="material-symbols-outlined">local_fire_department</span>
                    </button>
                    <button 
                        onClick={() => setLayers(l => ({...l, transit: !l.transit}))}
                        className={`size-9 flex items-center justify-center rounded transition-colors ${layers.transit ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-100'}`}
                        title="Transporte"
                    >
                        <span className="material-symbols-outlined">directions_bus</span>
                    </button>
                </div>
            )}

            {/* Zoom Controls */}
            {mapMode === 'simulated' && (
                <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-lg flex flex-col overflow-hidden shadow-xl">
                    <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))} className="size-9 flex items-center justify-center text-slate-700 hover:bg-slate-100 border-b border-slate-200">
                        <span className="material-symbols-outlined">add</span>
                    </button>
                    <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className="size-9 flex items-center justify-center text-slate-700 hover:bg-slate-100">
                        <span className="material-symbols-outlined">remove</span>
                    </button>
                </div>
            )}
        </div>

        {/* MAPA CONTENT */}
        <div 
            className={`w-full h-full relative ${mapMode === 'simulated' ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {mapMode === 'real' ? (
                // --- MODO GOOGLE MAPS REAL (Iframe Dinâmico) ---
                <div className="w-full h-full">
                     <iframe 
                        width="100%" 
                        height="100%" 
                        frameBorder="0" 
                        style={{ border: 0 }}
                        // A URL atualiza dinamicamente baseada no realMapCenter
                        src={`https://maps.google.com/maps?q=${realMapCenter.lat},${realMapCenter.lng}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                        allowFullScreen
                        title="Google Maps"
                    ></iframe>
                </div>
            ) : (
                // --- MODO SATÉLITE IA (Simulado com Layers) ---
                <div 
                    className="w-full h-full relative transition-transform duration-100 ease-out origin-center"
                    style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
                >
                    {/* Base Map Image */}
                    <div 
                        className="absolute inset-[-50%] bg-cover bg-center"
                        style={{ 
                            width: '200%', height: '200%',
                            // Imagem aérea escura que simula visão de satélite/mapa técnico
                            backgroundImage: 'url("https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2000&auto=format&fit=crop")',
                            filter: 'brightness(40%) grayscale(100%) contrast(120%)'
                        }}
                    ></div>

                    {/* HUD / Grid Overlay */}
                    <div className="absolute inset-[-50%] w-[200%] h-[200%] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

                    {/* Layers */}
                    {layers.aiScan && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                             <div className="absolute top-0 left-0 w-full h-1 bg-primary/50 shadow-[0_0_30px_rgba(43,108,238,0.8)] animate-[scan_4s_linear_infinite]"></div>
                        </div>
                    )}

                    {layers.heat && (
                        <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply" 
                             style={{ background: 'radial-gradient(circle at 40% 40%, rgba(255,0,0,0.5), transparent 30%)' }}>
                        </div>
                    )}

                    {/* Pins */}
                    {filteredList.map(p => (
                        <div 
                            key={p.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer group"
                            style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: activePropertyId === p.id ? 20 : 10 }}
                            onClick={(e) => { e.stopPropagation(); focusOnProperty(p); }}
                        >
                            <div className={`
                                flex items-center justify-center transition-all duration-300
                                ${activePropertyId === p.id ? 'scale-125' : 'hover:scale-110'}
                            `}>
                                {/* Label do Pin */}
                                <div className={`
                                    px-2 py-1 rounded bg-white border border-slate-300 text-slate-800 text-[10px] font-bold shadow-lg mb-1 whitespace-nowrap
                                    ${activePropertyId === p.id ? 'bg-primary border-primary text-white' : ''}
                                `}>
                                    {p.formattedPrice}
                                </div>
                                {/* Icone do Pin */}
                                <div className={`
                                    absolute top-full size-3 bg-primary rounded-full border-2 border-white shadow-lg
                                    ${activePropertyId === p.id ? 'bg-white border-primary' : ''}
                                `}></div>
                            </div>
                            {/* Quick Action Popup on Pin Click */}
                            {activePropertyId === p.id && (
                                <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-white p-2 rounded-lg border border-slate-200 shadow-xl flex flex-col gap-1 w-32 animate-in fade-in zoom-in slide-in-from-top-2">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleViewDetails(p.id);
                                        }}
                                        className="w-full py-1.5 bg-primary text-white text-[10px] font-bold rounded hover:bg-blue-600"
                                    >
                                        Ver Detalhes
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </main>

      {/* Styles for Animations */}
      <style>{`
        @keyframes scan {
            0% { top: -10%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 110%; opacity: 0; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default InteractiveMap;