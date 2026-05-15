import React, { useState, useEffect, useRef } from 'react';
import { Property, Contract } from '../src/types';
import { getLeads, updateLeadStatus } from '../src/services/dataService';
import { generateAIInsight, chatWithAI } from '../src/services/aiAnalyticsService';
import type { Lead } from '../src/services/neonService';
import type { AIInsight, AIMessage } from '../src/services/aiAnalyticsService';

interface AIAnalyticsProps {
    properties: Property[];
    contracts: Contract[];
}

const SCORE_COLORS = {
    hot: { label: '🔥 Quente', bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600', border: 'border-rose-200 dark:border-rose-800', dot: 'bg-rose-500' },
    warm: { label: '🌤 Morno', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
    cold: { label: '🧊 Frio', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
};

const STATUS_OPTIONS: { value: Lead['status'], label: string, color: string }[] = [
    { value: 'new', label: 'Novo', color: 'bg-blue-100 text-blue-700' },
    { value: 'contacted', label: 'Contactado', color: 'bg-purple-100 text-purple-700' },
    { value: 'qualified', label: 'Qualificado', color: 'bg-amber-100 text-amber-700' },
    { value: 'converted', label: 'Convertido', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'lost', label: 'Perdido', color: 'bg-slate-100 text-slate-500' },
];

const QUICK_QUESTIONS = [
    'Quais imóveis têm mais leads esta semana?',
    'Qual lead tem maior probabilidade de converter?',
    'Recomende uma estratégia de preço para o portfólio.',
    'Quais imóveis estão estagnados?',
    'Qual o perfil dos leads mais quentes?',
];

function getLeadTemp(score: number): 'hot' | 'warm' | 'cold' {
    if (score >= 70) return 'hot';
    if (score >= 40) return 'warm';
    return 'cold';
}

const AIAnalytics: React.FC<AIAnalyticsProps> = ({ properties, contracts }) => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [insight, setInsight] = useState<AIInsight | null>(null);
    const [isLoadingInsight, setIsLoadingInsight] = useState(true);
    const [activeTab, setActiveTab] = useState<'leads' | 'insights' | 'chat'>('insights');
    const [chatMessages, setChatMessages] = useState<AIMessage[]>([
        { role: 'model', text: '👋 Olá! Sou o assistente de IA do EstateFlow. Pergunta-me sobre seus leads, imóveis, preços ou estratégias de mercado.' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [tempFilter, setTempFilter] = useState<string>('all');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        getLeads().then(setLeads).catch(() => setLeads([]));
    }, []);

    useEffect(() => {
        if (leads.length > 0 || properties.length > 0) {
            setIsLoadingInsight(true);
            generateAIInsight(properties, leads, contracts)
                .then(setInsight)
                .catch(() => {})
                .finally(() => setIsLoadingInsight(false));
        } else {
            setIsLoadingInsight(false);
        }
    }, [leads.length, properties.length, contracts.length]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleStatusChange = async (leadId: string, status: Lead['status']) => {
        await updateLeadStatus(leadId, status);
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
    };

    const handleSendChat = async (text?: string) => {
        const message = text || chatInput.trim();
        if (!message || isChatLoading) return;
        setChatInput('');
        const userMsg: AIMessage = { role: 'user', text: message };
        setChatMessages(prev => [...prev, userMsg]);
        setIsChatLoading(true);
        try {
            const history = chatMessages.slice(-8);
            const response = await chatWithAI(message, { properties, leads, contracts }, history);
            setChatMessages(prev => [...prev, { role: 'model', text: response }]);
        } catch {
            setChatMessages(prev => [...prev, { role: 'model', text: 'Erro ao processar. Tente novamente.' }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const filteredLeads = leads.filter(l => {
        const statusOk = statusFilter === 'all' || l.status === statusFilter;
        const tempOk = tempFilter === 'all' || getLeadTemp(l.score) === tempFilter;
        return statusOk && tempOk;
    }).sort((a, b) => b.score - a.score);

    const hotCount = leads.filter(l => getLeadTemp(l.score) === 'hot').length;
    const warmCount = leads.filter(l => getLeadTemp(l.score) === 'warm').length;
    const newCount = leads.filter(l => l.status === 'new').length;
    const convertedCount = leads.filter(l => l.status === 'converted').length;

    return (
        <div className="bg-slate-50 dark:bg-[#0f1117] h-full flex flex-col font-display">
            {/* Header */}
            <header className="flex-none bg-white dark:bg-[#111318] border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                <div className="flex items-center justify-between max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="size-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[20px]">psychology</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white">IA Analytics</h1>
                            <p className="text-xs text-slate-500">{leads.length} leads · {properties.length} imóveis · {contracts.length} contratos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        {([['insights', 'Insights IA'], ['leads', `Leads (${leads.length})`], ['chat', 'Chat IA']] as const).map(([id, label]) => (
                            <button key={id} onClick={() => setActiveTab(id)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === id ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-[1600px] mx-auto">

                    {/* ── KPI STRIP ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Leads Totais', value: leads.length, icon: 'group', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                            { label: 'Leads Quentes 🔥', value: hotCount, icon: 'local_fire_department', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
                            { label: 'Novos (sem contato)', value: newCount, icon: 'mark_email_unread', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                            { label: 'Convertidos', value: convertedCount, icon: 'handshake', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                        ].map(stat => (
                            <div key={stat.label} className="bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
                                <div className={`size-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                                    <span className={`material-symbols-outlined ${stat.color} text-[24px]`}>{stat.icon}</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                                    <p className="text-xs text-slate-500">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── INSIGHTS TAB ── */}
                    {activeTab === 'insights' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* AI Summary Card */}
                            <div className="lg:col-span-2 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="material-symbols-outlined text-violet-200">auto_awesome</span>
                                        <span className="text-xs font-bold text-violet-200 uppercase tracking-wider">Análise Inteligente em Tempo Real</span>
                                        {isLoadingInsight && <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin ml-2" />}
                                    </div>
                                    <p className="text-xl font-bold leading-relaxed mb-4">
                                        {isLoadingInsight ? 'Analisando seu portfólio com IA...' : insight?.summary || 'Adicione dados ao sistema para gerar insights.'}
                                    </p>
                                    {insight?.weeklyHighlight && (
                                        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur rounded-full px-4 py-1.5">
                                            <span className="material-symbols-outlined text-[16px]">star</span>
                                            <span className="text-sm font-medium">{insight.weeklyHighlight}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Hot Leads */}
                            <div className="bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-rose-500">local_fire_department</span>
                                    <h3 className="font-bold text-slate-900 dark:text-white">Leads Mais Quentes</h3>
                                </div>
                                {isLoadingInsight ? (
                                    <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
                                ) : insight?.hotLeads?.length ? (
                                    <ul className="space-y-3">
                                        {insight.hotLeads.map((lead, i) => (
                                            <li key={i} className="flex items-start gap-3 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                                                <span className="size-6 rounded-full bg-rose-500 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                                <p className="text-sm text-rose-800 dark:text-rose-200 leading-relaxed">{lead}</p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-slate-400 text-center py-6">Sem dados de leads quentes ainda.</p>
                                )}
                            </div>

                            {/* Stagnated Properties */}
                            <div className="bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-amber-500">trending_down</span>
                                    <h3 className="font-bold text-slate-900 dark:text-white">Imóveis Estagnados</h3>
                                </div>
                                {isLoadingInsight ? (
                                    <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
                                ) : insight?.stagnatedProperties?.length ? (
                                    <ul className="space-y-3">
                                        {insight.stagnatedProperties.map((prop, i) => (
                                            <li key={i} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                                <span className="material-symbols-outlined text-amber-500 text-[20px] shrink-0 mt-0.5">warning</span>
                                                <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">{prop}</p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-slate-400 text-center py-6">Todos os imóveis com bom desempenho!</p>
                                )}
                            </div>

                            {/* Price Recommendation */}
                            <div className="bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-emerald-500">price_change</span>
                                    <h3 className="font-bold text-slate-900 dark:text-white">Recomendação de Preço</h3>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {isLoadingInsight ? 'Calculando...' : insight?.priceRecommendation || 'Adicione imóveis para análise de preços.'}
                                </p>
                            </div>

                            {/* Action Items */}
                            <div className="bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-indigo-500">task_alt</span>
                                    <h3 className="font-bold text-slate-900 dark:text-white">Ações Prioritárias</h3>
                                </div>
                                {isLoadingInsight ? (
                                    <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {(insight?.actionItems || ['Configure a API Key do Gemini para ver recomendações personalizadas.']).map((item, i) => (
                                            <li key={i} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                                <span className="size-5 rounded-full border-2 border-indigo-300 flex items-center justify-center shrink-0">
                                                    <span className="size-2 rounded-full bg-indigo-500" />
                                                </span>
                                                <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── LEADS TAB ── */}
                    {activeTab === 'leads' && (
                        <div>
                            {/* Filters */}
                            <div className="flex flex-wrap gap-3 mb-5">
                                <div className="flex gap-1 bg-white dark:bg-[#1a1d23] border border-slate-200 dark:border-slate-800 p-1 rounded-lg">
                                    {['all', 'hot', 'warm', 'cold'].map(t => (
                                        <button key={t} onClick={() => setTempFilter(t)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${tempFilter === t ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                            {t === 'all' ? 'Todos' : t === 'hot' ? '🔥 Quentes' : t === 'warm' ? '🌤 Mornos' : '🧊 Frios'}
                                        </button>
                                    ))}
                                </div>
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                    className="h-9 bg-white dark:bg-[#1a1d23] border border-slate-200 dark:border-slate-800 rounded-lg text-sm px-3 text-slate-700 dark:text-slate-300">
                                    <option value="all">Todos os status</option>
                                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>

                            {filteredLeads.length === 0 ? (
                                <div className="text-center py-20 bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">person_search</span>
                                    <p className="text-slate-500 font-medium">Nenhum lead encontrado.</p>
                                    <p className="text-slate-400 text-sm mt-1">Os leads aparecem quando visitantes preenchem o formulário de contato nos imóveis.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filteredLeads.map(lead => {
                                        const temp = getLeadTemp(lead.score);
                                        const colors = SCORE_COLORS[temp];
                                        const statusCfg = STATUS_OPTIONS.find(s => s.value === lead.status) || STATUS_OPTIONS[0];
                                        return (
                                            <div key={lead.id} className={`bg-white dark:bg-[#1a1d23] rounded-xl border ${colors.border} p-5 hover:shadow-md transition-shadow`}>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`size-10 rounded-full ${colors.bg} flex items-center justify-center`}>
                                                            <span className={`font-black text-lg ${colors.text}`}>{lead.name.charAt(0).toUpperCase()}</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-slate-900 dark:text-white">{lead.name}</p>
                                                            <p className="text-xs text-slate-400">{lead.source}</p>
                                                        </div>
                                                    </div>
                                                    {/* Score badge */}
                                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${colors.bg} border ${colors.border}`}>
                                                        <div className={`size-2 rounded-full ${colors.dot}`} />
                                                        <span className={`text-xs font-black ${colors.text}`}>{lead.score}</span>
                                                    </div>
                                                </div>

                                                {lead.propertyTitle && (
                                                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">home</span>
                                                        {lead.propertyTitle}
                                                    </p>
                                                )}
                                                {lead.email && <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><span className="material-symbols-outlined text-[14px]">mail</span>{lead.email}</p>}
                                                {lead.phone && <p className="text-xs text-slate-500 flex items-center gap-1 mb-2"><span className="material-symbols-outlined text-[14px]">phone</span>{lead.phone}</p>}

                                                <div className="mt-3 flex items-center justify-between">
                                                    <span className="text-[10px] text-slate-400">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</span>
                                                    <select value={lead.status}
                                                        onChange={e => handleStatusChange(lead.id, e.target.value as Lead['status'])}
                                                        className={`text-xs font-bold px-2 py-1 rounded-full border-0 cursor-pointer ${statusCfg.color} appearance-none`}>
                                                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── CHAT TAB ── */}
                    {activeTab === 'chat' && (
                        <div className="flex flex-col h-[calc(100vh-240px)] bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {chatMessages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'model' && (
                                            <div className="size-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mr-3 mt-1">
                                                <span className="material-symbols-outlined text-white text-[16px]">psychology</span>
                                            </div>
                                        )}
                                        <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                            msg.role === 'user'
                                                ? 'bg-primary text-white rounded-tr-sm'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                                        }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {isChatLoading && (
                                    <div className="flex justify-start">
                                        <div className="size-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mr-3">
                                            <span className="material-symbols-outlined text-white text-[16px]">psychology</span>
                                        </div>
                                        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                                            <span className="size-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="size-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="size-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Quick Questions */}
                            {chatMessages.length <= 1 && (
                                <div className="px-5 pb-2 flex flex-wrap gap-2">
                                    {QUICK_QUESTIONS.map(q => (
                                        <button key={q} onClick={() => handleSendChat(q)}
                                            className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-600 dark:text-slate-300 rounded-full transition-all">
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Input */}
                            <div className="flex-none border-t border-slate-200 dark:border-slate-800 p-4 flex gap-3">
                                <input
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                                    placeholder="Pergunte sobre seus leads, imóveis ou mercado..."
                                    className="flex-1 h-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                                <button onClick={() => handleSendChat()} disabled={!chatInput.trim() || isChatLoading}
                                    className="size-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-40 active:scale-95 shadow-lg shadow-indigo-500/20">
                                    <span className="material-symbols-outlined text-[20px]">send</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIAnalytics;
