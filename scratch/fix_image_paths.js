import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:npg_eQ8Gy7NbdYrI@ep-sweet-fog-ac1yy0y5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

async function fixPaths() {
    try {
        console.log("Fixing image paths (removing leading slash)...");
        
        await sql`UPDATE properties SET image = 'assets/properties/villa.png' WHERE id = 'prop1'`;
        await sql`UPDATE properties SET image = 'assets/properties/apartment.png' WHERE id = 'prop2'`;
        await sql`UPDATE properties SET image = 'assets/properties/house.png' WHERE id = 'prop3'`;
        await sql`UPDATE properties SET image = 'assets/properties/loft.png' WHERE id = 'prop4'`;
        await sql`UPDATE properties SET image = 'assets/properties/office.png' WHERE id = 'prop5'`;

        console.log("Fix completed.");
    } catch (err) {
        console.error("Fix error:", err);
    }
}

fixPaths();
