import React, { useState, useEffect, useRef } from 'react';
import { Property, Contract } from '../src/types';
import { getDashboardStats, getActivityLog, getLeads } from '../src/services/dataService';
import { generateAIInsight } from '../src/services/aiAnalyticsService';
import type { AIInsight } from '../src/services/aiAnalyticsService';

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
  properties?: Property[];
  contracts?: Contract[];
  currentUser?: { name?: string; avatar?: string; } | null;
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

interface SubInfo {
  status: string;
  plan: string;
  current_period_end: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  properties = [],
  contracts = [],
  currentUser
}) => {
  const [currentDate, setCurrentDate] = useState('');
  const [dbStats, setDbStats] = useState({ totalViews: 0, viewsThisWeek: 0, totalLeads: 0, leadsThisWeek: 0, activeProperties: 0, totalRevenue: 0 });
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [boostSuccess, setBoostSuccess] = useState(false);
  const [subInfo, setSubInfo] = useState<SubInfo | null>(null);

  // Load real DB stats and AI insights
  useEffect(() => {
    const now = new Date();
    setCurrentDate(now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }));

    getDashboardStats().then(setDbStats).catch(() => {});
    getActivityLog(10).then(setActivityLog).catch(() => {});
    getLeads().then(setAllLeads).catch(() => {});
    (async () => {
      try {
        const companyId = localStorage.getItem('estateflow_company_id');
        if (companyId) {
          const token = localStorage.getItem('ef_token');
          const res = await fetch(`/api/subscriptions/status?company_id=${companyId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.subscription) setSubInfo(data.subscription);
          }
        }
      } catch {}
    })();

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

  // All values come from real DB queries (getDashboardStats)
  const activeCount = dbStats.activeProperties;
  const totalViews = dbStats.totalViews;
  const totalLeads = dbStats.totalLeads;
  const totalRevenue = dbStats.totalRevenue;
  const viewsThisWeek = dbStats.viewsThisWeek;
  const leadsThisWeek = dbStats.leadsThisWeek;

  // Conversion rate: leads that converted / total leads
  const convertedLeads = allLeads.filter(l => l.status === 'converted').length;
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';

  // Ticket médio: receita ativa / número de contratos ativos
  const activeContracts = contracts.filter(c => c.status === 'active');
  const averageTicket = activeContracts.length > 0 ? totalRevenue / activeContracts.length : 0;

  // Total interactions: views + leads (real data only)
  const totalInteractions = totalViews + totalLeads;

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

  // Simple chart bars based on real weekly views and leads
  const chartBars = [
    { label: 'Views', value: viewsThisWeek, max: Math.max(totalViews, 1), color: 'bg-violet-500' },
    { label: 'Leads', value: leadsThisWeek, max: Math.max(totalLeads, 1), color: 'bg-amber-500' },
    { label: 'Conversões', value: convertedLeads, max: Math.max(totalLeads, 1), color: 'bg-emerald-500' },
  ];

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
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                Bem-vindo{currentUser?.name ? `, ${currentUser.name.split(' ')[0]}` : ''}! 👋
              </h1>
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

          {/* Subscription Status Widget */}
          {subInfo && (
            <div className={`flex items-center justify-between px-5 py-3 rounded-xl border text-sm ${
              subInfo.status === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
              subInfo.status === 'trialing' ? 'bg-amber-50 border-amber-200 text-amber-700' :
              'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">
                  {subInfo.status === 'active' ? 'verified' : subInfo.status === 'trialing' ? 'hourglass_top' : 'error'}
                </span>
                <span className="font-bold">Assinatura: <span className="capitalize">{subInfo.status === 'active' ? 'Ativa' : subInfo.status === 'trialing' ? 'Período de Teste' : subInfo.status}</span></span>
              </div>
              <span className="text-xs opacity-80">
                {subInfo.current_period_end ? `Próxima cobrança: ${new Date(subInfo.current_period_end).toLocaleDateString('pt-BR')}` : ''}
              </span>
            </div>
          )}

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
                  {isLoadingAI ? 'Analisando dados do seu portfólio...' : aiInsight?.summary || 'Processando dados...'}
                </h2>
                <p className="text-blue-100 text-sm md:text-base font-medium leading-relaxed">
                  {isLoadingAI ? 'Analisando leads, imóveis e contratos...' : aiInsight?.weeklyHighlight || 'Gerando resumo semanal...'}
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

          {/* Grid de Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Card 1 — Imóveis Ativos */}
            <div className="flex flex-col gap-3 rounded-xl p-5 bg-white dark:bg-[#1a1d23] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[24px]">home_work</span>
                </div>
                <span className="flex items-center text-blue-600 text-xs font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">{activeCount} ativos</span>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Imóveis Ativos</p>
                <p className="text-slate-900 dark:text-white text-2xl font-bold mt-1">{activeCount}</p>
              </div>
            </div>
            {/* Card 2 — Visualizações */}
            <div className="flex flex-col gap-3 rounded-xl p-5 bg-white dark:bg-[#1a1d23] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start">
                <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[24px]">visibility</span>
                </div>
                {viewsThisWeek > 0 && (
                  <span className="flex items-center text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full">+{viewsThisWeek} semana</span>
                )}
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Visualizações</p>
                <p className="text-slate-900 dark:text-white text-2xl font-bold mt-1">{formatViews(totalViews)}</p>
              </div>
            </div>
            {/* Card 3 — Leads */}
            <div className="flex flex-col gap-3 rounded-xl p-5 bg-white dark:bg-[#1a1d23] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[24px]">groups</span>
                </div>
                {leadsThisWeek > 0 && (
                  <span className="flex items-center text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full">+{leadsThisWeek} semana</span>
                )}
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Leads Gerados</p>
                <p className="text-slate-900 dark:text-white text-2xl font-bold mt-1">{totalLeads}</p>
              </div>
            </div>
            {/* Card 4 — Taxa Conversão */}
            <div className="flex flex-col gap-3 rounded-xl p-5 bg-white dark:bg-[#1a1d23] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start">
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[24px]">pie_chart</span>
                </div>
                <span className="flex items-center text-slate-500 text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">real</span>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Taxa Conversão</p>
                <p className="text-slate-900 dark:text-white text-2xl font-bold mt-1">{conversionRate}%</p>
              </div>
            </div>
            {/* Card 5 — Ticket Médio */}
            <div className="flex flex-col gap-3 rounded-xl p-5 bg-white dark:bg-[#1a1d23] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start">
                <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[24px]">payments</span>
                </div>
                {totalRevenue > 0 && (
                  <span className="flex items-center text-teal-500 text-xs font-bold bg-teal-500/10 px-2 py-1 rounded-full">ativo</span>
                )}
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Ticket Médio</p>
                <p className="text-slate-900 dark:text-white text-2xl font-bold mt-1">{formatCurrency(averageTicket)}</p>
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
                  <p className="text-slate-500 dark:text-text-secondary text-sm">Dados reais do banco</p>
                </div>
              </div>
              <div className="flex flex-col p-6">
                <div className="flex items-baseline gap-4 mb-6">
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white transition-all duration-300">{formatViews(totalInteractions)}</h2>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Interações</span>
                </div>
                {/* Real Data Bars */}
                <div className="space-y-4">
                  {chartBars.map(bar => (
                    <div key={bar.label} className="flex items-center gap-4">
                      <span className="w-24 text-sm font-medium text-slate-600 dark:text-slate-400">{bar.label}</span>
                      <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${bar.color}`}
                          style={{ width: `${(bar.value / bar.max) * 100}%`, minWidth: bar.value > 0 ? '4%' : '0%' }}
                        ></div>
                      </div>
                      <span className="w-16 text-right text-sm font-bold text-slate-900 dark:text-white">{bar.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Side Panel: Alerts */}
            <div className="flex flex-col gap-6">

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
            © {new Date().getFullYear()} EstateFlow Suite. Todos os direitos reservados.
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;