import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

function verifySignature(req: VercelRequest): boolean {
  const signature = req.headers['x-signature'] as string;
  if (!signature) return false;

  const mpToken = process.env.MERCADO_PAGO_WEBHOOK_SECRET || process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!mpToken) return true; // allow without secret in dev

  try {
    const parts = signature.split(',');
    const ts = parts.find((p: string) => p.startsWith('ts='))?.split('=')[1];
    const hash = parts.find((p: string) => p.startsWith('v1='))?.split('=')[1];
    if (!ts || !hash) return false;

    const body = JSON.stringify(req.body);
    const manifest = `id:${req.body?.data?.id};request-id:${req.headers['x-request-id'] || ''};ts:${ts};`;
    const expected = crypto.createHmac('sha256', mpToken).update(manifest).digest('hex');
    return expected === hash;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });

  const sql = neon(dbUrl);

  try {
    if (!verifySignature(req)) {
      console.warn('Invalid webhook signature');
      return res.status(200).json({ success: true });
    }

    const { action, data, type } = req.body;

    if (type === 'payment' && data?.id) {
      const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

      if (mpToken) {
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
          headers: { 'Authorization': `Bearer ${mpToken}` },
        });
        const payment = await mpResponse.json();

        // Idempotency: check if payment already processed
        const existingPayment = await sql`SELECT id FROM payments WHERE gateway_payment_id = ${payment.id.toString()} LIMIT 1`;
        if (existingPayment.length > 0) {
          console.log(`Payment ${payment.id} already processed, skipping`);
          return res.status(200).json({ success: true });
        }

        if (payment.status === 'approved') {
          const companyId = payment.external_reference;

          await sql`UPDATE companies SET subscription_status = 'active', updated_at = NOW() WHERE id = ${companyId}`;

          const existingSub = await sql`SELECT id FROM subscriptions WHERE company_id = ${companyId} LIMIT 1`;
          if (existingSub.length > 0) {
            await sql`UPDATE subscriptions SET status = 'active', updated_at = NOW() WHERE company_id = ${companyId}`;
          } else {
            await sql`
              INSERT INTO subscriptions (id, company_id, plan_name, status, payment_gateway, gateway_subscription_id)
              VALUES (${'sub_' + companyId}, ${companyId}, 'monthly', 'active', 'mercadopago', ${payment.id.toString()})
            `;
          }

          await sql`
            INSERT INTO payments (id, company_id, subscription_id, gateway_payment_id, amount, status, payment_method, paid_at)
            VALUES (
              ${'pay_' + Date.now()},
              ${companyId},
              ${existingSub.length > 0 ? existingSub[0].id : 'sub_' + companyId},
              ${payment.id.toString()},
              ${payment.transaction_amount || 0},
              'paid',
              ${payment.payment_method_id || 'unknown'},
              NOW()
            )
          `;

          console.log(`Payment approved for company ${companyId}: R$ ${payment.transaction_amount}`);
        }
      } else {
        console.log('Webhook received but Mercado Pago not configured. Payment data:', data.id);
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).json({ success: true });
  }
}
