import React, { useState, useEffect } from 'react';

const MASTER_TEST_EMAIL = 'smartlogic.sjl@gmail.com';

interface CompanySub {
  id: string;
  name: string;
  email: string;
  subscription_status: string;
  plan: string;
  created_at: string;
  admin_name?: string;
  admin_email?: string;
}

interface Payment {
  id: string;
  company_id: string;
  amount: number;
  status: string;
  paid_at: string;
}

const MasterBilling: React.FC = () => {
  const [companies, setCompanies] = useState<CompanySub[]>([]);
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const master = JSON.parse(localStorage.getItem('master_session') || '{}');
      const token = master?.token || '';

      const [companiesRes, paymentsRes] = await Promise.all([
        fetch('/api/master/saas-settings', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/master/saas-settings', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      // Load companies directly from DB via API
      const dbUrl = import.meta.env.VITE_DATABASE_URL;
      if (dbUrl) {
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(dbUrl);
        const tokenData = JSON.parse(atob(token));
        const userRes = await sql`SELECT role FROM master_users WHERE id = ${tokenData.id} LIMIT 1`;
        if (userRes.length > 0) {
          const companiesData = await sql`
            SELECT c.id, c.name, c.email, c.subscription_status, c.plan, c.created_at,
              (SELECT u.name FROM users u WHERE u.company_id = c.id AND u.id = cs.billing_admin_id LIMIT 1) as admin_name,
              (SELECT u.email FROM users u WHERE u.company_id = c.id AND u.id = cs.billing_admin_id LIMIT 1) as admin_email
            FROM companies c
            LEFT JOIN company_settings cs ON cs.company_id = c.id
            ORDER BY c.created_at DESC
          `;
          setCompanies(companiesData.map((c: any) => ({
            id: c.id, name: c.name, email: c.email || '',
            subscription_status: c.subscription_status || 'inactive',
            plan: c.plan || '-', created_at: c.created_at,
            admin_name: c.admin_name, admin_email: c.admin_email,
          })));

          const paymentsData = await sql`SELECT * FROM payments ORDER BY created_at DESC LIMIT 100`;
          const grouped: Record<string, Payment[]> = {};
          for (const p of paymentsData) {
            if (!grouped[p.company_id]) grouped[p.company_id] = [];
            grouped[p.company_id].push({ id: p.id, company_id: p.company_id, amount: p.amount, status: p.status, paid_at: p.paid_at });
          }
          setPayments(grouped);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendBillingEmail = async (companyId: string, test = false) => {
    setSendingEmail(true);
    setEmailMsg('');
    try {
      const master = JSON.parse(localStorage.getItem('master_session') || '{}');
      const token = master?.token || '';
      const res = await fetch('/api/master/send-billing-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ company_id: companyId, ...(test ? { test_to: MASTER_TEST_EMAIL } : {}) }),
      });
      const data = await res.json();
      setEmailMsg(data.success ? `Email enviado com sucesso${test ? ` para ${MASTER_TEST_EMAIL}` : ''}!` : 'Erro: ' + (data.error || ''));
    } catch (e: any) {
      setEmailMsg('Erro de conexão: ' + e.message);
    } finally {
      setSendingEmail(false);
      setTimeout(() => setEmailMsg(''), 4000);
    }
  };

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2)}`;

  const filteredCompanies = companies.filter(c => {
    if (filter === 'all') return true;
    return c.subscription_status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="size-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {emailMsg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          emailMsg.includes('sucesso') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}>
          {emailMsg}
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Total</p>
          <p className="text-3xl font-black text-white mt-1">{companies.length}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
          <p className="text-emerald-400 text-xs uppercase tracking-widest font-bold">Ativas</p>
          <p className="text-3xl font-black text-emerald-400 mt-1">{companies.filter(c => c.subscription_status === 'active').length}</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
          <p className="text-amber-400 text-xs uppercase tracking-widest font-bold">Inativas</p>
          <p className="text-3xl font-black text-amber-400 mt-1">{companies.filter(c => c.subscription_status === 'inactive' || c.subscription_status === 'trialing').length}</p>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6">
          <p className="text-rose-400 text-xs uppercase tracking-widest font-bold">Suspensas</p>
          <p className="text-3xl font-black text-rose-400 mt-1">{companies.filter(c => c.subscription_status === 'suspended').length}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {(['all', 'active', 'inactive', 'suspended'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              filter === f ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : f === 'inactive' ? 'Inativas' : 'Suspensas'}
          </button>
        ))}
      </div>

      {/* Tabela de empresas */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left p-4 text-slate-400 text-xs font-bold uppercase tracking-wider">Empresa</th>
                <th className="text-left p-4 text-slate-400 text-xs font-bold uppercase tracking-wider">Plano</th>
                <th className="text-left p-4 text-slate-400 text-xs font-bold uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-slate-400 text-xs font-bold uppercase tracking-wider">Criada em</th>
                <th className="text-left p-4 text-slate-400 text-xs font-bold uppercase tracking-wider">Último Pagamento</th>
                <th className="text-right p-4 text-slate-400 text-xs font-bold uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map(c => {
                const companyPayments = payments[c.id] || [];
                const lastPayment = companyPayments[0];
                return (
                  <tr key={c.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="p-4">
                      <p className="text-white font-bold text-sm">{c.name}</p>
                      <p className="text-slate-500 text-xs">{c.email}</p>
                      {c.admin_email && c.admin_email !== c.email && (
                        <p className="text-slate-500 text-xs mt-0.5">Admin: {c.admin_email}</p>
                      )}
                    </td>
                    <td className="p-4 text-slate-300 text-sm capitalize">{c.plan || '-'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        c.subscription_status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                        c.subscription_status === 'suspended' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {c.subscription_status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-sm">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="p-4">
                      {lastPayment ? (
                        <div>
                          <p className="text-slate-300 text-sm">{formatCurrency(lastPayment.amount)}</p>
                          <p className="text-slate-500 text-xs">{new Date(lastPayment.paid_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleSendBillingEmail(c.id)}
                        disabled={sendingEmail}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-sm">mail</span>
                        Enviar Cobrança
                      </button>
                      <button
                        onClick={() => handleSendBillingEmail(c.id, true)}
                        disabled={sendingEmail}
                        className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-sm">outgoing_mail</span>
                        Teste
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredCompanies.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhuma empresa encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MasterBilling;
