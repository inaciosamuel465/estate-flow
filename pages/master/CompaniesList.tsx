import React, { useEffect, useState, useCallback } from 'react';

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  status: string;
  subscription_status: string;
  plan: string;
  created_at: string;
  visible: boolean;
  user_count?: number;
  property_count?: number;
  admin_info?: { name: string; email: string } | null;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400',
    inactive: 'bg-slate-500/20 text-slate-400',
    suspended: 'bg-rose-500/20 text-rose-400',
  };
  return map[status] || 'bg-slate-500/20 text-slate-400';
};

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

const CompaniesList: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', slug: '', email: '', phone: '', adminName: '', adminEmail: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [editCompany, setEditCompany] = useState<CompanyRow | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');

  const loadCompanies = useCallback(async () => {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(import.meta.env.VITE_DATABASE_URL || '');
      const rows = await sql`
        SELECT c.*,
          (SELECT COUNT(*) FROM users WHERE company_id = c.id) as user_count,
          (SELECT COUNT(*) FROM properties WHERE company_id = c.id) as property_count,
          (SELECT json_build_object('name', u.name, 'email', u.email)
             FROM users u WHERE u.company_id = c.id AND u.role = 'admin' LIMIT 1) as admin_info
        FROM companies c
        ORDER BY c.created_at DESC
      `;
      setCompanies(rows as unknown as CompanyRow[]);
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  const handleCreate = async () => {
    if (!newCompany.name || !newCompany.slug) {
      setError('Nome e slug são obrigatórios');
      return;
    }
    setCreating(true);
    setError('');

    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(import.meta.env.VITE_DATABASE_URL || '');
      const id = `comp_${Date.now()}`;

      await sql`
        INSERT INTO companies (id, name, slug, email, phone, status, subscription_status, plan)
        VALUES (${id}, ${newCompany.name}, ${newCompany.slug}, ${newCompany.email || null}, ${newCompany.phone || null}, 'active', 'trialing', 'free')
      `;

      await sql`
        INSERT INTO subscriptions (id, company_id, plan_name, status, trial)
        VALUES (${'sub_' + id}, ${id}, 'free', 'trialing', true)
      `;

      await sql`
        INSERT INTO company_settings (company_id, company_name)
        VALUES (${id}, ${newCompany.name})
      `;

      if (newCompany.adminName && newCompany.adminEmail) {
        await sql`
          INSERT INTO users (id, name, email, role, company_id)
          VALUES (${'user_' + Date.now()}, ${newCompany.adminName}, ${newCompany.adminEmail}, 'admin', ${id})
        `;
      }

      setShowCreate(false);
      setNewCompany({ name: '', slug: '', email: '', phone: '', adminName: '', adminEmail: '' });
      await loadCompanies();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar empresa');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (company: CompanyRow) => {
    const newStatus = company.status === 'active' ? 'suspended' : 'active';
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(import.meta.env.VITE_DATABASE_URL || '');
    await sql`UPDATE companies SET status = ${newStatus}, updated_at = NOW() WHERE id = ${company.id}`;
    await loadCompanies();
  };

  const handleEditSave = async () => {
    if (!editCompany) return;
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(import.meta.env.VITE_DATABASE_URL || '');
      await sql`
        UPDATE companies SET name = ${editCompany.name}, slug = ${editCompany.slug}, visible = ${editCompany.visible}, updated_at = NOW()
        WHERE id = ${editCompany.id}
      `;
      setEditCompany(null);
      await loadCompanies();
    } catch (err) {
      console.error('Erro ao editar:', err);
    }
  };

  const handleToggleVisible = async (company: CompanyRow) => {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(import.meta.env.VITE_DATABASE_URL || '');
      await sql`UPDATE companies SET visible = ${!company.visible}, updated_at = NOW() WHERE id = ${company.id}`;
      await loadCompanies();
    } catch (err) {
      console.error('Erro ao alterar visibilidade:', err);
    }
  };

  const handleToggleSubStatus = async (company: CompanyRow) => {
    const newStatus = company.subscription_status === 'active' ? 'overdue' : 'active';
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(import.meta.env.VITE_DATABASE_URL || '');
    await sql`UPDATE companies SET subscription_status = ${newStatus}, updated_at = NOW() WHERE id = ${company.id}`;
    await loadCompanies();
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta imobiliária? Todos os dados serão perdidos.')) return;
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(import.meta.env.VITE_DATABASE_URL || '');
      await sql`DELETE FROM company_settings WHERE company_id = ${id}`;
      await sql`DELETE FROM subscriptions WHERE company_id = ${id}`;
      await sql`DELETE FROM payments WHERE company_id = ${id}`;
      await sql`DELETE FROM push_subscriptions WHERE company_id = ${id}`;
      await sql`DELETE FROM activity_log WHERE company_id = ${id}`;
      await sql`DELETE FROM notifications WHERE company_id = ${id}`;
      await sql`DELETE FROM leads WHERE company_id = ${id}`;
      await sql`DELETE FROM marketing_campaigns WHERE company_id = ${id}`;
      await sql`DELETE FROM property_views WHERE company_id = ${id}`;
      await sql`DELETE FROM contracts WHERE company_id = ${id}`;
      await sql`DELETE FROM properties WHERE company_id = ${id}`;
      await sql`DELETE FROM users WHERE company_id = ${id}`;
      await sql`DELETE FROM companies WHERE id = ${id}`;
      await loadCompanies();
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const handleSendBillingEmail = async (companyId: string) => {
    setSendingEmail(true);
    setEmailMsg('');
    try {
      const master = JSON.parse(localStorage.getItem('master_session') || '{}');
      const token = master?.token || '';
      const res = await fetch('/api/master/send-billing-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ company_id: companyId }),
      });
      const data = await res.json();
      setEmailMsg(data.success ? 'Email enviado com sucesso!' : 'Erro: ' + (data.error || ''));
    } catch (e: any) {
      setEmailMsg('Erro de conexão: ' + e.message);
    } finally {
      setSendingEmail(false);
      setTimeout(() => setEmailMsg(''), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="size-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Imobiliárias</h1>
          <p className="text-slate-400 mt-1">{companies.length} empresas registradas</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-xl transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          Nova Imobiliária
        </button>
      </div>

      {emailMsg && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${
          emailMsg.includes('sucesso') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}>
          {emailMsg}
        </div>
      )}

      {showCreate && (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Nova Imobiliária</h2>
          {error && <p className="text-rose-400 text-sm mb-4">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome *</label>
              <input value={newCompany.name} onChange={e => setNewCompany(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="Imobiliária Alpha" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Slug *</label>
              <input value={newCompany.slug} onChange={e => setNewCompany(p => ({ ...p, slug: e.target.value }))}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="imobiliaria-alpha" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Email</label>
              <input value={newCompany.email} onChange={e => setNewCompany(p => ({ ...p, email: e.target.value }))}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="contato@imobiliaria.com" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Telefone</label>
              <input value={newCompany.phone} onChange={e => setNewCompany(p => ({ ...p, phone: e.target.value }))}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="(15) 99999-9999" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Admin (nome)</label>
              <input value={newCompany.adminName} onChange={e => setNewCompany(p => ({ ...p, adminName: e.target.value }))}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="João Silva" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Admin (email)</label>
              <input value={newCompany.adminEmail} onChange={e => setNewCompany(p => ({ ...p, adminEmail: e.target.value }))}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="joao@imobiliaria.com" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={creating}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2">
              {creating ? <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Salvar</>}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="text-slate-400 hover:text-white px-6 py-3 rounded-xl transition-all font-medium">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Imobiliária</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Admin</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Contato</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Status</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Assinatura</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Visível</th>
                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Dados</th>
                <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(c => (
                <tr key={c.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-white font-bold">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.email || c.slug}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white text-sm">{c.admin_info?.name || '-'}</p>
                    <p className="text-xs text-slate-500">{c.admin_info?.email || '-'}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {c.phone || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusBadge(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${subBadge(c.subscription_status)}`}>
                      {c.subscription_status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleToggleVisible(c)}
                      className={`p-1.5 rounded-lg transition-all ${c.visible ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-slate-500/10'}`}
                      title={c.visible ? 'Visível no site' : 'Oculta'}>
                      <span className="material-symbols-outlined text-lg">{c.visible ? 'visibility' : 'visibility_off'}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    <p>{c.user_count || 0} usuários</p>
                    <p>{c.property_count || 0} imóveis</p>
                    <p className="text-xs text-slate-500">{c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleToggleStatus(c)}
                        className={`p-2 rounded-lg transition-all ${
                          c.status === 'active'
                            ? 'text-rose-400 hover:bg-rose-500/10'
                            : 'text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                        title={c.status === 'active' ? 'Suspender' : 'Ativar'}>
                        <span className="material-symbols-outlined text-lg">
                          {c.status === 'active' ? 'block' : 'check_circle'}
                        </span>
                      </button>
                      <button onClick={() => setEditCompany({ ...c })}
                        className="p-2 rounded-lg text-sky-400 hover:bg-sky-500/10 transition-all"
                        title="Editar">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button onClick={() => handleToggleSubStatus(c)}
                        className={`p-2 rounded-lg transition-all ${
                          c.subscription_status === 'active'
                            ? 'text-amber-400 hover:bg-amber-500/10'
                            : 'text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                        title={c.subscription_status === 'active' ? 'Marcar inadimplente' : 'Ativar assinatura'}>
                        <span className="material-symbols-outlined text-lg">
                          {c.subscription_status === 'active' ? 'credit_card_off' : 'credit_card'}
                        </span>
                      </button>
                      <button onClick={() => handleDeleteCompany(c.id)}
                        className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all"
                        title="Excluir">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500">
                    Nenhuma imobiliária encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editCompany && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditCompany(null)}>
          <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-2">{editCompany.name}</h2>
            <p className="text-xs text-slate-500 mb-5">/{editCompany.slug}</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome</label>
                <input value={editCompany.name} onChange={e => setEditCompany(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Slug</label>
                <input value={editCompany.slug} onChange={e => setEditCompany(p => ({ ...p, slug: e.target.value }))}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
              </div>

              <div className="border-t border-slate-700/30 pt-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Administrador</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Nome</p>
                    <p className="text-white font-medium">{editCompany.admin_info?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-white font-medium">{editCompany.admin_info?.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email empresa</p>
                    <p className="text-white font-medium">{editCompany.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Telefone</p>
                    <p className="text-white font-medium">{editCompany.phone || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700/30 pt-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Assinatura</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Plano</p>
                    <p className="text-white font-medium capitalize">{editCompany.plan || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <p className="text-white font-medium">{editCompany.subscription_status}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setEditCompany(p => ({ ...p, visible: !p.visible }))}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${editCompany.visible ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                  {editCompany.visible ? 'Visível' : 'Oculta'}
                </button>
                <span className="text-xs text-slate-500">{editCompany.visible ? 'Aparece no site principal' : 'Oculta do site principal'}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={handleEditSave} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-all">Salvar</button>
              <button onClick={() => handleSendBillingEmail(editCompany.id)} disabled={sendingEmail}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2">
                {sendingEmail ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-lg">mail</span>}
                Enviar Cobrança
              </button>
              <button onClick={() => setEditCompany(null)} className="text-slate-400 hover:text-white px-6 py-3 rounded-xl transition-all font-medium">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompaniesList;
