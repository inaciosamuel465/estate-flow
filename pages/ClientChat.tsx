import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../src/types';

interface ClientChatProps {
  propertyTitle: string;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

const ClientChat: React.FC<ClientChatProps> = ({ propertyTitle, onClose, messages, onSendMessage }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col animate-in slide-in-from-bottom-5 duration-300">
      {/* Chat Header */}
      <div className="bg-primary p-4 rounded-t-2xl flex justify-between items-center text-white">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="size-10 bg-white rounded-full p-0.5">
              <img src="https://picsum.photos/100/100?random=50" className="w-full h-full rounded-full object-cover" />
            </div>
            <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-primary rounded-full"></div>
          </div>
          <div>
            <h3 className="font-bold text-sm">Atendimento Online</h3>
            <p className="text-xs text-blue-100">Fale com um consultor</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Info Bar */}
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="truncate max-w-[200px] font-medium text-slate-700">Interesse: {propertyTitle}</span>
        <span className="flex items-center gap-1"><span className="size-1.5 bg-green-500 rounded-full"></span> Aguardando Atendente</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${msg.sender === 'user'
              ? 'bg-primary text-white rounded-tr-none'
              : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
              }`}>
              <p>{msg.text}</p>

              {msg.attachment && (
                <div className={`mt-3 p-3 rounded-xl border flex flex-col gap-3 ${msg.sender === 'user' ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-lg flex items-center justify-center ${msg.attachment.type === 'contract' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                      <span className="material-symbols-outlined">
                        {msg.attachment.type === 'contract' ? 'description' : 'receipt_long'}
                      </span>
                    </div>
                    <div>
                      <p className={`font-bold text-xs ${msg.sender === 'user' ? 'text-white' : 'text-slate-800'}`}>{msg.attachment.title}</p>
                      <p className={`text-[10px] ${msg.sender === 'user' ? 'text-blue-100' : 'text-slate-500'}`}>{msg.attachment.type === 'contract' ? 'Contrato disponível para assinar' : 'Nova fatura mensal'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      window.location.hash = '#juridico'; // Simulation of navigation
                      alert("Redirecionando para seu Portal do Cliente > Jurídico...");
                    }}
                    className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${msg.sender === 'user' ? 'bg-white text-primary hover:bg-white/90' : 'bg-primary text-white hover:bg-blue-600'}`}
                  >
                    Abrir no Portal
                  </button>
                </div>
              )}

              <span className={`text-[10px] block mt-1 text-right ${msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>{msg.time}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-slate-200 bg-white rounded-b-2xl">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary text-slate-900"
            placeholder="Digite sua mensagem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2.5 bg-primary text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClientChat;