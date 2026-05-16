import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { company_id, plan, price } = req.body;
  if (!company_id || !plan) {
    return res.status(400).json({ error: 'company_id and plan are required' });
  }

  const dbUrl = process.env.VITE_DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'Database URL not configured' });

  const sql = neon(dbUrl);

  try {
    const company = await sql`SELECT * FROM companies WHERE id = ${company_id} LIMIT 1`;
    if (company.length === 0) return res.status(404).json({ error: 'Company not found' });

    // Load price from global saas_settings
    const saas = await sql`SELECT plan_name, plan_price FROM saas_settings WHERE id = 'global' LIMIT 1`;
    const planPrice = price || (saas.length > 0 ? Number(saas[0].plan_price) : 170);
    const planName = saas.length > 0 ? (saas[0].plan_name || 'Mensal') : 'Mensal';

    const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!mpToken) {
      return res.status(200).json({
        success: true,
        sandbox: true,
        message: 'Mercado Pago não configurado. Modo simulação ativado.',
        checkout_url: null,
        plan,
        price: planPrice,
      });
    }

    const payerName = company[0].name || undefined;
    const payerEmail = company[0].email || undefined;
    const payerPhone = company[0].phone ? { number: company[0].phone, area_code: '55' } : undefined;

    const idempotencyKey = `pref_${company_id}_${Date.now()}`;

    const preferenceData = {
      items: [{
        id: `plan_${plan}_${company_id}`,
        title: planName,
        description: `Assinatura ${planName} - EstateFlow`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: planPrice,
      }],
      payer: {
        email: payerEmail,
        name: payerName,
        phone: payerPhone,
      },
      back_urls: {
        success: `${process.env.VITE_APP_URL || ''}/payment/success?company_id=${company_id}`,
        failure: `${process.env.VITE_APP_URL || ''}/payment/failure?company_id=${company_id}`,
        pending: `${process.env.VITE_APP_URL || ''}/payment/pending?company_id=${company_id}`,
      },
      auto_return: 'approved',
      notification_url: `${process.env.VITE_APP_URL || ''}/api/subscriptions/webhook`,
      external_reference: company_id,
      metadata: { company_id, idempotency_key: idempotencyKey },
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpToken}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(preferenceData),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Mercado Pago error:', mpData);
      return res.status(500).json({ error: 'Failed to create preference', details: mpData });
    }

    res.status(200).json({
      success: true,
      sandbox: false,
      preference_id: mpData.id,
      checkout_url: mpData.init_point,
      sandbox_checkout_url: mpData.sandbox_init_point,
      plan,
      price: planPrice,
    });
  } catch (error) {
    console.error('Create preference error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
