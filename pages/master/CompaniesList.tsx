import React, { useEffect, useState, useCallback } from 'react';

const MASTER_TEST_EMAIL = 'smartlogic.sjl@gmail.com';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  subdomain?: string;
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
  billing_admin_id?: string | null;
  billing_admin_info?: { id: string; name: string; email: string } | null;
  admins?: AdminUser[];
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

const hashPassword = async (password: string) => {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const ensureTenantUserSchema = async (sql: any) => {
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id TEXT`;
  await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_company_email_idx ON users (company_id, lower(email))`;
};

const CompaniesList: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', slug: '', email: '', phone: '', adminName: '', adminEmail: '', adminPassword: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [editCompany, setEditCompany] = useState<CompanyRow | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', phone: '', password: '' });

  const loadCompanies = useCallback(async () => {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(import.meta.env.VITE_DATABASE_URL || '');
      await sql`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS billing_admin_id TEXT`;
      const rows = await sql`
        SELECT c.*,
          cs.billing_admin_id,
          (SELECT COUNT(*) FROM users WHERE company_id = c.id) as user_count,
          (SELECT COUNT(*) FROM properties WHERE company_id = c.id) as property_count,
          (SELECT json_build_object('name', u.name, 'email', u.email)
             FROM users u
             WHERE u.company_id = c.id AND u.role = 'admin'
             ORDER BY CASE WHEN u.id = cs.billing_admin_id THEN 0 ELSE 1 END, u.name
             LIMIT 1) as admin_info,
          (SELECT json_build_object('id', u.id, 'name', u.name, 'email', u.email)
             FROM users u
             WHERE u.company_id = c.id AND u.id = cs.billing_admin_id
             LIMIT 1) as billing_admin_info,
          COALESCE((
            SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'phone', u.phone, 'role', u.role) ORDER BY u.name)
            FROM users u
            WHERE u.company_id = c.id AND u.role = 'admin'
          ), '[]'::json) as admins
        FROM companies c
        LEFT JOIN company_settings cs ON cs.company_id = c.id
        ORDER BY c.created_at DESC
      `;
      setCompanies(rows as unknown as CompanyRow[]);
      return rows as unknown as CompanyRow[];
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
      return [];
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
      await sql`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS billing_admin_id TEXT`;

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
        await ensureTenantUserSchema(sql);
        const password = newCompany.adminPassword || `admin-${Date.now()}`;
        const hashedPassword = await hashPassword(password);
        const adminId = 'user_' + Date.now();
        await sql`
          INSERT INTO users (id, name, email, password, role, company_id)
          VALUES (${adminId}, ${newCompany.adminName}, ${newCompany.adminEmail}, ${hashedPassword}, 'admin', ${id})
        `;
        await sql`
          UPDATE company_settings SET billing_admin_id = ${adminId}, updated_at = NOW() WHERE company_id = ${id}
        `;
      }

      setShowCreate(false);
      setNewCompany({ name: '', slug: '', email: '', phone: '', adminName: '', adminEmail: '', adminPassword: '' });
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
        UPDATE companies SET
          name = ${editCompany.name},
          slug = ${editCompany.slug},
          subdomain = ${editCompany.subdomain || null},
          email = ${editCompany.email || null},
          phone = ${editCompany.phone || null},
          status = ${editCompany.status},
          subscription_status = ${editCompany.subscription_status},
          plan = ${editCompany.plan || 'free'},
          visible = ${editCompany.visible},
          updated_at = NOW()
        WHERE id = ${editCompany.id}
      `;
      setEditCompany(null);
      await loadCompanies();
    } catch (err) {
      console.error('Erro ao editar:', err);
    }
  };

  const refreshSelectedCompany = async (companyId: string) => {
    const rows = await loadCompanies();
    const updated = rows.find(company => company.id === companyId);
    if (updated) setEditCompany({ ...updated });
  };

  const handleSetBillingAdmin = async (companyId: string, adminId: string) => {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(import.meta.env.VITE_DATABASE_URL || '');
      await sql`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS billing_admin_id TEXT`;
      await sql`
        INSERT INTO company_settings (company_id, company_name, billing_admin_id, updated_at)
        VALUES (${companyId}, ${editCompany?.name || null}, ${adminId}, NOW())
        ON CONFLICT (company_id) DO UPDATE SET billing_admin_id = EXCLUDED.billing_admin_id, updated_at = NOW()
      `;
      setEditCompany(p => p ? ({ ...p, billing_admin_id: adminId, billing_admin_info: p.admins?.find(a => a.id === adminId) || null }) : p);
      await loadCompanies();
    } catch (err) {
      console.error('Erro ao definir admin de cobranca:', err);
    }
  };

  const handleUpdateAdmin = async (admin: AdminUser) => {
    if (!editCompany) return;
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(import.meta.env.VITE_DATABASE_URL || '');
      await sql`
        UPDATE users SET name = ${admin.name}, email = ${admin.email}, phone = ${admin.phone || null}
        WHERE id = ${admin.id} AND company_id = ${editCompany.id}
      `;
      await refreshSelectedCompany(editCompany.id);
    } catch (err) {
      console.error('Erro ao editar admin:', err);
    }
  };

  const handleAddAdmin = async () => {
    if (!editCompany) return;
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
      setEmailMsg('Preencha nome, email e senha do novo admin.');
      setTimeout(() => setEmailMsg(''), 4000);
      return;
    }

    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(import.meta.env.VITE_DATABASE_URL || '');
      await ensureTenantUserSchema(sql);
      const adminId = `user_${Date.now()}`;
      const hashedPassword = await hashPassword(newAdmin.password);
      await sql`
        INSERT INTO users (id, name, email, phone, password, role, company_id)
        VALUES (${adminId}, ${newAdmin.name}, ${newAdmin.email}, ${newAdmin.phone || null}, ${hashedPassword}, 'admin', ${editCompany.id})
      `;
      if (!editCompany.billing_admin_id && (editCompany.admins?.length || 0) === 0) {
        await handleSetBillingAdmin(editCompany.id, adminId);
      }
      setNewAdmin({ name: '', email: '', phone: '', password: '' });
      await refreshSelectedCompany(editCompany.id);
    } catch (err: any) {
      setEmailMsg('Erro ao criar admin: ' + (err.message || 'verifique os dados'));
      setTimeout(() => setEmailMsg(''), 4000);
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
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Senha do admin</label>
              <input type="password" value={newCompany.adminPassword} onChange={e => setNewCompany(p => ({ ...p, adminPassword: e.target.value }))}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="Senha inicial" />
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
                    <p className="text-xs text-slate-500">/{c.slug}{c.subdomain ? ` - ${c.subdomain}` : ''}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white text-sm">{c.billing_admin_info?.name || c.admin_info?.name || '-'}</p>
                    <p className="text-xs text-slate-500">{c.billing_admin_info?.email || c.admin_info?.email || '-'}</p>
                    {c.billing_admin_info && <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mt-1">Recebe cobranca</p>}
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
          <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-6 w-full max-w-5xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-2">{editCompany.name}</h2>
            <p className="text-xs text-slate-500 mb-5">/{editCompany.slug}</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome</label>
                <input value={editCompany.name} onChange={e => setEditCompany(p => p ? ({ ...p, name: e.target.value }) : p)}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Slug</label>
                <input value={editCompany.slug} onChange={e => setEditCompany(p => p ? ({ ...p, slug: e.target.value.trim().toLowerCase() }) : p)}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Subdominio futuro</label>
                  <input value={editCompany.subdomain || ''} onChange={e => setEditCompany(p => p ? ({ ...p, subdomain: e.target.value.trim().toLowerCase() }) : p)}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="estateflow" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">URL publica</label>
                  <a href={`/${editCompany.slug}`} target="_blank" rel="noreferrer"
                    className="w-full flex items-center justify-between bg-slate-700/40 border border-slate-600/50 rounded-xl px-4 py-3 text-white hover:bg-slate-700 transition-all">
                    <span>/{editCompany.slug}</span>
                    <span className="material-symbols-outlined text-lg">open_in_new</span>
                  </a>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Email da empresa</label>
                  <input value={editCompany.email || ''} onChange={e => setEditCompany(p => p ? ({ ...p, email: e.target.value }) : p)}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Telefone</label>
                  <input value={editCompany.phone || ''} onChange={e => setEditCompany(p => p ? ({ ...p, phone: e.target.value }) : p)}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</label>
                  <select value={editCompany.status} onChange={e => setEditCompany(p => p ? ({ ...p, status: e.target.value }) : p)}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                    <option value="active">Ativa</option>
                    <option value="inactive">Inativa</option>
                    <option value="suspended">Suspensa</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Visibilidade</label>
                  <button onClick={() => setEditCompany(p => p ? ({ ...p, visible: !p.visible }) : p)}
                    className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition-all ${editCompany.visible ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                    {editCompany.visible ? 'Visivel no SaaS' : 'Oculta no SaaS'}
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-700/30 pt-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admins da imobiliaria</p>
                    <p className="text-xs text-slate-500 mt-1">Edite admins e escolha quem recebe as cobrancas.</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{editCompany.admins?.length || 0} admins</span>
                </div>
                <div className="space-y-3">
                  {(editCompany.admins || []).map(admin => (
                    <div key={admin.id} className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_0.8fr_auto_auto] gap-3 bg-slate-900/40 border border-slate-700/50 rounded-xl p-3">
                      <input value={admin.name} onChange={e => setEditCompany(p => p ? ({ ...p, admins: (p.admins || []).map(a => a.id === admin.id ? { ...a, name: e.target.value } : a) }) : p)}
                        className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        placeholder="Nome" />
                      <input value={admin.email} onChange={e => setEditCompany(p => p ? ({ ...p, admins: (p.admins || []).map(a => a.id === admin.id ? { ...a, email: e.target.value } : a) }) : p)}
                        className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        placeholder="Email" />
                      <input value={admin.phone || ''} onChange={e => setEditCompany(p => p ? ({ ...p, admins: (p.admins || []).map(a => a.id === admin.id ? { ...a, phone: e.target.value } : a) }) : p)}
                        className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        placeholder="Telefone" />
                      <button onClick={() => handleSetBillingAdmin(editCompany.id, admin.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-black transition-all ${editCompany.billing_admin_id === admin.id ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                        {editCompany.billing_admin_id === admin.id ? 'Cobranca' : 'Receber cobranca'}
                      </button>
                      <button onClick={() => handleUpdateAdmin(admin)}
                        className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all">
                        Salvar admin
                      </button>
                    </div>
                  ))}
                  {(editCompany.admins || []).length === 0 && (
                    <p className="text-sm text-slate-500 bg-slate-900/40 rounded-xl px-4 py-3">Nenhum admin cadastrado para esta imobiliaria.</p>
                  )}
                </div>

                <div className="border-t border-slate-700/50 mt-5 pt-5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Novo admin</p>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <input value={newAdmin.name} onChange={e => setNewAdmin(p => ({ ...p, name: e.target.value }))}
                      className="bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="Nome" />
                    <input value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))}
                      className="bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="Email" />
                    <input value={newAdmin.phone} onChange={e => setNewAdmin(p => ({ ...p, phone: e.target.value }))}
                      className="bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="Telefone" />
                    <input type="password" value={newAdmin.password} onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))}
                      className="bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="Senha" />
                    <button onClick={handleAddAdmin}
                      className="bg-sky-600 hover:bg-sky-500 text-white font-black px-4 py-3 rounded-xl transition-all">
                      Criar admin
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700/30 pt-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Assinatura</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Plano</p>
                    <select value={editCompany.plan || 'free'} onChange={e => setEditCompany(p => p ? ({ ...p, plan: e.target.value }) : p)}
                      className="w-full mt-1 bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                      <option value="free">Free</option>
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <select value={editCompany.subscription_status} onChange={e => setEditCompany(p => p ? ({ ...p, subscription_status: e.target.value }) : p)}
                      className="w-full mt-1 bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                      <option value="trialing">Teste</option>
                      <option value="active">Ativa</option>
                      <option value="overdue">Atrasada</option>
                      <option value="suspended">Suspensa</option>
                      <option value="canceled">Cancelada</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 bg-slate-900/40 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Destino atual da cobranca</p>
                  <p className="text-white font-bold mt-1">{editCompany.billing_admin_info?.name || editCompany.admin_info?.name || editCompany.name}</p>
                  <p className="text-sm text-slate-400">{editCompany.billing_admin_info?.email || editCompany.admin_info?.email || editCompany.email || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setEditCompany(p => p ? ({ ...p, visible: !p.visible }) : p)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${editCompany.visible ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                  {editCompany.visible ? 'Visível' : 'Oculta'}
                </button>
                <span className="text-xs text-slate-500">{editCompany.visible ? 'Aparece no site principal' : 'Oculta do site principal'}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={handleEditSave} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-all">Salvar imobiliaria</button>
              <button onClick={() => handleSendBillingEmail(editCompany.id)} disabled={sendingEmail}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2">
                {sendingEmail ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-lg">mail</span>}
                Enviar Cobrança
              </button>
              <button onClick={() => handleSendBillingEmail(editCompany.id, true)} disabled={sendingEmail}
                className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">outgoing_mail</span>
                Testar em {MASTER_TEST_EMAIL}
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
