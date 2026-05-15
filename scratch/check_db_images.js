import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:npg_eQ8Gy7NbdYrI@ep-sweet-fog-ac1yy0y5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

async function check() {
    try {
        const rows = await sql`SELECT id, title, image FROM properties`;
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    }
}

check();
