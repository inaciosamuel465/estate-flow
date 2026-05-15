import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:npg_eQ8Gy7NbdYrI@ep-sweet-fog-ac1yy0y5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

async function seed() {
    try {
        console.log("Seeding database with updated schema...");

        // 1. Users
        const users = [
            { id: 'admin1', name: 'Ricardo Admin', email: 'admin@estateflow.com', role: 'admin', password: 'admin', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' },
            { id: 'owner1', name: 'Carlos Santos', email: 'carlos@owner.com', role: 'owner', phone: '(11) 98888-1111', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
            { id: 'owner2', name: 'Ana Oliveira', email: 'ana@owner.com', role: 'owner', phone: '(11) 98888-2222', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
            { id: 'client1', name: 'João Silva', email: 'joao@client.com', role: 'client', phone: '(11) 97777-1111', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100' },
            { id: 'client2', name: 'Maria Souza', email: 'maria@client.com', role: 'client', phone: '(11) 97777-2222', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100' }
        ];

        for (const u of users) {
            await sql`
                INSERT INTO users (id, name, email, role, phone, avatar, password)
                VALUES (${u.id}, ${u.name}, ${u.email}, ${u.role}, ${u.phone}, ${u.avatar}, ${u.password})
                ON CONFLICT (id) DO UPDATE SET 
                    name = EXCLUDED.name, 
                    email = EXCLUDED.email, 
                    role = EXCLUDED.role, 
                    phone = EXCLUDED.phone, 
                    avatar = EXCLUDED.avatar
            `;
        }

        // 2. Properties
        const properties = [
            {
                id: 'prop1',
                title: 'Mansão Contemporânea Alphaville',
                price: 'R$ 8.500.000',
                location: 'Alphaville - Barueri, SP',
                category: 'Casas',
                type: 'Casa',
                purpose: 'sale',
                beds: 5,
                baths: 7,
                area: 850,
                image: '/assets/properties/villa.png',
                status: 'active',
                ownerId: 'owner1',
                specs: [{ icon: 'bed', value: '5 Suítes' }, { icon: 'bathtub', value: '7' }, { icon: 'square_foot', value: '850m²' }],
                description: 'Uma obra-prima da arquitetura contemporânea.'
            },
            {
                id: 'prop2',
                title: 'Cobertura Duplex Vila Nova',
                price: 'R$ 12.000 /mês',
                location: 'Vila Nova Conceição - SP',
                category: 'Apartamentos',
                type: 'Cobertura',
                purpose: 'rent',
                beds: 3,
                baths: 4,
                area: 320,
                image: '/assets/properties/apartment.png',
                status: 'rented',
                ownerId: 'owner2',
                specs: [{ icon: 'bed', value: '3 Suítes' }, { icon: 'square_foot', value: '320m²' }],
                description: 'Exclusiva cobertura com terraço gourmet.'
            },
            {
                id: 'prop3',
                title: 'Casa de Campo Atibaia',
                price: 'R$ 2.800.000',
                location: 'Atibaia, SP',
                category: 'Casas',
                type: 'Casa de Campo',
                purpose: 'sale',
                beds: 4,
                baths: 3,
                area: 1500,
                image: '/assets/properties/house.png',
                status: 'active',
                ownerId: 'owner1',
                specs: [{ icon: 'bed', value: '4' }, { icon: 'square_foot', value: '1500m²' }],
                description: 'Refúgio perfeito com pomar.'
            }
        ];

        for (const p of properties) {
            await sql`
                INSERT INTO properties (id, title, price, location, category, type, purpose, beds, baths, area, image, status, owner_id, specs, description)
                VALUES (${p.id}, ${p.title}, ${p.price}, ${p.location}, ${p.category}, ${p.type}, ${p.purpose}, ${p.beds}, ${p.baths}, ${p.area}, ${p.image}, ${p.status}, ${p.ownerId}, ${JSON.stringify(p.specs)}, ${p.description})
                ON CONFLICT (id) DO UPDATE SET 
                    title = EXCLUDED.title, price = EXCLUDED.price, status = EXCLUDED.status
            `;
        }

        // 3. Leads
        await sql`DELETE FROM leads`;
        const leads = [
            { name: 'Gabriel Mendes', email: 'gabriel@email.com', phone: '(11) 99999-0001', message: 'Interesse na mansão.', propertyId: 'prop1', propertyTitle: 'Mansão Contemporânea Alphaville', score: 85, status: 'new' },
            { name: 'Fernanda Lima', email: 'fernanda@email.com', phone: '(11) 99999-0002', message: 'Visita na cobertura.', propertyId: 'prop2', propertyTitle: 'Cobertura Duplex Vila Nova', score: 92, status: 'contacted' }
        ];

        for (const l of leads) {
            await sql`
                INSERT INTO leads (name, email, phone, message, property_id, property_title, score, status)
                VALUES (${l.name}, ${l.email}, ${l.phone}, ${l.message}, ${l.propertyId}, ${l.propertyTitle}, ${l.score}, ${l.status})
            `;
        }

        // 4. Contracts
        const contracts = [
            {
                id: 101, propertyId: 'prop2', propertyTitle: 'Cobertura Duplex Vila Nova', propertyImage: '/assets/properties/apartment.png',
                type: 'rent', status: 'active', clientId: 'client1', clientName: 'João Silva', clientPhone: '(11) 97777-1111',
                ownerId: 'owner2', ownerName: 'Ana Oliveira', ownerPhone: '(11) 98888-2222', value: 12000, commissionRate: 10,
                dueDay: 5, startDate: '2026-01-01', nextPaymentStatus: 'paid'
            }
        ];

        for (const c of contracts) {
            await sql`
                INSERT INTO contracts (id, property_id, property_title, property_image, type, status, client_id, client_name, client_phone, owner_id, owner_name, owner_phone, value, commission_rate, due_day, start_date, next_payment_status)
                VALUES (${c.id}, ${c.propertyId}, ${c.propertyTitle}, ${c.propertyImage}, ${c.type}, ${c.status}, ${c.clientId}, ${c.clientName}, ${c.clientPhone}, ${c.ownerId}, ${c.ownerName}, ${c.ownerPhone}, ${c.value}, ${c.commissionRate}, ${c.dueDay}, ${c.startDate}, ${c.nextPaymentStatus})
                ON CONFLICT (id) DO NOTHING
            `;
        }

        console.log("Seeding completed successfully!");
    } catch (err) {
        console.error("Error seeding data:", err);
    }
}

seed();
