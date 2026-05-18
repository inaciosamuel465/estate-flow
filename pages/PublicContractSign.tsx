import React, { useState, useEffect } from 'react';
import { getContractById, updateContract, getProperties } from '../src/services/dataService';
import { generateContractPDF, downloadPdfBlob } from '../src/services/pdfService';
import SignaturePad from '../components/SignaturePad';
import type { Contract, Property, User } from '../src/types';

interface PublicContractSignProps {
    contractId: string;
    settings?: Record<string, string>;
}

const PublicContractSign: React.FC<PublicContractSignProps> = ({ contractId, settings = {} }) => {
    const [contract, setContract] = useState<Contract | null>(null);
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [signingUp, setSigningUp] = useState(false);
    const [isSavingContract, setIsSavingContract] = useState(false);
    const [showSavedFeedback, setShowSavedFeedback] = useState(false);

    const agencyName = settings.companyName || 'EstateFlow Negócios Imobiliários Ltda.';
    const agencyCnpj = settings.agencyCnpj || '';
    const agencyCreci = settings.agencyCreci || '';
    const agencyAddress = settings.address || '';
    const logoUrl = settings.logoUrl || '';
    const agencyStampUrl = settings.agencyStampUrl || '';
    const agencyStampName = settings.agencyStampName || agencyName;

    useEffect(() => {
        const load = async () => {
            try {
                const c = await getContractById(contractId);
                if (!c) {
                    setError('Contrato não encontrado.');
                    setLoading(false);
                    return;
                }
                setContract(c);
                const props = await getProperties();
                const p = props.find(prop => String(prop.id) === String(c.propertyId));
                setProperty(p || null);
            } catch (e) {
                setError('Erro ao carregar contrato.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [contractId]);

    const handleSignatureSave = async (dataUrl: string) => {
        if (!contract) return;
        setSigningUp(true);
        try {
            const saved = await updateContract(String(contract.id), {
                signatureStatus: 'signed',
                signatureImage: dataUrl,
                signedAt: new Date().toISOString(),
                status: 'active'
            });
            if (!saved) {
                alert('Erro ao salvar assinatura no banco de dados. Tente novamente.');
                return;
            }
            setContract({
                ...contract,
                signatureStatus: 'signed',
                signatureImage: dataUrl,
                signedAt: new Date().toISOString(),
                status: 'active'
            });
            setIsSignatureModalOpen(false);
        } catch (e) {
            alert('Erro ao salvar assinatura. Verifique sua conexão e tente novamente.');
        } finally {
            setSigningUp(false);
        }
    };

    const handleSaveContract = async () => {
        if (!contract) return;
        setIsSavingContract(true);
        try {
            const saved = await updateContract(String(contract.id), {
                signatureStatus: contract.signatureStatus,
                signatureImage: contract.signatureImage,
                signedAt: contract.signedAt,
                status: contract.status
            });
            if (!saved) {
                alert('Erro ao salvar contrato. Tente novamente.');
                return;
            }
            setShowSavedFeedback(true);
            setTimeout(() => setShowSavedFeedback(false), 3000);
        } catch (e) {
            alert('Erro ao salvar contrato. Tente novamente.');
        } finally {
            setIsSavingContract(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!contract) return;
        const tenant: User = { id: contract.clientId, name: contract.clientName, phone: contract.clientPhone, email: '', role: 'client', avatar: '', favorites: [] } as User;
        const owner: User = { id: contract.ownerId, name: contract.ownerName, phone: contract.ownerPhone, email: '', role: 'owner', avatar: '', favorites: [] } as User;
        try {
            const doc = await generateContractPDF(
                contract,
                property || { id: contract.propertyId, title: contract.propertyTitle } as Property,
                tenant,
                owner,
                contract.customContent,
                logoUrl,
                agencyName,
                agencyCnpj,
                agencyCreci,
                agencyAddress,
                agencyStampUrl,
                agencyStampName
            );
            const fileName = `Contrato_${contract.type === 'rent' ? 'Locacao' : 'Venda'}_${contract.propertyTitle.replace(/\s+/g, '_')}.pdf`;
            downloadPdfBlob(doc, fileName);
        } catch (e) {
            alert('Erro ao gerar PDF.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-slate-600 font-medium">Carregando contrato...</span>
                </div>
            </div>
        );
    }

    if (error || !contract) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center max-w-md p-8">
                    <div className="size-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-rose-500 text-4xl">description</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Contrato não encontrado</h1>
                    <p className="text-slate-500 mb-6">{error || 'O link que você acessou é inválido ou o contrato foi removido.'}</p>
                    <a href="/" className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors">Ir para o Site</a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="max-w-[1000px] mx-auto w-full px-4 py-4 sm:py-8 flex-1 flex flex-col">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col flex-1 sm:flex-none">
                    <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                            {logoUrl && <img src={logoUrl} className="h-8 w-8 sm:h-10 sm:w-10 object-contain rounded-lg shrink-0" alt="" />}
                            <div className="min-w-0">
                                <h1 className="text-sm sm:text-lg font-bold text-slate-900 truncate">{contract.propertyTitle}</h1>
                                <p className="text-xs sm:text-sm text-slate-500 truncate">
                                    {contract.type === 'rent' ? 'Locação' : 'Compra e Venda'} · {contract.clientName}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {contract.signatureStatus === 'signed' ? (
                                <span className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] sm:text-sm font-bold whitespace-nowrap">
                                    <span className="material-symbols-outlined text-sm sm:text-[18px]">verified</span>
                                    <span className="hidden xs:inline">Assinado</span>
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-amber-100 text-amber-700 rounded-full text-[10px] sm:text-sm font-bold whitespace-nowrap">
                                    <span className="material-symbols-outlined text-sm sm:text-[18px]">pending</span>
                                    <span className="hidden xs:inline">Pendente</span>
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 custom-scrollbar">
                        <div className="prose prose-sm max-w-none text-justify leading-relaxed whitespace-pre-wrap font-serif text-slate-800">
                            {contract.customContent || 'Conteúdo do contrato não disponível.'}
                        </div>

                        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-100">
                            <p className="text-right mb-8 sm:mb-12 font-serif italic text-xs sm:text-sm text-slate-600">
                                São Paulo, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                            </p>
                                <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 sm:gap-8">
                                <div className="text-center">
                                    <div className="h-14 sm:h-20 flex flex-col items-center justify-center mb-2">
                                        {contract.ownerSignatureImage ? (
                                            <img src={contract.ownerSignatureImage} className="h-8 sm:h-12 object-contain" alt="Assinatura Imobiliária" />
                                        ) : agencyStampUrl ? (
                                            <img src={agencyStampUrl} className="h-8 sm:h-12 object-contain" alt="Rubrica" />
                                        ) : (
                                            <span className="text-[8px] sm:text-xs text-slate-300 font-bold uppercase tracking-widest italic">[Pendente]</span>
                                        )}
                                    </div>
                                    <div className="border-t border-black w-full pt-1">
                                        <p className="font-bold text-[10px] sm:text-xs uppercase">{agencyStampName}</p>
                                        <p className="text-[8px] sm:text-[10px] text-slate-500">Imobiliária</p>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="h-10 sm:h-14 flex flex-col items-center justify-center mb-2">
                                        {contract.signatureImage ? (
                                            <img src={contract.signatureImage} className="h-10 sm:h-14 object-contain" alt="Assinatura" />
                                        ) : (
                                            <span className="text-[8px] sm:text-xs text-slate-300 font-bold uppercase tracking-widest italic">[Pendente]</span>
                                        )}
                                    </div>
                                    <div className="border-t border-black w-full pt-1">
                                        <p className="font-bold text-[10px] sm:text-xs uppercase">{contract.clientName}</p>
                                        <p className="text-[8px] sm:text-[10px] text-slate-500">Contratante</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center sticky bottom-0 bg-slate-50 py-3 sm:py-0 sm:static">
                    {contract.signatureStatus !== 'signed' && (
                        <button
                            onClick={() => setIsSignatureModalOpen(true)}
                            disabled={signingUp}
                            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
                        >
                            {signingUp ? (
                                <><span className="size-4 sm:size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Salvando...</>
                            ) : (
                                <><span className="material-symbols-outlined text-xl sm:text-2xl">draw</span> Assinar Contrato</>
                            )}
                        </button>
                    )}
                    <button
                        onClick={handleDownloadPDF}
                        className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 border-primary text-primary rounded-xl font-bold hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                        <span className="material-symbols-outlined text-xl sm:text-2xl">download</span> Baixar PDF
                    </button>
                    {contract.signatureStatus === 'signed' && (
                        <button
                            onClick={handleSaveContract}
                            disabled={isSavingContract}
                            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
                        >
                            {isSavingContract ? (
                                <><span className="size-4 sm:size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Salvando...</>
                            ) : (
                                <><span className="material-symbols-outlined text-xl sm:text-2xl">save</span> {showSavedFeedback ? '✓ Salvo' : 'Salvar Contrato'}</>
                            )}
                        </button>
                    )}
                </div>

                {contract.signatureStatus === 'signed' && (
                    <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center flex flex-col sm:flex-row items-center justify-center gap-3">
                        <p className="text-emerald-800 font-medium flex items-center justify-center gap-2 text-xs sm:text-sm">
                            <span className="material-symbols-outlined text-emerald-600">verified</span>
                            Contrato assinado digitalmente em {contract.signedAt ? new Date(contract.signedAt).toLocaleDateString('pt-BR') : 'data registrada'}.
                        </p>
                    </div>
                )}
            </div>

            {isSignatureModalOpen && (
                <SignaturePad
                    onSave={handleSignatureSave}
                    onCancel={() => setIsSignatureModalOpen(false)}
                />
            )}
        </div>
    );
};

export default PublicContractSign;
