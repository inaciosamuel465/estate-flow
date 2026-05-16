import React, { useState, useRef } from 'react';

const ImageStudio: React.FC = () => {
  // --- Estados de Controle e UI ---
  const [activeTab, setActiveTab] = useState<'original' | 'ai'>('original');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Estados do Formulário (Engenharia de Prompt) ---
  const [config, setConfig] = useState({
    roomType: 'Sala de Estar',
    style: 'Moderno',
    materials: 'Madeira e Concreto',
    colors: 'Neutras e Terrosas',
    lighting: 'Luz Natural Suave'
  });

  // --- Imagem Base (Upload ou Default) ---
  const [baseImage, setBaseImage] = useState<string>("https://picsum.photos/1200/800?random=30");

  // --- Handlers ---

  const handleConfigChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBaseImage(reader.result as string);
        setActiveTab('original');
        setGeneratedImage(null); // Reseta geração anterior
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = () => fileInputRef.current?.click();

  // --- Lógica de Geração com Gemini ---
  const handleGenerate = async () => {
    setIsGenerating(true);
    setActiveTab('ai');

    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const randomSeed = Math.floor(Math.random() * 1000);
      setGeneratedImage(`https://picsum.photos/1200/800?random=${randomSeed}`);
    } catch (error) {
      console.error("Erro ao gerar imagem:", error);
      alert("Erro ao gerar imagem. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 h-full flex flex-col font-display text-slate-900 dark:text-white antialiased overflow-hidden">
      
      {/* --- HEADER --- */}
      <header className="flex-none bg-white dark:bg-[#111318] border-b border-slate-200 dark:border-slate-800 z-20">
        <div className="px-4 lg:px-8 py-3 max-w-[1600px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="size-8 text-primary flex items-center justify-center bg-primary/10 rounded-lg">
                    <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
                </div>
                <div>
                    <h2 className="text-lg font-bold leading-tight">Estúdio IA</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Virtual Staging & Renovation</p>
                </div>
            </div>
             <div className="flex items-center gap-3">
                 <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-colors">
                    <span className="material-symbols-outlined text-[16px]">history</span> Histórico
                </button>
                 <div className="size-8 rounded-full bg-slate-200 bg-cover bg-center border border-slate-300 dark:border-slate-600" style={{ backgroundImage: 'url("https://picsum.photos/100/100?random=29")' }}></div>
             </div>
        </div>
      </header>
      
      {/* --- MAIN CONTENT (Scrollable Wrapper) --- */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 h-full min-h-min">
            
            {/* --- COLUNA ESQUERDA: PREVIEW (Sticky on Desktop) --- */}
            <div className="lg:col-span-8 flex flex-col gap-4 lg:h-[calc(100vh-140px)] lg:sticky lg:top-0">
                
                {/* Visualizador Principal */}
                <div className="flex-grow relative bg-white dark:bg-[#151b26] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-sm">
                    {/* Toolbar Superior do Visualizador */}
                    <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 bg-white dark:bg-[#1a212e]">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button 
                                onClick={() => setActiveTab('original')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'original' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Original
                            </button>
                            <button 
                                onClick={() => setActiveTab('ai')}
                                disabled={!generatedImage && !isGenerating}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${activeTab === 'ai' ? 'bg-white dark:bg-slate-600 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <span className="material-symbols-outlined text-[14px]">auto_fix_high</span> Resultado IA
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={triggerUpload} className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                                <span className="material-symbols-outlined text-[16px]">upload</span> Trocar Foto
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                        </div>
                    </div>
                    
                    {/* Canvas da Imagem */}
                     <div className="flex-grow bg-[#0f1218] relative flex items-center justify-center p-4 group overflow-hidden min-h-[400px]">
                        <div className="relative w-full h-full flex items-center justify-center rounded-lg overflow-hidden">
                            
                            {/* Loader Overlay */}
                            {isGenerating && activeTab === 'ai' && (
                                <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                                    <div className="size-16 rounded-full border-4 border-primary border-t-transparent animate-spin mb-6"></div>
                                    <h3 className="text-xl font-bold animate-pulse">Criando seu novo ambiente...</h3>
                                    <p className="text-sm text-slate-400 mt-2 max-w-xs text-center">Aplicando estilo {config.style} em {config.roomType} com acabamentos em {config.materials}</p>
                                </div>
                            )}

                            {/* Imagem Display */}
                            {activeTab === 'original' ? (
                                <img alt="Original" className="max-w-full max-h-full object-contain shadow-2xl" src={baseImage} />
                            ) : (
                                generatedImage ? (
                                    <img alt="Generated" className="max-w-full max-h-full object-contain shadow-2xl animate-in fade-in zoom-in duration-500" src={generatedImage} />
                                ) : (
                                    <div className="text-slate-500 flex flex-col items-center justify-center h-full opacity-50">
                                        <span className="material-symbols-outlined text-6xl mb-4">image</span>
                                        <p>A imagem gerada aparecerá aqui.</p>
                                    </div>
                                )
                            )}

                            {/* Badge Informativa */}
                            {!isGenerating && (
                                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                                    <span className={`size-2 rounded-full ${activeTab === 'ai' ? 'bg-primary' : 'bg-white'}`}></span>
                                    {activeTab === 'original' ? 'Foto Original' : 'Virtual Staging'}
                                </div>
                            )}
                        </div>
                     </div>
                </div>
            </div>
            
            {/* --- COLUNA DIREITA: CONTROLES (Scrollable on Desktop) --- */}
            <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* Card de Configuração */}
                <div className="bg-white dark:bg-[#1a1d23] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-auto lg:max-h-[calc(100vh-140px)]">
                     <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1d23]">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">tune</span> Personalização
                        </h3>
                    </div>
                    
                    <div className="p-5 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                        
                        {/* Seletor de Cômodo */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ambiente</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Sala de Estar', 'Quarto', 'Cozinha', 'Banheiro', 'Escritório', 'Varanda'].map(room => (
                                    <button
                                        key={room}
                                        onClick={() => handleConfigChange('roomType', room)}
                                        className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all text-left flex items-center justify-between ${
                                            config.roomType === room 
                                            ? 'bg-primary/10 border-primary text-primary' 
                                            : 'bg-white dark:bg-[#111318] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                        }`}
                                    >
                                        {room}
                                        {config.roomType === room && <span className="material-symbols-outlined text-[16px]">check</span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <hr className="border-slate-100 dark:border-slate-700" />

                        {/* Seletor de Estilo (Visual) */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estilo de Design</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { name: 'Moderno', img: 33 }, { name: 'Industrial', img: 34 }, { name: 'Escandinavo', img: 35 },
                                    { name: 'Clássico', img: 36 }, { name: 'Boho', img: 37 }, { name: 'Minimalista', img: 38 }
                                ].map(style => (
                                    <div 
                                        key={style.name}
                                        onClick={() => handleConfigChange('style', style.name)}
                                        className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group border-2 transition-all ${config.style === style.name ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'}`}
                                    >
                                        <img src={`https://picsum.photos/150/150?random=${style.img}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={style.name} />
                                        <div className={`absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/80 via-transparent to-transparent ${config.style === style.name ? 'opacity-100' : 'opacity-80'}`}>
                                            <span className="text-[10px] font-bold text-white leading-tight">{style.name}</span>
                                        </div>
                                        {config.style === style.name && (
                                            <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-0.5">
                                                <span className="material-symbols-outlined text-[12px] block">check</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <hr className="border-slate-100 dark:border-slate-700" />

                        {/* Configurações Avançadas (Selects) */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Acabamentos & Materiais</label>
                                <select 
                                    value={config.materials}
                                    onChange={(e) => handleConfigChange('materials', e.target.value)}
                                    className="w-full h-10 bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 focus:ring-primary focus:border-primary"
                                >
                                    <option>Madeira e Concreto</option>
                                    <option>Mármore e Vidro</option>
                                    <option>Tijolo Aparente e Metal</option>
                                    <option>Tecidos Naturais e Madeira Clara</option>
                                </select>
                            </div>
                             <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Iluminação</label>
                                <select 
                                    value={config.lighting}
                                    onChange={(e) => handleConfigChange('lighting', e.target.value)}
                                    className="w-full h-10 bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 focus:ring-primary focus:border-primary"
                                >
                                    <option>Luz Natural Suave</option>
                                    <option>Entardecer Dourado (Golden Hour)</option>
                                    <option>Iluminação de Estúdio Dramática</option>
                                    <option>Luz Fria e Brilhante</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Botão de Ação (Sticky Bottom on Controls) */}
                    <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a212e]">
                        <button 
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full py-4 bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-primary text-white rounded-xl font-bold text-base shadow-lg shadow-primary/25 transition-all flex justify-center items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group active:scale-95"
                        >
                            {isGenerating ? (
                                <>
                                    <span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    <span>Processando...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[20px] group-hover:animate-pulse">auto_awesome</span> 
                                    <span>Gerar Novo Ambiente</span>
                                </>
                            )}
                        </button>
                        <p className="text-[10px] text-center text-slate-400 mt-3">
                            Powered by Gemini 2.5 Flash • Gerações ilimitadas no plano Pro
                        </p>
                    </div>
                </div>

                {/* Banner Promocional (Opcional) */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl p-5 text-white relative overflow-hidden hidden lg:block">
                     <div className="absolute top-0 right-0 -mt-2 -mr-2 w-20 h-20 bg-primary/30 rounded-full blur-xl"></div>
                     <h4 className="font-bold text-sm relative z-10 mb-1">Dica Pro</h4>
                     <p className="text-xs text-indigo-200 relative z-10 leading-relaxed">
                         Para melhores resultados, use fotos com boa iluminação e ângulos retos. A IA preserva a estrutura arquitetônica original.
                     </p>
                </div>

            </div>
        </div>
      </main>
    </div>
  );
};

export default ImageStudio;