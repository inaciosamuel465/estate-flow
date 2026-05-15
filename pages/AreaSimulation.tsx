import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

const AreaSimulation: React.FC = () => {
  const [viewMode, setViewMode] = useState<'map' | 'street' | '3d'>('map');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("Imóvel Selecionado");
  const [settings, setSettings] = useState({
    time: 'Dia',
    weather: 'Ensolarado',
    activity: 'Moderada'
  });

  const generateStreetView = async (location: string = selectedLocation) => {
    setIsGenerating(true);
    setViewMode('street');
    setSelectedLocation(location);
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 
      if (!apiKey) {
        console.warn("Sem chave de API encontrada, simulando geração.");
        await new Promise(resolve => setTimeout(resolve, 2000));
        setGeneratedImage("https://picsum.photos/1600/900?random=" + Math.random());
        setIsGenerating(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Photorealistic street view of ${location} in a modern upscale neighborhood. 
                      Perspective: Eye level standing on sidewalk.
                      Elements: Contemporary buildings, lush street trees, modern street furniture, paved sidewalks.
                      Atmosphere: ${settings.time}, ${settings.weather}, ${settings.activity} pedestrian activity. 
                      Cinematic lighting, high detail, 8k resolution style.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
            break;
          }
        }
      }
    } catch (error) {
      console.error("Falha na geração", error);
      setGeneratedImage("https://picsum.photos/1600/900?random=" + Math.random());
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display text-slate-900 dark:text-white antialiased transition-colors duration-200">
       <header className="sticky top-0 z-50 w-full border-b border-solid border-slate-200 dark:border-[#282e39] bg-surface-light dark:bg-[#111318]">
        <div className="flex items-center justify-between whitespace-nowrap px-4 lg:px-10 py-3 max-w-[1600px] mx-auto">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <div className="size-8 text-primary">
                        <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z"></path>
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">EstateFlow</h2>
                </div>
            </div>
            <div className="flex items-center gap-4">
                 <div className="flex items-center gap-3">
                    <button className="size-9 rounded-full bg-slate-100 dark:bg-surface-dark flex items-center justify-center text-slate-500 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">notifications</span>
                    </button>
                    <div className="size-9 rounded-full bg-slate-200 bg-cover bg-center border border-slate-300 dark:border-slate-600" style={{ backgroundImage: 'url("https://picsum.photos/100/100?random=36")' }}></div>
                 </div>
            </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
                 <div className="flex flex-wrap gap-2 items-center mb-2 text-sm">
                    <a className="text-slate-500 dark:text-[#9da6b9] hover:text-primary font-medium transition-colors" href="#">Dashboard</a>
                    <span className="material-symbols-outlined text-slate-400 text-[16px]">chevron_right</span>
                    <a className="text-slate-500 dark:text-[#9da6b9] hover:text-primary font-medium transition-colors" href="#">Visualizador</a>
                    <span className="material-symbols-outlined text-slate-400 text-[16px]">chevron_right</span>
                    <span className="text-slate-900 dark:text-white font-medium">Simulação de Área Local</span>
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight">Simulação de Área Local</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Simule dinâmicas do bairro, tempos de deslocamento e visualize amenidades em 3D.</p>
            </div>
            <div className="flex gap-3">
                 <button className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface-light dark:bg-surface-dark hover:bg-slate-50 dark:hover:bg-[#252b3b] text-slate-700 dark:text-white text-sm font-bold transition-colors">
                    <span className="material-symbols-outlined text-[20px]">bookmark</span> Áreas Salvas
                </button>
                 <button className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-white hover:bg-primary/90 text-sm font-bold shadow-lg shadow-primary/20 transition-all">
                    <span className="material-symbols-outlined text-[20px]">description</span> Exportar Relatório
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-220px)] min-h-[800px]">
            <div className="lg:col-span-8 flex flex-col gap-4 h-full">
                <div className="flex-grow relative bg-surface-light dark:bg-[#151b26] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                     <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 bg-white dark:bg-[#1a212e]">
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setViewMode('map')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${viewMode === 'map' ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            >
                                Mapa 2D
                            </button>
                            <button 
                                onClick={() => setViewMode('3d')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${viewMode === '3d' ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            >
                                <span className="material-symbols-outlined text-[14px]">3d_rotation</span> Vista 3D
                            </button>
                            <button 
                                onClick={() => viewMode !== 'street' ? generateStreetView(selectedLocation) : null}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${viewMode === 'street' ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            >
                                Street View (IA)
                            </button>
                            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-2"></div>
                        </div>
                        <div className="flex items-center gap-3">
                            {viewMode === 'street' && (
                                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mr-2">
                                    <span className="text-xs font-bold px-2 text-slate-700 dark:text-slate-200">{selectedLocation}</span>
                                </div>
                            )}
                            <button className="p-1.5 text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined text-[20px]">fullscreen</span></button>
                        </div>
                    </div>
                    
                    <div className="flex-grow bg-[#0f1218] relative flex items-center justify-center overflow-hidden group">
                        {viewMode === 'street' ? (
                             <div className="relative w-full h-full flex items-center justify-center">
                                {isGenerating ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="size-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                                        <p className="text-white text-sm font-medium animate-pulse">Gerando vista da rua realista com Gemini...</p>
                                    </div>
                                ) : generatedImage ? (
                                    <>
                                        <img alt={`Street view de ${selectedLocation}`} className="w-full h-full object-cover animate-in fade-in duration-700" src={generatedImage} />
                                        
                                        {/* Interactive Navigation Overlays */}
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-4">
                                            <button 
                                                onClick={() => generateStreetView(selectedLocation)}
                                                className="pointer-events-auto size-12 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center border border-white/20 transition-all hover:scale-110"
                                                title="Mover Esquerda"
                                            >
                                                <span className="material-symbols-outlined">chevron_left</span>
                                            </button>
                                            <button 
                                                onClick={() => generateStreetView(selectedLocation)}
                                                className="pointer-events-auto size-12 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center border border-white/20 transition-all hover:scale-110"
                                                title="Mover Direita"
                                            >
                                                <span className="material-symbols-outlined">chevron_right</span>
                                            </button>
                                        </div>
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
                                            <div className="pointer-events-auto flex gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-white/20">
                                                 <button onClick={() => generateStreetView(selectedLocation)} className="px-3 py-1.5 hover:bg-white/20 rounded-lg text-white text-xs font-bold transition-colors">Regenerar</button>
                                                 <div className="w-px bg-white/20"></div>
                                                 <button onClick={() => setSettings(s => ({...s, time: s.time === 'Dia' ? 'Noite' : 'Dia'}))} className="px-3 py-1.5 hover:bg-white/20 rounded-lg text-white text-xs font-bold transition-colors flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">{settings.time === 'Dia' ? 'sunny' : 'dark_mode'}</span>
                                                    {settings.time}
                                                 </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center">
                                        <p className="text-slate-400 mb-4">Selecione um local no mapa ou clique em gerar.</p>
                                        <button onClick={() => generateStreetView()} className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90">Gerar Vista</button>
                                    </div>
                                )}
                             </div>
                        ) : (
                            /* Map View (Default) */
                            <div className="relative w-full h-full">
                                <img alt="Mapa 3D" className="w-full h-full object-cover opacity-80" src="https://picsum.photos/1600/900?random=37" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1218]/80 via-transparent to-transparent"></div>
                                
                                {/* Map Points */}
                                <div 
                                    onClick={() => generateStreetView("Escola Santa Maria")}
                                    className="absolute top-[30%] left-[40%] flex flex-col items-center group cursor-pointer z-20 hover:scale-110 transition-transform"
                                >
                                    <div className="px-2 py-1 bg-white text-slate-900 text-[10px] font-bold rounded shadow-lg mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Escola Santa Maria</div>
                                    <div className="size-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center shadow-lg animate-bounce">
                                        <span className="material-symbols-outlined text-white text-[18px]">school</span>
                                    </div>
                                    <div className="w-2 h-1 bg-black/50 rounded-full blur-[2px]"></div>
                                </div>

                                <div 
                                    onClick={() => generateStreetView("Estação de Metrô")}
                                    className="absolute bottom-[40%] right-[25%] flex flex-col items-center group cursor-pointer z-20 hover:scale-110 transition-transform"
                                >
                                    <div className="px-2 py-1 bg-white text-slate-900 text-[10px] font-bold rounded shadow-lg mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Estação de Metrô</div>
                                    <div className="size-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-lg">
                                        <span className="material-symbols-outlined text-white text-[18px]">directions_subway</span>
                                    </div>
                                </div>

                                <div 
                                    onClick={() => generateStreetView("Mercado Central")}
                                    className="absolute top-[20%] right-[35%] flex flex-col items-center group cursor-pointer z-20 hover:scale-110 transition-transform"
                                >
                                    <div className="px-2 py-1 bg-white text-slate-900 text-[10px] font-bold rounded shadow-lg mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Mercado Central</div>
                                    <div className="size-8 rounded-full bg-orange-500 border-2 border-white flex items-center justify-center shadow-lg">
                                        <span className="material-symbols-outlined text-white text-[18px]">shopping_cart</span>
                                    </div>
                                </div>

                                <div 
                                    onClick={() => generateStreetView("Imóvel Selecionado")}
                                    className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 cursor-pointer hover:scale-110 transition-transform"
                                >
                                    <div className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xl mb-2 border border-slate-700">Imóvel Selecionado</div>
                                    <div className="size-12 rounded-full bg-primary border-4 border-white dark:border-slate-800 flex items-center justify-center shadow-2xl relative">
                                        <span className="material-symbols-outlined text-white text-[24px]">home</span>
                                        <span className="absolute -inset-2 rounded-full bg-primary/30 animate-ping"></span>
                                    </div>
                                </div>

                                <div className="absolute bottom-6 left-6 bg-surface-dark/90 backdrop-blur-md p-3 rounded-lg border border-slate-700 text-white max-w-xs shadow-xl pointer-events-none">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="material-symbols-outlined text-yellow-400 text-[20px]">sunny</span>
                                        <span className="text-xs font-bold">12:30 • Céu Limpo</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 leading-relaxed">
                                        Clique em qualquer marcador de localização para gerar uma vista da rua realista usando IA.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                     <div className="h-32 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a212e] p-4 flex gap-3 overflow-x-auto">
                        <div className="flex flex-col justify-center min-w-[140px] px-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Destaques Próximos</span>
                            <p className="text-[10px] text-slate-400">Clique para focar no mapa</p>
                        </div>
                        {[
                            { name: 'Parque Ibirapuera', dist: '0.2 km', img: 38 },
                            { name: 'Shopping Center', dist: '0.8 km', img: 39 },
                            { name: 'Hospital Geral', dist: '1.5 km', img: 40 }
                        ].map(item => (
                             <div 
                                key={item.name} 
                                onClick={() => generateStreetView(item.name)}
                                className="min-w-[120px] h-full rounded-lg border border-slate-200 dark:border-slate-700 relative overflow-hidden cursor-pointer group hover:ring-2 hover:ring-primary"
                             >
                                <div className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: `url("https://picsum.photos/150/150?random=${item.img}")` }}></div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-2">
                                    <span className="text-white text-xs font-bold">{item.name}</span>
                                    <span className="text-slate-300 text-[10px]">{item.dist}</span>
                                </div>
                            </div>
                        ))}
                     </div>
                </div>
            </div>
            
            <div className="lg:col-span-4 flex flex-col h-full overflow-hidden bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
                 <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">Análise da Vizinhança</h3>
                    <div className="flex gap-2">
                        <button className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined text-[20px]">share</span></button>
                        <button className="text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined text-[20px]">settings</span></button>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto p-5 space-y-6">
                    {/* Street View Settings (Visible only when in street mode) */}
                    {viewMode === 'street' && (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                             <label className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white mb-3">
                                <span className="material-symbols-outlined text-primary text-[20px]">tune</span> Controles de Simulação
                            </label>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Horário</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Dia', 'Noite', 'Pôr do Sol', 'Amanhecer'].map(t => (
                                            <button 
                                                key={t}
                                                onClick={() => setSettings({...settings, time: t})}
                                                className={`text-xs py-1.5 rounded-lg border transition-all ${settings.time === t ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-[#111318] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">Clima</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Ensolarado', 'Chuvoso', 'Nublado', 'Neblina'].map(w => (
                                            <button 
                                                key={w}
                                                onClick={() => setSettings({...settings, weather: w})}
                                                className={`text-xs py-1.5 rounded-lg border transition-all ${settings.weather === w ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-[#111318] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                                            >
                                                {w}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => generateStreetView(selectedLocation)}
                                    className="w-full py-2 bg-primary text-white rounded-lg font-bold text-xs shadow-lg shadow-primary/20 hover:bg-primary/90 mt-2"
                                >
                                    Atualizar Simulação
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                         <label className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white mb-3">
                            <span className="material-symbols-outlined text-primary text-[20px]">layers</span> Pontos de Interesse
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Escolas', icon: 'school', color: 'text-blue-500' },
                                { label: 'Transporte', icon: 'directions_bus', color: 'text-emerald-500' },
                                { label: 'Hospitais', icon: 'local_hospital', color: 'text-red-500', checked: false },
                                { label: 'Academias', icon: 'fitness_center', color: 'text-orange-500', checked: false }
                            ].map(poi => (
                                <div key={poi.label} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-700">
                                    <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 bg-transparent" defaultChecked={poi.checked !== false} />
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{poi.label}</span>
                                    <span className={`material-symbols-outlined ${poi.color} text-[16px] ml-auto`}>{poi.icon}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <hr className="border-slate-100 dark:border-slate-700"/>
                    <div className="space-y-4">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                            <span className="material-symbols-outlined text-primary text-[20px]">timer</span> Simulador de Tempo
                        </label>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Destino</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 material-symbols-outlined text-slate-400 text-[18px]">work</span>
                                <input className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-primary focus:border-primary placeholder:text-slate-400" placeholder="ex: Centro Financeiro" defaultValue="Av. Paulista" />
                            </div>
                        </div>
                         <div className="flex gap-2">
                             {[
                                 { icon: 'directions_car', label: '12 min', active: true },
                                 { icon: 'directions_subway', label: '25 min' },
                                 { icon: 'directions_walk', label: '45 min' }
                             ].map(mode => (
                                <button key={mode.label} className={`flex-1 py-2 rounded-lg border flex justify-center items-center gap-1 transition-all ${mode.active ? 'bg-primary/10 border-primary text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                    <span className="material-symbols-outlined text-[18px]">{mode.icon}</span>
                                    <span className="text-xs font-bold">{mode.label}</span>
                                </button>
                             ))}
                        </div>
                    </div>
                    <hr className="border-slate-100 dark:border-slate-700"/>
                    <div className="space-y-4">
                         <label className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                            <span className="material-symbols-outlined text-primary text-[20px]">analytics</span> Valorização Regional
                        </label>
                        <div className="bg-slate-50 dark:bg-[#111318] rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                             <div className="flex justify-between items-end mb-2">
                                <div>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Preço Médio / m²</span>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white">R$ 5.420</div>
                                </div>
                                <div className="text-emerald-500 flex items-center text-sm font-bold bg-emerald-500/10 px-2 py-1 rounded">
                                    <span className="material-symbols-outlined text-[16px]">trending_up</span> +4.2%
                                </div>
                            </div>
                            <div className="h-16 flex items-end gap-1 mt-2">
                                {[40, 50, 45, 60, 75].map((h, i) => (
                                     <div key={i} className="w-1/6 bg-slate-200 dark:bg-slate-700 rounded-sm" style={{ height: `${h}%` }}></div>
                                ))}
                                <div className="w-1/6 bg-primary h-[90%] rounded-sm relative group cursor-pointer">
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Atual</div>
                                </div>
                            </div>
                        </div>
                    </div>
                     <hr className="border-slate-100 dark:border-slate-700"/>
                      <div className="space-y-4">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                            <span className="material-symbols-outlined text-primary text-[20px]">star_half</span> Perfil do Bairro
                        </label>
                        <div className="space-y-3">
                            {[
                                { label: 'Caminhabilidade', score: '85/100', width: '85%', color: 'bg-green-500' },
                                { label: 'Segurança', score: '92/100', width: '92%', color: 'bg-blue-500' },
                                { label: 'Nível de Ruído', score: 'Baixo', width: '30%', color: 'bg-yellow-400' }
                            ].map(stat => (
                                 <div key={stat.label}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-600 dark:text-slate-400">{stat.label}</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{stat.score}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                        <div className={`h-1.5 rounded-full ${stat.color}`} style={{ width: stat.width }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                 <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a212e]">
                    <button className="w-full py-3.5 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary text-white rounded-xl font-bold text-base shadow-lg shadow-primary/25 transition-all flex justify-center items-center gap-2 group">
                        <span className="material-symbols-outlined">download</span> Baixar Relatório Completo
                    </button>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default AreaSimulation;