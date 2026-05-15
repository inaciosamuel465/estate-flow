import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Contract, User } from '../src/types';
import SignaturePad from '../components/SignaturePad';
import { generateContractPDF } from '../src/services/pdfService';

interface LegalChatProps {
    contract: Contract;
    currentUser: User;
    messages: ChatMessage[];
    onSendMessage: (text: string, sender: 'user' | 'agent', attachment?: ChatMessage['attachment']) => void;
    onSignContract: (contractId: number | string, signatureImage: string) => void;
    onClose: () => void;
}

const LegalChat: React.FC<LegalChatProps> = ({
    contract,
    currentUser,
    messages,
    onSendMessage,
    onSignContract,
    onClose
}) => {
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [replyText, setReplyText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        onSendMessage(replyText, currentUser.role === 'admin' ? 'agent' : 'user');
        setReplyText('');
    };

    const handleSignatureSave = (image: string) => {
        onSignContract(contract.id, image);
        setShowSignaturePad(false);
        const role = currentUser.role === 'admin' ? 'Agent' : 'Cliente';
        onSendMessage(`[ASSINATURA REGISTRADA] O ${role} assinou digitalmente o contrato às ${new Date().toLocaleString()}.`, currentUser.role === 'admin' ? 'agent' : 'user');
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60] flex items-center justify-end md:p-6">
            <div className="bg-white dark:bg-[#0f1115] w-full max-w-2xl h-full md:h-[90vh] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="p-4 md:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors md:hidden">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-[32px]">gavel</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">Canal Jurídico</h3>
                            <p className="text-xs text-blue-200 font-medium">Contrato: {contract.propertyTitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="hidden md:flex p-2 hover:bg-white/10 rounded-full transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Contract Summary Bar */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${contract.signatureStatus === 'signed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {contract.signatureStatus === 'signed' ? 'Assinado' : 'Pendente de Assinatura'}
                        </span>
                        <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700"></div>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">ID: #{contract.id}</p>
                    </div>

                    {/* Signed Rubric Display */}
                    {contract.signatureStatus === 'signed' && contract.signatureImage && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 px-6 py-3 border-b border-emerald-100 dark:border-emerald-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-emerald-600">verified</span>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Documento Assinado</p>
                                    <p className="text-[9px] text-emerald-600/70 font-mono italic">Hash: {btoa(contract.signedAt || '').substring(0, 16)}...</p>
                                </div>
                            </div>
                            <div className="bg-white p-1 rounded border border-emerald-200 shadow-sm">
                                <img src={contract.signatureImage} alt="Assinatura" className="h-8 grayscale contrast-125" />
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => {
                            const prop = { title: contract.propertyTitle, type: contract.type, location: 'Ver contrato', area: 0, beds: 0, baths: 0, image: '' } as any;
                            const tenant = { name: contract.clientName, email: '' } as any;
                            const owner = { name: contract.ownerName, email: '' } as any;
                            generateContractPDF(contract, prop, tenant, owner);
                        }}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-[16px]">visibility</span> Baixar PDF Completo
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
                    {messages.length === 0 && (
                        <div className="text-center py-12">
                            <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <span className="material-symbols-outlined text-3xl">chat</span>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white">Inicie a conversa jurídica</h4>
                            <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">Tire suas dúvidas sobre as cláusulas ou solicite ajustes antes de assinar.</p>
                        </div>
                    )}

                    {messages.map((msg) => {
                        const isAgent = msg.sender === 'agent';
                        const isMe = (currentUser.role === 'admin' && isAgent) || (currentUser.role !== 'admin' && !isAgent);

                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`
                                    max-w-[85%] p-4 rounded-2xl shadow-sm text-sm relative
                                    ${isMe
                                        ? 'bg-primary text-white rounded-tr-none'
                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'}
                                `}>
                                    <p className="leading-relaxed">{msg.text}</p>

                                    {/* Attachment Preview (Contract) */}
                                    {msg.attachment && msg.attachment.type === 'contract' && (
                                        <div className={`mt-3 p-3 rounded-xl border flex items-center gap-3 ${isMe ? 'bg-white/10 border-white/20' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                                            <div className="size-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
                                                <span className="material-symbols-outlined">description</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-xs font-bold truncate ${isMe ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{msg.attachment.title}</p>
                                                <p className={`text-[10px] ${isMe ? 'text-blue-100' : 'text-slate-500'}`}>ID: #{msg.attachment.id}</p>
                                            </div>
                                            <button
                                                onClick={() => alert("Simulação: Abrindo visualização detalhada do contrato...")}
                                                className={`p-2 rounded-lg transition-colors ${isMe ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400'}`}
                                            >
                                                <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                                            </button>
                                        </div>
                                    )}

                                    <div className={`flex items-center justify-end gap-1 mt-2 text-[10px] ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                        <span>{msg.time}</span>
                                        {isMe && <span className="material-symbols-outlined text-[14px]">done_all</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Action Footer */}
                <div className="p-4 md:p-6 bg-white dark:bg-[#0f1115] border-t border-slate-200 dark:border-slate-800 shrink-0">
                    {contract.signatureStatus === 'pending' && currentUser.role !== 'admin' && (
                        <div className="mb-4">
                            <button
                                onClick={() => setShowSignaturePad(true)}
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                            >
                                <span className="material-symbols-outlined text-[24px]">verified</span>
                                Assinar Contrato Agora
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSend} className="flex items-center gap-3">
                        <input
                            type="text"
                            className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary text-slate-900 dark:text-white placeholder:text-slate-400"
                            placeholder="Tire suas dúvidas jurídicas aqui..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={!replyText.trim()}
                            className="p-4 bg-primary text-white rounded-2xl hover:bg-blue-600 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
                        >
                            <span className="material-symbols-outlined text-[24px]">send</span>
                        </button>
                    </form>
                </div>
            </div>

            {showSignaturePad && (
                <SignaturePad
                    onSave={handleSignatureSave}
                    onCancel={() => setShowSignaturePad(false)}
                />
            )}
        </div>
    );
};

export default LegalChat;
