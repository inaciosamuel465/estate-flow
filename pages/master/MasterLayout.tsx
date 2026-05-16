import React from 'react';

interface MasterLayoutProps {
  children: React.ReactNode;
  user: any;
  currentSection: string;
  onNavigate: (section: string) => void;
  onLogout: () => void;
}

const sections = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'companies', label: 'Imobiliárias', icon: 'business' },
  { key: 'requests', label: 'Solicitações', icon: 'how_to_reg' },
  { key: 'subscriptions', label: 'Assinaturas', icon: 'payments' },
  { key: 'plans', label: 'Precificação', icon: 'attach_money' },
  { key: 'billing', label: 'Cobrança', icon: 'receipt_long' },
  { key: 'settings', label: 'Configurações', icon: 'settings' },
];

const MasterLayout: React.FC<MasterLayoutProps> = ({ children, user, currentSection, onNavigate, onLogout }) => {
  return (
    <div className="min-h-screen bg-slate-900 flex">
      <aside className="w-64 bg-slate-800/50 border-r border-slate-700/50 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-400">admin_panel_settings</span>
            </div>
            <div>
              <h2 className="font-black text-white text-sm">Master</h2>
              <p className="text-xs text-slate-500">Painel de Controle</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => onNavigate(s.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                currentSection === s.key
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-slate-300">
              {user?.name?.charAt(0)?.toUpperCase() || 'M'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.name || 'Admin'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 text-sm text-rose-400 hover:text-rose-300 py-2 rounded-xl hover:bg-rose-500/10 transition-all font-medium"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MasterLayout;
