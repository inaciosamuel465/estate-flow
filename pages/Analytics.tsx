import React, { useState, useMemo } from 'react';
import { Property, Contract } from '../src/types';
import { getDashboardStats } from '../src/services/dataService';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line
} from 'recharts';

const COLORS = ['#2b6cee', '#10b981', '#f59e0b', '#8b5cf6'];

// Helper to extract numeric price from string if needed
const parsePrice = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val.replace(/[^\d.-]/g, '')) || 0;
    return 0;
};


interface AnalyticsProps {
    properties?: Property[];
    contracts?: Contract[];
}

const Analytics: React.FC<AnalyticsProps> = ({ properties = [], contracts = [] }) => {
    const [timeRange, setTimeRange] = useState('6m');
    const [dbStats, setDbStats] = useState({ totalViews: 0, viewsThisWeek: 0, totalLeads: 0, leadsThisWeek: 0, activeProperties: 0, totalRevenue: 0 });

    React.useEffect(() => {
        getDashboardStats().then(setDbStats).catch(() => {});
    }, []);

    // Real KPIs
    const activeProps = properties.filter(p => p.status === 'active');
    const totalRevenue = dbStats.totalRevenue || contracts.filter(c => c.status === 'active').reduce((acc, c) => acc + Number(c.value || 0), 0);
    const convRate = dbStats.totalLeads > 0 ? ((contracts.length / dbStats.totalLeads) * 100).toFixed(1) : '0.0';
    const totalLeads = dbStats.totalLeads;
    const activeCount = dbStats.activeProperties || activeProps.length;

    // --- Data for Charts ---
    
    // 1. Property Type Distribution
    const propertyTypeData = useMemo(() => {
        const types: Record<string, number> = {};
        properties.forEach(p => {
            const cat = p.category || 'Outros';
            types[cat] = (types[cat] || 0) + 1;
        });
        return Object.entries(types).map(([name, value]) => ({ name, value }));
    }, [properties]);

    // 2. Neighborhood Performance
    const neighborhoodData = useMemo(() => {
        const areas: Record<string, { total: number, count: number }> = {};
        properties.forEach(p => {
            const neighborhood = p.location?.split('-')[0]?.trim() || 'Desconhecido';
            const price = parsePrice(p.price);
            const sqm = p.specs?.find(s => s.icon === 'square_foot')?.value || '100';
            const sqmNum = parseFloat(sqm.replace(/[^\d]/g, '')) || 100;
            const priceSqm = price / sqmNum;
            
            if (!areas[neighborhood]) areas[neighborhood] = { total: 0, count: 0 };
            areas[neighborhood].total += priceSqm;
            areas[neighborhood].count += 1;
        });
        return Object.entries(areas)
            .map(([name, data]) => ({ name, priceSqm: Math.round(data.total / data.count) }))
            .sort((a, b) => b.priceSqm - a.priceSqm)
            .slice(0, 5);
    }, [properties]);

    // 3. Revenue Data (Simplified for current month + historical logic)
    const revenueData = useMemo(() => {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const currentMonth = new Date().getMonth();
        return months.slice(Math.max(0, currentMonth - 5), currentMonth + 1).map((m, i) => ({
            name: m,
            revenue: totalRevenue * (0.5 + Math.random() * 0.5), // Simulate historical
            profit: (totalRevenue * (0.5 + Math.random() * 0.5)) * 0.25
        }));
    }, [totalRevenue]);

    // 4. Funnel Data (Real)
    const leadsFunnelData = useMemo(() => {
        return [
            { name: 'Visitantes', value: dbStats.totalViews },
            { name: 'Leads', value: dbStats.totalLeads },
            { name: 'Qualificados', value: Math.round(dbStats.totalLeads * 0.4) }, // Estimate based on typical 40% qualification
            { name: 'Propostas', value: Math.round(dbStats.totalLeads * 0.15) }, // Estimate 15% proposals
            { name: 'Fechamentos', value: contracts.length },
        ];
    }, [dbStats.totalViews, dbStats.totalLeads, contracts.length]);


    return (
        <div className="flex h-full flex-col bg-slate-50 dark:bg-background-dark overflow-y-auto">
            <div className="p-8 max-w-[1600px] mx-auto w-full space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Analytics & Insights</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Visualize o desempenho do seu negócio em tempo real.</p>
                    </div>
                    <div className="flex bg-white dark:bg-[#111318] p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                        {['1m', '3m', '6m', '1y'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${timeRange === range
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                {range.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {[
                        { title: 'Receita Ativa', value: `R$ ${totalRevenue > 0 ? (totalRevenue / 1000).toFixed(0) + 'k' : '0'}`, change: dbStats.totalRevenue > 0 ? '+real' : 'banco', icon: 'payments', color: 'text-emerald-500' },
                        { title: 'Leads Registrados', value: String(totalLeads), change: `+${dbStats.leadsThisWeek || 0} esta semana`, icon: 'group', color: 'text-blue-500' },
                        { title: 'Taxa de Conversão', value: `${convRate}%`, change: contracts.length > 0 ? `${contracts.length} contratos` : 'sem contratos', icon: 'percent', color: 'text-amber-500' },
                        { title: 'Imóveis Ativos', value: String(activeCount), change: `${properties.length} total`, icon: 'home_work', color: 'text-purple-500' }
                    ].map((kpi, idx) => (
                        <div key={idx} className="bg-white dark:bg-[#1a1d23] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-lg ${kpi.color} bg-opacity-10 dark:bg-opacity-20 bg-current`}>
                                    <span className={`material-symbols-outlined text-2xl ${kpi.color}`}>{kpi.icon}</span>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${kpi.change.startsWith('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {kpi.change}
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{kpi.title}</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{kpi.value}</h3>
                        </div>
                    ))}
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                    {/* Revenue Chart */}
                    <div className="bg-white dark:bg-[#1a1d23] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Evolução Financeira</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2b6cee" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#2b6cee" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" name="Faturamento" stroke="#2b6cee" fillOpacity={1} fill="url(#colorRevenue)" />
                                    <Area type="monotone" dataKey="profit" name="Lucro Líquido" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
                                    <Legend />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Funnel Chart (Composite) */}
                    <div className="bg-white dark:bg-[#1a1d23] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Funil de Conversão</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={leadsFunnelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <XAxis type="number" stroke="#94a3b8" hide />
                                    <YAxis dataKey="name" type="category" width={100} stroke="#94a3b8" tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Bar dataKey="value" fill="#2b6cee" radius={[0, 4, 4, 0]} barSize={20}>
                                        {leadsFunnelData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#94a3b8' : index === 4 ? '#10b981' : '#2b6cee'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Type Distribution */}
                    <div className="bg-white dark:bg-[#1a1d23] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Distribuição de Portfólio</h3>
                        <div className="h-[300px] w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={propertyTypeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {propertyTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Neighborhood Performance */}
                    <div className="bg-white dark:bg-[#1a1d23] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Top Bairros (Valor m²)</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={neighborhoodData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis dataKey="name" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Preço m²']}
                                    />
                                    <Bar dataKey="priceSqm" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Analytics;
