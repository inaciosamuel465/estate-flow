import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { neon } from '@neondatabase/serverless';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      proxy: {
        // We'll handle /api via a custom middleware or proxy if needed
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            const match = id.match(/node_modules[\\/](?:@[^\\/]+[\\/])?[^\\/]+/);
            if (!match) return 'vendor';
            const pkg = match[0].toLowerCase();
            if (/react|scheduler/.test(pkg)) return 'react-vendor';
            if (/html2canvas/.test(pkg)) return 'html2canvas';
            if (/leaflet/.test(pkg)) return 'map-vendor';
            if (/hls\.js/.test(pkg)) return 'hls-vendor';
            if (/dash/.test(pkg)) return 'dash-vendor';
            if (/react-player/.test(pkg)) return 'player-vendor';
            return 'vendor';
          }
        }
      }
    },
    plugins: [
      react(), 
      tailwindcss(),
      // Custom plugin to handle /api routes during local dev (simulating Vercel functions)
      {
        name: 'api-simulator',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/')) {
              // Simulação de Vercel Functions para desenvolvimento local
              res.setHeader('Content-Type', 'application/json');
              
              if (req.url === '/api/push/vapidPublicKey') {
                const publicKey = env.VITE_VAPID_PUBLIC_KEY || env.VAPID_PUBLIC_KEY;
                res.end(JSON.stringify({ publicKey }));
                return;
              }

              if (req.url === '/api/push/subscribe') {
                // Simulação de sucesso
                res.end(JSON.stringify({ success: true }));
                return;
              }

              if (req.url === '/api/push/send' || req.url === '/api/push/broadcast') {
                // Simulação de disparo de push
                res.end(JSON.stringify({ success: true, count: 1 }));
                return;
              }

              if (req.url === '/api/admin/provision') {
                // Simulação de provisionamento
                res.end(JSON.stringify({ success: true, message: 'Simulado com sucesso' }));
                return;
              }

              if (req.url === '/api/email/send') {
                const chunks: Buffer[] = [];
                for await (const chunk of req) chunks.push(chunk as Buffer);
                const body = JSON.parse(Buffer.concat(chunks).toString());
                const { to, subject, html, company_id } = body;
                if (!to) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Destinatário obrigatório' })); return; }

                let smtpConfig: any = null;
                if (company_id) {
                  try {
                    const sql = neon(env.VITE_DATABASE_URL);
                    const s = await sql`SELECT * FROM company_settings WHERE company_id = ${company_id} LIMIT 1`;
                    if (s[0]?.smtp_host && s[0]?.smtp_user && s[0]?.smtp_password) {
                      smtpConfig = {
                        host: s[0].smtp_host, port: Number(s[0].smtp_port) || 587,
                        secure: s[0].smtp_secure === true,
                        user: s[0].smtp_user, pass: s[0].smtp_password,
                        senderName: s[0].email_sender_name || 'EstateFlow',
                        senderEmail: s[0].email_sender_address || s[0].smtp_user,
                      };
                    }
                  } catch (_) {}
                }

                const config = smtpConfig || {
                  host: env.SMTP_HOST, port: Number(env.SMTP_PORT) || 587,
                  secure: env.SMTP_SECURE === 'true',
                  user: env.SMTP_USER, pass: env.SMTP_PASS,
                  senderName: 'EstateFlow Suite', senderEmail: env.SMTP_USER,
                };

                if (!config.host || !config.user) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'SMTP não configurado' }));
                  return;
                }

                try {
                  const nodemailer = await import('nodemailer');
                  const transporter = nodemailer.default.createTransport({
                    host: config.host, port: config.port, secure: config.secure,
                    auth: { user: config.user, pass: config.pass },
                    tls: { rejectUnauthorized: false },
                  });
                  const info = await transporter.sendMail({
                    from: `"${config.senderName}" <${config.senderEmail}>`,
                    to, subject, html,
                  });
                  res.end(JSON.stringify({ success: true, messageId: info.messageId }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message || 'Erro ao enviar email' }));
                }
                return;
              }

              if (req.url === '/api/agency/request') {
                const chunks: Buffer[] = [];
                for await (const chunk of req) chunks.push(chunk as Buffer);
                const body = JSON.parse(Buffer.concat(chunks).toString());
                try {
                  const sql = neon(env.VITE_DATABASE_URL);
                  const id = `req_${Date.now()}`;
                  await sql`
                    INSERT INTO agency_requests (id, company_name, slug, cnpj, email, phone, admin_name, admin_email, admin_password)
                    VALUES (${id}, ${body.company_name}, ${body.slug}, ${body.cnpj || null}, ${body.email || null}, ${body.phone || null}, ${body.admin_name}, ${body.admin_email}, ${body.admin_password || ''})
                  `;
                  res.end(JSON.stringify({ success: true, message: 'Solicitacao enviada com sucesso. Aguarde aprovacao.' }));
                } catch (e: any) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
                return;
              }

              if (req.url === '/api/agency/list-requests') {
                const auth = req.headers.authorization || '';
                try {
                  const sql = neon(env.VITE_DATABASE_URL);
                  const rows = await sql`SELECT id, company_name, slug, cnpj, email, phone, admin_name, admin_email, status, admin_note, created_at FROM agency_requests ORDER BY created_at DESC`;
                  res.end(JSON.stringify(rows));
                } catch (e: any) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
                return;
              }

              if (req.url === '/api/agency/approve') {
                const chunks: Buffer[] = [];
                for await (const chunk of req) chunks.push(chunk as Buffer);
                const body = JSON.parse(Buffer.concat(chunks).toString());
                try {
                  const sql = neon(env.VITE_DATABASE_URL);
                  const { request_id, action } = body;
                  if (!request_id || !action) { res.statusCode = 400; res.end(JSON.stringify({ error: 'request_id and action required' })); return; }
                  const reqRow = await sql`SELECT * FROM agency_requests WHERE id = ${request_id} LIMIT 1`;
                  if (reqRow.length === 0) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Request not found' })); return; }

                  if (action === 'approved') {
                    const r = reqRow[0];
                    const companyId = `comp_${Date.now()}`;
                    const msgUint8 = new TextEncoder().encode(r.admin_password);
                    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

                    await sql`
                      INSERT INTO companies (id, name, slug, cnpj, email, phone, status, subscription_status, visible)
                      VALUES (${companyId}, ${r.company_name}, ${r.slug}, ${r.cnpj || null}, ${r.email || null}, ${r.phone || null}, 'active', 'trialing', true)
                    `;
                    await sql`
                      INSERT INTO subscriptions (id, company_id, plan_name, status, trial)
                      VALUES (${'sub_' + companyId}, ${companyId}, 'free', 'trialing', true)
                    `;
                    await sql`
                      INSERT INTO company_settings (company_id, company_name)
                      VALUES (${companyId}, ${r.company_name})
                    `;
                    const userId = `user_${Date.now()}`;
                    await sql`
                      INSERT INTO users (id, name, email, role, password_hash, company_id)
                      VALUES (${userId}, ${r.admin_name}, ${r.admin_email}, 'admin', ${hashedPassword}, ${companyId})
                    `;
                    await sql`UPDATE agency_requests SET status = 'approved', updated_at = NOW() WHERE id = ${request_id}`;
                  } else {
                    await sql`UPDATE agency_requests SET status = 'rejected', updated_at = NOW() WHERE id = ${request_id}`;
                  }

                  res.end(JSON.stringify({ success: true }));
                } catch (e: any) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
                return;
              }

              if (req.url === '/api/master/login') {
                const chunks: Buffer[] = [];
                for await (const chunk of req) chunks.push(chunk as Buffer);
                const body = JSON.parse(Buffer.concat(chunks).toString());
                const { email, password } = body;
                try {
                  const sql = neon(env.VITE_DATABASE_URL);
                  const result = await sql`SELECT * FROM master_users WHERE email = ${email} LIMIT 1`;
                  if (result.length === 0) {
                    res.statusCode = 401; res.end(JSON.stringify({ error: 'Credenciais inválidas' })); return;
                  }
                  const user = result[0];
                  const msgUint8 = new TextEncoder().encode(password);
                  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
                  const hashArray = Array.from(new Uint8Array(hashBuffer));
                  const hashedInput = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                  if (user.password !== hashedInput) {
                    res.statusCode = 401; res.end(JSON.stringify({ error: 'Credenciais inválidas' })); return;
                  }
                  const { password: _, ...safeUser } = user;
                  res.end(JSON.stringify({
                    success: true, user: safeUser,
                    token: btoa(JSON.stringify({ id: user.id, email: user.email, role: user.role, exp: Date.now() + 86400000 }))
                  }));
                } catch (e: any) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
                return;
              }

              if (req.url === '/api/upload') {
                const chunks: Buffer[] = [];
                for await (const chunk of req) chunks.push(chunk as Buffer);
                const body = JSON.parse(Buffer.concat(chunks).toString());
                const { image, company_id, category, filename } = body;
                if (!image || !company_id) {
                  res.statusCode = 400; res.end(JSON.stringify({ error: 'image e company_id obrigatórios' })); return;
                }
                try {
                  const sql = neon(env.VITE_DATABASE_URL);
                  const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
                  const mimeMatch = image.match(/^data:(.+);base64,/);
                  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                  const size = Math.round((image.length * 3) / 4);
                  await sql`
                    INSERT INTO uploads (id, company_id, filename, mime_type, data, size, category)
                    VALUES (${id}, ${company_id}, ${filename || 'upload.png'}, ${mimeType}, ${image}, ${size}, ${category || 'general'})
                  `;
                  res.end(JSON.stringify({ success: true, id, url: image, mimeType, size }));
                } catch (e: any) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
                return;
              }

              if (req.url?.startsWith('/api/upload/serve')) {
                const url = new URL(req.url, 'http://localhost');
                const id = url.searchParams.get('id');
                if (!id) { res.statusCode = 400; res.end(JSON.stringify({ error: 'id required' })); return; }
                try {
                  const sql = neon(env.VITE_DATABASE_URL);
                  const result = await sql`SELECT * FROM uploads WHERE id = ${id} LIMIT 1`;
                  if (result.length === 0) { res.statusCode = 404; res.end('Not found'); return; }
                  const upload = result[0];
                  const base64Data = upload.data.replace(/^data:[^;]+;base64,/, '');
                  const buffer = Buffer.from(base64Data, 'base64');
                  res.setHeader('Content-Type', upload.mime_type);
                  res.setHeader('Cache-Control', 'public, max-age=31536000');
                  res.end(buffer);
                } catch (e: any) { res.statusCode = 500; res.end(e.message); }
                return;
              }

              // Subscription endpoints (simulation for dev)
              if (req.url === '/api/subscriptions/create-preference') {
                const chunks: Buffer[] = [];
                for await (const chunk of req) chunks.push(chunk as Buffer);
                const body = JSON.parse(Buffer.concat(chunks).toString());
                const { company_id, plan, price: reqPrice } = body;
                const planPrice = reqPrice || 170;
                const mpToken = env.MERCADO_PAGO_ACCESS_TOKEN;
                if (!mpToken) {
                  res.end(JSON.stringify({ success: true, sandbox: true, message: 'MP not configured', plan, price: planPrice }));
                  return;
                }
                try {
                  const sql = neon(env.VITE_DATABASE_URL);
                  const companyRes = await sql`SELECT email FROM companies WHERE id = ${company_id} LIMIT 1`;
                  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mpToken}` },
                    body: JSON.stringify({
                      items: [{ id: `plan_${plan}_${company_id}`, title: plan, quantity: 1, currency_id: 'BRL', unit_price: planPrice }],
                      payer: { email: companyRes[0]?.email || '' },
                      back_urls: { success: `${env.VITE_APP_URL || ''}/payment/success`, failure: `${env.VITE_APP_URL || ''}/payment/failure`, pending: `${env.VITE_APP_URL || ''}/payment/pending` },
                      auto_return: 'approved',
                      notification_url: `${env.VITE_APP_URL || ''}/api/subscriptions/webhook`,
                      external_reference: company_id,
                    }),
                  });
                  const mpData = await mpRes.json();
                  res.end(JSON.stringify({ success: true, preference_id: mpData.id, checkout_url: mpData.init_point, plan, price: planPrice }));
                } catch (e: any) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
                return;
              }

              if (req.url === '/api/subscriptions/webhook') {
                res.end(JSON.stringify({ success: true }));
                return;
              }

              if (req.url?.startsWith('/api/subscriptions/status')) {
                const url = new URL(req.url, 'http://localhost');
                const companyId = url.searchParams.get('company_id');
                if (!companyId) { res.statusCode = 400; res.end(JSON.stringify({ error: 'company_id required' })); return; }
                try {
                  const sql = neon(env.VITE_DATABASE_URL);
                  const [company, subscription, payments] = await Promise.all([
                    sql`SELECT id, name, subscription_status, plan FROM companies WHERE id = ${companyId} LIMIT 1`,
                    sql`SELECT * FROM subscriptions WHERE company_id = ${companyId} ORDER BY created_at DESC LIMIT 1`,
                    sql`SELECT * FROM payments WHERE company_id = ${companyId} ORDER BY created_at DESC LIMIT 10`,
                  ]);
                  res.end(JSON.stringify({ company: company[0] || null, subscription: subscription[0] || null, payments }));
                } catch (e: any) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
                return;
              }

              // Master API: saas-settings
              if (req.url === '/api/master/saas-settings') {
                const sql = neon(env.VITE_DATABASE_URL);
                const auth = req.headers.authorization || '';
                try {
                  const tokenPayload = auth ? JSON.parse(atob(auth.replace('Bearer ', ''))) : null;
                  if (!tokenPayload || tokenPayload.exp < Date.now()) {
                    if (req.method === 'GET') {
                      // Public GET - no auth required for the plans page
                      const saas = await sql`SELECT plan_name, plan_price, billing_email_from, billing_email_cc FROM saas_settings WHERE id = 'global' LIMIT 1`;
                      res.end(JSON.stringify(saas[0] || { plan_name: 'Mensal', plan_price: 170 }));
                      return;
                    }
                    res.statusCode = 401; res.end(JSON.stringify({ error: 'Nao autorizado' })); return;
                  }
                  
                  if (req.method === 'GET') {
                    const saas = await sql`SELECT plan_name, plan_price, billing_email_from, billing_email_cc FROM saas_settings WHERE id = 'global' LIMIT 1`;
                    res.end(JSON.stringify(saas[0] || { plan_name: 'Mensal', plan_price: 170 }));
                  } else if (req.method === 'POST') {
                    const chunks: Buffer[] = [];
                    for await (const chunk of req) chunks.push(chunk as Buffer);
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    await sql`
                      INSERT INTO saas_settings (id, plan_name, plan_price, billing_email_from, billing_email_cc, updated_at)
                      VALUES ('global', ${body.plan_name || 'Mensal'}, ${body.plan_price || 170}, ${body.billing_email_from || null}, ${body.billing_email_cc || null}, NOW())
                      ON CONFLICT (id) DO UPDATE SET
                        plan_name = EXCLUDED.plan_name, plan_price = EXCLUDED.plan_price,
                        billing_email_from = EXCLUDED.billing_email_from, billing_email_cc = EXCLUDED.billing_email_cc, updated_at = NOW()
                    `;
                    res.end(JSON.stringify({ success: true }));
                  } else {
                    res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' }));
                  }
                } catch (e: any) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
                return;
              }

              // Master API: send-billing-email
              if (req.url === '/api/master/send-billing-email') {
                const sql = neon(env.VITE_DATABASE_URL);
                const auth = req.headers.authorization || '';
                try {
                  const tokenPayload = auth ? JSON.parse(atob(auth.replace('Bearer ', ''))) : null;
                  if (!tokenPayload || tokenPayload.exp < Date.now()) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Nao autorizado' })); return; }
                  const chunks: Buffer[] = [];
                  for await (const chunk of req) chunks.push(chunk as Buffer);
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const company = await sql`SELECT id, name, email FROM companies WHERE id = ${body.company_id} LIMIT 1`;
                  if (company.length === 0) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Company not found' })); return; }
                  console.log(`[SIMULATED BILLING EMAIL] To: ${company[0].email}, Company: ${company[0].name}`);
                  res.end(JSON.stringify({ success: true, message: `Email de cobranca enviado para ${company[0].email}` }));
                } catch (e: any) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
                return;
              }
            }
            next();
          });
        }
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'EstateFlow Suite',
          short_name: 'EstateFlow',
          description: 'Suíte completa para gestão imobiliária e vendas de imóveis.',
          theme_color: '#2b6cee',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
