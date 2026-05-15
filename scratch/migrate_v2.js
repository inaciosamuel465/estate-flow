import { neon } from '@neondatabase/serverless';

const databaseUrl = "postgresql://neondb_owner:npg_eQ8Gy7NbdYrI@ep-sweet-fog-ac1yy0y5-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(databaseUrl);

async function migrate() {
    console.log("🚀 EstateFlow v2 — Database Migration Starting...\n");

    try {
        // 1. property_views — rastreamento real de visualizações
        await sql`
            CREATE TABLE IF NOT EXISTS property_views (
                id SERIAL PRIMARY KEY,
                property_id TEXT NOT NULL,
                user_id TEXT,
                viewed_at TIMESTAMP DEFAULT NOW(),
                source TEXT DEFAULT 'web'
            )
        `;
        console.log("✅ property_views — criada");

        // 2. notifications — notificações reais por usuário
        await sql`
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                read BOOLEAN DEFAULT FALSE,
                action_url TEXT,
                icon TEXT,
                priority TEXT DEFAULT 'medium',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;
        console.log("✅ notifications — criada");

        // 3. marketing_campaigns — histórico de campanhas de marketing
        await sql`
            CREATE TABLE IF NOT EXISTS marketing_campaigns (
                id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
                user_id TEXT NOT NULL,
                property_id TEXT,
                property_title TEXT,
                platform TEXT NOT NULL,
                format TEXT NOT NULL,
                tone TEXT,
                template TEXT,
                generated_text TEXT,
                headline TEXT,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;
        console.log("✅ marketing_campaigns — criada");

        // 4. leads — leads capturados por imóvel
        await sql`
            CREATE TABLE IF NOT EXISTS leads (
                id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
                property_id TEXT NOT NULL,
                property_title TEXT,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                message TEXT,
                status TEXT DEFAULT 'new',
                score INTEGER DEFAULT 50,
                source TEXT DEFAULT 'website',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `;
        console.log("✅ leads — criada");

        // 5. activity_log — log de atividades do sistema
        await sql`
            CREATE TABLE IF NOT EXISTS activity_log (
                id SERIAL PRIMARY KEY,
                user_id TEXT,
                user_name TEXT,
                action TEXT NOT NULL,
                entity_type TEXT,
                entity_id TEXT,
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;
        console.log("✅ activity_log — criada");

        // 6. Adicionar coluna description às properties se não existir
        try {
            await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS description TEXT`;
            console.log("✅ properties.description — coluna adicionada");
        } catch(e) { console.log("   properties.description — já existe"); }

        // 7. Adicionar coluna image (thumbnail principal) às properties se não existir
        try {
            await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS image TEXT`;
            console.log("✅ properties.image — coluna adicionada");
        } catch(e) { console.log("   properties.image — já existe"); }

        // 8. Adicionar coluna tag às properties
        try {
            await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS tag TEXT`;
            console.log("✅ properties.tag — coluna adicionada");
        } catch(e) { console.log("   properties.tag — já existe"); }

        // 9. Adicionar views_count para cache rápido
        try {
            await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0`;
            console.log("✅ properties.views_count — coluna adicionada");
        } catch(e) { console.log("   properties.views_count — já existe"); }

        // 10. leads_count
        try {
            await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS leads_count INTEGER DEFAULT 0`;
            console.log("✅ properties.leads_count — coluna adicionada");
        } catch(e) { console.log("   properties.leads_count — já existe"); }

        // 11. Índices para performance
        await sql`CREATE INDEX IF NOT EXISTS idx_property_views_property_id ON property_views(property_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_property_views_viewed_at ON property_views(viewed_at)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_leads_property_id ON leads(property_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_user_id ON marketing_campaigns(user_id)`;
        console.log("✅ Índices de performance — criados");

        console.log("\n🎉 Migração v2 concluída com sucesso!");
        console.log("📊 Tabelas disponíveis: property_views, notifications, marketing_campaigns, leads, activity_log");

    } catch (e) {
        console.error("❌ Erro na migração:", e.message);
    }
    process.exit(0);
}

migrate();
