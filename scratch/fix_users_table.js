import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:npg_eQ8Gy7NbdYrI@ep-sweet-fog-ac1yy0y5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

async function migrate() {
    try {
        console.log("Running migrations...");

        // Users table
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
        
        // Check if avatar column exists, add if not (if table already existed)
        try {
            await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`;
            await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`;
            await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT`;
            await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS favorites JSONB DEFAULT '[]'`;
        } catch (e) {
            console.log("Columns might already exist.");
        }

        console.log("Migration completed.");
    } catch (err) {
        console.error("Migration error:", err);
    }
}

migrate();
