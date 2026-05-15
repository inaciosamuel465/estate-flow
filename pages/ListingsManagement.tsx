import React, { useState, useEffect, useMemo } from 'react';
import { Property, User } from '../src/types';

interface ListingsManagementProps {
    onNavigate: (view: string) => void;
    onSelectProperty: (id: number | string) => void;
    properties: Property[];
    onDelete: (id: number | string) => void;
    onUpdate: (id: number | string, data: Partial<Property>) => void;
    onEditFull: (property: Property) => void;
    currentUser: User | null;
}

const ListingsManagement: React.FC<ListingsManagementProps> = ({
    onNavigate,
    onSelectProperty,
    properties,
    onDelete,
    onUpdate,
    onEditFull,
    currentUser
}) => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'draft' | 'sold' | 'rented'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const myListings = useMemo(() => {
        if (currentUser?.role === 'admin') return properties;
        return properties.filter(p => p.ownerId === currentUser?.id);
    }, [properties, currentUser]);

    const filteredListings = myListings.filter(item => {
        const title = item.title || '';
        const location = item.location || '';
        const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || (item.status || 'active') === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const handleDelete = (id: number | string) => {
        if (confirm('Tem certeza que deseja remover este anúncio permanentemente?')) {
            onDelete(id);
        }
    };

    const handleShare = (id: number | string) => {
        const url = `${window.location.origin}${window.location.pathname}?id=${id}`;
        navigator.clipboard.writeText(url).then(() => {
            alert(`Link copiado: ${url}`);
        });
    };

    const handleQuickStatusChange = (id: number | string, newStatus: 'active' | 'sold' | 'rented' | 'draft') => {
        onUpdate(id, { status: newStatus });
    };

    const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(filteredListings.map(l => l.id));
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

    const handleBulkAction = (action: 'delete' | 'active' | 'sold' | 'rented') => {
        if (!confirm(`Aplicar ação para ${selectedIds.length} itens?`)) return;

        selectedIds.forEach(id => {
            if (action === 'delete') {
                onDelete(id);
            } else {
                onUpdate(id, { status: action });
            }
        });
        setSelectedIds([]);
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-500 text-white';
            case 'sold': return 'bg-rose-500 text-white';
            case 'rented': return 'bg-blue-500 text-white';
            case 'draft': return 'bg-slate-400 text-white';
            default: return 'bg-emerald-500 text-white';
        }
    };

    const getStatusLabel = (status?: string) => {
        switch (status) {
            case 'active': return 'Ativo';
            case 'sold': return 'Vendido';
            case 'rented': return 'Alugado';
            case 'draft': return 'Rascunho';
            default: return 'Ativo';
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display h-full flex flex-col overflow-hidden relative">
            <header className="flex-none bg-surface-light dark:bg-[#111318] border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[1600px] mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold">Gestão de Anúncios</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie seu portfólio imobiliário</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onNavigate('listing')}
                            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-primary/20 transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined text-[20px]">add</span> Criar Anúncio
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-[#1a1d23] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <span className="text-xs font-bold text-slate-500 uppercase">Total</span>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{myListings.length}</p>
                        </div>
                        <div className="bg-white dark:bg-[#1a1d23] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-emerald-500">
                            <span className="text-xs font-bold text-slate-500 uppercase">Ativos</span>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{myListings.filter(l => (l.status || 'active') === 'active').length}</p>
                        </div>
                        <div className="bg-white dark:bg-[#1a1d23] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-rose-500">
                            <span className="text-xs font-bold text-slate-500 uppercase">Vendidos/Alugados</span>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{myListings.filter(l => l.status === 'sold' || l.status === 'rented').length}</p>
                        </div>
                        <div className="bg-white dark:bg-[#1a1d23] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <span className="text-xs font-bold text-slate-500 uppercase">Visitas (Total)</span>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                {myListings.reduce((acc, curr) => acc + (curr.stats?.views || 0), 0)}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-[#1a1d23] p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                        {selectedIds.length > 0 && (
                            <div className="absolute inset-0 z-10 bg-slate-900 text-white flex items-center justify-between px-4 animate-in slide-in-from-top duration-200">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedIds([])} className="hover:bg-white/10 p-1 rounded-full"><span className="material-symbols-outlined">close</span></button>
                                    <span className="font-bold text-sm">{selectedIds.length} selecionados</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-px bg-white/20 mx-2"></div>
                                    <button onClick={() => handleBulkAction('active')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-bold transition-colors">Ativar</button>
                                    <button onClick={() => handleBulkAction('sold')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-bold transition-colors">Vender</button>
                                    <button onClick={() => handleBulkAction('delete')} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-500 hover:text-white rounded text-xs font-bold transition-colors flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">delete</span> Excluir
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                            {['all', 'active', 'sold', 'rented', 'draft'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status as any)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${filterStatus === status
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    {status === 'all' ? 'Todos' : getStatusLabel(status)}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                                <input
                                    type="text"
                                    placeholder="Buscar imóvel..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-[#111318] border-none rounded-lg text-sm focus:ring-2 focus:ring-primary text-slate-900 dark:text-white placeholder:text-slate-500"
                                />
                            </div>
                            <div className="flex items-center bg-slate-100 dark:bg-[#111318] rounded-lg p-1 border border-slate-200 dark:border-slate-800">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">grid_view</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">view_list</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                            {filteredListings.map(item => (
                                <div key={item.id} className="group bg-white dark:bg-[#1a1d23] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:border-primary/50 transition-all duration-300 flex flex-col">
                                    <div className="relative h-48 overflow-hidden cursor-pointer" onClick={() => onSelectProperty(item.id)}>
                                        <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                                        <div className="absolute top-3 left-3">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${getStatusColor(item.status)}`}>
                                                {getStatusLabel(item.status)}
                                            </span>
                                        </div>
                                        <div className="absolute bottom-3 left-3 text-white">
                                            <p className="text-lg font-bold">{item.price}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 flex flex-col flex-1">
                                        <h3
                                            className="font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => onSelectProperty(item.id)}
                                        >
                                            {item.title}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-4">{item.location}</p>

                                        <div className="flex items-center gap-3 mb-4 text-xs text-slate-600 dark:text-slate-300">
                                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">bed</span> {item.beds}</span>
                                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">bathtub</span> {item.baths}</span>
                                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">square_foot</span> {item.area}m²</span>
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                            <div className="flex gap-1 group/actions relative">
                                                <button className="text-xs font-bold text-slate-500 hover:text-primary flex items-center gap-1">
                                                    Status <span className="material-symbols-outlined text-[14px]">expand_more</span>
                                                </button>
                                                <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-[#1a1d23] border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-1 hidden group-hover/actions:flex flex-col gap-1 min-w-[100px] z-10">
                                                    <button onClick={() => handleQuickStatusChange(item.id, 'active')} className="px-3 py-1.5 text-xs text-left hover:bg-emerald-50 text-emerald-600 rounded">Ativo</button>
                                                    <button onClick={() => handleQuickStatusChange(item.id, 'sold')} className="px-3 py-1.5 text-xs text-left hover:bg-rose-50 text-rose-600 rounded">Vendido</button>
                                                    <button onClick={() => handleQuickStatusChange(item.id, 'rented')} className="px-3 py-1.5 text-xs text-left hover:bg-blue-50 text-blue-600 rounded">Alugado</button>
                                                </div>
                                            </div>

                                            <div className="flex gap-1">
                                                <button onClick={() => handleShare(item.id)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors" title="Compartilhar Link">
                                                    <span className="material-symbols-outlined text-[18px]">share</span>
                                                </button>
                                                <button onClick={() => onEditFull(item)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors" title="Editar Completo">
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 text-slate-500 hover:text-rose-500 transition-colors" title="Excluir">
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto custom-scrollbar mb-20">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111318]">
                                        <th className="p-4 w-12 text-center">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-primary focus:ring-primary"
                                                checked={filteredListings.length > 0 && selectedIds.length === filteredListings.length}
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Imóvel</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Preço</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell">Stats</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredListings.map(item => (
                                        <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-[#20242c] transition-colors group ${selectedIds.includes(item.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                            <td className="p-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-primary focus:ring-primary"
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => handleSelectOne(item.id)}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-12 rounded-lg bg-cover bg-center shrink-0 cursor-pointer" onClick={() => onSelectProperty(item.id)} style={{ backgroundImage: `url("${item.image}")` }}></div>
                                                    <div className="min-w-0">
                                                        <p
                                                            className="font-bold text-sm text-slate-900 dark:text-white truncate cursor-pointer hover:text-primary"
                                                            onClick={() => onSelectProperty(item.id)}
                                                        >
                                                            {item.title}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{item.location}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 hidden sm:table-cell">
                                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.price}</span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getStatusColor(item.status)}`}>
                                                    {getStatusLabel(item.status)}
                                                </span>
                                            </td>
                                            <td className="p-4 hidden md:table-cell">
                                                <div className="flex flex-col gap-1 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">visibility</span> {item.stats?.views || 0}</span>
                                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">group</span> {item.stats?.leads || 0}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleShare(item.id)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary transition-colors" title="Compartilhar">
                                                        <span className="material-symbols-outlined text-[18px]">share</span>
                                                    </button>
                                                    <button onClick={() => onEditFull(item)} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-primary transition-colors" title="Editar">
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 text-slate-500 hover:text-rose-500 transition-colors" title="Remover">
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredListings.length === 0 && (
                                <div className="p-8 text-center text-slate-500">
                                    <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                                    <p>Nenhum anúncio encontrado com os filtros atuais.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ListingsManagement;