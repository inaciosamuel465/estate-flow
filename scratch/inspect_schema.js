import { neon } from '@neondatabase/serverless';

const databaseUrl = "postgresql://neondb_owner:npg_eQ8Gy7NbdYrI@ep-sweet-fog-ac1yy0y5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(databaseUrl);

async function inspect() {
    try {
        console.log("Inspecting 'conversations' table schema...");
        const result = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'conversations'
        `;
        console.log("Columns in 'conversations':", JSON.stringify(result, null, 2));

        console.log("\nInspecting 'messages' table schema...");
        const resultMsgs = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'messages'
        `;
        console.log("Columns in 'messages':", JSON.stringify(resultMsgs, null, 2));

    } catch (e) {
        console.error("Inspection error:", e.message);
    }
}

inspect();
