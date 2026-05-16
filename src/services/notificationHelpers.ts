import { addNotification } from './dataService';

/**
 * Helper para criar notificações reais no Neon.
 * Todos os helpers aceitam o userId do destinatário.
 */

export const createContractNotification = async (
    userId: string,
    contractId: string | number,
    propertyTitle: string,
    type: 'created' | 'expiring' | 'signed'
) => {
    const configs = {
        created: {
            title: 'Novo Contrato Criado',
            message: `Um novo contrato foi criado para o imóvel "${propertyTitle}".`,
            priority: 'medium',
            icon: 'gavel'
        },
        expiring: {
            title: 'Contrato Próximo do Vencimento',
            message: `O contrato do imóvel "${propertyTitle}" vence em breve. Tome uma ação.`,
            priority: 'high',
            icon: 'schedule'
        },
        signed: {
            title: 'Contrato Assinado',
            message: `O contrato do imóvel "${propertyTitle}" foi assinado digitalmente.`,
            priority: 'high',
            icon: 'task_alt'
        }
    };
    const cfg = configs[type];
    await addNotification({
        userId,
        type: 'contract',
        title: cfg.title,
        message: cfg.message,
        icon: cfg.icon,
        priority: cfg.priority,
        actionUrl: `/contracts/${contractId}`,
    });

    // Send Email if it's a new contract or signed
    if (type === 'created' || type === 'signed') {
        // We'd need the user's email here. For now, we'll try to get it or skip if not available.
        // In a real scenario, you'd fetch the user's email from the DB first.
        console.log(`[Email] Preparando envio para contrato ${contractId} (${type})`);
        // Example API call (commented out until we have user email retrieval logic)
        /*
        fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: userEmail, 
                subject: cfg.title,
                html: `<p>${cfg.message}</p><a href="${window.location.origin}/contracts/${contractId}">Ver Contrato</a>`
            })
        });
        */
    }
};

export const createPaymentNotification = async (
    userId: string,
    amount: number,
    propertyTitle: string
) => {
    await addNotification({
        userId,
        type: 'payment',
        title: 'Pagamento Recebido',
        message: `Pagamento de R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} recebido para "${propertyTitle}".`,
        icon: 'payments',
        priority: 'medium',
    });
};

export const createPropertyNotification = async (
    userId: string,
    propertyTitle: string,
    action: 'created' | 'sold' | 'rented' | 'view_milestone'
) => {
    const configs = {
        created: { title: 'Imóvel Cadastrado', message: `"${propertyTitle}" foi publicado com sucesso.`, icon: 'add_home', priority: 'low' },
        sold: { title: 'Imóvel Vendido! 🎉', message: `"${propertyTitle}" foi vendido com sucesso!`, icon: 'home', priority: 'high' },
        rented: { title: 'Imóvel Alugado', message: `"${propertyTitle}" foi alugado.`, icon: 'vpn_key', priority: 'medium' },
        view_milestone: { title: '100 Visualizações!', message: `"${propertyTitle}" atingiu 100 visualizações.`, icon: 'trending_up', priority: 'low' },
    };
    const cfg = configs[action];
    await addNotification({ userId, type: 'property', ...cfg });
};

export const createSystemNotification = async (
    userId: string,
    title: string,
    message: string
) => {
    await addNotification({ userId, type: 'system', title, message, icon: 'info', priority: 'low' });
};
