import React, { useState, useMemo } from 'react';
import { Contract, Property, User } from '../src/types';

interface FinancialManagementProps {
    contracts: Contract[];
    properties: Property[];
    users: User[];
    onAddContract: (contract: Contract) => void;
    onUpdateContract: (id: number | string, data: Partial<Contract>) => void;
    settings: Record<string, string>;
}

const FinancialManagement: React.FC<FinancialManagementProps> = ({ contracts, properties, users, onAddContract, onUpdateContract, settings }) => {
    const [activeTab, setActiveTab] = useState<'rent' | 'sale'>('rent');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid');
    const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);

    // Form States
    const [newContractForm, setNewContractForm] = useState({
        propertyId: '',
        clientId: '',
        ownerId: '',
        value: '',
        commission: '',
        dueDay: '',
        startDate: '',
        type: 'rent',
        installmentsTotal: '' // Novo campo para parcelas
    });

    const filteredContracts = useMemo(() => {
        return contracts.filter(c => c.type === activeTab);
    }, [contracts, activeTab]);

    const totalRevenue = useMemo(() => {
        return contracts.reduce((acc, curr) => {
            const monthlyRevenue = (curr.value * curr.commissionRate) / 100;
            return acc + monthlyRevenue;
        }, 0);
    }, [contracts]);

    const handleWhatsAppCharge = (contract: Contract) => {
        const monthName = new Date().toLocaleString('pt-BR', { month: 'long' });
        const pixKey = settings.pixKey || 'Consulte o financeiro';
        const beneficiary = settings.pixBeneficiary || '';
        
        let message = '';

        if (contract.type === 'rent') {
            message = `Olá *${contract.clientName}*, referente ao aluguel do imóvel *${contract.propertyTitle}*.\n\nO boleto de *${monthName}* no valor de *R$ ${contract.value.toLocaleString('pt-BR')}* vence no dia *${contract.dueDay}*.\n\n🔑 *Pagamento via PIX*:\nChave: ${pixKey}${beneficiary ? `\nBeneficiário: ${beneficiary}` : ''}\n\nApós o pagamento, favor enviar o comprovante!`;
        } else {
            const currentInstallment = (contract.installmentsPaid || 0) + 1;
            const total = contract.installmentsTotal || 1;
            message = `Olá *${contract.clientName}*, referente à parcela *${currentInstallment}/${total}* do financiamento do imóvel *${contract.propertyTitle}*.\n\nValor: *R$ ${contract.value.toLocaleString('pt-BR')}*.\nVencimento: Dia *${contract.dueDay}/${new Date().getMonth() + 1}*.\n\n🔑 *Pagamento via PIX*:\nChave: ${pixKey}${beneficiary ? `\nBeneficiário: ${beneficiary}` : ''}\n\nAtenciosamente, EstateFlow.`;
        }

        const url = `https://wa.me/${contract.clientPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleOwnerPayout = (contract: Contract) => {
        const payout = contract.value - (contract.value * contract.commissionRate / 100);
        const refText = contract.type === 'rent' ? 'aluguel' : `parcela ${(contract.installmentsPaid || 0)}/${contract.installmentsTotal || 1}`;

        const message = `Olá *${contract.ownerName}*, confirmamos o recebimento do(a) ${refText} de *${contract.propertyTitle}*.\n\nO repasse de *R$ ${payout.toLocaleString('pt-BR')}* (descontada taxa de administração de ${contract.commissionRate}%) já foi programado.`;

        const url = `https://wa.me/${contract.ownerPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleMarkAsPaid = (contract: Contract) => {
        if (!confirm(`Confirmar recebimento do pagamento de ${contract.clientName}?`)) return;

        const updatedData: Partial<Contract> = {
            nextPaymentStatus: 'paid',
            lastPaymentDate: new Date().toISOString().split('T')[0]
        };

        if (contract.type === 'sale' && contract.installmentsTotal) {
            const currentPaid = contract.installmentsPaid || 0;
            if (currentPaid < contract.installmentsTotal) {
                updatedData.installmentsPaid = currentPaid + 1;
                // Se pagou a última, marca como completo
                if (updatedData.installmentsPaid === contract.installmentsTotal) {
                    updatedData.status = 'completed';
                }
            }
        }

        onUpdateContract(contract.id, updatedData);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(filteredContracts.map(c => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: number | string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkMarkPaid = () => {
        if (!confirm(`Confirmar recebimento de ${selectedIds.length} pagamentos?`)) return;

        selectedIds.forEach(id => {
            const contract = contracts.find(c => c.id === id);
            if (contract) {
                const updatedData: Partial<Contract> = {
                    nextPaymentStatus: 'paid',
                    lastPaymentDate: new Date().toISOString().split('T')[0]
                };
                if (contract.type === 'sale' && contract.installmentsTotal) {
                    const currentPaid = contract.installmentsPaid || 0;
                    if (currentPaid < contract.installmentsTotal) {
                        updatedData.installmentsPaid = currentPaid + 1;
                        if (updatedData.installmentsPaid === contract.installmentsTotal) {
                            updatedData.status = 'completed';
                        }
                    }
                }
                onUpdateContract(id, updatedData);
            }
        });
        setSelectedIds([]);
    };
    const isOverdue = (contract: Contract) => {
        if (contract.nextPaymentStatus !== 'pending') return false;
        const currentDay = new Date().getDate();
        return currentDay > contract.dueDay;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const property = properties.find(p => p.id.toString() === newContractForm.propertyId);
        const client = users.find(u => u.id.toString() === newContractForm.clientId);
        const owner = users.find(u => u.id.toString() === newContractForm.ownerId);

        if (!property || !client || !owner) {
            alert("Selecione imóvel, cliente e proprietário válidos.");
            return;
        }

        const newContract: Contract = {
            id: Date.now(),
            propertyId: property.id,
            propertyTitle: property.title,
            propertyImage: property.image,
            type: newContractForm.type as 'rent' | 'sale',
            status: 'active',
            clientId: client.id,
            clientName: client.name,
            clientPhone: client.phone || '',
            ownerId: owner.id,
            ownerName: owner.name,
            ownerPhone: owner.phone || '',
            value: parseFloat(newContractForm.value),
            commissionRate: parseFloat(newContractForm.commission),
            dueDay: parseInt(newContractForm.dueDay),
            startDate: newContractForm.startDate,
            nextPaymentStatus: 'pending',
            installmentsTotal: newContractForm.type === 'sale' && newContractForm.installmentsTotal ? parseInt(newContractForm.installmentsTotal) : undefined,
            installmentsPaid: newContractForm.type === 'sale' ? 0 : undefined
        };

        onAddContract(newContract);
        setIsModalOpen(false);
        setNewContractForm({
            propertyId: '', clientId: '', ownerId: '', value: '', commission: '', dueDay: '', startDate: '', type: 'rent', installmentsTotal: ''
        });
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display h-full flex flex-col overflow-hidden relative">

            {/* Header */}
            <header className="flex-none bg-surface-light dark:bg-[#111318] border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[1600px] mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold">Gestão Financeira</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Contratos, recebimentos e repasses.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center bg-slate-100 dark:bg-[#111318] rounded-lg p-1 border border-slate-200 dark:border-slate-800">
                                <button
                                    onClick={() => setLayoutMode('grid')}
                                    className={`p-1.5 rounded-md transition-all ${layoutMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="Visualização em Grade"
                                >
                                    <span className="material-symbols-outlined text-[20px]">grid_view</span>
                                </button>
                                <button
                                    onClick={() => setLayoutMode('table')}
                                    className={`p-1.5 rounded-md transition-all ${layoutMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="Visualização em Lista"
                                >
                                    <span className="material-symbols-outlined text-[20px]">table_rows</span>
                                </button>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-primary/20 transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[20px]">add_card</span> Novo Contrato
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-[1600px] mx-auto flex flex-col gap-8">

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-[#1a1d23] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Contratos Ativos</p>
                                <p className="text-2xl font-bold mt-1">{contracts.filter(c => c.status === 'active').length}</p>
                            </div>
                            <div className="size-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined">description</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#1a1d23] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Receita Prevista (Comissão)</p>
                                <p className="text-2xl font-bold mt-1 text-emerald-600">R$ {totalRevenue.toLocaleString('pt-BR')}</p>
                            </div>
                            <div className="size-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined">trending_up</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#1a1d23] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Inadimplência</p>
                                <p className="text-2xl font-bold mt-1 text-rose-500">0%</p>
                            </div>
                            <div className="size-10 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined">warning</span>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800">
                        <button
                            onClick={() => setActiveTab('rent')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'rent' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Aluguéis Ativos
                        </button>
                        <button
                            onClick={() => setActiveTab('sale')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'sale' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Vendas & Financiamentos
                        </button>
                    </div>

                    {/* Bulk Actions Bar */}
                    {selectedIds.length > 0 && (
                        <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between animate-in slide-in-from-top duration-200 shadow-lg sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSelectedIds([])} className="hover:bg-white/10 p-1 rounded-full"><span className="material-symbols-outlined">close</span></button>
                                <span className="font-bold text-sm">{selectedIds.length} selecionados</span>
                            </div>
                            <button onClick={handleBulkMarkPaid} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs font-bold transition-colors flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">check_circle</span> Baixar Pagamento (Todos)
                            </button>
                        </div>
                    )}

                    {/* Contracts Grid/Table */}
                    {filteredContracts.length === 0 ? (
                        <div className="text-center py-20 text-slate-500 bg-white dark:bg-[#1a1d23] rounded-2xl border border-dashed border-slate-300">
                            <span className="material-symbols-outlined text-4xl mb-2">folder_off</span>
                            <p>Nenhum contrato encontrado nesta categoria.</p>
                        </div>
                    ) : layoutMode === 'grid' ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {filteredContracts.map(contract => (
                                <div key={contract.id} className={`bg-white dark:bg-[#1a1d23] rounded-xl border ${isOverdue(contract) ? 'border-red-500 shadow-lg shadow-red-500/10' : 'border-slate-200 dark:border-slate-800'} shadow-sm overflow-hidden flex flex-col md:flex-row transition-all ${selectedIds.includes(contract.id) ? 'ring-2 ring-primary' : ''} relative`}>
                                    {/* Badge de Atraso */}
                                    {isOverdue(contract) && (
                                        <div className="absolute top-4 left-4 z-20 bg-red-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded-full animate-pulse shadow-lg">
                                            Atrasado
                                        </div>
                                    )}
                                    {/* Selection Checkbox (Grid Mode) */}
                                    {contract.nextPaymentStatus !== 'paid' && (
                                        <div className="absolute top-4 left-4 z-10">
                                            <input
                                                type="checkbox"
                                                className="size-5 rounded border-slate-300 text-primary focus:ring-primary shadow-sm"
                                                checked={selectedIds.includes(contract.id)}
                                                onChange={() => handleSelectOne(contract.id)}
                                            />
                                        </div>
                                    )}

                                    {/* Imóvel Info */}
                                    <div className="w-full md:w-48 bg-slate-100 relative group">
                                        <img src={contract.propertyImage} className="w-full h-48 md:h-full object-cover transition-transform group-hover:scale-105 duration-700" alt={contract.propertyTitle} />
                                        <div className="absolute inset-0 bg-black/40 flex items-end p-3">
                                            <p className="text-white font-bold text-sm leading-tight">{contract.propertyTitle}</p>
                                        </div>
                                    </div>

                                    {/* Contract Details */}
                                    <div className="flex-1 p-5 flex flex-col justify-between gap-4">
                                        <div className="flex justify-between items-start pl-8 md:pl-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${contract.nextPaymentStatus === 'paid' ? 'bg-green-100 text-green-700' : isOverdue(contract) ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {contract.nextPaymentStatus === 'paid' ? 'Pago no Mês' : isOverdue(contract) ? 'Atrasado' : 'Pendente'}
                                                </span>
                                                <span className={`text-xs ${isOverdue(contract) ? 'text-red-500 font-bold' : 'text-slate-500'}`}>Vencimento dia {contract.dueDay}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-slate-900 dark:text-white">
                                                    R$ {contract.value.toLocaleString('pt-BR')}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{contract.type === 'rent' ? 'Mensal' : 'Parcela'}</p>
                                            </div>
                                        </div>

                                        {/* Progresso do Financiamento (Apenas Vendas) */}
                                        {contract.type === 'sale' && contract.installmentsTotal && (
                                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 mt-1 relative overflow-hidden">
                                                <div
                                                    className="bg-primary h-2.5 rounded-full"
                                                    style={{ width: `${((contract.installmentsPaid || 0) / contract.installmentsTotal) * 100}%` }}
                                                ></div>
                                                <div className="absolute right-0 top-3 text-[10px] text-slate-500 font-bold">
                                                    {contract.installmentsPaid}/{contract.installmentsTotal} Pagas
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Cliente (Pagador)</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="size-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                        {contract.clientName.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-semibold truncate">{contract.clientName}</span>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Proprietário (Recebedor)</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="size-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">
                                                        {contract.ownerName.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-semibold truncate">{contract.ownerName}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-700 pt-4">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Comissão ({contract.commissionRate}%)</span>
                                                <span className="text-emerald-600 font-bold">+ R$ {(contract.value * contract.commissionRate / 100).toLocaleString('pt-BR')}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Repasse Líquido</span>
                                                <span className="text-slate-900 dark:text-white font-bold">R$ {(contract.value - (contract.value * contract.commissionRate / 100)).toLocaleString('pt-BR')}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-auto pt-2">
                                            <button
                                                onClick={() => handleWhatsAppCharge(contract)}
                                                className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-500/20 active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">chat</span> Cobrar
                                            </button>

                                            {contract.nextPaymentStatus === 'paid' ? (
                                                <button
                                                    onClick={() => handleOwnerPayout(contract)}
                                                    className="flex-1 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">payments</span> Repassar
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleMarkAsPaid(contract)}
                                                    className="flex-1 py-2 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">check_circle</span> Baixar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111318]">
                                        <th className="p-4 w-12 text-center">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-primary focus:ring-primary"
                                                checked={filteredContracts.length > 0 && selectedIds.length === filteredContracts.filter(c => c.nextPaymentStatus !== 'paid').length}
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Imóvel</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Financeiro</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell">Comissão</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredContracts.map(contract => (
                                        <tr key={contract.id} className={`hover:bg-slate-50 dark:hover:bg-[#20242c] transition-colors ${selectedIds.includes(contract.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                            <td className="p-4 text-center">
                                                {contract.nextPaymentStatus !== 'paid' && (
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-primary focus:ring-primary"
                                                        checked={selectedIds.includes(contract.id)}
                                                        onChange={() => handleSelectOne(contract.id)}
                                                    />
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[200px]">{contract.propertyTitle}</div>
                                                <div className="text-xs text-slate-500 flex flex-col">
                                                    <span>C: {contract.clientName}</span>
                                                    <span>P: {contract.ownerName}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-sm text-slate-900 dark:text-white">R$ {contract.value.toLocaleString('pt-BR')}</div>
                                                <div className="text-xs text-slate-500">Vence dia {contract.dueDay}</div>
                                            </td>
                                            <td className="p-4 hidden md:table-cell">
                                                <div className="text-xs text-emerald-600 font-bold">+ R$ {(contract.value * contract.commissionRate / 100).toLocaleString('pt-BR')}</div>
                                                <div className="text-[10px] text-slate-400">{contract.commissionRate}% Taxa</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${contract.nextPaymentStatus === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : isOverdue(contract) ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                    {contract.nextPaymentStatus === 'paid' ? 'Pago' : isOverdue(contract) ? 'Atrasado' : 'Pendente'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleWhatsAppCharge(contract)} className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-slate-500 hover:text-green-600 transition-colors" title="Cobrar WhatsApp">
                                                        <span className="material-symbols-outlined text-[18px]">chat</span>
                                                    </button>
                                                    {contract.nextPaymentStatus !== 'paid' && (
                                                        <button onClick={() => handleMarkAsPaid(contract)} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-primary transition-colors" title="Baixar Pagamento">
                                                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal Novo Contrato */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1a1d23] w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Registrar Novo Contrato</h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Contrato</label>
                                    <select
                                        className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111318]"
                                        value={newContractForm.type}
                                        onChange={e => setNewContractForm({ ...newContractForm, type: e.target.value })}
                                    >
                                        <option value="rent">Aluguel</option>
                                        <option value="sale">Venda / Financiamento</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Imóvel</label>
                                    <select
                                        required
                                        className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111318]"
                                        value={newContractForm.propertyId}
                                        onChange={e => {
                                            const prop = properties.find(p => p.id.toString() === e.target.value);
                                            setNewContractForm({
                                                ...newContractForm,
                                                propertyId: e.target.value,
                                                ownerId: prop?.ownerId?.toString() || '' // Auto-select owner if possible
                                            })
                                        }}
                                    >
                                        <option value="">Selecione o Imóvel...</option>
                                        {properties.map(p => (
                                            <option key={p.id} value={p.id}>{p.title} ({p.status})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Cliente (Pagador)</label>
                                    <select
                                        required
                                        className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111318]"
                                        value={newContractForm.clientId}
                                        onChange={e => setNewContractForm({ ...newContractForm, clientId: e.target.value })}
                                    >
                                        <option value="">Selecione o Cliente...</option>
                                        {users.filter(u => u.role === 'client').map(u => (
                                            <option key={u.id} value={u.id}>{u.name} - {u.email}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Proprietário (Recebedor)</label>
                                    <select
                                        required
                                        className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111318]"
                                        value={newContractForm.ownerId}
                                        onChange={e => setNewContractForm({ ...newContractForm, ownerId: e.target.value })}
                                    >
                                        <option value="">Selecione o Proprietário...</option>
                                        {users.filter(u => u.role === 'owner' || u.role === 'admin').map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <hr className="border-slate-200 dark:border-slate-700" />

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1 col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Valor Mensal / Parcela (R$)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111318]"
                                        placeholder="0.00"
                                        value={newContractForm.value}
                                        onChange={e => setNewContractForm({ ...newContractForm, value: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Taxa Adm (%)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111318]"
                                        placeholder="10"
                                        value={newContractForm.commission}
                                        onChange={e => setNewContractForm({ ...newContractForm, commission: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Dia Vencimento</label>
                                    <input
                                        type="number"
                                        required
                                        max="31"
                                        className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111318]"
                                        placeholder="05"
                                        value={newContractForm.dueDay}
                                        onChange={e => setNewContractForm({ ...newContractForm, dueDay: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Campo Condicional de Parcelas */}
                            {newContractForm.type === 'sale' && (
                                <div className="space-y-1 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <label className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">Número de Parcelas (Financiamento)</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111318]"
                                        placeholder="Ex: 60, 120..."
                                        value={newContractForm.installmentsTotal}
                                        onChange={e => setNewContractForm({ ...newContractForm, installmentsTotal: e.target.value })}
                                    />
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">Deixe em branco se for venda à vista.</p>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Data de Início</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111318]"
                                    value={newContractForm.startDate}
                                    onChange={e => setNewContractForm({ ...newContractForm, startDate: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors">Criar Contrato</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancialManagement;