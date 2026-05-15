import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:npg_eQ8Gy7NbdYrI@ep-sweet-fog-ac1yy0y5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

async function seed() {
    try {
        console.log("Final seeding with all 5 properties and correct paths...");

        // 2. Properties
        const properties = [
            { id: 'prop1', title: 'Mansão Contemporânea Alphaville', price: 'R$ 8.500.000', location: 'Alphaville - Barueri, SP', category: 'Casas', type: 'Casa', purpose: 'sale', beds: 5, baths: 7, area: 850, image: 'assets/properties/villa.png', status: 'active', ownerId: 'owner1' },
            { id: 'prop2', title: 'Cobertura Duplex Vila Nova', price: 'R$ 12.000 /mês', location: 'Vila Nova Conceição - SP', category: 'Apartamentos', type: 'Apartamento', purpose: 'rent', beds: 3, baths: 4, area: 320, image: 'assets/properties/apartment.png', status: 'active', ownerId: 'owner2' },
            { id: 'prop3', title: 'Casa de Campo Atibaia', price: 'R$ 2.800.000', location: 'Atibaia, SP', category: 'Casas', type: 'Casa', purpose: 'sale', beds: 4, baths: 3, area: 1500, image: 'assets/properties/house.png', status: 'active', ownerId: 'owner1' },
            { id: 'prop4', title: 'Loft Industrial Pinheiros', price: 'R$ 6.500 /mês', location: 'Pinheiros - São Paulo, SP', category: 'Apartamentos', type: 'Apartamento', purpose: 'rent', beds: 1, baths: 2, area: 85, image: 'assets/properties/loft.png', status: 'active', ownerId: 'owner2' },
            { id: 'prop5', title: 'Laje Corporativa Paulista', price: 'R$ 45.000 /mês', location: 'Av. Paulista - SP', category: 'Comercial', type: 'Comercial', purpose: 'rent', beds: 0, baths: 4, area: 600, image: 'assets/properties/office.png', status: 'active', ownerId: 'admin1' }
        ];

        for (const p of properties) {
            await sql`
                INSERT INTO properties (id, title, price, location, category, type, purpose, beds, baths, area, image, status, owner_id)
                VALUES (${p.id}, ${p.title}, ${p.price}, ${p.location}, ${p.category}, ${p.type}, ${p.purpose}, ${p.beds}, ${p.baths}, ${p.area}, ${p.image}, ${p.status}, ${p.ownerId})
                ON CONFLICT (id) DO UPDATE SET 
                    image = EXCLUDED.image,
                    status = EXCLUDED.status,
                    type = EXCLUDED.type
            `;
        }

        console.log("Final seed completed.");
    } catch (err) {
        console.error("Seed error:", err);
    }
}

seed();
