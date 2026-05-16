import React, { useState, useEffect } from 'react';

interface AgencyRequest {
  id: number;
  company_name: string;
  slug: string;
  cnpj: string;
  email: string;
  phone: string;
  admin_name: string;
  admin_email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  admin_note: string;
}

const RequestsList: React.FC = () => {
  const [requests, setRequests] = useState<AgencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<number | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('ef_user') || '{}');
      const token = localStorage.getItem('ef_token');
      const res = await fetch('/api/agency/list-requests', {
        headers: { Authorization: `Bearer ${token}`, 'X-User-Role': 'master' },
      });
      if (res.ok) {
        setRequests(await res.json());
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleAction = async (id: number, action: 'approved' | 'rejected') => {
    setActioning(id);
    try {
      const token = localStorage.getItem('ef_token');
      await fetch('/api/agency/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ request_id: id, action }),
      });
      await fetchRequests();
    } catch { /* ignore */ }
    setActioning(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <span className="size-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Solicitações</h1>
          <p className="text-sm text-slate-500 mt-1">{requests.filter(r => r.status === 'pending').length} pendentes</p>
        </div>
        <button onClick={fetchRequests} className="text-sm text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1">
          <span className="material-symbols-outlined text-lg">refresh</span>
          Atualizar
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-3">inbox</span>
          <p className="font-medium">Nenhuma solicitacao</p>
        </div>
      ) : (
        requests.map(r => (
          <div key={r.id} className={`bg-white rounded-2xl border p-6 shadow-sm ${
            r.status === 'pending' ? 'border-amber-200' : r.status === 'approved' ? 'border-emerald-200' : 'border-slate-200'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800">{r.company_name}</h3>
                <p className="text-xs text-slate-400">Solicitado em {new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                r.status === 'pending' ? 'bg-amber-50 text-amber-700' : r.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'
              }`}>
                {r.status === 'pending' ? 'Pendente' : r.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
              <div><span className="text-slate-400">Slug:</span> <span className="font-medium text-slate-700">/{r.slug}</span></div>
              {r.cnpj && <div><span className="text-slate-400">CNPJ:</span> <span className="font-medium text-slate-700">{r.cnpj}</span></div>}
              {r.email && <div><span className="text-slate-400">Email:</span> <span className="font-medium text-slate-700">{r.email}</span></div>}
              {r.phone && <div><span className="text-slate-400">Telefone:</span> <span className="font-medium text-slate-700">{r.phone}</span></div>}
              <div><span className="text-slate-400">Admin:</span> <span className="font-medium text-slate-700">{r.admin_name}</span></div>
              <div><span className="text-slate-400">Admin Email:</span> <span className="font-medium text-slate-700">{r.admin_email}</span></div>
            </div>

            {r.admin_note && (
              <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-600 mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nota</span>
                {r.admin_note}
              </div>
            )}

            {r.status === 'pending' && (
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button onClick={() => handleAction(r.id, 'approved')} disabled={actioning === r.id}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all">
                  {actioning === r.id ? '...' : 'Aprovar'}
                </button>
                <button onClick={() => handleAction(r.id, 'rejected')} disabled={actioning === r.id}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all">
                  {actioning === r.id ? '...' : 'Rejeitar'}
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default RequestsList;
