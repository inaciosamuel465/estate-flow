import jsPDF from 'jspdf';
import { Contract, Property, User } from '../types';

function loadImage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = url;
    });
}

export const generateContractPDF = async (
    contract: Contract,
    property: Property,
    tenant: User,
    owner: User,
    customContent?: string,
    logoUrl?: string,
    agencyName?: string,
    agencyCnpj?: string,
    agencyCreci?: string,
    agencyAddress?: string,
    agencyStampUrl?: string,
    agencyStampName?: string
) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 25;
    const contentWidth = pageWidth - (margin * 2);

    const bodyText = customContent || contract.customContent || 'Conteúdo do contrato não disponível.';

    const primaryColor: [number, number, number] = [17, 19, 24];
    const secondaryColor: [number, number, number] = [43, 108, 238];

    let logoDataUrl: string | null = null;
    if (logoUrl) {
        try {
            logoDataUrl = await loadImage(logoUrl);
        } catch (e) {
            console.warn('Could not load logo for PDF', e);
        }
    }

    const addHeader = (pageNum: number) => {
        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, 'PNG', margin, 15, 30, 15);
            } catch (e) {
                doc.setFillColor(240, 242, 245);
                doc.rect(margin, 15, 30, 15, 'F');
                doc.setTextColor(...secondaryColor);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text((agencyName || 'Admin').split(' ')[0], margin + 15, 23, { align: 'center' });
            }
        } else {
            doc.setFillColor(240, 242, 245);
            doc.rect(margin, 15, 30, 15, 'F');
            doc.setTextColor(...secondaryColor);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text((agencyName || 'Admin').split(' ')[0], margin + 15, 23, { align: 'center' });
        }

        doc.setTextColor(...primaryColor);
        doc.setFontSize(14);
        doc.text(agencyName || 'Imobiliária', pageWidth - margin, 20, { align: 'right' });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        if (agencyCnpj) doc.text(`CNPJ: ${agencyCnpj}${agencyCreci ? ` | CRECI: ${agencyCreci}` : ''}`, pageWidth - margin, 25, { align: 'right' });
        if (agencyAddress) doc.text(agencyAddress, pageWidth - margin, 29, { align: 'right' });

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(margin, 35, pageWidth - margin, 35);
    };

    const addFooter = (pageNum: number, totalPages: number) => {
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Página ${pageNum} de ${totalPages} | Contrato #${contract.id} | Validado digitalmente via EstateFlow`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    };

    addHeader(1);
    let yPos = 50;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const title = (contract.type === 'rent' ? 'CONTRATO DE LOCAÇÃO RESIDENCIAL' : 'COMPROMISSO DE COMPRA E VENDA').toUpperCase();
    doc.text(title, pageWidth / 2, yPos, { align: 'center' });

    yPos += 15;

    doc.setFontSize(10.5);
    doc.setFont('times', 'normal');

    const splitText = doc.splitTextToSize(bodyText, contentWidth);

    for (let i = 0; i < splitText.length; i++) {
        if (yPos > pageHeight - 30) {
            addFooter(doc.internal.pages.length - 1, 0);
            doc.addPage();
            addHeader(doc.internal.pages.length - 1);
            yPos = 50;
            doc.setFont('times', 'normal');
            doc.setFontSize(10.5);
        }
        doc.text(splitText[i], margin, yPos, { align: 'justify', maxWidth: contentWidth });
        yPos += 6;
    }

    if (yPos > pageHeight - 80) {
        addFooter(doc.internal.pages.length - 1, 0);
        doc.addPage();
        addHeader(doc.internal.pages.length - 1);
        yPos = 50;
    }

    yPos += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`São Paulo, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.`, pageWidth - margin, yPos, { align: 'right' });

    yPos += 25;

    const col1 = margin;
    const col2 = pageWidth / 2 + 5;
    const lineW = (pageWidth / 2) - margin - 5;
    const stampName = agencyStampName || agencyName || 'ADMINISTRADORA';

    // Rubrica/carimbo da imobiliária no lado esquerdo
    if (agencyStampUrl) {
        try {
            doc.addImage(agencyStampUrl, 'PNG', col1 + (lineW/2) - 15, yPos - 15, 30, 12);
        } catch (e) {
            console.warn("Erro ao incluir rubrica no PDF", e);
        }
    }

    // Assinatura do cliente no lado direito
    if (contract.signatureImage && contract.signatureStatus === 'signed') {
        try {
            doc.addImage(contract.signatureImage, 'PNG', col2 + (lineW/2) - 15, yPos - 15, 30, 12);
        } catch (e) {
            console.error("Erro ao incluir imagem de assinatura no PDF", e);
        }
    }

    // Linhas de assinatura
    doc.setLineWidth(0.2);
    doc.line(col1, yPos, col1 + lineW, yPos);
    doc.line(col2, yPos, col2 + lineW, yPos);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(stampName.toUpperCase(), col1 + lineW/2, yPos + 5, { align: 'center' });
    doc.text(contract.clientName.toUpperCase(), col2 + lineW/2, yPos + 5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Administradora (Assinatura Digital)', col1 + lineW/2, yPos + 9, { align: 'center' });
    doc.text('Contratante', col2 + lineW/2, yPos + 9, { align: 'center' });

    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(i, totalPages);

        if (contract.signatureStatus !== 'signed') {
            doc.setTextColor(220, 220, 220);
            doc.setFontSize(60);
            doc.setFont('helvetica', 'bold');
            doc.text('RASCUNHO', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
        }
    }

    const fileName = `Contrato_${contract.type === 'rent' ? 'Locacao' : 'Venda'}_${contract.propertyTitle.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
    return doc;
};
