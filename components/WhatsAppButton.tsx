import React, { useState } from 'react';

interface WhatsAppButtonProps {
    phoneNumber: string;
    propertyTitle?: string;
    propertyPrice?: string;
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({ phoneNumber, propertyTitle, propertyPrice }) => {
    const [isOpen, setIsOpen] = useState(false);

    const templates = [
        {
            id: 'interest',
            label: 'Tenho Interesse',
            icon: 'star',
            message: `Olá! Tenho interesse no imóvel: ${propertyTitle || 'Consultar'}. Gostaria de mais detalhes.`
        },
        {
            id: 'visit',
            label: 'Agendar Visita',
            icon: 'calendar_today',
            message: `Olá! Gostaria de agendar uma visita para o imóvel: ${propertyTitle || 'Consultar'}. Quais horários estão disponíveis?`
        },
        {
            id: 'question',
            label: 'Dúvida Rápida',
            icon: 'help_outline',
            message: `Olá! Tenho uma dúvida sobre o imóvel: ${propertyTitle || 'Consultar'}. Pode me ajudar?`
        }
    ];

    const handleSendMessage = (message: string) => {
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        setIsOpen(false);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
            {/* Menu de Templates */}
            {isOpen && (
                <div className="flex flex-col gap-2 mb-2 animate-in slide-in-from-bottom-4 duration-300">
                    {templates.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => handleSendMessage(t.message)}
                            className="px-4 py-2 bg-white dark:bg-[#1a1d23] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all transform hover:-translate-x-1"
                        >
                            <span className="material-symbols-outlined text-[18px] text-[#25D366]">{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                    <div className="p-3 bg-white dark:bg-[#1a1d23] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-[200px]">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Escanear QR Code</p>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://wa.me/' + phoneNumber)}`}
                            alt="QR Code WhatsApp"
                            className="w-full h-auto rounded-lg border border-slate-100"
                        />
                    </div>
                </div>
            )}

            {/* Botão Principal */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`group relative size-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 transform active:scale-90 ${isOpen ? 'bg-slate-900 rotate-90' : 'bg-[#25D366] hover:scale-110'}`}
            >
                <span className="material-symbols-outlined text-[28px]">
                    {isOpen ? 'close' : 'chat'}
                </span>

                {!isOpen && (
                    <span className="absolute right-full mr-4 px-3 py-1.5 bg-white text-slate-900 text-xs font-bold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Fale conosco no WhatsApp
                    </span>
                )}
            </button>
        </div>
    );
};

export default WhatsAppButton;
