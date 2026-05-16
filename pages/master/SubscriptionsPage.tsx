import React, { useEffect, useState } from 'react';

const subBadge = (status: string) => {
  const map: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400',
    trialing: 'bg-sky-500/20 text-sky-400',
    overdue: 'bg-amber-500/20 text-amber-400',
    canceled: 'bg-rose-500/20 text-rose-400',
    suspended: 'bg-red-500/20 text-red-400',
  };
  return map[status] || 'bg-slate-500/20 text-slate-400';
};

const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(import.meta.env.VITE_DATABASE_URL || '');
        const rows = await sql`
          SELECT s.*, c.name as company_name, c.email as company_email
          FROM subscriptions s
          LEFT JOIN companies c ON s.company_id = c.id
          ORDER BY s.created_at DESC
        `;
        setSubscriptions(rows as any[]);
      } catch (err) {
        console.error('Erro ao carregar assinaturas:', err);
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Assinaturas</h1>
        <p className="text-slate-400 mt-1">Gerenciamento de planos e pagamentos</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Imobiliária</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Plano</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Status</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Trial</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Início</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Expira</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Gateway</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map(s => (
                <tr key={s.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-white font-bold">{s.company_name || s.company_id}</p>
                    <p className="text-xs text-slate-500">{s.company_email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white font-bold">{s.plan_name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${subBadge(s.status)}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${s.trial ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-500/20 text-slate-400'}`}>
                      {s.trial ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {s.started_at ? new Date(s.started_at).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {s.expires_at ? new Date(s.expires_at).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{s.payment_gateway || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionsPage;
