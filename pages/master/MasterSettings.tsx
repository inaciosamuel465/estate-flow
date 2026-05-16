import React, { useState } from 'react';

const MasterSettings: React.FC = () => {
  const [showCreateMaster, setShowCreateMaster] = useState(false);
  const [newMaster, setNewMaster] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');

  const handleCreateMaster = async () => {
    if (!newMaster.name || !newMaster.email || !newMaster.password) {
      setMessage('Preencha todos os campos');
      return;
    }

    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(import.meta.env.VITE_DATABASE_URL || '');

      const msgUint8 = new TextEncoder().encode(newMaster.password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const id = `master_${Date.now()}`;
      await sql`
        INSERT INTO master_users (id, name, email, password, role)
        VALUES (${id}, ${newMaster.name}, ${newMaster.email}, ${hashedPassword}, 'admin')
      `;

      setMessage('Administrador master criado com sucesso!');
      setShowCreateMaster(false);
      setNewMaster({ name: '', email: '', password: '' });
    } catch (err: any) {
      setMessage(err.message || 'Erro ao criar administrador');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Configurações Master</h1>
        <p className="text-slate-400 mt-1">Gerenciamento do painel administrativo</p>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Administradores Master</h2>
          <p className="text-slate-400 text-sm mb-4">
            Crie novos acessos para o painel master. Cada administrador terá acesso total ao sistema.
          </p>

          {message && (
            <div className={`text-sm px-4 py-3 rounded-xl mb-4 ${
              message.includes('sucesso')
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {message}
            </div>
          )}

          {!showCreateMaster ? (
            <button
              onClick={() => { setShowCreateMaster(true); setMessage(''); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-xl transition-all"
            >
              <span className="material-symbols-outlined">person_add</span>
              Novo Administrador Master
            </button>
          ) : (
            <div className="space-y-4 max-w-md">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome</label>
                <input value={newMaster.name} onChange={e => setNewMaster(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="Admin Master" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Email</label>
                <input type="email" value={newMaster.email} onChange={e => setNewMaster(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="admin@sistema.com" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Senha</label>
                <input type="password" value={newMaster.password} onChange={e => setNewMaster(p => ({ ...p, password: e.target.value }))}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="••••••••" />
              </div>
              <div className="flex gap-3">
                <button onClick={handleCreateMaster}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-all">
                  Criar
                </button>
                <button onClick={() => setShowCreateMaster(false)}
                  className="text-slate-400 hover:text-white px-6 py-3 rounded-xl transition-all font-medium">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Informações do Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-700/30 rounded-xl p-4">
              <p className="text-slate-400">Versão</p>
              <p className="text-white font-bold">1.0.0 (SaaS)</p>
            </div>
            <div className="bg-slate-700/30 rounded-xl p-4">
              <p className="text-slate-400">Ambiente</p>
              <p className="text-white font-bold">{import.meta.env.MODE}</p>
            </div>
            <div className="bg-slate-700/30 rounded-xl p-4">
              <p className="text-slate-400">Banco de Dados</p>
              <p className="text-white font-bold">Neon PostgreSQL</p>
            </div>
            <div className="bg-slate-700/30 rounded-xl p-4">
              <p className="text-slate-400">Frontend</p>
              <p className="text-white font-bold">React + Vite + Tailwind</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterSettings;
