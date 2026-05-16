import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { verifyRequest } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = new URL(req.url || '', 'http://localhost').pathname;
  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'DB not configured' });
  const sql = neon(dbUrl);

  // POST /api/subscriptions/create-preference
  if (path === '/api/subscriptions/create-preference' && req.method === 'POST') {
    const { company_id, plan, price } = req.body;
    if (!company_id || !plan) return res.status(400).json({ error: 'company_id and plan are required' });

    try {
      const company = await sql`SELECT * FROM companies WHERE id = ${company_id} LIMIT 1`;
      if (company.length === 0) return res.status(404).json({ error: 'Company not found' });

      const saas = await sql`SELECT plan_name, plan_price FROM saas_settings WHERE id = 'global' LIMIT 1`;
      const planPrice = price || (saas.length > 0 ? Number(saas[0].plan_price) : 170);
      const planName = saas.length > 0 ? (saas[0].plan_name || 'Mensal') : 'Mensal';

      const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!mpToken) {
        return res.status(200).json({
          success: true, sandbox: true, message: 'Mercado Pago não configurado. Modo simulação ativado.',
          checkout_url: null, plan, price: planPrice,
        });
      }

      const idempotencyKey = `pref_${company_id}_${Date.now()}`;
      const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', 'Authorization': `Bearer ${mpToken}`,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          items: [{
            id: `plan_${plan}_${company_id}`, title: planName,
            description: `Assinatura ${planName} - EstateFlow`,
            quantity: 1, currency_id: 'BRL', unit_price: planPrice,
          }],
          payer: { email: company[0]?.email || '', name: company[0]?.name || undefined },
          back_urls: {
            success: `${process.env.VITE_APP_URL || ''}/payment/success?company_id=${company_id}`,
            failure: `${process.env.VITE_APP_URL || ''}/payment/failure?company_id=${company_id}`,
            pending: `${process.env.VITE_APP_URL || ''}/payment/pending?company_id=${company_id}`,
          },
          auto_return: 'approved',
          notification_url: `${process.env.VITE_APP_URL || ''}/api/subscriptions/webhook`,
          external_reference: company_id,
          metadata: { company_id, idempotency_key: idempotencyKey },
        }),
      });

      const mpData = await mpResponse.json();
      if (!mpResponse.ok) {
        console.error('Mercado Pago error:', mpData);
        return res.status(500).json({ error: 'Failed to create preference', details: mpData });
      }

      return res.status(200).json({
        success: true, sandbox: false, preference_id: mpData.id,
        checkout_url: mpData.init_point, plan, price: planPrice,
      });
    } catch (error) {
      console.error('Create preference error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /api/subscriptions/status
  if (path === '/api/subscriptions/status' && req.method === 'GET') {
    const user = verifyRequest(req);
    if (!user) return res.status(401).json({ error: 'Nao autorizado' });

    const companyId = req.query.company_id as string;
    if (!companyId) return res.status(400).json({ error: 'company_id is required' });

    try {
      const [company, subscription, payments] = await Promise.all([
        sql`SELECT id, name, subscription_status, plan, trial_ends_at FROM companies WHERE id = ${companyId} LIMIT 1`,
        sql`SELECT * FROM subscriptions WHERE company_id = ${companyId} ORDER BY created_at DESC LIMIT 1`,
        sql`SELECT * FROM payments WHERE company_id = ${companyId} ORDER BY created_at DESC LIMIT 10`,
      ]);

      if (company.length === 0) return res.status(404).json({ error: 'Company not found' });
      return res.status(200).json({ company: company[0], subscription: subscription[0] || null, payments });
    } catch (error) {
      console.error('Status error:', error);
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  // POST /api/subscriptions/webhook
  if (path === '/api/subscriptions/webhook' && req.method === 'POST') {
    try {
      const { type, data } = req.body;

      if (type === 'payment' && data?.id) {
        const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        if (mpToken) {
          const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
            headers: { 'Authorization': `Bearer ${mpToken}` },
          });
          const payment = await mpResponse.json();

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
              VALUES (${'pay_' + Date.now()}, ${companyId}, ${existingSub.length > 0 ? existingSub[0].id : 'sub_' + companyId}, ${payment.id.toString()}, ${payment.transaction_amount || 0}, 'paid', ${payment.payment_method_id || 'unknown'}, NOW())
            `;

            console.log(`Payment approved for company ${companyId}: R$ ${payment.transaction_amount}`);
          }
        } else {
          console.log('Webhook received but Mercado Pago not configured. Payment data:', data.id);
        }
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(200).json({ success: true });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
