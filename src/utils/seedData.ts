import { Property, Contract, User } from "../types";
import * as neon from "../services/neonService";

// --- DADOS MOCKADOS ORIGINAIS DO APP.TSX ---

const INITIAL_PROPERTIES: Property[] = [
    {
        id: "1",
        title: "Residencial Luxo Augusta",
        price: "R$ 450.000",
        location: "Consolação, SP",
        image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=800&auto=format&fit=crop",
        beds: 2,
        baths: 2,
        area: 80,
        tag: "Destaque",
        type: "Apartamento",
        purpose: 'sale',
        ownerId: "101",
        status: 'active',
        stats: { views: 1240, likes: 45, leads: 12 }
    },
    {
        id: 'cob-paulista-1234',
        title: "Cobertura Panorâmica",
        price: "R$ 2.450.000",
        location: "Bela Vista, SP",
        image: "https://images.unsplash.com/photo-1512918760513-95f192972701?q=80&w=800&auto=format&fit=crop",
        beds: 4,
        baths: 4,
        area: 285,
        tag: "Luxo",
        type: "Apartamento",
        purpose: 'sale',
        ownerId: "102",
        status: 'active',
        stats: { views: 5400, likes: 320, leads: 50 }
    },
    {
        id: "3",
        title: "Studio Moderno Jardins",
        price: "R$ 3.200/mês",
        location: "Jardins, SP",
        image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop",
        beds: 1,
        baths: 1,
        area: 45,
        tag: "Mobiliado",
        type: "Apartamento",
        purpose: 'rent',
        ownerId: "999",
        status: 'rented',
        stats: { views: 800, likes: 20, leads: 5 }
    }
];

const INITIAL_USERS: User[] = [
    { id: "1", name: "Administrador", email: "admin@suite.com", role: "admin", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop" },
    { id: "101", name: "Carlos Proprietário", email: "carlos@email.com", role: "owner", phone: "5511999999999", document: "123.456.789-00", address: "Av. Brasil, 100", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop" },
    { id: "102", name: "Ana Proprietária", email: "ana@email.com", role: "owner", phone: "5511988888888", document: "987.654.321-99", address: "Rua das Flores, 50", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop" },
    { id: "200", name: "João Cliente", email: "joao@email.com", role: "client", phone: "5511977777777", document: "456.123.789-11", address: "Al. Santos, 400", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop" }
];

export const seedDatabase = async () => {
    try {
        console.log("Iniciando Seed Completo no Neon...");

        // 1. Users
        for (const user of INITIAL_USERS) {
            await neon.upsertUser(user);
        }
        console.log("Usuários criados.");

        // 2. Properties
        for (const prop of INITIAL_PROPERTIES) {
            // Using a simple upsert logic if possible or just adding
            // For seed, we assume these are test data
            await neon.addProperty(prop);
        }
        console.log("Propriedades criadas.");

        alert("Todos os dados de exemplo foram migrados para o Neon com sucesso!");
        window.location.reload();

    } catch (e) {
        console.error("Erro no Seed:", e);
        alert("Erro ao criar dados. Veja o console.");
    }
};

