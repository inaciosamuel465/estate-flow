import { GoogleGenAI } from "@google/genai";
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

const FALLBACK_INSIGHT: AIInsight = {
    summary: "IA pronta para análise. Processando dados do seu portfólio...",
    hotLeads: ["Analisando leads recentes..."],
    stagnatedProperties: [],
    priceRecommendation: "Aguardando processamento de dados...",
    weeklyHighlight: "Resumo semanal em processamento.",
    actionItems: ["Aguardando recomendações da IA"],
};

function buildContextPrompt(
    properties: Property[],
    leads: Lead[],
    contracts: Contract[]
): string {
    const activeProps = properties.filter(p => p.status === 'active' || !p.status);
    const totalViews = activeProps.reduce((acc, p) => acc + (p.stats?.views || 0), 0);
    const newLeads = leads.filter(l => l.status === 'new').length;
    const hotLeads = leads.filter(l => l.score >= 70);
    const activeContracts = contracts.filter(c => c.status === 'active').length;

    const propertyContext = activeProps.slice(0, 10).map(p =>
        `- "${p.title}" (${p.type}, ${p.location}): R$ ${p.price}, ${p.stats?.views || 0} views, ${p.stats?.leads || 0} leads`
    ).join('\n');

    const leadContext = leads.slice(0, 15).map(l =>
        `- ${l.name} (score ${l.score}): ${l.propertyTitle || 'imóvel não especificado'}, status: ${l.status}, origem: ${l.source}`
    ).join('\n');

    return `
Você é o motor de IA do EstateFlow, uma plataforma de gestão imobiliária profissional.
Analise os dados abaixo e gere insights acionáveis em PORTUGUÊS do Brasil.

=== PORTFÓLIO ATUAL ===
- ${activeProps.length} imóveis ativos
- ${totalViews} visualizações totais
- Imóveis:
${propertyContext}

=== LEADS ===  
- ${leads.length} leads no total
- ${newLeads} leads novos (não contactados)
- ${hotLeads.length} leads quentes (score ≥ 70)
- Leads recentes:
${leadContext}

=== CONTRATOS ===
- ${activeContracts} contratos ativos de ${contracts.length} total

=== INSTRUÇÕES ===
Responda APENAS com um JSON válido, sem markdown, no seguinte formato:
{
  "summary": "Resumo executivo em 2-3 frases sobre o estado do negócio",
  "hotLeads": ["Nome do lead mais quente e por quê (máx 3 itens)"],
  "stagnatedProperties": ["Nome do imóvel estagnado e sugestão (máx 3 itens)"],
  "priceRecommendation": "Uma recomendação específica sobre preços baseada nos dados",
  "weeklyHighlight": "O evento ou métrica mais importante desta semana em 1 frase",
  "actionItems": ["Ação prioritária 1", "Ação prioritária 2", "Ação prioritária 3"]
}
    `.trim();
}

export async function generateAIInsight(
    properties: Property[],
    leads: Lead[],
    contracts: Contract[]
): Promise<AIInsight> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return FALLBACK_INSIGHT;

    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = buildContextPrompt(properties, leads, contracts);

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: { parts: [{ text: prompt }] },
        });

        const text = response.text || '';
        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in response');

        const parsed = JSON.parse(jsonMatch[0]);
        return {
            summary: parsed.summary || '',
            hotLeads: parsed.hotLeads || [],
            stagnatedProperties: parsed.stagnatedProperties || [],
            priceRecommendation: parsed.priceRecommendation || '',
            weeklyHighlight: parsed.weeklyHighlight || '',
            actionItems: parsed.actionItems || [],
        };
    } catch (e: any) {
        console.error('AI Insight error:', e);
        
        let errorMessage = 'Erro ao gerar análise. Tente novamente.';
        if (e.message?.includes('403') || e.status === 403) {
            errorMessage = "API Gemini desativada. Ative em: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview";
        }

        return {
            ...FALLBACK_INSIGHT,
            summary: errorMessage,
            error: errorMessage,
        };
    }
}

export async function chatWithAI(
    message: string,
    context: {
        properties: Property[];
        leads: Lead[];
        contracts: Contract[];
    },
    history: AIMessage[] = []
): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        return "⚠️ Configure a variável VITE_GEMINI_API_KEY no .env.local para usar o chat de IA.";
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const activeProps = context.properties.filter(p => p.status === 'active' || !p.status);
        const totalRevenue = context.contracts
            .filter(c => c.status === 'active')
            .reduce((acc, c) => acc + Number(c.value || 0), 0);

        const systemContext = `
Você é o assistente de IA do EstateFlow, especialista em mercado imobiliário.
Responda de forma concisa e útil em PORTUGUÊS do Brasil.

Dados atuais do portfólio:
- ${activeProps.length} imóveis ativos
- ${context.leads.length} leads registrados  
- ${context.contracts.length} contratos (receita ativa: R$ ${totalRevenue.toLocaleString('pt-BR')})
- Leads quentes: ${context.leads.filter(l => l.score >= 70).length}
- Imóveis: ${activeProps.slice(0, 5).map(p => `"${p.title}" (${p.price})`).join(', ')}
        `.trim();

        const historyText = history.slice(-6).map(m =>
            `${m.role === 'user' ? 'Usuário' : 'IA'}: ${m.text}`
        ).join('\n');

        const fullPrompt = `${systemContext}\n\n${historyText}\nUsuário: ${message}\nIA:`;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: { parts: [{ text: fullPrompt }] },
        });

        return response.text || 'Não consegui gerar uma resposta. Tente novamente.';
    } catch (e) {
        console.error('AI Chat error:', e);
        return 'Erro ao comunicar com a IA. Verifique sua conexão e API Key.';
    }
}

export async function generateMarketingContent(
    property: Property,
    platform: string,
    format: string,
    tone: string
): Promise<{ caption: string; headline: string }> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    const mock = {
        caption: `🏡 ${property.title}\n\n💎 ${property.beds} quartos | ${property.baths} banheiros | ${property.area}m²\n📍 ${property.location}\n💰 ${property.price}\n\nAgende sua visita! 📞`,
        headline: tone === 'urgent' ? 'ÚLTIMA UNIDADE!' : tone === 'viral' ? 'O APÊ DOS SONHOS 😍' : 'EXCLUSIVIDADE E LUXO',
    };

    if (!apiKey) return mock;

    try {
        const ai = new GoogleGenAI({ apiKey });
        const propertyCtx = `Imóvel: ${property.title}, ${property.beds} quartos, ${property.baths} banheiros, ${property.area}m², Localização: ${property.location}, Preço: ${property.price}, Tipo: ${property.type}, Diferenciais: ${property.amenities?.join(', ') || 'não especificado'}`;

        const captionPrompt = `Você é um especialista em copywriting imobiliário. Crie uma legenda de ALTA CONVERSÃO para ${platform} formato ${format}.
Tom: ${tone} (professional=formal e confiante | viral=energético com emojis | urgent=senso de urgência | minimal=elegante e sóbrio).
${propertyCtx}
REGRAS: Comece com um HOOK irresistível. Benefícios emocionais. CTA claro no final. Máximo 200 palavras. Use emojis estratégicos.
Retorne APENAS a legenda, sem explicações.`;

        const headlinePrompt = `Crie a frase de impacto mais curta (máximo 5 palavras) para ser usada como headline visual de uma arte imobiliária.
Tom: ${tone}. Imóvel: ${property.title}. 
Retorne APENAS a frase, sem pontuação no final, sem aspas.`;

        const [captionRes, headlineRes] = await Promise.all([
            ai.models.generateContent({ model: 'gemini-1.5-flash', contents: { parts: [{ text: captionPrompt }] } }),
            ai.models.generateContent({ model: 'gemini-1.5-flash', contents: { parts: [{ text: headlinePrompt }] } }),
        ]);

        return {
            caption: captionRes.text || mock.caption,
            headline: (headlineRes.text || mock.headline).replace(/"/g, '').trim(),
        };
    } catch (e) {
        console.error('Marketing generation error:', e);
        return mock;
    }
}
