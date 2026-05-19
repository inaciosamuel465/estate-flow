import React, { useState, useEffect } from 'react';

interface AgencySubscriptionProps {
  companyId: string;
  companyName?: string;
}

const AgencySubscription: React.FC<AgencySubscriptionProps> = ({ companyId, companyName }) => {
  const [subscription, setSubscription] = useState<{
    status: string;
    plan: string;
    current_period_start: string;
    current_period_end: string;
    mercado_pago_id: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('ef_token');
        const res = await fetch(`/api/subscriptions/status?company_id=${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSubscription(data);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [companyId]);

  const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: 'Ativa', color: 'text-emerald-600 bg-emerald-50' },
    trialing: { label: 'Teste', color: 'text-amber-600 bg-amber-50' },
    past_due: { label: 'Vencida', color: 'text-rose-600 bg-rose-50' },
    cancelled: { label: 'Cancelada', color: 'text-slate-500 bg-slate-50' },
    inactive: { label: 'Inativa', color: 'text-slate-500 bg-slate-50' },
  };

  const sc = statusConfig[subscription?.status || 'inactive'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-black text-slate-800">Assinatura</h2>
          {companyName && <p className="text-xs text-slate-400 mt-0.5">{companyName}</p>}
        </div>
        {subscription && (
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${sc.color}`}>{sc.label}</span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <span className="size-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : subscription ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Plano</span>
            <span className="font-bold text-slate-800 capitalize">{subscription.plan || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Início</span>
            <span className="font-medium text-slate-700">
              {subscription.current_period_start
                ? new Date(subscription.current_period_start).toLocaleDateString('pt-BR')
                : '—'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Próxima cobrança</span>
            <span className="font-medium text-slate-700">
              {subscription.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR')
                : '—'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Mercado Pago ID</span>
            <span className="font-mono text-xs text-slate-400 truncate max-w-[180px]">{subscription.mercado_pago_id || '—'}</span>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">credit_off</span>
          <p className="text-sm text-slate-500">Nenhuma assinatura ativa</p>
          <a href="/plans" className="mt-3 inline-block px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all">
            Assinar Agora
          </a>
        </div>
      )}
    </div>
  );
};

export default AgencySubscription;
