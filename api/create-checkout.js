const { setCors, sendError } = require('./_utils');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405);

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return sendError(res, 500, '支付未配置');

    const stripe = require('stripe')(stripeKey);
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) return sendError(res, 500, '支付价格未配置');

    const host = req.headers.host || 'a-sigma-rust.vercel.app';
    const siteUrl = process.env.SITE_URL || `https://${host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/success.html`,
      cancel_url: `${siteUrl}/pricing.html`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    sendError(res, 500, '支付服务暂不可用');
  }
};
