import React, { useState, useMemo } from 'react';
import { User } from '../src/types';

interface UsersManagementProps {
    users: User[];
    onUpdateUser: (id: string | number, data: Partial<User>) => Promise<boolean>;
    onAddUser: (data: Omit<User, 'id'> & { password: string }) => Promise<boolean>;
    onDeleteUser: (id: string | number) => Promise<boolean>;
    onSendCredentials: (user: User, password: string) => Promise<boolean>;
}

type RoleOption = 'all' | 'admin' | 'owner' | 'client' | 'visitor';

const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    owner: 'Proprietário',
    client: 'Cliente',
    visitor: 'Visitante',
};

const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-rose-100 text-rose-700 border-rose-200',
    owner: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    client: 'bg-blue-100 text-blue-700 border-blue-200',
    visitor: 'bg-slate-100 text-slate-600 border-slate-200',
};

function generatePassword(length = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
    let pwd = '';
    for (let i = 0; i < length; i++) {
        pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
}

const UsersManagement: React.FC<UsersManagementProps> = ({ users, onUpdateUser, onAddUser, onDeleteUser, onSendCredentials }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleOption>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Add form
    const [addForm, setAddForm] = useState({
        name: '', email: '', phone: '', document: '', address: '',
        role: 'visitor' as User['role'], password: '', sendEmail: true,
    });

    // Edit form
    const [editForm, setEditForm] = useState({
        name: '', email: '', phone: '', document: '', address: '',
        role: 'visitor' as User['role'], password: '', avatar: '',
    });

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4000);
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchRole = roleFilter === 'all' || user.role === roleFilter;
            return matchSearch && matchRole;
        });
    }, [users, searchTerm, roleFilter]);

    const resetAddForm = () => {
        setAddForm({ name: '', email: '', phone: '', document: '', address: '', role: 'visitor', password: '', sendEmail: true });
    };

    const handleCreate = async () => {
        if (!addForm.name || !addForm.email) {
            showFeedback('error', 'Nome e email são obrigatórios.');
            return;
        }
        setIsSaving(true);
        const pwd = addForm.password || generatePassword();
        const success = await onAddUser?.({
            name: addForm.name, email: addForm.email, phone: addForm.phone,
            document: addForm.document, address: addForm.address,
            role: addForm.role, password: pwd,
        } as any);
        if (success) {
            showFeedback('success', `Usuário ${addForm.name} criado com sucesso!`);
            if (addForm.sendEmail && onSendCredentials) {
                const emailUser: User = { id: '', name: addForm.name, email: addForm.email, role: addForm.role };
                await onSendCredentials(emailUser, pwd);
            }
            setShowAddModal(false);
            resetAddForm();
        } else {
            showFeedback('error', 'Erro ao criar usuário.');
        }
        setIsSaving(false);
    };

    const openEdit = (user: User) => {
        setEditingUser(user);
        setEditForm({
            name: user.name, email: user.email, phone: user.phone || '',
            document: (user as any).document || '', address: (user as any).address || '',
            role: user.role, password: '', avatar: user.avatar || '',
        });
        setShowEditModal(true);
    };

    const handleEdit = async () => {
        if (!editingUser) return;
        setIsSaving(true);
        const updateData: Partial<User> = {
            name: editForm.name, email: editForm.email,
            role: editForm.role,
        };
        (updateData as any).phone = editForm.phone;
        (updateData as any).document = editForm.document;
        (updateData as any).address = editForm.address;
        (updateData as any).avatar = editForm.avatar;
        if (editForm.password) (updateData as any).password = editForm.password;

        const success = await onUpdateUser?.(editingUser.id, updateData);
        if (success) {
            showFeedback('success', `Usuário ${editForm.name} atualizado.`);
            setShowEditModal(false);
            setEditingUser(null);
        } else {
            showFeedback('error', 'Erro ao atualizar usuário.');
        }
        setIsSaving(false);
    };

    const handleDelete = async (id: string | number) => {
        setIsSaving(true);
        const success = await onDeleteUser?.(id);
        if (success) {
            showFeedback('success', 'Usuário excluído.');
        } else {
            showFeedback('error', 'Erro ao excluir usuário.');
        }
        setShowDeleteConfirm(null);
        setIsSaving(false);
    };

    const handleResendCredentials = async (user: User) => {
        const newPwd = generatePassword();
        const emailSent = await onSendCredentials?.(user, newPwd);
        if (emailSent) {
            const updated = await onUpdateUser?.(user.id, { ...user, password: newPwd } as any);
            if (updated) {
                showFeedback('success', `Nova senha gerada e enviada para ${user.email}`);
            } else {
                showFeedback('error', 'E-mail enviado, mas falha ao salvar a nova senha no banco.');
            }
        } else {
            showFeedback('error', 'Erro ao enviar e-mail. Verifique as configurações de SMTP.');
        }
    };

    const getRoleLabel = (role: string) => ROLE_LABELS[role] || role;
    const getRoleColor = (role: string) => ROLE_COLORS[role] || ROLE_COLORS.visitor;

    return (
        <div className="bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white font-display h-full flex flex-col overflow-hidden">
            <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111318] px-6 py-4 gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">group</span>
                        Gerenciar Usuários
                    </h2>
                    <p className="text-xs text-slate-500">{users.length} usuários cadastrados</p>
                </div>
                <button
                    onClick={() => { resetAddForm(); setShowAddModal(true); }}
                    className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-transform flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-lg">person_add</span>
                    Novo Usuário
                </button>
            </header>

            {feedback && (
                <div className={`mx-6 mt-4 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 ${feedback.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    <span className="material-symbols-outlined text-lg">{feedback.type === 'success' ? 'check_circle' : 'error'}</span>
                    {feedback.message}
                </div>
            )}

            <div className="p-4 md:p-6 md:pb-2">
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
                        {(['all', 'admin', 'owner', 'client', 'visitor'] as RoleOption[]).map(role => (
                            <button
                                key={role}
                                onClick={() => setRoleFilter(role)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${roleFilter === role ?
                                     'bg-slate-900 dark:bg-primary text-white border-slate-900 dark:border-primary'
                                    : 'bg-white dark:bg-[#1a1d23] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                {role === 'all' ? 'Todos' : getRoleLabel(role)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-4">
                <div className="bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredUsers.map(user => (
                            <div key={user.id} className="p-4 space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="size-11 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold overflow-hidden shrink-0">
                                        {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-slate-900 dark:text-white break-words">{user.name}</p>
                                        <p className="text-xs text-slate-500 break-all">{user.email}</p>
                                        <p className="text-xs text-slate-500 mt-1">{user.phone || 'Sem telefone'}</p>
                                    </div>
                                    <span className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-bold border ${getRoleColor(user.role)}`}>
                                        {getRoleLabel(user.role).toUpperCase()}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => openEdit(user)} className="py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">edit</span> Editar
                                    </button>
                                    <button onClick={() => handleResendCredentials(user)} className="py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">mail</span> Enviar
                                    </button>
                                    <button onClick={() => setShowDeleteConfirm(String(user.id))} className="py-2 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">delete</span> Excluir
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredUsers.length === 0 && (
                            <div className="p-12 text-center text-slate-400">
                                <span className="material-symbols-outlined text-4xl mb-2 block">person_off</span>
                                Nenhum usuário encontrado.
                            </div>
                        )}
                    </div>
                    <table className="hidden md:table w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-[#111318] border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 uppercase">
                                <th className="p-4 font-bold">Usuário</th>
                                <th className="p-4 font-bold">Papel</th>
                                <th className="p-4 font-bold hidden md:table-cell">Contato</th>
                                <th className="p-4 font-bold hidden lg:table-cell">Cadastro</th>
                                <th className="p-4 font-bold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-[#20242c] transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold overflow-hidden shrink-0">
                                                {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                                                <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getRoleColor(user.role)}`}>
                                            {getRoleLabel(user.role).toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4 hidden md:table-cell text-sm text-slate-600 dark:text-slate-400">
                                        {user.phone || '—'}
                                    </td>
                                    <td className="p-4 hidden lg:table-cell text-xs text-slate-400">
                                        {(user as any).createdAt ? new Date((user as any).createdAt).toLocaleDateString('pt-BR') : '—'}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => openEdit(user)}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-primary transition-colors"
                                                title="Editar"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleResendCredentials(user)}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-amber-600 transition-colors"
                                                title="Enviar credenciais"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">mail</span>
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm(String(user.id))}
                                                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-600 transition-colors"
                                                title="Excluir"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-400">
                                        <span className="material-symbols-outlined text-4xl mb-2 block">person_off</span>
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-4 md:p-6 shadow-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">person_add</span>
                                Novo Usuário
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-800 dark:hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Nome Completo *</label>
                                    <input type="text" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" placeholder="João Silva" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Email *</label>
                                    <input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" placeholder="joao@email.com" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Telefone</label>
                                    <input type="text" value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" placeholder="(11) 99999-9999" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">CPF/Documento</label>
                                    <input type="text" value={addForm.document} onChange={e => setAddForm({ ...addForm, document: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" placeholder="123.456.789-00" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Endereço</label>
                                    <input type="text" value={addForm.address} onChange={e => setAddForm({ ...addForm, address: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" placeholder="Rua Exemplo, 123" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Permissão</label>
                                    <select value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value as User['role'] })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary">
                                        <option value="visitor">Visitante</option>
                                        <option value="client">Cliente</option>
                                        <option value="owner">Proprietário</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Senha</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                                            className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-mono" placeholder="Deixe vazio para gerar" />
                                        <button type="button" onClick={() => setAddForm({ ...addForm, password: generatePassword() })}
                                            className="px-3 py-2 bg-slate-200 dark:bg-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                                            <span className="material-symbols-outlined text-lg">autorenew</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pt-2">
                                    <input type="checkbox" id="sendEmail" checked={addForm.sendEmail}
                                        onChange={e => setAddForm({ ...addForm, sendEmail: e.target.checked })}
                                        className="size-4 rounded border-slate-300 text-primary focus:ring-primary" />
                                    <label htmlFor="sendEmail" className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                        Enviar e-mail de boas-vindas com credenciais
                                    </label>
                                </div>
                            </div>
                            <button
                                onClick={handleCreate}
                                disabled={isSaving || !addForm.name || !addForm.email}
                                className="w-full py-3 bg-primary text-white rounded-xl font-bold mt-4 hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <> <span className="material-symbols-outlined animate-spin text-lg">sync</span> Salvando...</>
                                ) : (
                                    <> <span className="material-symbols-outlined text-lg">check</span> Criar Usuário</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowEditModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-4 md:p-6 shadow-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">edit</span>
                                Editar Usuário
                            </h3>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-slate-800 dark:hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Nome Completo</label>
                                    <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                                    <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Telefone</label>
                                    <input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">CPF/Documento</label>
                                    <input type="text" value={editForm.document} onChange={e => setEditForm({ ...editForm, document: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Endereço</label>
                                    <input type="text" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Avatar URL</label>
                                    <input type="text" value={editForm.avatar} onChange={e => setEditForm({ ...editForm, avatar: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary" placeholder="https://..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Permissão</label>
                                    <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value as User['role'] })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary">
                                        <option value="visitor">Visitante</option>
                                        <option value="client">Cliente</option>
                                        <option value="owner">Proprietário</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Nova Senha <span className="text-slate-400 font-normal">(deixe vazio para manter)</span></label>
                                    <div className="flex gap-2">
                                        <input type="text" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                            className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary font-mono" placeholder="Nova senha" />
                                        <button type="button" onClick={() => setEditForm({ ...editForm, password: generatePassword() })}
                                            className="px-3 py-2 bg-slate-200 dark:bg-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                                            <span className="material-symbols-outlined text-lg">autorenew</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleEdit}
                                disabled={isSaving || !editForm.name || !editForm.email}
                                className="w-full py-3 bg-primary text-white rounded-xl font-bold mt-4 hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <> <span className="material-symbols-outlined animate-spin text-lg">sync</span> Salvando...</>
                                ) : (
                                    <> <span className="material-symbols-outlined text-lg">save</span> Salvar Alterações</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDeleteConfirm(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="text-center">
                            <div className="size-16 mx-auto mb-4 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl text-rose-500">warning</span>
                            </div>
                            <h3 className="text-lg font-bold dark:text-white mb-2">Excluir Usuário</h3>
                            <p className="text-sm text-slate-500 mb-6">
                                Esta ação não pode ser desfeita. Todos os dados deste usuário serão permanentemente removidos.
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteConfirm(null)}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={() => handleDelete(showDeleteConfirm)}
                                    disabled={isSaving}
                                    className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                                    {isSaving ? 'Excluindo...' : 'Excluir'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersManagement;
