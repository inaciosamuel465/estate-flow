import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/VITE_DATABASE_URL=(.*)/);
const dbUrl = match[1].trim();
const sql = neon(dbUrl);

async function migrate() {
  console.log('Criando tabela uploads...');
  await sql`
    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      data TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      category TEXT DEFAULT 'general',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log('Tabela uploads pronta.');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_uploads_company ON uploads(company_id)
  `;
  console.log('Índice idx_uploads_company criado.');
}

migrate().catch(console.error);
