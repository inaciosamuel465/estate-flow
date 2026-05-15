import { neon } from '@neondatabase/serverless';

const databaseUrl = "postgresql://neondb_owner:npg_eQ8Gy7NbdYrI@ep-sweet-fog-ac1yy0y5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(databaseUrl);

async function alterTable() {
    console.log("Adding password column to users table...");
    try {
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT`;
        console.log("Success!");
    } catch (e) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}

alterTable();
