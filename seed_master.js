import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/VITE_DATABASE_URL=(.*)/);
const dbUrl = match[1].trim();
const sql = neon(dbUrl);

async function seedMaster() {
  const email = 'sa2007inacio@gmail.com';
  
  const existing = await sql`SELECT id FROM master_users WHERE email = ${email}`;
  if (existing.length > 0) {
    console.log('Master admin já existe.');
    return;
  }

  const password = 'admin123';
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  await sql`
    INSERT INTO master_users (id, name, email, password, role)
    VALUES ('master_admin', 'Admin Master', ${email}, ${hashedPassword}, 'superadmin')
  `;

  console.log('Master admin criado:');
  console.log(`  Email: ${email}`);
  console.log(`  Senha: ${password}`);
  console.log('  Acesse: /master');
}

seedMaster().catch(console.error);
