import React, { useState, useEffect } from 'react';

interface SubscriptionPlansProps {
  companyId: string;
  currentPlan?: string;
  currentStatus?: string;
  onBack?: () => void;
  isLoggedIn?: boolean;
  loginPath?: string;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ companyId, currentPlan, currentStatus, onBack, isLoggedIn, loginPath = '/' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [planName, setPlanName] = useState('Mensal');
  const [planPrice, setPlanPrice] = useState(170);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/master/saas-settings');
        const data = await res.json();
        if (data.plan_name) setPlanName(data.plan_name);
        if (data.plan_price) setPlanPrice(Number(data.plan_price));
      } catch { /* ignore */ }
      setLoadingConfig(false);
    })();
  }, []);

  const handleSelectPlan = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/subscriptions/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, plan: 'monthly', price: planPrice }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (data.sandbox_checkout_url) {
        window.location.href = data.sandbox_checkout_url;
      } else if (data.status === 'not_configured') {
        setError(data.message || 'Mercado Pago ainda nao foi configurado para gerar checkout real.');
      } else {
        setError(data.error || 'Erro ao gerar link de pagamento');
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexao');
    } finally {
      setLoading(false);
    }
  };

  const isSubscribed = currentStatus === 'active' || currentStatus === 'trialing';

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">lock</span>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Faça Login</h2>
          <p className="text-slate-500 text-sm mb-6">Você precisa estar logado para gerenciar sua assinatura.</p>
          <a href={loginPath} className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-xl transition-all">
            Ir para Login
          </a>
        </div>
      </div>
    );
  }

  if (loadingConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <span className="size-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6 overflow-y-auto">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          {onBack && (
            <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600 font-medium mb-4 inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Voltar
            </button>
          )}
          <h1 className="text-3xl font-black text-slate-900 mb-2">Assinatura</h1>
          <p className="text-slate-500 text-sm">
            {isSubscribed ? 'Sua assinatura esta ativa.' : 'Ative sua assinatura para usar o sistema.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-5 py-4 rounded-xl text-sm text-center font-medium">
            {error}
          </div>
        )}

        {currentPlan && (
          <div className="mb-6 bg-white rounded-xl border border-slate-200 p-5 text-center shadow-sm">
            <p className="text-sm text-slate-500">Plano: <span className="text-slate-800 font-bold capitalize">{currentPlan}</span></p>
            <p className="text-sm text-slate-500 mt-1">
              Status: <span className={`font-bold capitalize ${isSubscribed ? 'text-emerald-600' : 'text-amber-600'}`}>{currentStatus}</span>
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-2">{planName}</p>
          <div className="mb-5">
            <span className="text-5xl font-black text-slate-900">R$ {planPrice.toFixed(2)}</span>
            <span className="text-slate-400 text-sm ml-1">/mes</span>
          </div>
          <p className="text-slate-500 text-xs mb-6">Cobranca mensal recorrente. Cancele quando quiser.</p>

          <ul className="space-y-2.5 mb-8 text-left max-w-xs mx-auto">
            {[
              'Gestao completa de imoveis',
              'CRM de clientes',
              'Contratos digitais',
              'Marketing Studio com IA',
              'Relatorios e analytics',
              'Suporte prioritario',
            ].map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                <span className="mt-0.5 text-emerald-500 material-symbols-outlined text-lg">check_circle</span>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={handleSelectPlan}
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isSubscribed ? (
              <>
                <span className="material-symbols-outlined">upgrade</span>
                Gerenciar Assinatura
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">lock_open</span>
                Assinar Agora — R$ {planPrice.toFixed(2)}/mes
              </>
            )}
          </button>
        </div>

        <div className="mt-6 text-center bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-700 mb-2">Pagamento 100% Seguro</p>
          <p className="text-xs text-slate-400 mb-3">Processado pelo Mercado Pago. Aceitamos cartao, Pix e boleto.</p>
          <div className="flex items-center justify-center gap-4 text-slate-400">
            <span className="material-symbols-outlined text-xl">credit_card</span>
            <span className="material-symbols-outlined text-xl">pix</span>
            <span className="material-symbols-outlined text-xl">receipt</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
