import React from 'react';

interface PaymentResultProps {
  status: 'success' | 'failure' | 'pending';
  planName?: string;
  amount?: number;
  paymentMethod?: string;
  onGoHome?: () => void;
  onRetry?: () => void;
}

const PaymentResult: React.FC<PaymentResultProps> = ({ status, planName = 'Mensal', amount, paymentMethod, onGoHome, onRetry }) => {
  const config = {
    success: {
      icon: 'check_circle',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      iconColor: 'text-emerald-600',
      title: 'Pagamento Confirmado!',
      desc: 'Sua assinatura foi ativada. Aproveite todos os recursos.',
      btn: 'Ir para o Sistema',
      btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    failure: {
      icon: 'cancel',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      iconColor: 'text-rose-500',
      title: 'Pagamento nao aprovado',
      desc: 'Tente novamente com outra forma de pagamento.',
      btn: 'Tentar Novamente',
      btnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
    pending: {
      icon: 'hourglass_top',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconColor: 'text-amber-500',
      title: 'Pagamento Pendente',
      desc: 'Aguardando confirmacao. Assim que aprovado, sua assinatura sera ativada.',
      btn: 'Voltar',
      btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
  };

  const c = config[status];

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center pt-24 px-6">
      <div className="max-w-sm w-full text-center">
        <div className={`${c.bg} ${c.border} border rounded-3xl p-10 shadow-sm`}>
          <div className={`size-16 ${c.iconColor} bg-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm border ${c.border}`}>
            <span className={`material-symbols-outlined text-4xl ${c.iconColor}`}>{c.icon}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">{c.title}</h1>
          <p className="text-sm text-slate-500 mb-6">{c.desc}</p>

          {status === 'success' && amount && (
            <div className="bg-white rounded-xl p-4 mb-6 border border-slate-100 text-left">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Plano</span>
                <span className="font-bold text-slate-800">{planName}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Valor</span>
                <span className="font-bold text-slate-800">R$ {amount.toFixed(2)}</span>
              </div>
              {paymentMethod && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Pagamento</span>
                  <span className="font-bold text-slate-800 capitalize">{paymentMethod}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={status === 'failure' ? onRetry : onGoHome}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm ${c.btnClass}`}
          >
            {status === 'failure' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">refresh</span>
                {c.btn}
              </span>
            ) : c.btn}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;
