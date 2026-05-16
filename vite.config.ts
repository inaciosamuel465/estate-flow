import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import nodemailer from 'nodemailer';

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
                const canSend = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
                if (!canSend) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'SMTP não configurado no .env' }));
                  return;
                }
                try {
                  const chunks: Buffer[] = [];
                  for await (const chunk of req) chunks.push(chunk as Buffer);
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { to, subject, html } = body;
                  if (!to) throw new Error('Destinatário (to) é obrigatório');
                  const transporter = nodemailer.createTransport({
                    host: env.SMTP_HOST,
                    port: Number(env.SMTP_PORT) || 587,
                    secure: env.SMTP_SECURE === 'true',
                    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
                    tls: { rejectUnauthorized: false },
                  });
                  const info = await transporter.sendMail({
                    from: `"EstateFlow Suite" <${env.SMTP_USER}>`,
                    to, subject, html,
                  });
                  res.end(JSON.stringify({ success: true, messageId: info.messageId }));
                } catch (err: any) {
                  console.error('Erro ao enviar email:', err);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message || 'Erro ao enviar email' }));
                }
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
