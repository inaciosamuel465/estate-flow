import { neon } from '@neondatabase/serverless';

const databaseUrl = "postgresql://neondb_owner:npg_eQ8Gy7NbdYrI@ep-sweet-fog-ac1yy0y5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(databaseUrl);

async function debugChat() {
    try {
        console.log("Checking conversations...");
        const convs = await sql`SELECT * FROM conversations`;
        console.log(`Found ${convs.length} conversations.`);
        console.log(JSON.stringify(convs, null, 2));

        console.log("\nChecking messages...");
        const msgs = await sql`SELECT * FROM messages ORDER BY timestamp DESC LIMIT 5`;
        console.log(`Found ${msgs.length} messages (showing last 5).`);
        console.log(JSON.stringify(msgs, null, 2));

    } catch (e) {
        console.error("Debug error:", e.message);
    }
}

debugChat();
