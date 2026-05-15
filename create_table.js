import fs from 'fs';
import { neon } from '@neondatabase/serverless';

const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrlMatch = envFile.match(/VITE_DATABASE_URL=(.*)/);
if (dbUrlMatch) {
    const dbUrl = dbUrlMatch[1].trim();
    const sql = neon(dbUrl);
    sql`CREATE TABLE IF NOT EXISTS system_settings (key VARCHAR(255) PRIMARY KEY, value TEXT, updated_at TIMESTAMP DEFAULT NOW())`
        .then(() => console.log('Table system_settings created or already exists.'))
        .catch(console.error);
} else {
    console.error('VITE_DATABASE_URL not found in .env');
}
