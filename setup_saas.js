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

async function migrate() {
  console.log('=== Migração SaaS Multi-Tenant ===\n');

  try {
    // 1. Criar tabela companies
    console.log('1. Criando tabela companies...');
    await sql`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT,
        subdomain TEXT,
        cnpj TEXT,
        email TEXT,
        phone TEXT,
        logo_url TEXT,
        favicon_url TEXT,
        primary_color TEXT DEFAULT '#2563eb',
        secondary_color TEXT DEFAULT '#1e40af',
        status TEXT DEFAULT 'active',
        plan TEXT DEFAULT 'free',
        trial_ends_at TIMESTAMP,
        subscription_status TEXT DEFAULT 'trialing',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('   Tabela companies pronta.');

    // 2. Criar tabela subscriptions
    console.log('2. Criando tabela subscriptions...');
    await sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        plan_name TEXT NOT NULL DEFAULT 'free',
        status TEXT DEFAULT 'trialing',
        payment_gateway TEXT,
        gateway_subscription_id TEXT,
        started_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        trial BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('   Tabela subscriptions pronta.');

    // 3. Criar tabela payments
    console.log('3. Criando tabela payments...');
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
        gateway_payment_id TEXT,
        amount NUMERIC NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('   Tabela payments pronta.');

    // 4. Criar tabela company_settings
    console.log('4. Criando tabela company_settings...');
    await sql`
      CREATE TABLE IF NOT EXISTS company_settings (
        company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
        company_name TEXT,
        logo_url TEXT,
        favicon_url TEXT,
        background_image TEXT,
        primary_color TEXT,
        secondary_color TEXT,
        smtp_host TEXT,
        smtp_port INTEGER,
        smtp_user TEXT,
        smtp_password TEXT,
        smtp_secure BOOLEAN DEFAULT false,
        email_sender_name TEXT,
        email_sender_address TEXT,
        whatsapp TEXT,
        instagram TEXT,
        facebook TEXT,
        website TEXT,
        custom_css TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('   Tabela company_settings pronta.');

    // 5. Criar tabela master_users (admins globais, SEPARADA do sistema principal)
    console.log('5. Criando tabela master_users...');
    await sql`
      CREATE TABLE IF NOT EXISTS master_users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('   Tabela master_users pronta.');

    // 5a. Criar tabela agency_requests (solicitacoes de abertura de imobiliaria)
    console.log('5a. Criando tabela agency_requests...');
    await sql`
      CREATE TABLE IF NOT EXISTS agency_requests (
        id TEXT PRIMARY KEY,
        company_name TEXT NOT NULL,
        slug TEXT NOT NULL,
        cnpj TEXT,
        email TEXT,
        phone TEXT,
        admin_name TEXT NOT NULL,
        admin_email TEXT NOT NULL,
        admin_password TEXT,
        admin_note TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('   Tabela agency_requests pronta.');

    await sql`
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT true
    `;
    console.log('   Coluna visible adicionada a companies.');

    // 5b. Criar tabela saas_settings (configuracoes globais do SaaS, apenas o master admin gerencia)
    console.log('5b. Criando tabela saas_settings...');
    await sql`
      CREATE TABLE IF NOT EXISTS saas_settings (
        id TEXT PRIMARY KEY DEFAULT 'global',
        plan_name TEXT NOT NULL DEFAULT 'Mensal',
        plan_price DECIMAL NOT NULL DEFAULT 170,
        billing_email_from TEXT,
        billing_email_cc TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`
      INSERT INTO saas_settings (id, plan_name, plan_price)
      VALUES ('global', 'Mensal', 170)
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('   Tabela saas_settings pronta.');

    // 5c. Criar tabela uploads (arquivos enviados)
    console.log('5c. Criando tabela uploads...');
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
    console.log('   Tabela uploads pronta.');

    // 5d. Criar tabela push_subscriptions (notificacoes push)
    console.log('5d. Criando tabela push_subscriptions...');
    await sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_id TEXT,
        company_id TEXT REFERENCES companies(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('   Tabela push_subscriptions pronta.');

    // ─────────────────────────────────────────────────────────────────────────
    // Adicionar colunas company_id nas tabelas existentes (safe, IF NOT EXISTS)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n6. Adicionando coluna company_id nas tabelas existentes...');

    const tables = [
      { name: 'users', ref: 'companies(id)' },
      { name: 'properties', ref: 'companies(id)' },
      { name: 'contracts', ref: 'companies(id)' },
      { name: 'leads', ref: 'companies(id)' },
      { name: 'notifications', ref: 'companies(id)' },
      { name: 'activity_log', ref: 'companies(id)' },
      { name: 'marketing_campaigns', ref: 'companies(id)' },
      { name: 'property_views', ref: 'companies(id)' },
      { name: 'push_subscriptions', ref: 'companies(id)' },
    ];

    // Nota: sql.unsafe() cria um wrapper UnsafeRawSql - usar dentro de tagged template
    // Pattern: await sql`${sql.unsafe('SQL DINÂMICO AQUI')}`
    for (const table of tables) {
      try {
        await sql`${sql.unsafe(
          `ALTER TABLE ${table.name} ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id)`
        )}`;
        console.log(`   -> ${table.name} + company_id`);
      } catch (err) {
        console.log(`   -> ${table.name}: ${err.message}`);
      }
    }

    // 7. Criar índices para performance
    console.log('\n7. Criando índices para company_id...');
    for (const table of tables) {
      try {
        await sql`${sql.unsafe(
          `CREATE INDEX IF NOT EXISTS idx_${table.name}_company ON ${table.name}(company_id)`
        )}`;
        console.log(`   -> Índice idx_${table.name}_company`);
      } catch (err) {
        console.log(`   -> ${table.name}: ${err.message}`);
      }
    }

    // 8. Seed: Criar empresa default se não existir
    console.log('\n8. Verificando empresa default...');
    const existing = await sql`SELECT id FROM companies WHERE id = 'default'`;
    
    if (existing.length === 0) {
      console.log('   Criando empresa default...');
      await sql`
        INSERT INTO companies (id, name, slug, subdomain, subscription_status, status)
        VALUES ('default', 'EstateFlow', 'estateflow', 'app', 'active', 'active')
      `;
      
      await sql`
        INSERT INTO subscriptions (id, company_id, plan_name, status, trial)
        VALUES ('sub_default', 'default', 'free', 'active', false)
      `;
      
      await sql`
        INSERT INTO company_settings (company_id, company_name)
        VALUES ('default', 'EstateFlow')
      `;

      console.log('   Empresa default criada com sucesso.');
    } else {
      console.log('   Empresa default já existe.');
    }

    // 9. Migrar dados existentes para empresa default
    console.log('\n9. Migrando registros existentes para empresa default...');
    for (const table of tables) {
      try {
        await sql`${sql.unsafe(
          `UPDATE ${table.name} SET company_id = 'default' WHERE company_id IS NULL`
        )}`;
        console.log(`   -> ${table.name} OK`);
      } catch (err) {
        console.log(`   -> ${table.name}: ${err.message}`);
      }
    }

    console.log('\n=== Migração SaaS concluída com sucesso! ===');
  } catch (error) {
    console.error('\nErro durante migração:', error);
    process.exit(1);
  }
}

migrate();
