import type { Property, Contract } from "../types";
import type { Lead } from "./neonService";

export interface AIInsight {
    summary: string;
    hotLeads: string[];
    stagnatedProperties: string[];
    priceRecommendation: string;
    weeklyHighlight: string;
    actionItems: string[];
    isLoading?: boolean;
    error?: string;
}

export interface AIMessage {
    role: 'user' | 'model';
    text: string;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

export async function generateAIInsight(
    properties: Property[],
    leads: Lead[],
    contracts: Contract[]
): Promise<AIInsight> {
    const activeProps = properties.filter(p => p.status === 'active' || !p.status);
    const totalViews = activeProps.reduce((acc, p) => acc + (p.stats?.views || 0), 0);
    const newLeads = leads.filter(l => l.status === 'new');
    const hotLeads = leads.filter(l => l.score >= 70).sort((a, b) => b.score - a.score);
    const activeContracts = contracts.filter(c => c.status === 'active');

    const stagnatedProps = activeProps
        .filter(p => (p.stats?.views || 0) === 0 && (p.stats?.leads || 0) === 0)
        .slice(0, 3);

    const topHotLeads = hotLeads.slice(0, 3);
    const totalValue = activeContracts.reduce((acc, c) => acc + Number(c.value || 0), 0);

    const bestProperty = [...activeProps].sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0))[0];
    const worstProperty = [...activeProps].sort((a, b) => (a.stats?.views || 0) - (b.stats?.views || 0))[0];

    const summaryParts: string[] = [];
    summaryParts.push(`${activeProps.length} imóveis ativos, ${leads.length} leads registrados.`);
    if (topHotLeads.length > 0) {
        summaryParts.push(`${topHotLeads.length} lead(s) quente(s) com alta probabilidade de conversão.`);
    }
    if (newLeads.length > 0) {
        summaryParts.push(`${newLeads.length} lead(s) novo(s) aguardando contato.`);
    }
    if (stagnatedProps.length > 0) {
        summaryParts.push(`${stagnatedProps.length} imóvel(is) sem movimento recente — revisar estratégia.`);
    }
    if (bestProperty) {
        summaryParts.push(`Destaque: "${bestProperty.title}" com ${bestProperty.stats?.views || 0} visualizações.`);
    }

    const summary = summaryParts.join(' ');

    const hotLeadStrings = topHotLeads.map(l =>
        `${l.name} (score ${l.score}) — ${l.propertyTitle || 'imóvel não especificado'}`
    );

    const stagnatedStrings = stagnatedProps.map(p =>
        `${p.title} — sem visualizações nem leads. Considere atualizar fotos/preço ou impulsionar.`
    );

    let priceRecommendation: string;
    if (activeProps.length === 0) {
        priceRecommendation = "Nenhum imóvel ativo no momento. Cadastre novos imóveis para análise.";
    } else if (stagnatedProps.length > 0) {
        priceRecommendation = `${stagnatedProps[0].title} está sem movimento. Avalie redução de preço ou destaque em campanhas.`;
    } else if (bestProperty && worstProperty && bestProperty.id !== worstProperty.id) {
        const bestPrice = typeof bestProperty.price === 'string' ? parseFloat(bestProperty.price.replace(/[^\d]/g, '')) : bestProperty.price;
        const worstPrice = typeof worstProperty.price === 'string' ? parseFloat(worstProperty.price.replace(/[^\d]/g, '')) : worstProperty.price;
        priceRecommendation = `"${worstProperty.title}" tem ${worstProperty.stats?.views || 0} views vs "${bestProperty.title}" com ${bestProperty.stats?.views || 0}. Considere ajustar preço de ${formatCurrency(worstPrice || 0)} ou melhorar fotos.`;
    } else {
        priceRecommendation = "Portfólio com desempenho estável. Monitore leads para ajustes de preço.";
    }

    let weeklyHighlight: string;
    if (newLeads.length > 0) {
        weeklyHighlight = `${newLeads.length} novo(s) lead(s) esta semana. Priorize contato para não perder oportunidades.`;
    } else if (activeContracts.length > 0) {
        weeklyHighlight = `${activeContracts.length} contrato(s) ativo(s) — receita recorrente de ${formatCurrency(totalValue)}.`;
    } else {
        weeklyHighlight = `${totalViews} visualizações totais no portfólio. Continue impulsionando os imóveis.`;
    }

    const actionItems: string[] = [];
    if (newLeads.length > 0) actionItems.push(`Contactar ${newLeads.length} lead(ns) novo(s) urgentemente`);
    if (stagnatedProps.length > 0) actionItems.push(`Revisar estratégia de ${stagnatedProps[0].title} — sem movimento`);
    if (activeProps.length < 5) actionItems.push("Aumentar portfólio — cadastre mais imóveis");
    actionItems.push("Monitorar métricas de visualização semanalmente");
    if (hotLeads.length > 0) actionItems.push(`Priorizar fechamento com ${hotLeads[0].name} (lead mais quente)`);

    return {
        summary,
        hotLeads: hotLeadStrings,
        stagnatedProperties: stagnatedStrings,
        priceRecommendation,
        weeklyHighlight,
        actionItems,
    };
}

export async function chatWithAI(
    message: string,
    context: {
        properties: Property[];
        leads: Lead[];
        contracts: Contract[];
    },
    _history: AIMessage[] = []
): Promise<string> {
    const { properties, leads, contracts } = context;
    const activeProps = properties.filter(p => p.status === 'active' || !p.status);
    const totalRevenue = contracts
        .filter(c => c.status === 'active')
        .reduce((acc, c) => acc + Number(c.value || 0), 0);
    const hotLeads = leads.filter(l => l.score >= 70);

    const msg = message.toLowerCase();

    if (msg.includes('lead') || msg.includes('cliente') || msg.includes('interessado') || msg.includes('quente') || msg.includes('maior probabilidade')) {
        if (hotLeads.length === 0) return "No momento não há leads quentes (score ≥ 70). Continue atraindo novos contatos.";
        const top = hotLeads.sort((a, b) => b.score - a.score).slice(0, 5);
        return top.map((l, i) =>
            `${i + 1}. **${l.name}** — score ${l.score}, interesse em "${l.propertyTitle || 'imóvel'}", status: ${l.status}`
        ).join('\n') + '\n\n👉 Foque nestes leads para conversão rápida.';
    }

    if (msg.includes('imóvel') || msg.includes('propriedade') || msg.includes('estagnado') || msg.includes('sem movimento') || msg.includes('venda')) {
        const stagnant = activeProps.filter(p => (p.stats?.views || 0) === 0);
        if (stagnant.length === 0) {
            const top = [...activeProps].sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0)).slice(0, 3);
            if (top.length === 0) return "Nenhum imóvel ativo no portfólio.";
            return "📊 **Imóveis com melhor desempenho:**\n" + top.map((p, i) =>
                `${i + 1}. ${p.title} — ${p.stats?.views || 0} views, ${p.stats?.leads || 0} leads`
            ).join('\n');
        }
        return "⚠️ **Imóveis sem movimento:**\n" + stagnant.slice(0, 5).map((p, i) =>
            `${i + 1}. ${p.title} — 0 views. Considere atualizar fotos, preço ou impulsionar.`
        ).join('\n');
    }

    if (msg.includes('preço') || msg.includes('preco') || msg.includes('valor') || msg.includes('estrategia') || msg.includes('estratégia')) {
        const avgPrice = activeProps.length > 0
            ? activeProps.reduce((acc, p) => acc + (Number(p.price) || 0), 0) / activeProps.length
            : 0;
        return `📈 **Análise de Preços**\n- Preço médio do portfólio: ${formatCurrency(avgPrice)}\n- ${activeProps.length} imóveis ativos\n- ${leads.length} leads no total\n\n💰 Recomendação: imóveis com muitas views e poucos leads podem precisar de ajuste de preço.`;
    }

    if (msg.includes('contrato') || msg.includes('receita') || msg.includes('faturamento')) {
        return `📄 **Contratos e Receita**\n- ${contracts.length} contratos no total\n- ${contracts.filter(c => c.status === 'active').length} ativos\n- Receita ativa: ${formatCurrency(totalRevenue)}\n- ${contracts.filter(c => c.nextPaymentStatus === 'pending').length} pagamentos pendentes`;
    }

    if (msg.includes('resumo') || msg.includes('panorama') || msg.includes('geral') || msg.includes('dashboard') || msg.includes('resumo')) {
        return `📋 **Resumo do Portfólio**\n- ${activeProps.length} imóveis ativos\n- ${leads.length} leads (${hotLeads.length} quentes)\n- ${contracts.length} contratos\n- Receita: ${formatCurrency(totalRevenue)}\n\nUse perguntas mais específicas para detalhes.`;
    }

    return `💡 Entendi sua pergunta sobre "${message}".\n\nAtualmente seu portfólio tem:\n- ${activeProps.length} imóveis ativos\n- ${leads.length} leads registrados\n- ${contracts.length} contratos\n\nPergunte sobre leads, imóveis, preços ou contratos para mais detalhes!`;
}

export async function generateMarketingContent(
    property: Property,
    _platform: string,
    _format: string,
    tone: string
): Promise<{ caption: string; headline: string }> {
    return {
        caption: `🏡 ${property.title}\n\n💎 ${property.beds} quartos | ${property.baths} banheiros | ${property.area}m²\n📍 ${property.location}\n💰 ${formatCurrency(Number(property.price) || 0)}\n\nAgende sua visita! 📞`,
        headline: tone === 'urgent' ? 'ÚLTIMA UNIDADE!' : tone === 'viral' ? 'O APÊ DOS SONHOS 😍' : 'EXCLUSIVIDADE E LUXO',
    };
}
