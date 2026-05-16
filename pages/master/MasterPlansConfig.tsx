import React, { useState, useEffect } from 'react';

const MasterPlansConfig: React.FC = () => {
  const [planName, setPlanName] = useState('Mensal');
  const [planPrice, setPlanPrice] = useState('170');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const master = JSON.parse(localStorage.getItem('master_session') || '{}');
      const token = master?.token || '';
      const res = await fetch('/api/master/saas-settings', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.plan_name) setPlanName(data.plan_name);
      if (data.plan_price) setPlanPrice(String(data.plan_price));
    } catch (e) {
      console.error('Erro ao carregar config:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const master = JSON.parse(localStorage.getItem('master_session') || '{}');
      const token = master?.token || '';
      const res = await fetch('/api/master/saas-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ plan_name: planName, plan_price: Number(planPrice) }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Configurações salvas com sucesso!');
      } else {
        setMessage('Erro ao salvar: ' + (data.error || 'desconhecido'));
      }
    } catch (e: any) {
      setMessage('Erro de conexão: ' + e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="size-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-3xl p-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
          <span className="material-symbols-outlined text-emerald-400">attach_money</span>
          Precificação Global
        </h2>
        <p className="text-slate-400 text-sm mb-8">
          Define o nome e valor do plano exibido na página de assinatura para todas as imobiliárias.
        </p>

        {message && (
          <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${
            message.includes('sucesso') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Nome do Plano</label>
            <input
              type="text"
              value={planName}
              onChange={e => setPlanName(e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
              placeholder="Ex: Mensal, Premium, Profissional"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={planPrice}
              onChange={e => setPlanPrice(e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-700/50 border border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
            />
          </div>

          <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 flex items-start gap-3">
            <span className="material-symbols-outlined text-indigo-400 text-lg mt-0.5">info</span>
            <div>
              <p className="text-sm font-bold text-indigo-300">Impacto imediato</p>
              <p className="text-xs text-indigo-400/80">O novo valor será exibido na página de planos de todas as imobiliárias e usado no checkout do Mercado Pago.</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            {saving ? (
              <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview do plano */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-3xl p-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-400">preview</span>
          Preview — Página de Planos
        </h3>
        <div className="bg-gradient-to-b from-indigo-500/10 to-slate-800 border border-indigo-500/30 rounded-2xl p-6 text-center">
          <p className="text-slate-400 text-sm uppercase tracking-widest mb-2">{planName || 'Mensal'}</p>
          <div className="text-4xl font-black text-white">R$ {Number(planPrice || 170).toFixed(2)} <span className="text-slate-400 text-sm font-normal">/mês</span></div>
          <p className="text-slate-500 text-xs mt-2">Cobrança mensal recorrente. Cancele quando quiser.</p>
        </div>
      </div>
    </div>
  );
};

export default MasterPlansConfig;
