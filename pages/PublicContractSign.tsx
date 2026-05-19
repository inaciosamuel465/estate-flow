import React, { useEffect, useMemo, useState } from 'react';
import SignaturePad from '../components/SignaturePad';
import { downloadPdfBlob, generateContractPDF } from '../src/services/pdfService';
import type { Contract, Property, User } from '../src/types';

interface PublicContractSignProps {
    contractId: string;
    settings?: Record<string, string>;
}

const PublicContractSign: React.FC<PublicContractSignProps> = ({ contractId, settings = {} }) => {
    const [contract, setContract] = useState<Contract | null>(null);
    const [property, setProperty] = useState<Property | null>(null);
    const [publicSettings, setPublicSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [signingUp, setSigningUp] = useState(false);

    const pathParts = useMemo(() => window.location.pathname.split('/').filter(Boolean), []);
    const tenantSlug = pathParts[0] && pathParts[0] !== 'contrato' ? pathParts[0] : '';
    const publicToken = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', []);
    const effectiveSettings = { ...settings, ...publicSettings };
    const agencyName = effectiveSettings.companyName || 'EstateFlow Negocios Imobiliarios Ltda.';
    const agencyCnpj = effectiveSettings.agencyCnpj || '';
    const agencyCreci = effectiveSettings.agencyCreci || '';
    const agencyAddress = effectiveSettings.address || '';
    const logoUrl = effectiveSettings.logoUrl || '';
    const agencyStampUrl = effectiveSettings.agencyStampUrl || '';
    const agencyStampName = effectiveSettings.agencyStampName || agencyName;
    const homeHref = tenantSlug ? `/${tenantSlug}` : '/';

    useEffect(() => {
        const load = async () => {
            try {
                if (!tenantSlug || !publicToken) {
                    setError('Link de assinatura invalido. Solicite um novo envio para a imobiliaria.');
                    return;
                }

                const params = new URLSearchParams({ tenant: tenantSlug, id: contractId, token: publicToken });
                const res = await fetch(`/api/contracts/public?${params.toString()}`);
                const data = await res.json().catch(() => null);
                if (!res.ok || !data?.success) {
                    setError(data?.error || 'Contrato nao encontrado ou link expirado.');
                    return;
                }

                setContract(data.data.contract as Contract);
                setProperty((data.data.property || null) as Property | null);
                setPublicSettings((data.data.settings || {}) as Record<string, string>);
            } catch {
                setError('Erro ao carregar contrato. Verifique sua conexao e tente novamente.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [contractId, publicToken, tenantSlug]);

    const handleSignatureSave = async (dataUrl: string) => {
        if (!contract) return;
        setSigningUp(true);
        try {
            const res = await fetch('/api/contracts/public-sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant: tenantSlug,
                    contract_id: contract.id,
                    token: publicToken,
                    signature_image: dataUrl,
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                alert(data?.error || 'Erro ao salvar assinatura. Solicite um novo link.');
                return;
            }

            setContract({
                ...contract,
                signatureStatus: 'signed',
                signatureImage: dataUrl,
                signedAt: data.data?.signed_at || new Date().toISOString(),
                status: 'active',
            });
            setIsSignatureModalOpen(false);
        } catch {
            alert('Erro ao salvar assinatura. Verifique sua conexao e tente novamente.');
        } finally {
            setSigningUp(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!contract) return;
        const tenant: User = { id: contract.clientId, name: contract.clientName, phone: contract.clientPhone, email: '', role: 'client', avatar: '', favorites: [] } as User;
        const owner: User = { id: contract.ownerId || '', name: contract.ownerName || '', phone: contract.ownerPhone || '', email: '', role: 'owner', avatar: '', favorites: [] } as User;
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
                agencyStampName,
            );
            const fileName = `Contrato_${contract.type === 'rent' ? 'Locacao' : 'Venda'}_${contract.propertyTitle.replace(/\s+/g, '_')}.pdf`;
            downloadPdfBlob(doc, fileName);
        } catch {
            alert('Erro ao gerar PDF.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-slate-600 font-medium">Carregando contrato...</span>
                </div>
            </div>
        );
    }

    if (error || !contract) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <div className="text-center max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <div className="size-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <span className="material-symbols-outlined text-rose-500 text-3xl">description</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Contrato indisponivel</h1>
                    <p className="text-slate-500 mb-6">{error || 'O link acessado e invalido, expirou ou pertence a outra imobiliaria.'}</p>
                    <a href={homeHref} className="inline-flex px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors">Ir para o site</a>
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
                                    {contract.type === 'rent' ? 'Locacao' : 'Compra e Venda'} - {contract.clientName}
                                </p>
                            </div>
                        </div>
                        <span className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-sm font-bold whitespace-nowrap ${contract.signatureStatus === 'signed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            <span className="material-symbols-outlined text-sm sm:text-[18px]">{contract.signatureStatus === 'signed' ? 'verified' : 'pending'}</span>
                            <span className="hidden xs:inline">{contract.signatureStatus === 'signed' ? 'Assinado' : 'Pendente'}</span>
                        </span>
                    </div>

                    <div className="flex-1 p-4 sm:p-6 lg:p-10">
                        <div className="prose prose-sm max-w-none text-justify leading-relaxed whitespace-pre-wrap font-serif text-slate-800">
                            {contract.customContent || 'Conteudo do contrato nao disponivel.'}
                        </div>

                        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-100">
                            <p className="text-right mb-8 sm:mb-12 font-serif italic text-xs sm:text-sm text-slate-600">
                                {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                            </p>
                            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 sm:gap-8">
                                <div className="text-center">
                                    <div className="h-14 sm:h-20 flex flex-col items-center justify-center mb-2">
                                        {contract.ownerSignatureImage ? (
                                            <img src={contract.ownerSignatureImage} className="h-8 sm:h-12 object-contain" alt="Assinatura imobiliaria" />
                                        ) : agencyStampUrl ? (
                                            <img src={agencyStampUrl} className="h-8 sm:h-12 object-contain" alt="Rubrica" />
                                        ) : (
                                            <span className="text-[8px] sm:text-xs text-slate-300 font-bold uppercase tracking-widest italic">[Pendente]</span>
                                        )}
                                    </div>
                                    <div className="border-t border-black w-full pt-1">
                                        <p className="font-bold text-[10px] sm:text-xs uppercase">{agencyStampName}</p>
                                        <p className="text-[8px] sm:text-[10px] text-slate-500">Imobiliaria</p>
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
                                <><span className="size-4 sm:size-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</>
                            ) : (
                                <><span className="material-symbols-outlined text-xl sm:text-2xl">draw</span> Assinar contrato</>
                            )}
                        </button>
                    )}
                    <button
                        onClick={handleDownloadPDF}
                        className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 border-primary text-primary rounded-xl font-bold hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                        <span className="material-symbols-outlined text-xl sm:text-2xl">download</span> Baixar PDF
                    </button>
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
