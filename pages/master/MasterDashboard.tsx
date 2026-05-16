import React, { useEffect, useState } from 'react';

interface DashboardData {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalUsers: number;
  totalProperties: number;
  overdueCompanies: number;
}

const MasterDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(import.meta.env.VITE_DATABASE_URL || '');

        const [
          totalComp, activeComp, suspendedComp, overdueComp,
          userCount, propCount
        ] = await Promise.all([
          sql`SELECT COUNT(*) as c FROM companies`,
          sql`SELECT COUNT(*) as c FROM companies WHERE status = 'active'`,
          sql`SELECT COUNT(*) as c FROM companies WHERE status = 'suspended'`,
          sql`SELECT COUNT(*) as c FROM companies WHERE subscription_status = 'overdue' OR subscription_status = 'canceled'`,
          sql`SELECT COUNT(*) as c FROM users`,
          sql`SELECT COUNT(*) as c FROM properties`,
        ]);

        setData({
          totalCompanies: Number(totalComp[0]?.c || 0),
          activeCompanies: Number(activeComp[0]?.c || 0),
          suspendedCompanies: Number(suspendedComp[0]?.c || 0),
          overdueCompanies: Number(overdueComp[0]?.c || 0),
          totalUsers: Number(userCount[0]?.c || 0),
          totalProperties: Number(propCount[0]?.c || 0),
        });
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="size-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Imobiliárias', value: data?.totalCompanies || 0, color: 'bg-indigo-500/20 text-indigo-400', icon: 'business' },
    { label: 'Ativas', value: data?.activeCompanies || 0, color: 'bg-emerald-500/20 text-emerald-400', icon: 'check_circle' },
    { label: 'Suspensas', value: data?.suspendedCompanies || 0, color: 'bg-rose-500/20 text-rose-400', icon: 'cancel' },
    { label: 'Inadimplentes', value: data?.overdueCompanies || 0, color: 'bg-amber-500/20 text-amber-400', icon: 'warning' },
    { label: 'Usuários', value: data?.totalUsers || 0, color: 'bg-sky-500/20 text-sky-400', icon: 'group' },
    { label: 'Imóveis', value: data?.totalProperties || 0, color: 'bg-violet-500/20 text-violet-400', icon: 'real_estate_agent' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Dashboard Master</h1>
        <p className="text-slate-400 mt-1">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map(card => (
          <div key={card.label} className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`size-12 rounded-xl ${card.color} flex items-center justify-center`}>
                <span className="material-symbols-outlined text-2xl">{card.icon}</span>
              </div>
            </div>
            <p className="text-3xl font-black text-white">{card.value}</p>
            <p className="text-sm text-slate-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <h2 className="text-lg font-bold text-white mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center gap-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 p-4 rounded-xl transition-all border border-indigo-500/10">
            <span className="material-symbols-outlined">add_business</span>
            <span className="font-bold text-sm">Nova Imobiliária</span>
          </button>
          <button className="flex items-center gap-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 p-4 rounded-xl transition-all border border-emerald-500/10">
            <span className="material-symbols-outlined">receipt_long</span>
            <span className="font-bold text-sm">Ver Faturas</span>
          </button>
          <button className="flex items-center gap-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 p-4 rounded-xl transition-all border border-amber-500/10">
            <span className="material-symbols-outlined">report</span>
            <span className="font-bold text-sm">Ver Inadimplentes</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MasterDashboard;
