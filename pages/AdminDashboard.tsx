import React, { useState, useEffect, useRef } from 'react';
import { Property, Contract, Conversation } from '../src/types';
import { getDashboardStats, getActivityLog, getLeads } from '../src/services/dataService';
import { generateAIInsight } from '../src/services/aiAnalyticsService';
import type { AIInsight } from '../src/services/aiAnalyticsService';

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
  conversations?: Conversation[]; // Nova prop para contar mensagens
  properties?: Property[];
  contracts?: Contract[];
}

// Tipo para os alertas
interface AlertItem {
  id: number;
  type: 'price' | 'traffic' | 'lead' | 'system' | 'contract' | 'user';
  title: string;
  desc: string;
  isNew: boolean;
  time: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  conversations = [],
  properties = [],
  contracts = []
}) => {
  const [timeRange, setTimeRange] = useState<'30d' | '3m' | '1y'>('30d');
  const [isBoosting, setIsBoosting] = useState(false);
  const [boostSuccess, setBoostSuccess] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [dbStats, setDbStats] = useState({ totalViews: 0, viewsThisWeek: 0, totalLeads: 0, leadsThisWeek: 0, activeProperties: 0, totalRevenue: 0 });
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Load real DB stats and AI insights
  useEffect(() => {
    const now = new Date();
    setCurrentDate(now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }));

    getDashboardStats().then(setDbStats).catch(() => {});
    getActivityLog(10).then(setActivityLog).catch(() => {});

    if (properties.length > 0) {
      setIsLoadingAI(true);
      getLeads().then(leads => {
        return generateAIInsight(properties, leads, contracts);
      }).then(insight => {
        setAiInsight(insight);
      }).catch(() => {}).finally(() => setIsLoadingAI(false));
    }
  }, [properties.length, contracts.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'd': onNavigate('dashboard'); break;
          case 'l': onNavigate('listing'); break;
          case 'c': onNavigate('contracts'); break;
          case 'f': onNavigate('financial'); break;
          case 'u': onNavigate('users'); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate]);

  const totalUnread = conversations.reduce((acc, conv) => acc + conv.unreadCount, 0);

  // Use real DB stats merged with local calculations
  const activeCount = dbStats.activeProperties || properties.filter(p => p.status === 'active').length;
  const totalViews = dbStats.totalViews || 0;
  const totalLeads = dbStats.totalLeads || conversations.length + contracts.length * 3;

  // Ticket Médio from real DB revenue
  const totalRevenue = dbStats.totalRevenue || 0;
  const activeProps = properties.filter(p => p.status === 'active');
  const totalPrice = activeProps.reduce((acc, p) => {
    const price = typeof p.price === 'string' ? parseFloat(p.price.replace(/[^\d]/g, '')) : p.price;
    return acc + (price || 0);
  }, 0);
  const averageTicket = activeCount > 0 ? totalPrice / activeCount : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  const formatViews = (num: number) => {
    if (num > 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  // Alert data from real AI insight
  const alerts = aiInsight ? [
    aiInsight.weeklyHighlight && { id: 1, type: 'traffic', title: 'Destaque da Semana', desc: aiInsight.weeklyHighlight, isNew: true, time: 'agora' },
    aiInsight.priceRecommendation && { id: 2, type: 'price', title: 'Recomendação de Preço', desc: aiInsight.priceRecommendation, isNew: true, time: '1h' },
    ...(aiInsight.stagnatedProperties || []).map((p, i) => ({ id: 10 + i, type: 'lead', title: 'Imóvel sem Movimento', desc: p, isNew: false, time: '2h' })),
  ].filter(Boolean) as any[] : [
    { id: 1, type: 'price', title: 'Analisando portfólio...', desc: 'IA carregando dados. Aguarde.', isNew: false, time: '' },
  ];

  const getAlertStyle = (type: string) => {
    switch (type) {
      case 'price': return { icon: 'sell', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' };
      case 'traffic': return { icon: 'trending_up', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' };
      case 'lead': return { icon: 'star', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' };
      default: return { icon: 'info', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' };
    }
  };

  // Setup initial date moved to combined useEffect above

  // Mock Data configuration based on real data calculation
  const data = {
    '30d': {
      active: activeCount,
      views: formatViews(totalViews),
      leads: totalLeads,
      conversion: '2.4%', // Estimado
      ticket: formatCurrency(averageTicket),
      totalInteractions: formatViews(totalViews + totalLeads * 10),
      chartPath: "M0,220 C50,220 50,150 100,150 C150,150 150,100 200,100 C250,100 250,180 300,180 C350,180 350,120 400,120 C450,120 450,50 500,50 C550,50 550,90 600,90 C650,90 650,30 700,30 C750,30 750,80 800,80"
    },
    '3m': {
      active: activeCount, // Aumentaria historicamente, mas mantemos atual para simplificar
      views: formatViews(totalViews * 3),
      leads: totalLeads * 3,
      conversion: '2.5%',
      ticket: formatCurrency(averageTicket),
      totalInteractions: formatViews((totalViews + totalLeads * 10) * 3),
      chartPath: "M0,250 C80,240 120,200 200,180 C280,160 320,100 400,120 C480,140 520,80 600,60 C680,40 720,20 800,10"
    },
    '1y': {
      active: activeCount,
      views: formatViews(totalViews * 12),
      leads: totalLeads * 12,
      conversion: '2.6%',
      ticket: formatCurrency(averageTicket),
      totalInteractions: formatViews((totalViews + totalLeads * 10) * 12),
      chartPath: "M0,280 C100,270 150,250 250,200 C350,150 400,180 500,120 C600,60 650,100 800,20"
    }
  };

  const currentData = data[timeRange];

  const handleBoost = () => {
    setIsBoosting(true);
    setTimeout(() => {
      setIsBoosting(false);
      setBoostSuccess(true);
      setTimeout(() => setBoostSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display antialiased">

      {/* Área de Conteúdo Principal */}
      <div className="flex flex-1 flex-col overflow-y-auto bg-slate-50 dark:bg-background-dark">

        <main className="flex-1 p-4 md:p-8 max-w-[1600px] mx-auto w-full flex flex-col gap-8">
          {/* Seção de Cabeçalho */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Bem-vindo, Alex</h1>
              <p className="text-slate-600 text-base font-medium">Aqui está o pulso diário do mercado e insights da IA.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#282e39] text-slate-700 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#323945] transition-colors text-sm font-semibold shadow-sm">
                <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                {currentDate}
              </button>
              <button
                onClick={() => onNavigate('listing')}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg shadow-primary/25 text-sm font-semibold active:scale-95 transform duration-100"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Adicionar Imóvel
              </button>
            </div>
          </div>

          {/* Quick Actions & Shortcuts Hint */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-[#1a1d23] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex gap-4 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
              <button onClick={() => onNavigate('listing')} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 transition-all hover:shadow-md whitespace-nowrap group">
                <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">add_home</span> Novo Imóvel <span className="text-[10px] opacity-50 ml-1 font-normal border border-slate-300 px-1 rounded hidden lg:inline-block">Alt+L</span>
              </button>
              <button onClick={() => onNavigate('contracts')} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 transition-all hover:shadow-md whitespace-nowrap group">
                <span className="material-symbols-outlined text-purple-600 group-hover:scale-110 transition-transform">post_add</span> Novo Contrato <span className="text-[10px] opacity-50 ml-1 font-normal border border-slate-300 px-1 rounded hidden lg:inline-block">Alt+C</span>
              </button>
              <button onClick={() => onNavigate('users')} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 transition-all hover:shadow-md whitespace-nowrap group">
                <span className="material-symbols-outlined text-amber-600 group-hover:scale-110 transition-transform">person_add</span> Novo Usuário <span className="text-[10px] opacity-50 ml-1 font-normal border border-slate-300 px-1 rounded hidden lg:inline-block">Alt+U</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span className="material-symbols-outlined text-[16px]">keyboard</span>
              <span className="hidden md:inline">Atalhos: </span>
              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">Alt + D</span>
              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">Alt + F</span>
            </div>
          </div>

          {/* Banner de Insight da IA */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-indigo-600 p-6 md:p-8 shadow-xl shadow-primary/10 transition-all">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-black/10 rounded-full blur-xl"></div>
            <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center justify-between">
              <div className="flex flex-col gap-3 max-w-2xl">
                <div className="flex items-center gap-2 text-blue-100 mb-1">
                  <span className="material-symbols-outlined text-sm animate-pulse">auto_awesome</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Resumo Inteligente IA</span>
                </div>
                <h2 className="text-white text-xl md:text-2xl font-bold leading-snug">
                  {isLoadingAI ? 'Analisando dados do seu portfólio...' : aiInsight?.summary || (import.meta.env.VITE_GEMINI_API_KEY ? 'Processando dados...' : 'Configure a API Key da IA para insights.')}
                </h2>
                <p className="text-blue-100 text-sm md:text-base font-medium leading-relaxed">
                  {isLoadingAI ? 'A IA está lendo seus dados de leads, imóveis e contratos...' : aiInsight?.weeklyHighlight || (import.meta.env.VITE_GEMINI_API_KEY ? 'Gerando resumo semanal...' : 'Adicione VITE_GEMINI_API_KEY ao .env.local.')}
                </p>
              </div>
              <div className="flex shrink-0">
                <button
                  onClick={handleBoost}
                  disabled={isBoosting || boostSuccess}
                  className={`whitespace-nowrap rounded-lg backdrop-blur-sm px-5 py-2.5 text-sm font-bold text-white transition-all border ${boostSuccess
                    ? 'bg-green-500/80 border-green-400 cursor-default'
                    : 'bg-white/20 hover:bg-white/30 border-white/30'
                    }`}
                >
                  {isBoosting ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Processando...
                    </span>
                  ) : boostSuccess ? (
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">check</span>
                      Impulsionado!
                    </span>
                  ) : (
                    "Impulsionar Campanha"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Grid de Estatísticas - Scrollable horizontal on mobile */}
          <div className="flex xl:grid xl:grid-cols-5 gap-4 overflow-x-auto pb-4 xl:pb-0 no-scrollbar">
            {/* Card 1 */}
            <div className="flex-none w-[160px] md:w-auto xl:flex-1 flex flex-col gap-3 rounded-xl p-5 bg-white dark:bg-[#1a1d23] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[24px]">home_work</span>
                </div>
                <span className="flex items-center text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full">+2 novos</span>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Imóveis Ativos</p>
                <p className="text-slate-900 text-2xl font-bold mt-1 transition-all duration-500">{currentData.active}</p>
              </div>
            </div>
            {/* Card 2 */}
            <div className="flex-none w-[160px] md:w-auto xl:flex-1 flex flex-col gap-3 rounded-xl p-5 bg-white border border-slate-200 shadow-sm hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start">
                <div className="p-2 rounded-lg bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[24px]">visibility</span>
                </div>
                <span className="flex items-center text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full">+12%</span>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Visualizações</p>
                <p className="text-slate-900 text-2xl font-bold mt-1 transition-all duration-500">{currentData.views}</p>
              </div>
            </div>
            {/* Card 3 */}
            <div className="flex-none w-[160px] md:w-auto xl:flex-1 flex flex-col gap-3 rounded-xl p-5 bg-white border border-slate-200 shadow-sm hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[24px]">groups</span>
                </div>
                <span className="flex items-center text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full">+45 quentes</span>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Leads Gerados</p>
                <p className="text-slate-900 text-2xl font-bold mt-1 transition-all duration-500">{currentData.leads}</p>
              </div>
            </div>
            {/* Card 4 */}
            <div className="flex-none w-[160px] md:w-auto xl:flex-1 flex flex-col gap-3 rounded-xl p-5 bg-white border border-slate-200 shadow-sm hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start">
                <div className="p-2 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[24px]">pie_chart</span>
                </div>
                <span className="flex items-center text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full">+0.2%</span>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Taxa Conversão</p>
                <p className="text-slate-900 text-2xl font-bold mt-1 transition-all duration-500">{currentData.conversion}</p>
              </div>
            </div>
            {/* Card 5 */}
            <div className="flex-none w-[160px] md:w-auto xl:flex-1 flex flex-col gap-3 rounded-xl p-5 bg-white border border-slate-200 shadow-sm hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start">
                <div className="p-2 rounded-lg bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[24px]">payments</span>
                </div>
                <span className="flex items-center text-slate-500 text-xs font-bold bg-slate-100 px-2 py-1 rounded-full">estável</span>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Ticket Médio</p>
                <p className="text-slate-900 text-2xl font-bold mt-1 transition-all duration-500">{currentData.ticket}</p>

              </div>
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Chart Section */}
            <div className="xl:col-span-2 flex flex-col rounded-xl bg-white dark:bg-[#1a1d23] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 p-6 border-b border-slate-100 dark:border-slate-800/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Visão Geral de Desempenho</h3>
                  <p className="text-slate-500 dark:text-text-secondary text-sm">Leads vs Visualizações</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#111318] p-1 rounded-lg">
                  {[
                    { id: '30d', label: '30 Dias' },
                    { id: '3m', label: '3 Meses' },
                    { id: '1y', label: 'Ano' }
                  ].map((range) => (
                    <button
                      key={range.id}
                      onClick={() => setTimeRange(range.id as any)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${timeRange === range.id
                        ? 'bg-white dark:bg-[#282e39] shadow text-slate-900 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col p-6">
                <div className="flex items-baseline gap-4 mb-6">
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white transition-all duration-300">{currentData.totalInteractions}</h2>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Interações</span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span> 15%
                  </span>
                </div>
                {/* SVG Chart */}
                <div className="relative w-full aspect-[21/9] min-h-[250px]">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 800 300">
                    <defs>
                      <linearGradient id="gradient1" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#2b6cee" stopOpacity="0.2"></stop>
                        <stop offset="100%" stopColor="#2b6cee" stopOpacity="0"></stop>
                      </linearGradient>
                    </defs>
                    {[0, 75, 150, 225].map(y => (
                      <line key={y} className="text-slate-100 dark:text-slate-800" stroke="currentColor" strokeDasharray="4 4" x1="0" x2="800" y1={y} y2={y}></line>
                    ))}
                    <line className="text-slate-100 dark:text-slate-800" stroke="currentColor" x1="0" x2="800" y1="300" y2="300"></line>

                    {/* Dynamic Path with simple animation via key */}
                    <path
                      key={timeRange}
                      d={currentData.chartPath}
                      fill="none"
                      stroke="#2b6cee"
                      strokeLinecap="round"
                      strokeWidth="3"
                      className="transition-all duration-1000 ease-in-out"
                    >
                      <animate attributeName="stroke-dasharray" from="0, 2000" to="2000, 0" dur="1.5s" />
                    </path>

                    <path
                      key={`${timeRange}-fill`}
                      d={`${currentData.chartPath} V300 H0 Z`}
                      fill="url(#gradient1)"
                      opacity="0.5"
                      className="transition-all duration-1000 ease-in-out"
                    ></path>
                  </svg>

                  {/* Interactive Tooltip Area */}
                  <div className="absolute top-1/4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    Visitas: 1,204
                  </div>
                </div>
                <div className="flex justify-between mt-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <span>{timeRange === '30d' ? 'Semana 1' : timeRange === '3m' ? 'Mês 1' : 'Trimestre 1'}</span>
                  <span>{timeRange === '30d' ? 'Semana 2' : timeRange === '3m' ? 'Mês 2' : 'Trimestre 2'}</span>
                  <span>{timeRange === '30d' ? 'Semana 3' : timeRange === '3m' ? 'Mês 3' : 'Trimestre 3'}</span>
                  <span>{timeRange === '30d' ? 'Semana 4' : timeRange === '3m' ? 'Atual' : 'Atual'}</span>
                </div>
              </div>
            </div>

            {/* Side Panel: Messages & Alerts */}
            <div className="flex flex-col gap-6">

              {/* --- MESSAGES WIDGET (Redirects to Chat) --- */}
              <div className="flex flex-col rounded-xl bg-white dark:bg-[#1a1d23] border border-slate-200 dark:border-slate-800 shadow-sm h-[200px]">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-500">chat</span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Mensagens</h3>
                  </div>
                  {totalUnread > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{totalUnread} novas</span>}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                  {totalUnread > 0 ? (
                    <>
                      <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">Você tem mensagens não lidas!</p>
                      <p className="text-slate-400 text-xs mb-3">Responda aos clientes e proprietários.</p>
                    </>
                  ) : (
                    <p className="text-slate-400 text-sm">Nenhuma mensagem nova.</p>
                  )}
                  <button
                    onClick={() => onNavigate('chat')}
                    className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors w-full"
                  >
                    Abrir Central de Chat
                  </button>
                </div>
              </div>

              {/* Alert Section */}
              <div className="flex flex-col rounded-xl bg-white dark:bg-[#1a1d23] border border-slate-200 dark:border-slate-800 shadow-sm flex-1">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Alertas</h3>
                  <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs px-2 py-1 rounded-full font-bold">{alerts.filter(a => a.isNew).length} Novos</span>
                </div>
                <div className="p-4 flex flex-col gap-4 overflow-y-auto">
                  {alerts.map(alert => {
                    const style = getAlertStyle(alert.type);
                    return (
                      <div key={alert.id} className="relative flex gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                        <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${style.bg} ${style.color}`}>
                          <span className="material-symbols-outlined text-[20px]">{style.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{alert.title}</h4>
                            <span className="text-[10px] text-slate-400 shrink-0">{alert.time}</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{alert.desc}</p>
                        </div>
                        {alert.isNew && (
                          <div className="absolute top-4 right-2 size-2 bg-primary rounded-full ring-2 ring-white dark:ring-[#1a1d23]"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Table (Desktop Optimized) */}
          <div className="hidden md:block rounded-xl bg-white dark:bg-[#1a1d23] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Atividade Recente do Sistema</h3>
              <button className="text-sm text-primary font-bold hover:underline">Ver Log Completo</button>
            </div>
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-[#111318] text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="p-4 rounded-tl-lg">Horário</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Descrição</th>
                  <th className="p-4">Usuário</th>
                  <th className="p-4 rounded-tr-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {(activityLog.length > 0 ? activityLog : [
                  { id: 0, time: '--:--', entityType: 'system', description: 'Nenhuma atividade registrada.', userName: 'Sistema' }
                ]).map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50 dark:hover:bg-[#20242c] transition-colors">
                    <td className="p-4 font-mono text-slate-500">{row.time}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        row.entityType === 'contract' ? 'bg-purple-100 text-purple-700' :
                        row.entityType === 'lead' ? 'bg-amber-100 text-amber-700' :
                        row.entityType === 'property' ? 'bg-blue-100 text-blue-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {row.entityType || 'sistema'}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-700 dark:text-slate-300">{row.description || row.action}</td>
                    <td className="p-4 text-slate-500">{row.userName || 'Sistema'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <div className="size-2 rounded-full bg-emerald-500"></div>
                        <span className="text-xs">ok</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-6 text-center text-xs text-slate-400 dark:text-slate-600">
            © 2023 EstateAI Platform. Todos os direitos reservados.
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;