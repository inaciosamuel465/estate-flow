import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/VITE_DATABASE_URL=(.+)/);
const dbUrl = match ? match[1].trim() : process.env.VITE_DATABASE_URL;

const sql = neon(dbUrl);

async function main() {
    try {
        console.log("Adicionando coluna avatar...");
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`;
        console.log("Coluna avatar adicionada com sucesso.");
    } catch (err) {
        console.error("Erro:", err);
    }
}
main();
