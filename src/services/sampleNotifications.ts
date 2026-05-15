import {
    createContractNotification,
    createPropertyNotification,
    createLeadNotification,
    createPaymentNotification,
    createSystemNotification
} from '../src/services/notificationHelpers';

/**
 * Gera notificações de exemplo para demonstração
 */
export const generateSampleNotifications = async () => {
    // Notificação de novo contrato
    await createContractNotification(
        'demo-001',
        'Apartamento Jardins - 3 Quartos',
        'created'
    );

    // Notificação de contrato expirando
    setTimeout(async () => {
        await createContractNotification(
            'demo-002',
            'Casa Vila Mariana - 4 Quartos',
            'expiring'
        );
    }, 500);

    // Notificação de pagamento
    setTimeout(async () => {
        await createPaymentNotification(
            3500.00,
            'Cobertura Moema - Duplex'
        );
    }, 1000);

    // Notificação de novo lead
    setTimeout(async () => {
        await createLeadNotification(
            'Maria Silva',
            'Studio Centro - Mobiliado'
        );
    }, 1500);

    // Notificação de novo imóvel
    setTimeout(async () => {
        await createPropertyNotification(
            'Loft Pinheiros - Reformado',
            'created'
        );
    }, 2000);

    // Notificação de sistema
    setTimeout(async () => {
        await createSystemNotification(
            'Backup Concluído',
            'Backup automático dos dados foi realizado com sucesso às 22:00.'
        );
    }, 2500);

    console.log('✅ 6 notificações de exemplo criadas!');
};
