import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:npg_eQ8Gy7NbdYrI@ep-sweet-fog-ac1yy0y5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

async function migrate() {
    try {
        console.log("Running comprehensive migration...");

        // 1. Users Table
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                role TEXT NOT NULL DEFAULT 'client',
                phone TEXT,
                avatar TEXT,
                password TEXT,
                favorites JSONB DEFAULT '[]'
            )
        `;

        // 2. Properties Table
        await sql`
            CREATE TABLE IF NOT EXISTS properties (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                price TEXT NOT NULL,
                location TEXT NOT NULL,
                image TEXT,
                category TEXT,
                type TEXT,
                purpose TEXT,
                beds INTEGER,
                baths INTEGER,
                area NUMERIC,
                status TEXT DEFAULT 'active',
                owner_id TEXT REFERENCES users(id),
                specs JSONB,
                description TEXT,
                amenities JSONB DEFAULT '[]',
                images JSONB DEFAULT '[]'
            )
        `;

        // 3. Leads Table
        await sql`
            CREATE TABLE IF NOT EXISTS leads (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                message TEXT,
                property_id TEXT REFERENCES properties(id),
                property_title TEXT,
                score INTEGER DEFAULT 0,
                status TEXT DEFAULT 'new',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // 4. Contracts Table
        await sql`
            CREATE TABLE IF NOT EXISTS contracts (
                id SERIAL PRIMARY KEY,
                property_id TEXT REFERENCES properties(id),
                property_title TEXT,
                property_image TEXT,
                type TEXT,
                status TEXT,
                client_id TEXT REFERENCES users(id),
                client_name TEXT,
                client_phone TEXT,
                owner_id TEXT REFERENCES users(id),
                owner_name TEXT,
                owner_phone TEXT,
                value NUMERIC,
                commission_rate NUMERIC,
                due_day INTEGER,
                start_date TEXT,
                end_date TEXT,
                next_payment_status TEXT,
                installments_total INTEGER,
                installments_paid INTEGER,
                last_payment_date TEXT,
                custom_content TEXT
            )
        `;

        // 5. Notifications Table
        await sql`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id TEXT REFERENCES users(id),
                type TEXT,
                title TEXT,
                message TEXT,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                read BOOLEAN DEFAULT FALSE,
                action_url TEXT,
                icon TEXT
            )
        `;

        // 6. Activity Log Table
        await sql`
            CREATE TABLE IF NOT EXISTS activity_log (
                id SERIAL PRIMARY KEY,
                user_id TEXT,
                user_name TEXT,
                action TEXT,
                target_type TEXT,
                target_id TEXT,
                details TEXT,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Ensure columns exist for existing tables
        try {
            await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS category TEXT`;
            await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS specs JSONB`;
            await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'`;
            await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'`;
        } catch (e) {}

        console.log("Migration completed.");
    } catch (err) {
        console.error("Migration error:", err);
    }
}

migrate();
