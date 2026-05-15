import React, { useState } from 'react';
import { User } from '../src/types';

interface ProfileSettingsProps {
    user: User;
    onSave: (updatedData: Partial<User>) => Promise<void>;
    onBack: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, onSave, onBack }) => {
    const [formData, setFormData] = useState({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        document: user.document || '',
        address: user.address || '',
        avatar: user.avatar || ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-[#F8F9FC] font-display selection:bg-primary/20 selection:text-primary">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-bold text-sm">
                        <span className="material-symbols-outlined">arrow_back</span>
                        Voltar
                    </button>
                    <h1 className="text-lg font-bold text-slate-900">Configurações de Perfil</h1>
                    <div className="w-10"></div> {/* Spacer for alignment */}
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                    <form onSubmit={handleSubmit}>
                        {/* Profile Photo Section */}
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="relative group">
                                    <div
                                        className="size-32 rounded-full bg-slate-200 bg-cover bg-center border-4 border-white shadow-lg transition-transform group-hover:scale-105"
                                        style={{ backgroundImage: `url("${formData.avatar || user.avatar}")` }}
                                    ></div>
                                    <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                        <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                                    </div>
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h2 className="text-2xl font-bold text-slate-900 mb-1">{formData.name}</h2>
                                    <p className="text-slate-500 text-sm font-medium mb-4">{user.role === 'admin' ? 'Administrador do Sistema' : user.role === 'owner' ? 'Proprietário' : 'Cliente'}</p>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                        <input
                                            name="avatar"
                                            value={formData.avatar}
                                            onChange={handleChange}
                                            placeholder="URL da Imagem de Perfil"
                                            className="w-full max-w-xs px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Personal Info Grid */}
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">person</span>
                                    <input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        placeholder="Seu nome"
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">mail</span>
                                    <input
                                        name="email"
                                        value={formData.email}
                                        disabled
                                        className="w-full pl-12 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 font-medium cursor-not-allowed"
                                    />
                                </div>
                                <span className="text-[10px] text-slate-400 ml-1">O e-mail não pode ser alterado por segurança.</span>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">call</span>
                                    <input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="(00) 00000-0000"
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Documento (CPF/CNPJ)</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">badge</span>
                                    <input
                                        name="document"
                                        value={formData.document}
                                        onChange={handleChange}
                                        placeholder="000.000.000-00"
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 md:col-span-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-11 -translate-y-1/2 text-slate-400 text-[20px]">location_on</span>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        rows={3}
                                        placeholder="Rua, Número, Bairro, Cidade - Estado"
                                        className="w-full pl-12 pr-4 py-6 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer / Actions */}
                        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                {success && (
                                    <span className="flex items-center gap-2 text-emerald-600 font-bold animate-in fade-in slide-in-from-left-4">
                                        <span className="material-symbols-outlined">check_circle</span>
                                        Alterações salvas com sucesso!
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <button
                                    type="button"
                                    onClick={onBack}
                                    className="flex-1 md:flex-none px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 md:flex-none px-12 py-3 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                            Salvando...
                                        </>
                                    ) : (
                                        'Salvar Alterações'
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Account Security Card */}
                <div className="mt-8 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                    <div className="absolute top-0 right-0 size-32 bg-rose-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="size-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined">security</span>
                        </div>
                        <div>
                            <h3 className="text-slate-900 font-bold">Segurança da Conta</h3>
                            <p className="text-slate-500 text-sm">Altere sua senha ou encerre sua sessão em todos os dispositivos.</p>
                        </div>
                    </div>
                    <button className="px-6 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-bold text-sm hover:bg-rose-600 hover:text-white transition-all active:scale-95 relative z-10">
                        Alterar Senha
                    </button>
                </div>
            </main>
        </div>
    );
};

export default ProfileSettings;
