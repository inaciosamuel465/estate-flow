import React, { useState, useMemo } from 'react';
import { User, Contract, Property } from '../src/types';

// --- Interfaces ---
interface TimelineEvent {
    id: number;
    type: 'visit' | 'view' | 'note' | 'update' | 'create' | 'call' | 'email';
    title: string;
    desc: string;
    date: string;
    meta?: any;
}

interface ClientProfileProps {
    users: User[];
    contracts: Contract[];
    properties: Property[];
}

const ClientProfile: React.FC<ClientProfileProps> = ({ users, contracts, properties }) => {
    const [selectedUserId, setSelectedUserId] = useState<number | string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<'Todos' | 'Admin' | 'Cliente' | 'Proprietário'>('Todos');
    const [noteInput, setNoteInput] = useState("");

    // --- Derived Data ---
    const selectedUser = useMemo(() =>
        users.find(u => u.id === selectedUserId),
        [selectedUserId, users]);

    const userContracts = useMemo(() => {
        if (!selectedUserId) return [];
        return contracts.filter(c => String(c.clientId) === String(selectedUserId) || String(c.ownerId) === String(selectedUserId));
    }, [selectedUserId, contracts]);

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase());
            
            let matchesStatus = true;
            if (statusFilter === 'Admin') matchesStatus = user.role === 'admin';
            if (statusFilter === 'Cliente') matchesStatus = user.role === 'client';
            if (statusFilter === 'Proprietário') matchesStatus = user.role === 'owner';

            return matchesSearch && matchesStatus;
        });
    }, [searchTerm, statusFilter, users]);

    // --- Ações ---
    const handleAddNote = () => {
        if (!noteInput.trim()) return;
        alert(`Nota salva localmente: ${noteInput}`);
        setNoteInput("");
    };

    const handleCall = () => {
        if (!selectedUser) return;
        window.location.href = `tel:${selectedUser.phone}`;
    };

    const handleEmail = () => {
        if (!selectedUser) return;
        window.location.href = `mailto:${selectedUser.email}`;
    };

    // --- UI Helpers ---
    const getStatusColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'client': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'owner': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    // --- LIST VIEW ---
    if (!selectedUserId || !selectedUser) {
        return (
            <div className="bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white font-display h-full flex flex-col overflow-hidden">
                <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111318] px-6 py-4">
                    <div>
                        <h2 className="text-xl font-bold">Relacionamentos (CRM)</h2>
                        <p className="text-xs text-slate-500">Gestão de Clientes, Proprietários e Equipe.</p>
                    </div>
                </header>

                <div className="p-6 pb-2">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-[#1a1d23] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="relative w-full md:w-96">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input
                                type="text"
                                placeholder="Buscar por nome ou email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-primary focus:border-primary"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto w-full md:w-auto">
                            {['Todos', 'Admin', 'Cliente', 'Proprietário'].map(st => (
                                <button
                                    key={st}
                                    onClick={() => setStatusFilter(st as any)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${statusFilter === st
                                            ? 'bg-slate-900 dark:bg-primary text-white border-slate-900 dark:border-primary'
                                            : 'bg-white dark:bg-[#1a1d23] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                                        }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-4">
                    <div className="bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-[#111318] border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 uppercase">
                                    <th className="p-4 font-bold">Usuário</th>
                                    <th className="p-4 font-bold">Papel</th>
                                    <th className="p-4 font-bold hidden md:table-cell">Contato</th>
                                    <th className="p-4 font-bold text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-[#20242c] transition-colors group cursor-pointer" onClick={() => setSelectedUserId(user.id)}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold overflow-hidden">
                                                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                                                    <p className="text-xs text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getStatusColor(user.role)}`}>
                                                {user.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="p-4 hidden md:table-cell text-sm text-slate-600 dark:text-slate-400">
                                            {user.phone || 'Sem telefone'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors">
                                                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // --- DETAIL VIEW ---
    return (
        <div className="bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white font-display h-full flex flex-col overflow-hidden">
            <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111318] px-6 py-3 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedUserId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h2 className="text-lg font-bold">Perfil do {selectedUser.role === 'admin' ? 'Administrador' : selectedUser.role === 'client' ? 'Cliente' : 'Proprietário'}</h2>
                </div>
            </header>

            <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-8 flex flex-col gap-6 overflow-y-auto">
                {/* Header do Perfil */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-white dark:bg-[#1a1d23] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex gap-4 items-center">
                        <div className="size-20 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold border-2 border-primary">
                            {selectedUser.avatar ? <img src={selectedUser.avatar} className="w-full h-full object-cover rounded-full" /> : selectedUser.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{selectedUser.name}</h1>
                            <p className="text-slate-500 text-sm">{selectedUser.email}</p>
                            <div className="flex gap-2 mt-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(selectedUser.role)} uppercase`}>
                                    {selectedUser.role}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleCall} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined text-[18px]">call</span> Ligar
                        </button>
                        <button onClick={handleEmail} className="flex items-center gap-2 bg-white dark:bg-[#111318] border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-lg font-bold text-sm">
                            <span className="material-symbols-outlined text-[18px]">mail</span> Email
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Relacionamentos e Contratos */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111318]">
                                <h3 className="font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">description</span> Contratos Relacionados
                                </h3>
                            </div>
                            <div className="p-6">
                                {userContracts.length > 0 ? (
                                    <div className="space-y-4">
                                        {userContracts.map(contract => (
                                            <div key={contract.id} className="p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#111318] flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold">{contract.propertyTitle}</p>
                                                    <p className="text-xs text-slate-500">{contract.type === 'rent' ? 'Locação' : 'Venda/Financ.'} • Vence dia {contract.dueDay}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-primary">R$ {contract.value.toLocaleString('pt-BR')}</p>
                                                    <span className={`text-[10px] font-bold uppercase ${contract.nextPaymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                                                        {contract.nextPaymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-slate-400">
                                        <span className="material-symbols-outlined text-4xl mb-2">history_edu</span>
                                        <p>Nenhum contrato ativo para este usuário.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notas Rápidas */}
                        <div className="bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="p-6">
                                <h3 className="font-bold mb-4">Notas Internas</h3>
                                <textarea
                                    value={noteInput}
                                    onChange={e => setNoteInput(e.target.value)}
                                    placeholder="Adicionar uma observação sobre este cliente..."
                                    className="w-full h-24 p-4 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 text-sm focus:ring-primary focus:border-primary"
                                />
                                <button onClick={handleAddNote} className="mt-2 bg-slate-900 dark:bg-primary text-white px-6 py-2 rounded-lg font-bold text-sm">
                                    Salvar Nota
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Informações de Contato e Imóveis Favoritos */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-[#1a1d23] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="font-bold mb-4">Informações</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-slate-400">call</span>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Telefone</p>
                                        <p className="text-sm">{selectedUser.phone || 'Não informado'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-slate-400">mail</span>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Email</p>
                                        <p className="text-sm">{selectedUser.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-slate-400">calendar_today</span>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Membro desde</p>
                                        <p className="text-sm">{new Date().toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Imóveis Favoritos/Interesse */}
                        <div className="bg-white dark:bg-[#1a1d23] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="font-bold mb-4">Favoritos ({selectedUser.favorites?.length || 0})</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {selectedUser.favorites?.slice(0, 4).map(favId => {
                                    const prop = properties.find(p => String(p.id) === String(favId));
                                    return prop ? (
                                        <div key={favId} className="aspect-square rounded-lg bg-cover bg-center border border-slate-100 dark:border-slate-800" style={{ backgroundImage: `url("${prop.image}")` }}></div>
                                    ) : null;
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ClientProfile;