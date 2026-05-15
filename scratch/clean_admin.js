import { neon } from '@neondatabase/serverless';

const databaseUrl = "postgresql://neondb_owner:npg_eQ8Gy7NbdYrI@ep-sweet-fog-ac1yy0y5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(databaseUrl);

async function cleanAdmin() {
    console.log("Cleaning up existing admin@estateflow.com user to allow fresh registration...");
    try {
        await sql`DELETE FROM users WHERE email = 'admin@estateflow.com'`;
        console.log("Success!");
    } catch (e) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}

cleanAdmin();
