import React, { useState, useEffect, useRef, useMemo } from 'react';
import { updateSetting } from '../src/services/dataService';
import { useNotifications } from '../src/contexts/NotificationContext';
import { useCompany } from '../src/contexts/CompanyContext';
import type { User } from '../src/types';

interface AdminSettingsProps {
    settings: Record<string, string>;
    onSettingsUpdated: (newSettings: Record<string, string>) => void;
    users?: User[];
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, onSettingsUpdated, users }) => {
    const { permissionStatus, requestPermission } = useNotifications();
    const { company, companySettings, refreshCompany } = useCompany();
    const [testEmail, setTestEmail] = useState('');
    const [isTestingEmail, setIsTestingEmail] = useState(false);
    const [testPushMessage, setTestPushMessage] = useState('Este é um teste de notificação push do EstateFlow!');
    const [isTestingPush, setIsTestingPush] = useState(false);

    const adminUsers = useMemo(() => (users || []).filter(u => u.role === 'admin'), [users]);

    const [localSettings, setLocalSettings] = useState<Record<string, any>>({
        companyName: settings.companyName || 'Flowe Estate',
        logoUrl: settings.logoUrl || '',
        agencyCnpj: settings.agencyCnpj || '',
        agencyCreci: settings.agencyCreci || '',
        agencyStampUrl: settings.agencyStampUrl || '',
        agencyStampName: settings.agencyStampName || '',
        contactEmail: settings.contactEmail || '',
        contactPhone: settings.contactPhone || '',
        address: settings.address || '',
        primaryColor: settings.primaryColor || '#4f46e5',
        contractTemplates: (() => {
            let parsed;
            if (typeof settings.contractTemplates === 'string') {
                try {
                    parsed = JSON.parse(settings.contractTemplates);
                } catch (e) {
                    console.error("Erro ao parsear contractTemplates:", e);
                    parsed = [];
                }
            } else {
                parsed = settings.contractTemplates;
            }

            // Garante que é um array para o .map() funcionar
            if (Array.isArray(parsed)) return parsed;
            if (parsed && typeof parsed === 'object') return Object.values(parsed);
            
            return [
                {
                    id: 'rent_residential',
                    title: 'Locação Residencial',
                    content: `CLÁUSULA PRIMEIRA - DAS PARTES:\nLOCADOR: {{OWNER_NAME}}, CPF: {{OWNER_DOC}}\nLOCATÁRIO: {{CLIENT_NAME}}, CPF: {{CLIENT_DOC}}\n\nCLÁUSULA SEGUNDA - DO OBJETO:\nLocação do imóvel em {{PROPERTY_ADDR}}.\n\nCLÁUSULA TERCEIRA - VALOR:\nO valor mensal é R$ {{VALUE}}.`
                },
                {
                    id: 'sale_cash',
                    title: 'Venda à Vista',
                    content: `COMPROMISSO DE COMPRA E VENDA\n\nVENDEDOR: {{OWNER_NAME}}\nCOMPRADOR: {{CLIENT_NAME}}\n\nOBJETO: Imóvel em {{PROPERTY_ADDR}}\nVALOR: R$ {{VALUE}} paid at once.`
                },
                {
                    id: 'rent_termination',
                    title: 'Distrato de Locação',
                    content: `DISTRATO DE CONTRATO DE LOCAÇÃO\n\nAs partes resolvem de comum acordo rescindir o contrato de locação do imóvel {{PROPERTY_ADDR}}.\n\nO LOCATÁRIO entrega as chaves nesta data {{START_DATE}} e declara nada mais ter a reclamar.`
                }
            ];
        })(),
        appUrl: settings.appUrl || '',
        heroVideoUrl: settings.heroVideoUrl || '',
        socialInstagram: settings.socialInstagram || '',
        socialFacebook: settings.socialFacebook || '',
        socialWhatsapp: settings.socialWhatsapp || '',
        aiModel: settings.aiModel || 'gemini-1.5-flash',
        aiPromptBase: settings.aiPromptBase || 'Você é um assistente imobiliário de elite...',
        pixKey: settings.pixKey || '',
        pixBeneficiary: settings.pixBeneficiary || '',
        smtp_host: companySettings?.smtp_host || '',
        smtp_port: companySettings?.smtp_port || '587',
        smtp_user: companySettings?.smtp_user || '',
        smtp_password: companySettings?.smtp_password || '',
        smtp_secure: companySettings?.smtp_secure ?? false,
        email_sender_name: companySettings?.email_sender_name || '',
        email_sender_address: companySettings?.email_sender_address || '',
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [activeTab, setActiveTab] = useState<'branding' | 'contact' | 'contracts' | 'ai' | 'sync' | 'broadcast' | 'finance' | 'smtp'>('branding');
    const [editingTemplateIndex, setEditingTemplateIndex] = useState<number | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleTestEmail = async () => {
        if (!testEmail) return;
        setIsTestingEmail(true);
        try {
            const companyId = localStorage.getItem('estateflow_company_id');
            const res = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_id: companyId,
                    to: testEmail,
                    subject: 'Teste de E-mail - EstateFlow Suite',
                    html: `<h1>Teste com sucesso!</h1><p>Se você recebeu este e-mail, as configurações de SMTP estão funcionando.</p>`
                })
            });
            if (res.ok) alert('E-mail de teste enviado!');
            else alert('Erro ao enviar e-mail. Verifique as configurações SMTP.');
        } catch (e) {
            alert('Erro de conexão ao enviar e-mail.');
        } finally {
            setIsTestingEmail(false);
        }
    };

    const handleTestPush = async () => {
        setIsTestingPush(true);
        try {
            const res = await fetch('/api/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: '📢 Teste de Notificação',
                    body: testPushMessage,
                    url: '/'
                })
            });
            const data = await res.json();
            if (res.ok) alert(`Push disparado para ${data.count} dispositivos inscritos.`);
            else alert('Erro ao disparar push.');
        } catch (e) {
            alert('Erro de conexão ao disparar push.');
        } finally {
            setIsTestingPush(false);
        }
    };

    const [broadcastMessage, setBroadcastMessage] = useState({ title: '', body: '', url: '/' });
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const handleBroadcast = async () => {
        if (!broadcastMessage.title || !broadcastMessage.body) {
            alert('Preencha título e mensagem.');
            return;
        }
        setIsBroadcasting(true);
        try {
            const res = await fetch('/api/push/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(broadcastMessage)
            });
            if (res.ok) {
                alert('Anúncio enviado com sucesso para todos os inscritos!');
                setBroadcastMessage({ title: '', body: '', url: '/' });
            } else {
                alert('Erro ao enviar broadcast.');
            }
        } catch (e) {
            alert('Erro de rede ao enviar broadcast.');
        } finally {
            setIsBroadcasting(false);
        }
    };

    const handleProvisionTestData = async () => {
        if (!confirm('Isso criará usuários de teste (Admin, Cliente, Proprietário) no banco de dados. Deseja continuar?')) return;
        try {
            // We use a dedicated API or we can try to do it via dataService if allowed
            // But since this is a server-side thing, let's use an API endpoint
            const res = await fetch('/api/admin/provision', { method: 'POST' });
            if (res.ok) alert('Dados de teste provisionados com sucesso!');
            else alert('Erro ao provisionar dados.');
        } catch (e) {
            alert('Erro de conexão ao provisionar dados.');
        }
    };

    useEffect(() => {
        const normalizeTemplates = (raw: any) => {
            let parsed;
            if (typeof raw === 'string') {
                try {
                    parsed = JSON.parse(raw);
                } catch (e) {
                    parsed = [];
                }
            } else {
                parsed = raw;
            }
            if (Array.isArray(parsed)) return parsed;
            if (parsed && typeof parsed === 'object') return Object.values(parsed);
            return null;
        };

        const normalizedTemplates = normalizeTemplates(settings.contractTemplates);

        const { contractTemplates: _, ...restSettings } = settings;
        setLocalSettings(prev => ({
            ...prev,
            ...restSettings,
            ...(normalizedTemplates ? { contractTemplates: normalizedTemplates } : {})
        }));
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setLocalSettings(prev => ({ ...prev, logoUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        setSaveMessage('');
        
        try {
            const companyId = localStorage.getItem('estateflow_company_id');

            // Save SMTP settings to company_settings table
            if (companyId) {
                const { neon } = await import('@neondatabase/serverless');
                const sql = neon(import.meta.env.VITE_DATABASE_URL || '');
                await sql`
                    INSERT INTO company_settings (company_id, company_name, smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure, email_sender_name, email_sender_address, logo_url, primary_color, secondary_color, whatsapp, instagram, facebook, website, updated_at)
                    VALUES (${companyId}, ${localSettings.companyName}, ${localSettings.smtp_host || null}, ${localSettings.smtp_port ? Number(localSettings.smtp_port) : null}, ${localSettings.smtp_user || null}, ${localSettings.smtp_password || null}, ${!!localSettings.smtp_secure}, ${localSettings.email_sender_name || null}, ${localSettings.email_sender_address || null}, ${localSettings.logoUrl || null}, ${localSettings.primaryColor || null}, ${null}, ${localSettings.socialWhatsapp || null}, ${localSettings.socialInstagram || null}, ${localSettings.socialFacebook || null}, ${null}, NOW())
                    ON CONFLICT (company_id) DO UPDATE SET
                        company_name = EXCLUDED.company_name,
                        smtp_host = EXCLUDED.smtp_host,
                        smtp_port = EXCLUDED.smtp_port,
                        smtp_user = EXCLUDED.smtp_user,
                        smtp_password = EXCLUDED.smtp_password,
                        smtp_secure = EXCLUDED.smtp_secure,
                        email_sender_name = EXCLUDED.email_sender_name,
                        email_sender_address = EXCLUDED.email_sender_address,
                        logo_url = EXCLUDED.logo_url,
                        primary_color = EXCLUDED.primary_color,
                        whatsapp = EXCLUDED.whatsapp,
                        instagram = EXCLUDED.instagram,
                        facebook = EXCLUDED.facebook,
                        updated_at = NOW()
                `;
                // Refresh company context to reflect changes immediately
                if (refreshCompany) refreshCompany();
            }

            // Save all settings to system_settings
            const keys = Object.keys(localSettings);
            for (const key of keys) {
                const value = key === 'contractTemplates' ? JSON.stringify(localSettings[key]) : localSettings[key];
                await updateSetting(key, value);
            }
            
            onSettingsUpdated(localSettings);
            
            setSaveMessage('Configurações salvas com sucesso!');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
            console.error('Error saving settings', error);
            setSaveMessage('Erro ao salvar configurações.');
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'branding', label: 'Identidade Visual', icon: 'palette' },
        { id: 'contact', label: 'Perfil da Imobiliária', icon: 'business' },
        { id: 'contracts', label: 'Contratos', icon: 'description' },
        { id: 'ai', label: 'Inteligência Artificial', icon: 'smart_toy' },
        { id: 'finance', label: 'Financeiro (PIX)', icon: 'payments' },
        { id: 'broadcast', label: 'Anúncios / Push', icon: 'campaign' },
        { id: 'sync', label: 'App & Notificações', icon: 'notifications_active' },
        { id: 'smtp', label: 'E-mail SMTP', icon: 'mail' },
    ];

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
            {/* Header Fixo */}
            <div className="p-4 md:p-6 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between z-20 gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-xl md:text-3xl font-bold text-slate-800">Configurações</h1>
                    <p className="text-xs md:text-sm text-slate-500">Gerencie sua plataforma</p>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    {saveMessage && (
                        <span className={`px-3 py-1 rounded-full text-[10px] md:text-sm font-medium whitespace-nowrap ${saveMessage.includes('Erro') ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600 animate-pulse'}`}>
                            {saveMessage}
                        </span>
                    )}
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 md:px-8 py-2 md:py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 text-sm"
                    >
                        {isSaving ? (
                            <>
                                <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                                <span className="hidden md:inline">Salvando...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-lg">save</span>
                                <span>Salvar</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Sidebar de Navegação / Tab Bar Mobile */}
                <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-2 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar md:custom-scrollbar flex-shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                                activeTab === tab.id 
                                ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
                                : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Área de Conteúdo com Scroll */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-8 pb-12">
                        
                        {activeTab === 'branding' && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                        <span className="material-symbols-outlined text-indigo-500 text-3xl">palette</span>
                                        Identidade Visual
                                    </h2>

                                    <div className="space-y-4">
                                        <label className="block text-sm font-bold text-slate-700">Cor Principal</label>
                                        <div className="flex gap-4">
                                            <input 
                                                type="color" 
                                                name="primaryColor"
                                                value={localSettings.primaryColor}
                                                onChange={handleChange}
                                                className="w-16 h-14 p-1 rounded-xl cursor-pointer border border-slate-200"
                                            />
                                            <input 
                                                type="text" 
                                                name="primaryColor"
                                                value={localSettings.primaryColor}
                                                onChange={handleChange}
                                                className="flex-1 px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none uppercase font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="block text-sm font-bold text-slate-700">Logo da Empresa</label>
                                        <div className="flex flex-col md:flex-row items-start gap-8">
                                            <div className="w-full md:w-1/2 space-y-4">
                                                <div 
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-full h-40 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer transition-all group"
                                                >
                                                    <span className="material-symbols-outlined text-4xl text-slate-400 group-hover:text-indigo-500 transition-colors">upload_file</span>
                                                    <span className="text-slate-500 font-medium group-hover:text-indigo-600">Clique para subir a logo</span>
                                                    <input 
                                                        ref={fileInputRef}
                                                        type="file" 
                                                        accept="image/*"
                                                        onChange={handleLogoUpload}
                                                        className="hidden"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                        <span className="material-symbols-outlined text-slate-400">link</span>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        name="logoUrl"
                                                        value={localSettings.logoUrl}
                                                        onChange={handleChange}
                                                        className="w-full pl-12 pr-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                                                        placeholder="Ou cole a URL da imagem aqui"
                                                    />
                                                </div>
                                            </div>

                                            <div className="w-full md:w-1/2 p-6 bg-slate-100 rounded-3xl border border-slate-200 flex flex-col items-center justify-center min-h-[160px]">
                                                {localSettings.logoUrl ? (
                                                    <>
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Pré-visualização</p>
                                                        <img src={localSettings.logoUrl} alt="Logo Preview" className="max-h-20 object-contain drop-shadow-md" />
                                                    </>
                                                ) : (
                                                    <div className="text-center">
                                                        <span className="material-symbols-outlined text-5xl text-slate-300">image</span>
                                                        <p className="text-slate-400 mt-2">Nenhuma logo configurada</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === 'contact' && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                        <span className="material-symbols-outlined text-blue-600 text-3xl">business</span>
                                        Perfil da Imobiliária
                                    </h2>

                                    {/* Dados da Imobiliária */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <label className="block text-sm font-bold text-slate-700">Nome da Imobiliária</label>
                                            <input 
                                                type="text" 
                                                name="companyName"
                                                value={localSettings.companyName}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-lg"
                                                placeholder="Flowe Estate"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="block text-sm font-bold text-slate-700">CNPJ</label>
                                            <input 
                                                type="text" 
                                                name="agencyCnpj"
                                                value={localSettings.agencyCnpj || ''}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none"
                                                placeholder="00.000.000/0001-00"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="block text-sm font-bold text-slate-700">CRECI</label>
                                            <input 
                                                type="text" 
                                                name="agencyCreci"
                                                value={localSettings.agencyCreci || ''}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none"
                                                placeholder="J-00000"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="block text-sm font-bold text-slate-700">E-mail Comercial</label>
                                            <input 
                                                type="email" 
                                                name="contactEmail"
                                                value={localSettings.contactEmail}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none"
                                                placeholder="contato@imobiliaria.com"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="block text-sm font-bold text-slate-700">WhatsApp / Telefone</label>
                                            <input 
                                                type="text" 
                                                name="contactPhone"
                                                value={localSettings.contactPhone}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none"
                                                placeholder="(11) 99999-9999"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="block text-sm font-bold text-slate-700">Endereço da Sede</label>
                                            <input 
                                                type="text" 
                                                name="address"
                                                value={localSettings.address}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none"
                                                placeholder="Av. Paulista, 1000 - São Paulo, SP"
                                            />
                                        </div>
                                        <div className="space-y-4 md:col-span-2">
                                            <label className="block text-sm font-bold text-slate-700">URL do Sistema (para links de assinatura)</label>
                                            <input 
                                                type="text" 
                                                name="appUrl"
                                                value={localSettings.appUrl}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-mono text-sm"
                                                placeholder={import.meta.env.VITE_APP_URL || 'https://meusite.com.br'}
                                            />
                                            <p className="text-xs text-slate-400">Usado nos e-mails de assinatura de contrato. Se vazio, usa <code className="bg-slate-100 px-1 rounded">{import.meta.env.VITE_APP_URL || 'window.location.origin'}</code></p>
                                        </div>
                                        <div className="space-y-4 md:col-span-2">
                                            <label className="block text-sm font-bold text-slate-700">Vídeo do Hero (YouTube ou Google Drive)</label>
                                            <input 
                                                type="text" 
                                                name="heroVideoUrl"
                                                value={localSettings.heroVideoUrl}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none"
                                                placeholder="https://www.youtube.com/watch?v=UBdgfwoZpNE"
                                            />
                                            <p className="text-xs text-slate-400">Link do YouTube para o fundo do hero na página inicial. Formatos aceitos: youtube.com/watch?v=, youtu.be/, youtube.com/embed/. Deixe vazio para usar o padrão.</p>
                                        </div>
                                    </div>

                                    {/* Rubrica / Carimbo */}
                                    <div className="pt-4 border-t border-slate-100">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                                            <span className="material-symbols-outlined text-blue-600">badge</span>
                                            Assinatura Digital da Imobiliária
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <label className="block text-sm font-bold text-slate-700">Rubrica / Carimbo (imagem)</label>
                                                <div
                                                    onClick={() => document.getElementById('stampInput')?.click()}
                                                    className="w-full h-36 border-2 border-dashed border-blue-300 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group"
                                                >
                                                    {localSettings.agencyStampUrl ? (
                                                        <img src={localSettings.agencyStampUrl} className="max-h-28 object-contain" alt="Rubrica" />
                                                    ) : (
                                                        <>
                                                            <span className="material-symbols-outlined text-3xl text-blue-400 group-hover:text-blue-600">upload</span>
                                                            <span className="text-xs text-blue-500 font-medium">Clique para fazer upload</span>
                                                        </>
                                                    )}
                                                    <input
                                                        id="stampInput"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const reader = new FileReader();
                                                            reader.onload = (ev) => {
                                                                setLocalSettings(prev => ({ ...prev, agencyStampUrl: ev.target?.result as string }));
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }}
                                                        className="hidden"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="block text-sm font-bold text-slate-700">Nome do Assinante</label>
                                                <input
                                                    type="text"
                                                    name="agencyStampName"
                                                    value={localSettings.agencyStampName || ''}
                                                    onChange={handleChange}
                                                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none"
                                                    placeholder="Ex: Nome do Responsável ou Razão Social"
                                                />
                                                <p className="text-xs text-slate-400">Este nome aparecerá na linha de assinatura da imobiliária nos contratos.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Redes Sociais */}
                                    <div className="pt-4 border-t border-slate-100 space-y-6">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">Redes Sociais</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <img src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" className="w-5 h-5 opacity-50" alt="" />
                                                </div>
                                                <input 
                                                    type="text" 
                                                    name="socialInstagram"
                                                    value={localSettings.socialInstagram}
                                                    onChange={handleChange}
                                                    className="w-full pl-12 pr-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-pink-100 focus:border-pink-500 outline-none"
                                                    placeholder="@usuario"
                                                />
                                            </div>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" className="w-5 h-5 opacity-50" alt="" />
                                                </div>
                                                <input 
                                                    type="text" 
                                                    name="socialFacebook"
                                                    value={localSettings.socialFacebook}
                                                    onChange={handleChange}
                                                    className="w-full pl-12 pr-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none"
                                                    placeholder="facebook.com/..."
                                                />
                                            </div>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="w-5 h-5 opacity-50" alt="" />
                                                </div>
                                                <input 
                                                    type="text" 
                                                    name="socialWhatsapp"
                                                    value={localSettings.socialWhatsapp}
                                                    onChange={handleChange}
                                                    className="w-full pl-12 pr-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none"
                                                    placeholder="Link do Whats"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === 'contracts' && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                                    {/* Rubrica e Nome da Imobiliária */}
                                    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-blue-200 space-y-6">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-blue-600">badge</span>
                                            Assinatura da Imobiliária
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <label className="block text-sm font-bold text-slate-700">Rubrica / Carimbo (imagem)</label>
                                                <div
                                                    onClick={() => document.getElementById('stampInput')?.click()}
                                                    className="w-full h-36 border-2 border-dashed border-blue-300 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group"
                                                >
                                                    {localSettings.agencyStampUrl ? (
                                                        <img src={localSettings.agencyStampUrl} className="max-h-28 object-contain" alt="Rubrica" />
                                                    ) : (
                                                        <>
                                                            <span className="material-symbols-outlined text-3xl text-blue-400 group-hover:text-blue-600">upload</span>
                                                            <span className="text-xs text-blue-500 font-medium">Clique para fazer upload</span>
                                                        </>
                                                    )}
                                                    <input
                                                        id="stampInput"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const reader = new FileReader();
                                                            reader.onload = (ev) => {
                                                                setLocalSettings(prev => ({ ...prev, agencyStampUrl: ev.target?.result as string }));
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }}
                                                        className="hidden"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="block text-sm font-bold text-slate-700">Nome do Assinante (imobiliária)</label>
                                                <input
                                                    type="text"
                                                    name="agencyStampName"
                                                    value={localSettings.agencyStampName || ''}
                                                    onChange={handleChange}
                                                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none"
                                                    placeholder="Ex: Nome do Responsável ou Razão Social"
                                                />
                                                <p className="text-xs text-slate-400">Este nome aparecerá na linha de assinatura da imobiliária nos contratos.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                            <span className="material-symbols-outlined text-orange-500 text-3xl">description</span>
                                            Modelos de Contrato
                                        </h2>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const newTmpl = { id: `new_${Date.now()}`, title: 'Novo Modelo', content: 'Escreva aqui...' };
                                                const newList = [...(localSettings.contractTemplates as any[]), newTmpl];
                                                setLocalSettings({...localSettings, contractTemplates: newList});
                                                setEditingTemplateIndex(newList.length - 1);
                                            }}
                                            className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-orange-600 transition-all"
                                        >
                                            <span className="material-symbols-outlined">add</span> Adicionar Modelo
                                        </button>
                                    </div>
                                    
                                    <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 text-sm leading-relaxed">
                                        <p className="font-bold mb-2 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">info</span>
                                            Tags Disponíveis
                                        </p>
                                        Use estas tags para preenchimento automático:
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {['{{OWNER_NAME}}', '{{OWNER_DOC}}', '{{CLIENT_NAME}}', '{{CLIENT_DOC}}', '{{PROPERTY_ADDR}}', '{{VALUE}}', '{{START_DATE}}', '{{END_DATE}}', '{{DUE_DAY}}'].map(tag => (
                                                <code key={tag} className="bg-white/60 px-2 py-1 rounded text-orange-700 font-mono text-[10px]">{tag}</code>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {(localSettings.contractTemplates as any[]).map((tmpl, idx) => (
                                            <div key={tmpl.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                                                <div className="bg-slate-50 p-4 flex items-center justify-between border-b border-slate-200">
                                                    {editingTemplateIndex === idx ? (
                                                        <input 
                                                            className="bg-white px-3 py-1 rounded-lg border border-slate-300 font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500"
                                                            value={tmpl.title}
                                                            onChange={(e) => {
                                                                const newList = [...(localSettings.contractTemplates as any[])];
                                                                newList[idx].title = e.target.value;
                                                                setLocalSettings({...localSettings, contractTemplates: newList});
                                                            }}
                                                        />
                                                    ) : (
                                                        <h4 className="font-bold text-slate-700">{tmpl.title}</h4>
                                                    )}
                                                    <div className="flex gap-2">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setEditingTemplateIndex(editingTemplateIndex === idx ? null : idx)}
                                                            className={`p-2 rounded-lg transition-all ${editingTemplateIndex === idx ? 'bg-orange-500 text-white' : 'hover:bg-slate-200 text-slate-500'}`}
                                                        >
                                                            <span className="material-symbols-outlined text-sm">{editingTemplateIndex === idx ? 'done' : 'edit'}</span>
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const newList = (localSettings.contractTemplates as any[]).filter((_, i) => i !== idx);
                                                                setLocalSettings({...localSettings, contractTemplates: newList});
                                                                if (editingTemplateIndex === idx) setEditingTemplateIndex(null);
                                                            }}
                                                            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                {editingTemplateIndex === idx && (
                                                    <div className="p-4 bg-white">
                                                        <textarea 
                                                            rows={10}
                                                            className="w-full p-4 rounded-xl border border-slate-200 font-serif text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                                            value={tmpl.content}
                                                            onChange={(e) => {
                                                                const newList = [...(localSettings.contractTemplates as any[])];
                                                                newList[idx].content = e.target.value;
                                                                setLocalSettings({...localSettings, contractTemplates: newList});
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === 'ai' && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                        <span className="material-symbols-outlined text-violet-500 text-3xl">smart_toy</span>
                                        Cérebro Artificial (AI)
                                    </h2>

                                    <div className="space-y-4">
                                        <label className="block text-sm font-bold text-slate-700">Modelo de Linguagem (LLM)</label>
                                        <select 
                                            name="aiModel"
                                            value={localSettings.aiModel}
                                            onChange={handleChange}
                                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-violet-100 focus:border-violet-500 outline-none appearance-none bg-no-repeat bg-[right_1.5rem_center] bg-[length:1.5rem_1.5rem]"
                                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='Length: 19 9l-7 7-7-7' /%3E%3C/svg%3E")` }}
                                        >
                                            <option value="gemini-1.5-flash">Google Gemini 1.5 Flash (Rápido & Estável)</option>
                                            <option value="gemini-1.5-pro">Google Gemini 1.5 Pro (Criativo & Raciocínio)</option>
                                            <option value="gpt-4o">OpenAI GPT-4o (Premium)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="block text-sm font-bold text-slate-700">Instruções de Personalidade (System Prompt)</label>
                                        <textarea 
                                            name="aiPromptBase"
                                            value={localSettings.aiPromptBase}
                                            onChange={handleChange}
                                            rows={8}
                                            className="w-full px-5 py-4 rounded-3xl border border-slate-200 focus:ring-4 focus:ring-violet-100 focus:border-violet-500 outline-none resize-none text-slate-600"
                                            placeholder="Ex: Você é um assistente que foca em imóveis de alto luxo..."
                                        />
                                        <p className="text-xs text-slate-400 italic">Isso define como a IA conversará com seus clientes e corretores.</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === 'finance' && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                        <span className="material-symbols-outlined text-emerald-500 text-3xl">payments</span>
                                        Configurações Financeiras
                                    </h2>
                                    
                                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex items-center gap-4">
                                        <div className="size-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-600">
                                            <span className="material-symbols-outlined text-2xl">qr_code_2</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-emerald-900">Recebimentos via PIX</p>
                                            <p className="text-xs text-emerald-700">Estas informações serão enviadas automaticamente para os clientes nas cobranças.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="block text-sm font-bold text-slate-700">Chave PIX (E-mail, CPF, CNPJ ou Aleatória)</label>
                                            <input 
                                                type="text" 
                                                name="pixKey"
                                                value={localSettings.pixKey}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all"
                                                placeholder="ex: financeiro@suaempresa.com"
                                            />
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <label className="block text-sm font-bold text-slate-700">Beneficiário (Nome Completo)</label>
                                            <input 
                                                type="text" 
                                                name="pixBeneficiary"
                                                value={localSettings.pixBeneficiary}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all"
                                                placeholder="ex: João da Silva Imóveis Ltda"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === 'broadcast' && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                        <span className="material-symbols-outlined text-primary text-3xl">campaign</span>
                                        Broadcaster de Anúncios
                                    </h2>
                                    
                                    <p className="text-slate-500 text-sm">
                                        Envie uma notificação push em tempo real para <strong>todos os dispositivos</strong> que aceitaram receber notificações.
                                        Use com moderação para anúncios de novos imóveis ou comunicados importantes.
                                    </p>

                                    <div className="space-y-6 bg-slate-50 p-8 rounded-3xl border border-slate-200">
                                        <div className="space-y-4">
                                            <label className="block text-sm font-bold text-slate-700">Título do Anúncio</label>
                                            <input 
                                                type="text" 
                                                value={broadcastMessage.title}
                                                onChange={(e) => setBroadcastMessage({...broadcastMessage, title: e.target.value})}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                                placeholder="Ex: 🔥 Grande Oportunidade no Jardins!"
                                            />
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <label className="block text-sm font-bold text-slate-700">Mensagem</label>
                                            <textarea 
                                                value={broadcastMessage.body}
                                                onChange={(e) => setBroadcastMessage({...broadcastMessage, body: e.target.value})}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all min-h-[100px]"
                                                placeholder="Ex: Apartamento com 3 quartos e vista livre por um preço imperdível. Confira!"
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <label className="block text-sm font-bold text-slate-700">Link de Destino (URL)</label>
                                            <input 
                                                type="text" 
                                                value={broadcastMessage.url}
                                                onChange={(e) => setBroadcastMessage({...broadcastMessage, url: e.target.value})}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                                placeholder="Ex: /properties/123"
                                            />
                                        </div>

                                        <button 
                                            type="button"
                                            onClick={handleBroadcast}
                                            disabled={isBroadcasting}
                                            className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                                        >
                                            {isBroadcasting ? (
                                                <span className="material-symbols-outlined animate-spin">sync</span>
                                            ) : (
                                                <span className="material-symbols-outlined">send</span>
                                            )}
                                            {isBroadcasting ? 'Enviando...' : 'Disparar para Todos'}
                                        </button>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === 'smtp' && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                            <span className="material-symbols-outlined text-amber-500 text-3xl">mail</span>
                                            Configurações de E-mail (SMTP)
                                        </h2>
                                        <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-100">
                                            Por Imobiliária
                                        </span>
                                    </div>
                                    <p className="text-slate-500 text-sm">
                                        Configure o servidor SMTP da sua imobiliária. 
                                        Os e-mails serão enviados usando estas credenciais.
                                        {companySettings?.smtp_host && <span className="text-emerald-600 font-bold"> ✅ SMTP configurado</span>}
                                        {!companySettings?.smtp_host && <span className="text-amber-600 font-bold"> ⚠️ Usando SMTP global (ENV)</span>}
                                    </p>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Servidor SMTP *</label>
                                            <input value={localSettings.smtp_host} onChange={e => setLocalSettings(p => ({ ...p, smtp_host: e.target.value }))}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                                                placeholder="smtp.gmail.com" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Porta</label>
                                            <input value={localSettings.smtp_port} onChange={e => setLocalSettings(p => ({ ...p, smtp_port: e.target.value }))}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                                                placeholder="587" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Usuário SMTP *</label>
                                            <input value={localSettings.smtp_user} onChange={e => setLocalSettings(p => ({ ...p, smtp_user: e.target.value }))}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                                                placeholder="contato@imobiliaria.com" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Senha SMTP *</label>
                                            <input type="password" value={localSettings.smtp_password} onChange={e => setLocalSettings(p => ({ ...p, smtp_password: e.target.value }))}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                                                placeholder="••••••••" />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={!!localSettings.smtp_secure} onChange={e => setLocalSettings(p => ({ ...p, smtp_secure: e.target.checked }))}
                                                    className="sr-only peer" />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/30 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                            <span className="text-sm text-slate-600 font-medium">Conexão Segura (TLS/SSL)</span>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-100 pt-6">
                                        <h3 className="text-lg font-bold text-slate-800 mb-4">Remetente dos E-mails</h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome do Remetente</label>
                                                <input value={localSettings.email_sender_name} onChange={e => setLocalSettings(p => ({ ...p, email_sender_name: e.target.value }))}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                                                    placeholder="Imobiliária Alpha" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-mail do Remetente</label>
                                                <input value={localSettings.email_sender_address} onChange={e => setLocalSettings(p => ({ ...p, email_sender_address: e.target.value }))}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                                                    placeholder="contato@imobiliaria.com" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-100 pt-6">
                                        <h3 className="text-lg font-bold text-slate-800 mb-4">Testar Envio</h3>
                                        <p className="text-sm text-slate-500 mb-4">Envie um e-mail de teste para verificar se as configurações SMTP estão corretas.</p>
                                        <div className="flex items-center gap-3">
                                            <input value={testEmail} onChange={e => setTestEmail(e.target.value)}
                                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                                                placeholder="seu@email.com" />
                                            <button onClick={handleTestEmail} disabled={isTestingEmail || !testEmail}
                                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center gap-2">
                                                {isTestingEmail ? <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Testar'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === 'sync' && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                            <span className="material-symbols-outlined text-blue-500 text-3xl">hub</span>
                                            Conectividade & Push
                                        </h2>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handleProvisionTestData}
                                                className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-100 hover:bg-amber-100 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">construction</span>
                                                Provisionar Dados de Teste
                                            </button>
                                            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                                                <span className="size-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                                Servidor Online
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Push Notifications Section */}
                                        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-blue-100 space-y-4 relative overflow-hidden group">
                                            <div className="absolute top-[-20px] right-[-20px] size-32 bg-blue-500/5 rounded-full group-hover:scale-110 transition-transform duration-700"></div>
                                            
                                            <div className="flex items-start justify-between relative z-10">
                                                <div className="size-12 bg-white rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center text-blue-600">
                                                    <span className="material-symbols-outlined text-2xl">notifications_active</span>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                                    permissionStatus === 'granted' ? 'bg-emerald-100 text-emerald-700' : 
                                                    permissionStatus === 'denied' ? 'bg-red-100 text-red-700' : 'bg-blue-200/50 text-blue-700'
                                                }`}>
                                                    {permissionStatus === 'granted' ? 'Ativo' : permissionStatus === 'denied' ? 'Bloqueado' : 'Aguardando'}
                                                </span>
                                            </div>

                                            <div>
                                                <h3 className="font-bold text-blue-900 text-lg">Web Push Notifications</h3>
                                                <p className="text-xs text-blue-700/70 leading-relaxed">Alertas nativos em tempo real para novos imóveis, leads e mensagens de chat.</p>
                                            </div>

                                            <div className="space-y-3 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={requestPermission}
                                                    className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-sm">vibration</span>
                                                    Ativar no Navegador
                                                </button>

                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        value={testPushMessage}
                                                        onChange={(e) => setTestPushMessage(e.target.value)}
                                                        className="flex-1 px-4 py-2 rounded-xl border border-blue-200 bg-white/50 focus:outline-none text-sm"
                                                        placeholder="Mensagem de teste..."
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleTestPush}
                                                        disabled={isTestingPush}
                                                        className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all disabled:opacity-50"
                                                    >
                                                        {isTestingPush ? '...' : 'Testar'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Email SMTP Section */}
                                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4 relative overflow-hidden group">
                                            <div className="flex items-start justify-between">
                                                <div className="size-12 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-600">
                                                    <span className="material-symbols-outlined text-2xl">alternate_email</span>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="font-bold text-slate-800 text-lg">Serviço de E-mail (SMTP)</h3>
                                                <p className="text-xs text-slate-500 leading-relaxed">Envio automático de contratos em PDF e convites para assinatura digital.</p>
                                            </div>

                                            <div className="space-y-4 pt-2">
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="email" 
                                                        value={testEmail}
                                                        onChange={(e) => setTestEmail(e.target.value)}
                                                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none text-sm"
                                                        placeholder="Seu e-mail de teste"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleTestEmail}
                                                        disabled={isTestingEmail}
                                                        className="px-5 py-3 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-all disabled:opacity-50 shadow-lg shadow-slate-200"
                                                    >
                                                        {isTestingEmail ? '...' : 'Enviar'}
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                                                    <span className="material-symbols-outlined text-amber-500 text-sm">lock</span>
                                                    <p className="text-[10px] text-amber-700 font-medium">Credenciais protegidas via variáveis de ambiente (.env).</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PWA Section */}
                                    <div className="p-8 bg-gradient-to-r from-indigo-600 to-violet-700 rounded-[2rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-indigo-200 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-full bg-white/10 skew-x-[-20deg] translate-x-20"></div>
                                        
                                        <div className="flex gap-6 items-center relative z-10">
                                            <div className="size-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/30">
                                                <span className="material-symbols-outlined text-5xl">install_mobile</span>
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black">App Nativo Instalável</h3>
                                                <p className="text-indigo-100 text-sm max-w-sm">Sua imobiliária no bolso do cliente. Instale na tela inicial para acesso instantâneo e offline.</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col items-end gap-1 relative z-10">
                                            <div className="px-4 py-2 bg-white/20 rounded-2xl backdrop-blur-md border border-white/20">
                                                <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Status da Engine</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="size-2 bg-emerald-400 rounded-full animate-ping"></span>
                                                    <p className="text-sm font-bold">Progressive Web App Ativo</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
