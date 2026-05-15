import { neon } from '@neondatabase/serverless';

const databaseUrl = "postgresql://neondb_owner:npg_eQ8Gy7NbdYrI@ep-sweet-fog-ac1yy0y5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(databaseUrl);

async function cleanChat() {
    try {
        console.log("Cleaning up corrupted chat data for a fresh start...");
        await sql`DELETE FROM messages`;
        await sql`DELETE FROM conversations`;
        console.log("✅ Chat tables cleared. New messages will now use the correct ID format.");

    } catch (e) {
        console.error("Cleanup error:", e.message);
    }
}

cleanChat();
