import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:npg_eQ8Gy7NbdYrI@ep-sweet-fog-ac1yy0y5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

async function fix() {
    try {
        console.log("Fixing tables...");
        
        const tables = ['properties', 'contracts', 'leads', 'notifications', 'activity_log'];
        
        // Properties fixes
        await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS category TEXT`;
        await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS type TEXT`;
        await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS purpose TEXT`;
        await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS beds INTEGER`;
        await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS baths INTEGER`;
        await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS area NUMERIC`;
        await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS specs JSONB`;
        await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'`;
        await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'`;

        // Contracts fixes
        await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS property_title TEXT`;
        await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS property_image TEXT`;
        await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_name TEXT`;
        await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_phone TEXT`;
        await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_name TEXT`;
        await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_phone TEXT`;
        await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS commission_rate NUMERIC`;
        await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS due_day INTEGER`;
        await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS start_date TEXT`;
        await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS next_payment_status TEXT`;
        await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS installments_total INTEGER`;
        await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS installments_paid INTEGER`;
        await sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS last_payment_date TEXT`;

        console.log("Fix completed.");
    } catch (err) {
        console.error("Fix error:", err);
    }
}

fix();
