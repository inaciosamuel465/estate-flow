import { neon } from '@neondatabase/serverless';

const databaseUrl = "postgresql://neondb_owner:npg_eQ8Gy7NbdYrI@ep-sweet-fog-ac1yy0y5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(databaseUrl);

async function wipeData() {
    console.log("Wiping all data from Neon database (keeping structures)...");
    try {
        // Ordem importa por causa de FKs, mas TRUNCATE CASCADE resolve
        await sql`TRUNCATE TABLE users, properties, contracts, conversations, messages, notifications CASCADE`;
        console.log("Database wiped successfully! All tables are now empty.");
    } catch (e) {
        console.error("Error wiping database:", e.message);
        // Fallback para DELETE caso TRUNCATE falhe em alguma permissão
        try {
            console.log("Attempting DELETE FROM fallback...");
            await sql`DELETE FROM messages`;
            await sql`DELETE FROM conversations`;
            await sql`DELETE FROM contracts`;
            await sql`DELETE FROM properties`;
            await sql`DELETE FROM users`;
            await sql`DELETE FROM notifications`;
            console.log("Fallback successful!");
        } catch (e2) {
            console.error("Critical error:", e2.message);
        }
    }
    process.exit(0);
}

wipeData();
