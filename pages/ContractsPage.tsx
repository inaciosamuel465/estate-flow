import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Contract, Property, User } from '../src/types';
import { addContract, deleteContract, updateContract } from '../src/services/dataService';
import { generateContractPDF } from '../src/services/pdfService';
import SignaturePad from '../components/SignaturePad';

// --- Dados da Imobiliária (dinâmico via settings) ---
const getAgencyInfo = (settings?: Record<string, string>) => ({
    name: settings?.companyName || "EstateFlow Negócios Imobiliários Ltda.",
    stampUrl: settings?.agencyStampUrl || '',
    stampName: settings?.agencyStampName || settings?.companyName || "EstateFlow Negócios Imobiliários Ltda.",
    cnpj: settings?.agencyCnpj || "12.345.678/0001-90",
    creci: settings?.agencyCreci || "J-12345",
    address: settings?.address || "Av. Paulista, 1000, 15º Andar - Jardins, São Paulo - SP",
    phone: settings?.contactPhone || "(11) 3000-0000",
    email: settings?.contactEmail || "juridico@estateflow.com",
    logo: settings?.logoUrl || ""
});

// --- Templates Jurídicos Detalhados ---
const CONTRACT_TEMPLATES = {
    rent_residential: {
        id: 'rent_residential',
        title: 'Locação Residencial (Administração)',
        desc: 'Contrato completo entre Locador (via Imobiliária) e Locatário.',
        content: `CLÁUSULA PRIMEIRA - DAS PARTES:
De um lado, devidamente qualificado no sistema, doravante denominado LOCADOR, neste ato representado por sua administradora {{AGENCY_NAME}}, pessoa jurídica de direito privado, inscrita no CNPJ sob nº {{AGENCY_CNPJ}}, com sede em {{AGENCY_ADDRESS}}, CRECI {{AGENCY_CRECI}}.
De outro lado, {{CLIENT_NAME}}, portador(a) do CPF/CNPJ nº {{CLIENT_DOC}}, doravante denominado LOCATÁRIO.

CLÁUSULA SEGUNDA - DO OBJETO:
O presente contrato tem como objeto a locação do imóvel residencial situado à {{PROPERTY_ADDR}}, de propriedade do LOCADOR, para fins exclusivamente residenciais.

CLÁUSULA TERCEIRA - DO PRAZO:
A locação terá vigência de 30 (trinta) meses, iniciando-se em {{START_DATE}} e terminando em {{END_DATE}}, data em que o LOCATÁRIO se obriga a restituir o imóvel inteiramente livre e desocupado, nas mesmas condições de habitabilidade em que o recebeu.

CLÁUSULA QUARTA - DO VALOR E PAGAMENTO:
O aluguel mensal livremente convencionado é de R$ {{VALUE}} ({{VALUE_EXTENSO}}), devendo ser pago até o dia {{DUE_DAY}} de cada mês subsequente ao vencido, diretamente à ADMINISTRADORA ou através de boleto bancário por ela emitido.
Parágrafo Primeiro: O aluguel será reajustado anualmente pelo índice IGPM-FGV ou outro que venha a substituí-lo.

CLÁUSULA QUINTA - DOS ENCARGOS:
Além do aluguel, o LOCATÁRIO pagará todos os impostos e taxas que recaiam ou venham a recair sobre o imóvel, seguro contra incêndio, despesas de condomínio, consumo de água, luz, gás e esgoto.

CLÁUSULA SEXTA - DA CONSERVAÇÃO:
O LOCATÁRIO declara ter vistoriado o imóvel, recebendo-o em perfeito estado de conservação e limpeza, obrigando-se a mantê-lo e restituí-lo nas mesmas condições (salvo deterioração decorrente do uso normal), conforme Laudo de Vistoria anexo.

CLÁUSULA SÉTIMA - DA MULTA:
Fica estipulada a multa contratual equivalente a 03 (três) aluguéis vigentes à época da infração, a ser aplicada à parte que infringir qualquer cláusula deste contrato, cobrada proporcionalmente ao tempo restante do contrato.

CLÁUSULA OITAVA - DO FORO:
As partes elegem o foro da Comarca de {{PROPERTY_CITY}} para dirimir quaisquer dúvidas oriundas deste contrato, renunciando a qualquer outro por mais privilegiado que seja.`
    },
    sale_cash: {
        id: 'sale_cash',
        title: 'Compromisso de Compra e Venda',
        desc: 'Instrumento particular com intermediação da Imobiliária.',
        content: `CLÁUSULA PRIMEIRA - VENDEDOR(ES):
{{OWNER_NAME}}, inscrito no CPF/CNPJ sob nº {{OWNER_DOC}}, legítimo proprietário do imóvel objeto deste instrumento.

CLÁUSULA SEGUNDA - COMPRADOR(ES):
{{CLIENT_NAME}}, inscrito no CPF/CNPJ sob nº {{CLIENT_DOC}}.

CLÁUSULA TERCEIRA - DA INTERMEDIAÇÃO:
O presente negócio é realizado com a intermediação exclusiva da {{AGENCY_NAME}}, CRECI {{AGENCY_CRECI}}, que aproximou as partes e prestou a devida assessoria imobiliária.

CLÁUSULA QUARTA - DO IMÓVEL:
O objeto deste contrato é a venda do imóvel localizado à {{PROPERTY_ADDR}}, livre e desembaraçado de quaisquer ônus reais, judiciais ou extrajudiciais.

CLÁUSULA QUINTA - DO PREÇO E CONDIÇÕES:
O preço certo e ajustado para a venda é de R$ {{VALUE}} ({{VALUE_EXTENSO}}), a ser pago da seguinte forma:
a) Pagamento integral à vista na data da assinatura deste contrato, ou
b) Conforme cronograma de parcelamento anexo, se houver.

CLÁUSULA SEXTA - DA POSSE E ESCRITURA:
A posse do imóvel será transmitida ao COMPRADOR na data da quitação integral do preço. A Escritura Definitiva será outorgada em Cartório de Notas escolhido pelo COMPRADOR, correndo por conta deste todas as despesas de transmissão (ITBI, emolumentos e registros).

CLÁUSULA SÉTIMA - DA IRREVOGABILIDADE:
O presente instrumento é celebrado em caráter irrevogável e irretratável, obrigando as partes, seus herdeiros e sucessores.

CLÁUSULA OITAVA - DA COMISSÃO:
O VENDEDOR reconhece ser devida à INTERMEDIADORA a comissão de corretagem pactuada, a ser paga no ato do recebimento do sinal ou valor à vista.`
    },
    admin_service: {
        id: 'admin_service',
        title: 'Contrato de Administração (Proprietário)',
        desc: 'Contrato entre Proprietário e Imobiliária.',
        content: `CLÁUSULA PRIMEIRA - DAS PARTES:
CONTRATANTE (PROPRIETÁRIO): {{OWNER_NAME}}, CPF/CNPJ {{OWNER_DOC}}.
CONTRATADA (ADMINISTRADORA): {{AGENCY_NAME}}, CNPJ {{AGENCY_CNPJ}}, CRECI {{AGENCY_CRECI}}.

CLÁUSULA SEGUNDA - DO OBJETO:
O CONTRATANTE entrega à CONTRATADA, para fins de administração e locação, o imóvel de sua propriedade situado à {{PROPERTY_ADDR}}.

CLÁUSULA TERCEIRA - DOS SERVIÇOS:
A CONTRATADA compromete-se a:
a) Promover a divulgação do imóvel em seus canais de marketing;
b) Selecionar pretendentes à locação, exigindo garantias compatíveis;
c) Elaborar contratos de locação e laudos de vistoria;
d) Cobrar e receber aluguéis, repassando ao CONTRATANTE após dedução das taxas pactuadas.

CLÁUSULA QUARTA - DA TAXA DE ADMINISTRAÇÃO:
Pelos serviços prestados, a CONTRATADA fará jus a:
a) Uma taxa de intermediação no valor do primeiro aluguel integral;
b) Uma taxa de administração mensal de {{COMMISSION_RATE}}% sobre o valor do aluguel e encargos recebidos.

CLÁUSULA QUINTA - DA VIGÊNCIA:
O presente contrato vigorará pelo prazo de 12 (doze) meses, renovando-se automaticamente por iguais períodos, salvo manifestação em contrário por escrito com 30 dias de antecedência.

CLÁUSULA SEXTA - DA EXCLUSIVIDADE:
O CONTRATANTE concede à CONTRATADA exclusividade na promoção do imóvel pelo prazo de 90 dias a contar da assinatura deste.`
    }
};

interface ContractsPageProps {
    contracts: Contract[];
    properties: Property[];
    users: User[];
    settings?: Record<string, string>;
    onAddContract: (c: Contract) => void;
    onDeleteContract: (id: number | string) => void;
    onUpdateContract: (id: number | string, data: Partial<Contract>) => void;
}

const ContractsPage: React.FC<ContractsPageProps> = ({ contracts, properties, users, settings, onAddContract, onDeleteContract, onUpdateContract }) => {
    const AGENCY = useMemo(() => getAgencyInfo(settings), [settings]);

    // --- States ---
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'view'>('list');
    const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid');
    const [filter, setFilter] = useState<'all' | 'expiring' | 'rent' | 'sale'>('all');
    const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);

    // Get templates from settings or use defaults
    const dynamicTemplates = useMemo(() => {
        if (settings?.contractTemplates) {
            try {
                const parsed = typeof settings.contractTemplates === 'string' 
                    ? JSON.parse(settings.contractTemplates) 
                    : settings.contractTemplates;
                
                const obj: Record<string, any> = {};
                if (Array.isArray(parsed)) {
                    parsed.forEach((t: any) => {
                        obj[t.id] = { ...t, desc: 'Modelo personalizado das configurações' };
                    });
                    return obj;
                }
            } catch (e) {
                console.error("Error parsing contractTemplates in ContractsPage", e);
            }
        }
        return CONTRACT_TEMPLATES;
    }, [settings]);

    // Create Mode States
    const [selectedTemplate, setSelectedTemplate] = useState<string>('rent_residential');
    const [creationStep, setCreationStep] = useState<'form' | 'preview'>('form');
    const [formData, setFormData] = useState({
        propertyId: '',
        clientId: '',
        ownerId: '',
        value: '',
        startDate: '',
        endDate: '',
        dueDay: '5',
        commissionRate: '10'
    });

    // View/Edit Mode States
    const [viewingContract, setViewingContract] = useState<Contract | null>(null);
    const [editingContract, setEditingContract] = useState<Contract | null>(null);
    const [generatedBody, setGeneratedBody] = useState(''); 
    const [isEditingText, setIsEditingText] = useState(false);
    const [currentText, setCurrentText] = useState('');
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

    // --- Helpers ---

    const calculateDaysLeft = (dateString?: string) => {
        if (!dateString) return 999;
        const end = new Date(dateString);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Filter Logic
    const filteredContracts = useMemo(() => {
        return contracts.filter(c => {
            if (filter === 'all') return true;
            if (filter === 'rent') return c.type === 'rent';
            if (filter === 'sale') return c.type === 'sale';
            if (filter === 'expiring') {
                const days = calculateDaysLeft(c.endDate);
                return days <= 30 && days >= 0;
            }
            return true;
        });
    }, [contracts, filter]);

    const expiringCount = contracts.filter(c => {
        const days = calculateDaysLeft(c.endDate);
        return days <= 30 && days >= 0;
    }).length;

    // --- Actions ---

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (creationStep === 'form') {
            const prop = properties.find(p => p.id.toString() === formData.propertyId);
            const cli = users.find(u => u.id.toString() === formData.clientId);
            const own = users.find(u => u.id.toString() === formData.ownerId);

            if (!prop || !cli || !own) {
                alert("Dados inválidos. Verifique as seleções.");
                return;
            }

            // Mock contract for generation
            const mockContract: Partial<Contract> = {
                propertyId: prop.id,
                propertyTitle: prop.title,
                type: selectedTemplate === 'sale_cash' ? 'sale' : 'rent',
                clientId: cli.id,
                clientName: cli.name,
                ownerId: own.id,
                ownerName: own.name,
                value: parseFloat(formData.value),
                commissionRate: parseFloat(formData.commissionRate),
                dueDay: parseInt(formData.dueDay),
                startDate: formData.startDate,
                endDate: formData.endDate,
                templateType: selectedTemplate as any,
            };

            const body = generateDocumentBody(mockContract as Contract);
            setCurrentText(body);
            setCreationStep('preview');
            return;
        }

        // Step is 'preview' -> Save
        const prop = properties.find(p => p.id.toString() === formData.propertyId);
        const cli = users.find(u => u.id.toString() === formData.clientId);
        const own = users.find(u => u.id.toString() === formData.ownerId);

        if (!prop || !cli || !own) return;

        const contractData: Partial<Contract> = {
            propertyId: prop.id,
            propertyTitle: prop.title,
            propertyImage: prop.image,
            type: selectedTemplate === 'sale_cash' ? 'sale' : 'rent',
            clientId: cli.id,
            clientName: cli.name,
            clientPhone: cli.phone || '',
            ownerId: own.id,
            ownerName: own.name,
            ownerPhone: own.phone || '',
            value: parseFloat(formData.value),
            commissionRate: parseFloat(formData.commissionRate),
            dueDay: parseInt(formData.dueDay),
            startDate: formData.startDate,
            endDate: formData.endDate,
            templateType: selectedTemplate as any,
            customContent: currentText // Final edited content
        };

        if (editingContract) {
            onUpdateContract(editingContract.id, contractData);
            alert("Contrato atualizado com sucesso!");
        } else {
            const newContract: Contract = {
                id: Date.now(),
                status: 'active',
                nextPaymentStatus: 'pending',
                signatureStatus: 'pending',
                ...(contractData as any)
            };
            onAddContract(newContract);
            alert("Contrato gerado com sucesso!");
        }

        setViewMode('list');
        setCreationStep('form');
        setEditingContract(null);
        setFormData({ propertyId: '', clientId: '', ownerId: '', value: '', startDate: '', endDate: '', dueDay: '5', commissionRate: '10' });
    };

    const handleDelete = (id: number | string) => {
        if (confirm("Tem certeza que deseja excluir este contrato? Esta ação é irreversível.")) {
            onDeleteContract(id);
        }
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

    const handleBulkDelete = () => {
        if (!confirm(`Tem certeza que deseja excluir ${selectedIds.length} contratos?`)) return;
        selectedIds.forEach(id => onDeleteContract(id));
        setSelectedIds([]);
    };

    const generateDocumentBody = (contract: Contract) => {
        const template = dynamicTemplates[contract.templateType || 'rent_residential'];
        if (!template) return "Template não encontrado.";

        const owner = users.find(u => u.id === contract.ownerId);
        const client = users.find(u => u.id === contract.clientId);
        const property = properties.find(p => p.id === contract.propertyId);

        let text = template.content;

        const replacements: Record<string, string> = {
            '{{AGENCY_NAME}}': AGENCY.name,
            '{{AGENCY_CNPJ}}': AGENCY.cnpj,
            '{{AGENCY_CRECI}}': AGENCY.creci,
            '{{AGENCY_ADDRESS}}': AGENCY.address,

            '{{OWNER_NAME}}': contract.ownerName.toUpperCase(),
            '{{OWNER_DOC}}': owner?.document || '000.000.000-00',

            '{{CLIENT_NAME}}': contract.clientName.toUpperCase(),
            '{{CLIENT_DOC}}': client?.document || '000.000.000-00',
            '{{CLIENT_ADDR}}': client?.address || 'Endereço não informado',

            '{{PROPERTY_ADDR}}': property ? `${property.location} - ${property.title}` : 'Endereço do Imóvel',
            '{{PROPERTY_CITY}}': property?.location.split(',')[1]?.trim() || 'São Paulo',

            '{{VALUE}}': contract.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            '{{VALUE_EXTENSO}}': 'valor pactuado', 

            '{{START_DATE}}': new Date(contract.startDate).toLocaleDateString('pt-BR'),
            '{{END_DATE}}': contract.endDate ? new Date(contract.endDate).toLocaleDateString('pt-BR') : 'Indeterminado',
            '{{DUE_DAY}}': contract.dueDay.toString(),
            '{{COMMISSION_RATE}}': contract.commissionRate.toString(),
            '{{DAYS_COUNT}}': contract.endDate ? Math.ceil((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / (1000 * 60 * 60 * 24)).toString() : '0'
        };

        Object.keys(replacements).forEach(key => {
            text = text.replace(new RegExp(key, 'g'), replacements[key]);
        });

        return text;
    };

    const handleViewContract = (contract: Contract) => {
        setViewingContract(contract);
        const bodyText = contract.customContent || generateDocumentBody(contract);
        setGeneratedBody(bodyText);
        setCurrentText(bodyText);
        setIsEditingText(false);
        setViewMode('view');
    };

    const handleDownloadPDF = async (contract: Contract) => {
        const property = properties.find(p => p.id === contract.propertyId);
        const tenant = users.find(u => u.id === contract.clientId);
        const owner = users.find(u => u.id === contract.ownerId);

        if (!property || !tenant || !owner) {
            alert('Dados incompletos para gerar o PDF.');
            return;
        }

        await generateContractPDF(contract, property, tenant, owner, contract.customContent || generateDocumentBody(contract), AGENCY.logo, AGENCY.name, AGENCY.cnpj, AGENCY.creci, AGENCY.address, AGENCY.stampUrl, AGENCY.stampName);
    };

    const handleEditContract = (contract: Contract) => {
        setEditingContract(contract);
        setSelectedTemplate(contract.templateType as any || 'rent_residential');
        setFormData({
            propertyId: String(contract.propertyId),
            clientId: String(contract.clientId),
            ownerId: String(contract.ownerId),
            value: String(contract.value),
            startDate: contract.startDate,
            endDate: contract.endDate || '',
            dueDay: String(contract.dueDay),
            commissionRate: String(contract.commissionRate)
        });
        setViewMode('create');
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSaveEdit = () => {
        if (viewingContract) {
            onUpdateContract(viewingContract.id, { customContent: currentText });
            setViewingContract({ ...viewingContract, customContent: currentText });
            alert("Conteúdo do contrato salvo com sucesso!");
        }
        setGeneratedBody(currentText);
        setIsEditingText(false);
    };

    const [isSendingEmail, setIsSendingEmail] = useState(false);

    const handleSignatureSave = (dataUrl: string) => {
        if (!viewingContract) return;
        
        onUpdateContract(viewingContract.id, {
            signatureStatus: 'signed',
            signatureImage: dataUrl,
            signedAt: new Date().toISOString(),
            status: 'active'
        });
        
        setViewingContract({ 
            ...viewingContract, 
            signatureStatus: 'signed', 
            signatureImage: dataUrl,
            status: 'active' 
        });
        
        setIsSignatureModalOpen(false);
        alert("Contrato assinado digitalmente com sucesso!");
    };

    const handleSendForSignature = async () => {
        if (!viewingContract) return;
        setIsSendingEmail(true);
        try {
            const baseUrl = settings?.appUrl || import.meta.env.VITE_APP_URL || window.location.origin;
            const contractUrl = `${baseUrl}/contrato/${viewingContract.id}`;
            const client = users.find(u => u.id === viewingContract.clientId);
            const to = client?.email;
            if (!to) {
                alert('Cliente não possui email cadastrado.');
                setIsSendingEmail(false);
                return;
            }
            const res = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to,
                    subject: `Contrato ${viewingContract.propertyTitle} - EstateFlow - Pendente de Assinatura`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="text-align: center; padding: 30px 0;">
                                ${AGENCY.logo ? `<img src="${AGENCY.logo}" style="height: 60px; object-fit: contain;" />` : ''}
                                <h1 style="color: #1e293b; margin-top: 16px;">Contato para Assinatura</h1>
                            </div>
                            <p style="font-size: 16px; color: #475569;">Olá <strong>${viewingContract.clientName}</strong>,</p>
                            <p style="font-size: 16px; color: #475569;">A <strong>${AGENCY.name}</strong> disponibilizou para você o contrato referente ao imóvel <strong>${viewingContract.propertyTitle}</strong>.</p>
                            <p style="font-size: 16px; color: #475569;">Clique no botão abaixo para ler, assinar digitalmente e baixar o documento.</p>
                            <div style="text-align: center; padding: 30px 0;">
                                <a href="${contractUrl}" style="display: inline-block; background: #2b6cee; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">Acessar Contrato</a>
                            </div>
                            <p style="font-size: 14px; color: #94a3b8;">Se o botão não funcionar, copie e cole o link abaixo no navegador:</p>
                            <p style="font-size: 14px; color: #2b6cee; word-break: break-all;">${contractUrl}</p>
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                            <p style="font-size: 12px; color: #94a3b8;">Este é um email automático do EstateFlow Suite. Por favor não responda.</p>
                        </div>
                    `
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Link de assinatura enviado para ${to}!`);
            } else {
                alert('Erro ao enviar email. Verifique as configurações de SMTP.');
            }
        } catch (e) {
            console.error('Erro ao enviar email:', e);
            alert('Erro de conexão ao enviar email.');
        } finally {
            setIsSendingEmail(false);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display h-full flex flex-col overflow-hidden relative">
            <style>{`
                @media print {
                    body { background: white !important; }
                    .no-print { display: none !important; }
                    #printable-area { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%;
                        height: auto;
                        display: block !important;
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .contract-page {
                        box-shadow: none !important;
                        margin: 0 !important;
                        border: none !important;
                        page-break-after: always !important;
                        display: flex !important;
                        flex-direction: column !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        transform: none !important;
                        zoom: 1 !important;
                    }
                    @page { 
                        size: A4; 
                        margin: 10mm;
                    }
                    h1, h2, p, div { color: black !important; }
                }
                .contract-page {
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    transition: transform 0.3s ease;
                }
            `}</style>

            {/* Header */}
            <header className="flex-none bg-surface-light dark:bg-[#111318] border-b border-slate-200 dark:border-slate-800 px-6 py-4 no-print">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[1600px] mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">gavel</span> Gestão Jurídica
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Emissão e controle de contratos oficiais.</p>
                    </div>
                    <div className="flex gap-3">
                        {viewMode === 'list' ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center bg-slate-100 dark:bg-[#111318] rounded-lg p-1 border border-slate-200 dark:border-slate-800">
                                    <button
                                        onClick={() => setLayoutMode('grid')}
                                        className={`p-1.5 rounded-md transition-all ${layoutMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">grid_view</span>
                                    </button>
                                    <button
                                        onClick={() => setLayoutMode('table')}
                                        className={`p-1.5 rounded-md transition-all ${layoutMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">table_rows</span>
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingContract(null);
                                        setFormData({ propertyId: '', clientId: '', ownerId: '', value: '', startDate: '', endDate: '', dueDay: '5', commissionRate: '10' });
                                        setViewMode('create');
                                    }}
                                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-primary/20"
                                >
                                    <span className="material-symbols-outlined text-[20px]">add_circle</span> Novo Contrato
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setViewMode('list')}
                                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-white px-4 py-2 rounded-lg font-bold text-sm"
                            >
                                <span className="material-symbols-outlined text-[20px]">arrow_back</span> Voltar à Lista
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100 dark:bg-black/20">
                <div className="max-w-[1600px] mx-auto flex flex-col gap-8">

                    {viewMode === 'list' && (
                        <>
                            {/* Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-[#1a1d23] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Contratos Ativos</p>
                                        <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{contracts.filter(c => c.status === 'active').length}</p>
                                    </div>
                                    <div className="size-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg flex items-center justify-center">
                                        <span className="material-symbols-outlined">folder_shared</span>
                                    </div>
                                </div>
                                <div className={`bg-white dark:bg-[#1a1d23] p-5 rounded-xl border shadow-sm flex items-center justify-between ${expiringCount > 0 ? 'border-amber-500 ring-1 ring-amber-500/20' : 'border-slate-200 dark:border-slate-800'}`}>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Renovação Pendente</p>
                                        <p className={`text-2xl font-bold mt-1 ${expiringCount > 0 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>{expiringCount}</p>
                                    </div>
                                    <div className={`size-10 rounded-lg flex items-center justify-center ${expiringCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                                        <span className="material-symbols-outlined">alarm</span>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-[#1a1d23] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Pendentes Assinatura</p>
                                        <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{contracts.filter(c => c.signatureStatus === 'pending').length}</p>
                                    </div>
                                    <div className="size-10 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg flex items-center justify-center">
                                        <span className="material-symbols-outlined">ink_pen</span>
                                    </div>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
                                {[
                                    { id: 'all', label: 'Todos' },
                                    { id: 'rent', label: 'Locação' },
                                    { id: 'sale', label: 'Venda' },
                                    { id: 'expiring', label: 'Expirando', icon: 'warning' }
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setFilter(f.id as any)}
                                        className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${filter === f.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {/* List Content */}
                            {layoutMode === 'grid' ? (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-10">
                                    {filteredContracts.map(contract => (
                                        <div key={contract.id} className="bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-4 hover:border-primary/50 transition-all group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary">
                                                        <span className="material-symbols-outlined text-[24px]">gavel</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{contract.propertyTitle}</h3>
                                                        <p className="text-xs text-slate-500 font-medium">{CONTRACT_TEMPLATES[contract.templateType || 'rent_residential']?.title}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${contract.signatureStatus === 'signed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                    {contract.signatureStatus === 'signed' ? 'Assinado' : 'Pendente'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Cliente</p>
                                                    <p className="text-sm font-bold truncate">{contract.clientName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Valor</p>
                                                    <p className="text-sm font-bold">{formatCurrency(contract.value)}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 mt-auto pt-2">
                                                <button onClick={() => handleViewContract(contract)} className="flex-1 py-2.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                                                    <span className="material-symbols-outlined text-[18px]">visibility</span> Visualizar
                                                </button>
                                                <button onClick={() => handleDownloadPDF(contract)} className="px-4 py-2.5 border border-primary text-primary hover:bg-primary hover:text-white rounded-lg transition-all font-bold text-sm">
                                                    <span className="material-symbols-outlined text-[18px]">download</span> PDF
                                                </button>
                                                <button onClick={() => handleDelete(contract.id)} className="px-3 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all">
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-[#1a1d23] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111318]">
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Contrato / Imóvel</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Partes</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Valor</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredContracts.map(contract => (
                                                <tr key={contract.id} className="hover:bg-slate-50 dark:hover:bg-[#20242c] transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-bold text-sm">{contract.propertyTitle}</div>
                                                        <div className="text-[10px] text-slate-400">{CONTRACT_TEMPLATES[contract.templateType || 'rent_residential']?.title}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="text-xs"><span className="font-bold">C:</span> {contract.clientName}</div>
                                                        <div className="text-xs text-slate-400"><span className="font-bold">P:</span> {contract.ownerName}</div>
                                                    </td>
                                                    <td className="p-4 font-bold text-sm">{formatCurrency(contract.value)}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${contract.signatureStatus === 'signed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                            {contract.signatureStatus === 'signed' ? 'Assinado' : 'Pendente'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => handleViewContract(contract)} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-primary"><span className="material-symbols-outlined text-[18px]">visibility</span></button>
                                                            <button onClick={() => handleDownloadPDF(contract)} className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"><span className="material-symbols-outlined text-[18px]">download</span></button>
                                                            <button onClick={() => handleDelete(contract.id)} className="p-1.5 rounded hover:bg-rose-100 text-rose-500"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}

                    {viewMode === 'create' && (
                        <div className="bg-white dark:bg-[#1a1d23] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                             <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1d23] flex items-center gap-3">
                                <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                    <span className="material-symbols-outlined text-xl">post_add</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingContract ? 'Editar Contrato' : 'Novo Contrato'}</h2>
                                    <p className="text-sm text-slate-500">Preencha os dados para gerar o documento jurídico.</p>
                                </div>
                            </div>

                             <form onSubmit={handleCreateSubmit} className="p-8 space-y-8">
                                 {creationStep === 'form' ? (
                                     <>
                                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                             {Object.values(dynamicTemplates).map((tmpl: any) => (
                                                 <div
                                                     key={tmpl.id}
                                                     onClick={() => setSelectedTemplate(tmpl.id)}
                                                     className={`cursor-pointer p-5 rounded-xl border-2 transition-all ${selectedTemplate === tmpl.id ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                                                 >
                                                     <h4 className="font-bold text-sm leading-tight">{tmpl.title}</h4>
                                                     <p className="text-[10px] text-slate-500 mt-2">{tmpl.desc || 'Modelo de contrato'}</p>
                                                 </div>
                                             ))}
                                         </div>

                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                             <div className="space-y-1">
                                                 <label className="text-xs font-bold text-slate-500 uppercase">Imóvel</label>
                                                 <select required className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111318] h-11 px-3 text-sm focus:ring-primary" value={formData.propertyId} onChange={e => setFormData({ ...formData, propertyId: e.target.value })}>
                                                     <option value="">Selecione...</option>
                                                     {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                                 </select>
                                             </div>
                                             <div className="space-y-1">
                                                 <label className="text-xs font-bold text-slate-500 uppercase">Cliente</label>
                                                 <select required className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111318] h-11 px-3 text-sm focus:ring-primary" value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })}>
                                                     <option value="">Selecione...</option>
                                                     {users.filter(u => u.role === 'client').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                 </select>
                                             </div>
                                             <div className="space-y-1">
                                                 <label className="text-xs font-bold text-slate-500 uppercase">Proprietário</label>
                                                 <select required className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111318] h-11 px-3 text-sm focus:ring-primary" value={formData.ownerId} onChange={e => setFormData({ ...formData, ownerId: e.target.value })}>
                                                     <option value="">Selecione...</option>
                                                     {users.filter(u => u.role === 'owner' || u.role === 'admin').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                 </select>
                                             </div>
                                             <div className="space-y-1">
                                                 <label className="text-xs font-bold text-slate-500 uppercase">Valor (R$)</label>
                                                 <input type="number" required className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111318] h-11 px-3 text-sm focus:ring-primary" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} />
                                             </div>
                                             <div className="space-y-1">
                                                 <label className="text-xs font-bold text-slate-500 uppercase">Data de Início</label>
                                                 <input type="date" required className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111318] h-11 px-3 text-sm focus:ring-primary" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                                             </div>
                                             <div className="space-y-1">
                                                 <label className="text-xs font-bold text-slate-500 uppercase">Data de Fim</label>
                                                 <input type="date" className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111318] h-11 px-3 text-sm focus:ring-primary" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                                             </div>
                                         </div>
                                     </>
                                 ) : (
                                     <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                         <div className="flex items-center justify-between">
                                             <label className="text-xs font-bold text-slate-500 uppercase">Edição Final do Documento</label>
                                             <button type="button" onClick={() => setCreationStep('form')} className="text-xs text-primary font-bold flex items-center gap-1">
                                                 <span className="material-symbols-outlined text-sm">edit</span> Alterar Dados
                                             </button>
                                         </div>
                                         <textarea 
                                             className="w-full h-[500px] p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/20 font-serif text-sm leading-relaxed focus:outline-none focus:border-primary/50"
                                             value={currentText}
                                             onChange={(e) => setCurrentText(e.target.value)}
                                         />
                                         <p className="text-[10px] text-slate-400">Você pode revisar e alterar qualquer parte do texto acima antes de finalizar o contrato.</p>
                                     </div>
                                 )}

                                 <div className="flex gap-4 pt-6">
                                     <button type="button" onClick={() => { setViewMode('list'); setCreationStep('form'); }} className="px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                                     <button type="submit" className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-colors">
                                         {creationStep === 'form' ? 'Revisar Documento' : (editingContract ? 'Salvar Alterações' : 'Finalizar e Gerar Contrato')}
                                     </button>
                                 </div>
                             </form>
                        </div>
                    )}

                    {viewMode === 'view' && viewingContract && (
                        <div className="flex flex-col lg:flex-row gap-8 h-full min-h-0">
                            {/* Document Preview (A4 Simulado) */}
                            <div className="flex-1 rounded-2xl p-4 lg:p-8 overflow-y-auto flex justify-center bg-slate-200/50 dark:bg-black/20 custom-scrollbar relative">
                                
                                <div id="printable-area" className="flex flex-col gap-0 w-full items-center">
                                    {isEditingText ? (
                                        <div className="bg-white text-black w-[210mm] min-h-[297mm] shadow-2xl relative mx-auto flex flex-col p-[25mm]">
                                            <textarea
                                                className="w-full h-full min-h-[600px] p-4 text-justify text-[11pt] leading-relaxed font-serif whitespace-pre-wrap bg-slate-50 focus:outline-none border-2 border-dashed border-primary/30 rounded-xl"
                                                value={currentText}
                                                onChange={(e) => setCurrentText(e.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        (() => {
                                            const CHARS_PER_PAGE = 3000;
                                            const paragraphs = currentText.split('\n');
                                            const pages: string[] = [];
                                            let currentPage = '';

                                            paragraphs.forEach(p => {
                                                if ((currentPage + p).length > CHARS_PER_PAGE) {
                                                    pages.push(currentPage);
                                                    currentPage = p + '\n';
                                                } else {
                                                    currentPage += p + '\n';
                                                }
                                            });
                                            if (currentPage) pages.push(currentPage);

                                            return pages.map((content, idx) => (
                                                <div key={idx} className="bg-white text-black w-[210mm] min-h-[297mm] shadow-2xl relative mx-auto flex flex-col mb-10 last:mb-0 contract-page p-[25mm]">
                                                    {/* Custom A4 Layout for each page */}
                                                    {idx === 0 && (
                                                        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-10">
                                                            {AGENCY.logo ? <img src={AGENCY.logo} className="h-16 object-contain" alt="Logo" /> : <div className="h-16 w-16 bg-slate-100 rounded-xl flex items-center justify-center"><span className="text-slate-400 font-bold text-lg">{AGENCY.name.charAt(0)}</span></div>}
                                                            <div className="text-right">
                                                                <h2 className="text-lg font-black uppercase tracking-tight">{AGENCY.name}</h2>
                                                                <p className="text-[10px] text-slate-500">{AGENCY.cnpj} | {AGENCY.creci}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {idx === 0 && (
                                                        <h1 className="text-center font-bold text-xl uppercase mb-10 underline decoration-double">
                                                            {CONTRACT_TEMPLATES[viewingContract.templateType || 'rent_residential']?.title}
                                                        </h1>
                                                    )}

                                                    <div className="text-justify text-[11pt] leading-relaxed font-serif whitespace-pre-wrap flex-1">
                                                        {content}
                                                    </div>

                                                    {idx === pages.length - 1 && (
                                                        <div className="mt-12 pt-10">
                                                            <p className="text-right mb-16 font-serif italic text-sm">São Paulo, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
                                                            
                                                            <div className="grid grid-cols-2 gap-12 mt-10">
                                                                <div className="text-center">
                                                                    <div className="h-14 flex items-center justify-center mb-2">
                                                                        {AGENCY.stampUrl ? (
                                                                            <img src={AGENCY.stampUrl} className="h-14 object-contain" alt="Rubrica" />
                                                                        ) : (
                                                                            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">[Assinatura Administradora]</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="border-t border-black w-full pt-1">
                                                                        <p className="font-bold text-[10px] uppercase">{AGENCY.stampName}</p>
                                                                        <p className="text-[9px]">Representante Legal</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="h-14 flex flex-col items-center justify-center mb-2">
                                                                        {viewingContract.signatureImage && (
                                                                            <img src={viewingContract.signatureImage} className="h-14 object-contain" alt="Assinatura" />
                                                                        )}
                                                                        {!viewingContract.signatureImage && (
                                                                             <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">[Pendente Assinatura Cliente]</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="border-t border-black w-full pt-1">
                                                                        <p className="font-bold text-[10px] uppercase">{viewingContract.clientName}</p>
                                                                        <p className="text-[9px]">Contratante</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="mt-auto pt-6 text-center text-[9px] text-slate-300 border-t border-slate-50">
                                                        Página {idx + 1} de {pages.length} | Documento #{viewingContract.id} | EstateFlow Suite
                                                    </div>

                                                    {viewingContract.signatureStatus !== 'signed' && (
                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-45 select-none">
                                                            <span className="text-[140px] font-black border-[20px] border-black p-20 rounded-3xl">RASCUNHO</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ));
                                        })()
                                    )}
                                </div>
                            </div>

                            {/* Sidebar Actions */}
                            <div className="w-full lg:w-80 flex flex-col gap-4 no-print">
                                <div className="bg-white dark:bg-[#1a1d23] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-6">
                                    <h3 className="font-bold text-lg mb-4">Ações Jurídicas</h3>
                                    
                                    <div className="flex flex-col gap-3">
                                        {isEditingText ? (
                                            <>
                                                <button onClick={handleSaveEdit} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all">
                                                    <span className="material-symbols-outlined">save</span> Salvar Texto
                                                </button>
                                                <button onClick={() => { setIsEditingText(false); setCurrentText(generatedBody); }} className="w-full py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all">
                                                    Cancelar
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={handlePrint} className="w-full py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                                                    <span className="material-symbols-outlined">print</span> Imprimir / Exportar PDF
                                                </button>

                                                {viewingContract.signatureStatus !== 'signed' && (
                                                    <button onClick={() => setIsSignatureModalOpen(true)} className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-all">
                                                        <span className="material-symbols-outlined">verified</span> Colher Assinatura Digital
                                                    </button>
                                                )}

                                                <button onClick={() => handleDownloadPDF(viewingContract)} className="w-full py-3 border border-primary text-primary rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/5 transition-all">
                                                    <span className="material-symbols-outlined">download</span> Gerar PDF Profissional
                                                </button>

                                                <button onClick={handleSendForSignature} disabled={isSendingEmail} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50">
                                                    {isSendingEmail ? (
                                                        <><span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Enviando...</>
                                                    ) : (
                                                        <><span className="material-symbols-outlined">send</span> Enviar para Assinatura</>
                                                    )}
                                                </button>

                                                <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />

                                                <button onClick={() => setIsEditingText(true)} className="w-full py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm">
                                                    <span className="material-symbols-outlined text-[18px]">edit_note</span> Editar Cláusulas
                                                </button>

                                            </>
                                        )}
                                    </div>

                                    <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800">
                                        <p className="text-[10px] text-amber-600 font-bold uppercase mb-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">shield_person</span> Segurança de Dados
                                        </p>
                                        <p className="text-[11px] text-amber-800 dark:text-amber-500 leading-tight">
                                            Assinaturas colhidas são criptografadas e vinculadas ao CPF do signatário para validade jurídica plena (MP 2.200-2/2001).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Signature Modal */}
            {isSignatureModalOpen && (
                <SignaturePad 
                    onSave={handleSignatureSave}
                    onCancel={() => setIsSignatureModalOpen(false)}
                />
            )}
        </div>
    );
};

export default ContractsPage;