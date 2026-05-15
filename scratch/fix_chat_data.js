import { neon } from '@neondatabase/serverless';

const databaseUrl = "postgresql://neondb_owner:npg_eQ8Gy7NbdYrI@ep-sweet-fog-ac1yy0y5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(databaseUrl);

async function fixData() {
    try {
        console.log("Fixing conversation IDs and user IDs...");

        // Update 'owner1' to match Carlos Santos (ID 1)
        await sql`UPDATE conversations SET id = '1', user_id = '1' WHERE id = 'owner1'`;
        await sql`UPDATE messages SET conversation_id = '1' WHERE conversation_id = 'owner1'`;

        // Update 'owner2' to match Ana Oliveira (ID 2)
        await sql`UPDATE conversations SET id = '2', user_id = '2' WHERE id = 'owner2'`;
        await sql`UPDATE messages SET conversation_id = '2' WHERE conversation_id = 'owner2'`;

        console.log("✅ Data mapping fixed.");

    } catch (e) {
        console.error("Fix error:", e.message);
    }
}

fixData();
