import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Conversation, ChatMessage, Contract, User } from '../src/types';

interface ChatManagementProps {
    conversations: Conversation[];
    contracts: Contract[];
    users: User[];
    onSendMessage: (text: string, sender: 'agent', userId: number | string, attachment?: ChatMessage['attachment']) => void;
    onMarkAsRead: (conversationId: number | string) => void;
}

const ChatManagement: React.FC<ChatManagementProps> = ({ conversations, contracts, users, onSendMessage, onMarkAsRead }) => {
    const [selectedUserId, setSelectedUserId] = useState<number | string | null>(null);
    const [searchText, setSearchText] = useState('');
    const [replyText, setReplyText] = useState('');
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [showContactPanel, setShowContactPanel] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Merge conversations with all users to ensure everyone appears in the list
    const allChatItems = useMemo(() => {
        // Only show clients and owners for the admin
        const relevantUsers = users.filter(u => u.role !== 'admin');
        
        return relevantUsers.map(user => {
            const existingConv = conversations.find(c => String(c.userId) === String(user.id));
            
            if (existingConv) {
                return existingConv;
            }
            
            // Create a "virtual" conversation for users without history
            return {
                id: `new_${user.id}`,
                userId: user.id,
                userName: user.name,
                userAvatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
                userRole: user.role as any,
                lastMessage: 'Sem conversas anteriores',
                lastMessageTime: '',
                unreadCount: 0,
                messages: [],
            } as Conversation;
        }).sort((a, b) => {
            // Put unread first, then with messages, then alphabetically
            if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
            if (a.messages.length > 0 && b.messages.length === 0) return -1;
            if (a.messages.length === 0 && b.messages.length > 0) return 1;
            return a.userName.localeCompare(b.userName);
        });
    }, [conversations, users]);

    const filteredItems = allChatItems.filter(item => 
        item.userName.toLowerCase().includes(searchText.toLowerCase())
    );

    const activeConversation = allChatItems.find(c => String(c.userId) === String(selectedUserId));
    const activeUser = users.find(u => String(u.id) === String(selectedUserId));

    // Scroll to bottom on new message
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [activeConversation?.messages]);

    // Mark as read when opening conversation
    useEffect(() => {
        if (activeConversation && activeConversation.unreadCount > 0) {
            onMarkAsRead(activeConversation.id);
        }
    }, [selectedUserId, activeConversation?.unreadCount]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !activeConversation) return;

        onSendMessage(replyText, 'agent', activeConversation.userId);
        setReplyText('');
    };

    const handleSendAttachment = (type: 'contract' | 'invoice', contract: Contract) => {
        if (!activeConversation) return;

        const text = type === 'contract'
            ? `Olá ${activeConversation.userName}, estou enviando o contrato do imóvel ${contract.propertyTitle} para sua assinatura digital.`
            : `Olá ${activeConversation.userName}, a fatura mensal referente ao imóvel ${contract.propertyTitle} já está disponível.`;

        onSendMessage(text, 'agent', activeConversation.userId, {
            type,
            id: contract.id,
            title: contract.propertyTitle,
            status: 'pending'
        });
        setIsActionMenuOpen(false);
    };

    const userContracts = contracts.filter(c => activeConversation && (String(c.clientId) === String(activeConversation.userId) || String(c.ownerId) === String(activeConversation.userId)));

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'owner': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            case 'client': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        }
    };

    const formatRole = (role: string) => {
        if (role === 'owner') return 'Proprietário';
        if (role === 'client') return 'Cliente';
        return role;
    };

    return (
        <div className="flex h-full bg-slate-100 dark:bg-[#0b0e14] overflow-hidden font-display relative">

            {/* --- LEFT SIDEBAR --- */}
            <div className={`
                w-full md:w-80 lg:w-96 flex flex-col bg-white dark:bg-[#111318] border-r border-slate-200 dark:border-slate-800 shrink-0
                ${selectedUserId ? 'hidden md:flex' : 'flex'}
            `}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1d23] flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">chat</span> Atendimento
                    </h2>
                    <div className="flex gap-2">
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-bold">
                            {allChatItems.length} contatos
                        </span>
                    </div>
                </div>

                <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                        <input
                            type="text"
                            placeholder="Buscar contato..."
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary text-slate-900 dark:text-white transition-all"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredItems.map(item => (
                        <div
                            key={item.userId}
                            onClick={() => setSelectedUserId(item.userId)}
                            className={`flex items-center gap-3 p-4 cursor-pointer transition-all border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${String(selectedUserId) === String(item.userId) ? 'bg-blue-50 dark:bg-primary/10 border-l-4 border-l-primary' : ''}`}
                        >
                            <div className="relative">
                                <div className="size-12 rounded-full bg-cover bg-center border border-slate-200 dark:border-slate-700 shadow-sm" style={{ backgroundImage: `url("${item.userAvatar}")` }}></div>
                                <div className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white dark:border-[#111318] ${item.messages.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h4 className={`text-sm font-bold truncate ${String(selectedUserId) === String(item.userId) ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>{item.userName}</h4>
                                    <span className="text-[10px] text-slate-400">{item.lastMessageTime}</span>
                                </div>
                                <p className={`text-xs truncate ${item.unreadCount > 0 ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {item.lastMessage}
                                </p>
                                <div className="mt-1 flex items-center justify-between">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ${getRoleBadge(item.userRole)}`}>
                                        {formatRole(item.userRole)}
                                    </span>
                                </div>
                            </div>
                            {item.unreadCount > 0 && (
                                <div className="size-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shadow-sm animate-pulse">
                                    {item.unreadCount}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* --- RIGHT SIDE (Chat) --- */}
            <div className={`
                flex-1 flex flex-col bg-[#f0f2f5] dark:bg-[#080a0f] relative h-full overflow-hidden
                ${!selectedUserId ? 'hidden md:flex' : 'flex'}
            `}>
                {activeConversation ? (
                    <>
                        <div className="flex-none h-16 bg-white dark:bg-[#1a1d23] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shadow-sm z-10">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedUserId(null)}
                                    className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                                >
                                    <span className="material-symbols-outlined">arrow_back</span>
                                </button>

                                <div className="size-10 rounded-full bg-cover bg-center cursor-pointer shadow-inner" style={{ backgroundImage: `url("${activeConversation.userAvatar}")` }}></div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm md:text-base leading-tight">
                                        {activeConversation.userName}
                                    </h3>
                                    <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                                        <span className="size-1.5 bg-emerald-500 rounded-full animate-pulse"></span> {formatRole(activeConversation.userRole)} Online
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-1 md:gap-2">
                                <button 
                                    onClick={() => setShowContactPanel(!showContactPanel)}
                                    className={`p-2 rounded-full transition-all flex items-center gap-2 px-3 ${showContactPanel ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary'}`}
                                >
                                    <span className="material-symbols-outlined">info</span>
                                    <span className="text-xs font-bold hidden lg:block">Informações</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
                                {activeConversation.messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
                                        <span className="material-symbols-outlined text-7xl mb-4">chat_bubble_outline</span>
                                        <p className="font-bold text-lg">Inicie uma nova conversa</p>
                                        <p className="text-sm">Envie uma mensagem ou um documento para começar.</p>
                                    </div>
                                ) : (
                                    activeConversation.messages.map((msg) => {
                                        const isAgent = msg.sender === 'agent';
                                        return (
                                            <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                                <div className={`
                                                    max-w-[85%] md:max-w-[70%] p-3 rounded-2xl shadow-sm text-sm relative transition-all
                                                    ${isAgent
                                                        ? 'bg-primary text-white rounded-tr-none'
                                                        : 'bg-white dark:bg-[#1a1d23] text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-none'}
                                                `}>
                                                    <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                                                    {msg.attachment && (
                                                        <div className={`mt-3 p-3 rounded-xl border flex flex-col gap-2 ${isAgent ? 'bg-white/10 border-white/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`size-10 rounded-lg flex items-center justify-center ${msg.attachment.type === 'contract' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                    <span className="material-symbols-outlined">
                                                                        {msg.attachment.type === 'contract' ? 'description' : 'receipt_long'}
                                                                    </span>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className={`font-bold text-xs truncate ${isAgent ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>{msg.attachment.title}</p>
                                                                    <p className={`text-[10px] ${isAgent ? 'text-blue-100' : 'text-slate-500'}`}>{msg.attachment.type === 'contract' ? 'Contrato para Assinatura' : 'Fatura Mensal'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isAgent ? 'text-blue-100/70' : 'text-slate-400'}`}>
                                                        <span>{msg.time}</span>
                                                        {isAgent && (
                                                            <span className={`material-symbols-outlined text-[14px] ${msg.read ? 'text-green-300' : 'text-blue-200'}`}>done_all</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} className="h-1" />
                            </div>

                            {/* Contact Info Sidebar */}
                            {showContactPanel && (
                                <div className="w-80 bg-white dark:bg-[#111318] border-l border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-8 overflow-y-auto animate-in slide-in-from-right duration-300">
                                    <div className="text-center">
                                        <div className="size-24 rounded-full bg-cover bg-center mx-auto border-4 border-slate-100 dark:border-slate-800 shadow-xl mb-4" style={{ backgroundImage: `url("${activeConversation.userAvatar}")` }}></div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{activeConversation.userName}</h3>
                                        <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1">{formatRole(activeConversation.userRole)}</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3">Informações de Contato</p>
                                            <div className="space-y-4">
                                                <div className="flex items-start gap-3">
                                                    <span className="material-symbols-outlined text-slate-400 text-[20px]">mail</span>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] text-slate-400 font-bold">Email</p>
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{activeUser?.email || 'Não informado'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <span className="material-symbols-outlined text-slate-400 text-[20px]">call</span>
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 font-bold">Telefone</p>
                                                        <p className="text-sm text-slate-700 dark:text-slate-300">{activeUser?.phone || 'Não informado'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <span className="material-symbols-outlined text-slate-400 text-[20px]">badge</span>
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 font-bold">CPF/CNPJ</p>
                                                        <p className="text-sm text-slate-700 dark:text-slate-300">{(activeUser as any)?.document || 'Não cadastrado'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3">Contratos Ativos ({userContracts.length})</p>
                                            <div className="space-y-2">
                                                {userContracts.map(c => (
                                                    <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{c.propertyTitle}</p>
                                                        <div className="flex justify-between items-center mt-2">
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold uppercase">{c.type === 'rent' ? 'Locação' : 'Venda'}</span>
                                                            <p className="text-[10px] font-bold text-primary">R$ {c.value.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {userContracts.length === 0 && (
                                                    <p className="text-xs text-slate-400 italic">Nenhum contrato encontrado.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-none p-3 md:p-4 bg-white dark:bg-[#1a1d23] border-t border-slate-200 dark:border-slate-800 relative">
                            {isActionMenuOpen && (
                                <div className="absolute bottom-full left-4 mb-2 w-72 bg-white dark:bg-[#1a1d23] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 animate-in slide-in-from-bottom-2 duration-200 overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Documentos Rápidos</h4>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">Enviar para {activeConversation.userName}</p>
                                    </div>
                                    <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
                                        {userContracts.length > 0 ? (
                                            userContracts.map(c => (
                                                <div key={c.id} className="p-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg">
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 truncate">{c.propertyTitle}</p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleSendAttachment('contract', c)}
                                                            className="flex-1 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">edit_square</span> Assinatura
                                                        </button>
                                                        <button
                                                            onClick={() => handleSendAttachment('invoice', c)}
                                                            className="flex-1 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">payments</span> Fatura
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-6 text-center">
                                                <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">folder_off</span>
                                                <p className="text-xs text-slate-500">Nenhum contrato ativo para este usuário.</p>
                                            </div>
                                        )}
                                    </div>
                                    <button className="w-full py-3 text-[10px] font-bold text-slate-400 hover:text-rose-500 uppercase tracking-widest text-center border-t border-slate-100 dark:border-slate-800" onClick={() => setIsActionMenuOpen(false)}>Fechar</button>
                                </div>
                            )}

                            <form onSubmit={handleSend} className="flex items-center gap-2 md:gap-3 max-w-[1200px] mx-auto">
                                <button
                                    type="button"
                                    onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                                    className={`p-2 transition-all rounded-xl ${isActionMenuOpen ? 'bg-primary text-white scale-90' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                >
                                    <span className="material-symbols-outlined text-[26px]">add_circle</span>
                                </button>
                                <input
                                    type="text"
                                    className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary text-slate-900 dark:text-white placeholder:text-slate-400 shadow-inner transition-all"
                                    placeholder="Escreva sua mensagem..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={!replyText.trim()}
                                    className="p-4 bg-primary text-white rounded-2xl hover:bg-blue-600 disabled:opacity-50 transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined text-[24px]">send</span>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-[#0b0e14]">
                        <div className="size-24 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-6 shadow-sm border border-slate-100 dark:border-slate-800">
                            <span className="material-symbols-outlined text-5xl opacity-20 text-primary">forum</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Central de Mensagens</h3>
                        <p className="text-sm px-6 text-center max-w-sm text-slate-500 leading-relaxed">
                            Selecione qualquer usuário na lista ao lado para iniciar um atendimento, enviar contratos ou faturas.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatManagement;