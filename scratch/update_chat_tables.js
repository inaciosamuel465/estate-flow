import { neon } from '@neondatabase/serverless';

const databaseUrl = "postgresql://neondb_owner:npg_eQ8Gy7NbdYrI@ep-sweet-fog-ac1yy0y5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(databaseUrl);

async function migrate() {
    try {
        console.log("Updating 'conversations' table schema...");
        await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id TEXT`;
        await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_name TEXT`;
        await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_avatar TEXT`;
        await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_role TEXT`;
        await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0`;
        console.log("✅ 'conversations' table updated.");

        console.log("\nUpdating 'messages' table schema...");
        await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment TEXT`;
        console.log("✅ 'messages' table updated.");

    } catch (e) {
        console.error("Migration error:", e.message);
    }
}

migrate();
