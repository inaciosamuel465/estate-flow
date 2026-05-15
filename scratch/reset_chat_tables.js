import { neon } from '@neondatabase/serverless';

const databaseUrl = "postgresql://neondb_owner:npg_eQ8Gy7NbdYrI@ep-sweet-fog-ac1yy0y5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(databaseUrl);

async function resetChat() {
    try {
        console.log("Re-initializing chat tables with correct constraints...");

        // 1. Drop existing if they are broken (OPTIONAL: better to just alter but if they are simulation ones, let's make sure)
        // We won't drop to avoid data loss if user has some data, but we will ensure PKs exist.
        
        await sql`
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                user_name TEXT,
                user_avatar TEXT,
                user_role TEXT,
                last_message TEXT,
                last_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                unread_count INTEGER DEFAULT 0,
                participants TEXT[] DEFAULT '{}',
                type TEXT DEFAULT 'direct'
            )
        `;
        console.log("✅ 'conversations' table verified/created.");

        await sql`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
                sender_id TEXT NOT NULL,
                sender_name TEXT,
                text TEXT NOT NULL,
                type TEXT DEFAULT 'text',
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                contract_id TEXT,
                attachment TEXT
            )
        `;
        console.log("✅ 'messages' table verified/created.");

        // Ensure PK on conversations(id) if it was created without it
        try {
            await sql`ALTER TABLE conversations ADD PRIMARY KEY (id)`;
        } catch (e) {
            console.log("   (Conversations PK already exists)");
        }

        console.log("\nSyncing column types...");
        await sql`ALTER TABLE conversations ALTER COLUMN participants SET DEFAULT '{}'`;

        console.log("\n🎉 Chat system database structure is now healthy.");

    } catch (e) {
        console.error("Initialization error:", e.message);
    }
}

resetChat();
