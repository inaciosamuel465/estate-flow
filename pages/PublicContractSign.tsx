import React, { useState, useEffect } from 'react';
import { getContractById, updateContract, getProperties } from '../src/services/dataService';
import { generateContractPDF } from '../src/services/pdfService';
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
            await updateContract(String(contract.id), {
                signatureStatus: 'signed',
                signatureImage: dataUrl,
                signedAt: new Date().toISOString(),
                status: 'active'
            });
            setContract({
                ...contract,
                signatureStatus: 'signed',
                signatureImage: dataUrl,
                signedAt: new Date().toISOString(),
                status: 'active'
            });
            setIsSignatureModalOpen(false);
        } catch (e) {
            alert('Erro ao salvar assinatura. Tente novamente.');
        } finally {
            setSigningUp(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!contract) return;
        const tenant: User = { id: contract.clientId, name: contract.clientName, phone: contract.clientPhone, email: '', role: 'client', avatar: '', favorites: [] } as User;
        const owner: User = { id: contract.ownerId, name: contract.ownerName, phone: contract.ownerPhone, email: '', role: 'owner', avatar: '', favorites: [] } as User;
        try {
            await generateContractPDF(
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
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-[1000px] mx-auto px-4 py-8">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {logoUrl && <img src={logoUrl} className="h-10 w-10 object-contain rounded-lg" alt="" />}
                            <div>
                                <h1 className="text-lg font-bold text-slate-900">{contract.propertyTitle}</h1>
                                <p className="text-sm text-slate-500">
                                    {contract.type === 'rent' ? 'Locação' : 'Compra e Venda'} · {contract.clientName}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {contract.signatureStatus === 'signed' ? (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                                    <span className="material-symbols-outlined text-[18px]">verified</span> Assinado
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-bold">
                                    <span className="material-symbols-outlined text-[18px]">pending</span> Pendente
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="p-6 lg:p-10">
                        <div className="prose prose-sm max-w-none text-justify leading-relaxed whitespace-pre-wrap font-serif text-slate-800">
                            {contract.customContent || 'Conteúdo do contrato não disponível.'}
                        </div>

                        <div className="mt-12 pt-8 border-t border-slate-100">
                            <p className="text-right mb-12 font-serif italic text-sm text-slate-600">
                                São Paulo, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                            </p>
                            <div className="grid grid-cols-2 gap-12">
                                <div className="text-center">
                                    <div className="h-14 flex items-center justify-center mb-2">
                                        {agencyStampUrl ? (
                                            <img src={agencyStampUrl} className="h-14 object-contain" alt="Rubrica" />
                                        ) : (
                                            <span className="text-xs text-slate-300 font-bold uppercase tracking-widest italic">[Assinatura Administradora]</span>
                                        )}
                                    </div>
                                    <div className="border-t border-black w-full pt-1">
                                        <p className="font-bold text-xs uppercase">{agencyStampName}</p>
                                        <p className="text-[10px] text-slate-500">Representante Legal</p>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="h-14 flex flex-col items-center justify-center mb-2">
                                        {contract.signatureImage ? (
                                            <img src={contract.signatureImage} className="h-14 object-contain" alt="Assinatura" />
                                        ) : (
                                            <span className="text-xs text-slate-300 font-bold uppercase tracking-widest italic">[Pendente Assinatura Cliente]</span>
                                        )}
                                    </div>
                                    <div className="border-t border-black w-full pt-1">
                                        <p className="font-bold text-xs uppercase">{contract.clientName}</p>
                                        <p className="text-[10px] text-slate-500">Contratante</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                    {contract.signatureStatus !== 'signed' && (
                        <button
                            onClick={() => setIsSignatureModalOpen(true)}
                            disabled={signingUp}
                            className="px-8 py-4 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {signingUp ? (
                                <><span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Salvando...</>
                            ) : (
                                <><span className="material-symbols-outlined">draw</span> Assinar Contrato</>
                            )}
                        </button>
                    )}
                    <button
                        onClick={handleDownloadPDF}
                        className="px-8 py-4 border-2 border-primary text-primary rounded-xl font-bold hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">download</span> Baixar PDF
                    </button>
                </div>

                {contract.signatureStatus === 'signed' && (
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                        <p className="text-emerald-800 font-medium flex items-center justify-center gap-2">
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
