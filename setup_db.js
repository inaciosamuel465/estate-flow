import fs from 'fs';
import { neon } from '@neondatabase/serverless';

const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrlMatch = envFile.match(/VITE_DATABASE_URL=(.*)/);

if (!dbUrlMatch) {
    console.error('VITE_DATABASE_URL not found in .env.local');
    process.exit(1);
}

const dbUrl = dbUrlMatch[1].trim();
const sql = neon(dbUrl);

async function setup() {
    console.log('Initializing database setup...');

    try {
        // 1. System Settings
        await sql`CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR(255) PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP DEFAULT NOW()
        )`;
        console.log('Table "system_settings" ready.');

        // 2. Users
        await sql`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            role TEXT DEFAULT 'client',
            document TEXT,
            address TEXT,
            favorites JSONB DEFAULT '[]',
            password TEXT,
            avatar TEXT,
            company_id TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )`;
        await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key`;
        await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_company_email_idx ON users (company_id, lower(email))`;
        console.log('Table "users" ready.');

        // 3. Properties
        await sql`CREATE TABLE IF NOT EXISTS properties (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            location TEXT,
            area NUMERIC,
            total_area NUMERIC,
            price TEXT,
            type TEXT,
            purpose TEXT,
            owner_id TEXT,
            status TEXT DEFAULT 'active',
            images JSONB DEFAULT '[]',
            image TEXT,
            address_details JSONB DEFAULT '{}',
            amenities JSONB DEFAULT '[]',
            beds INTEGER DEFAULT 0,
            baths INTEGER DEFAULT 0,
            stats JSONB DEFAULT '{"views": 0, "leads": 0, "likes": 0}',
            description TEXT,
            tag TEXT,
            views_count INTEGER DEFAULT 0,
            leads_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        )`;
        console.log('Table "properties" ready.');

        // 4. Contracts
        await sql`CREATE TABLE IF NOT EXISTS contracts (
            id TEXT PRIMARY KEY,
            property_id TEXT,
            client_id TEXT,
            owner_id TEXT,
            type TEXT,
            status TEXT DEFAULT 'pending',
            value NUMERIC,
            commission_rate NUMERIC,
            due_day INTEGER,
            start_date TEXT,
            end_date TEXT,
            next_payment_status TEXT DEFAULT 'pending',
            template_type TEXT,
            custom_content TEXT,
            signature_status TEXT DEFAULT 'pending',
            signature_image TEXT,
            signed_at TIMESTAMP,
            installments_total INTEGER,
            installments_paid INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        )`;
        console.log('Table "contracts" ready.');

        // 5. Leads
        await sql`CREATE TABLE IF NOT EXISTS leads (
            id SERIAL PRIMARY KEY,
            property_id TEXT,
            property_title TEXT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            message TEXT,
            status TEXT DEFAULT 'new',
            score INTEGER DEFAULT 50,
            source TEXT DEFAULT 'website',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`;
        console.log('Table "leads" ready.');

        // 6. Notifications
        await sql`CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id TEXT,
            type TEXT,
            title TEXT,
            message TEXT,
            action_url TEXT,
            icon TEXT,
            priority TEXT DEFAULT 'medium',
            read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        )`;
        console.log('Table "notifications" ready.');

        // 7. Activity Log
        await sql`CREATE TABLE IF NOT EXISTS activity_log (
            id SERIAL PRIMARY KEY,
            user_id TEXT,
            user_name TEXT,
            action TEXT,
            entity_type TEXT,
            entity_id TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )`;
        console.log('Table "activity_log" ready.');

        // 8. Marketing Campaigns
        await sql`CREATE TABLE IF NOT EXISTS marketing_campaigns (
            id SERIAL PRIMARY KEY,
            user_id TEXT,
            property_id TEXT,
            property_title TEXT,
            platform TEXT,
            format TEXT,
            tone TEXT,
            template TEXT,
            generated_text TEXT,
            headline TEXT,
            image_url TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )`;
        console.log('Table "marketing_campaigns" ready.');

        // 9. Property Views
        await sql`CREATE TABLE IF NOT EXISTS property_views (
            id SERIAL PRIMARY KEY,
            property_id TEXT,
            user_id TEXT,
            source TEXT DEFAULT 'web',
            viewed_at TIMESTAMP DEFAULT NOW()
        )`;
        console.log('Table "property_views" ready.');

        console.log('Database setup completed successfully!');
    } catch (error) {
        console.error('Error during database setup:', error);
    }
}

setup();
