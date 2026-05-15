import fs from 'fs';
import { neon } from '@neondatabase/serverless';

const envFile = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
const dbUrlMatch = envFile.match(/VITE_DATABASE_URL=(.*)/);

if (!dbUrlMatch) {
    console.error('VITE_DATABASE_URL not found in .env.local');
    process.exit(1);
}

const dbUrl = dbUrlMatch[1].trim();
const sql = neon(dbUrl);

async function setup() {
    console.log('Ensuring push_subscriptions table...');
    try {
        await sql`CREATE TABLE IF NOT EXISTS push_subscriptions (
            id SERIAL PRIMARY KEY,
            endpoint TEXT UNIQUE NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            user_id TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )`;
        console.log('Table "push_subscriptions" ready.');
    } catch (error) {
        console.error('Error creating push_subscriptions table:', error);
    }
}

setup();
