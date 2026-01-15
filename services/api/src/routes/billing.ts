import { Hono } from 'hono';

const app = new Hono();

// GET /api/billing - Get current billing status
app.get('/', async (c) => {
    // TODO: Implement with Polar + Prisma
    return c.json({
        plan: 'pro',
        status: 'active',
        monthlyCredit: 50,
        creditUsed: 0,
        resetDate: new Date().toISOString(),
    });
});

// POST /api/billing/upgrade - Upgrade to ULTRA
app.post('/upgrade', async (c) => {
    // TODO: Redirect to Polar checkout
    return c.json({ checkoutUrl: 'https://polar.sh/checkout/aspendos-ultra' });
});

// POST /api/billing/webhook - Polar webhook handler
app.post('/webhook', async (c) => {
    const body = await c.req.json();
    console.log('Polar Webhook:', body);
    // TODO: Verify signature and update subscription
    return c.json({ received: true });
});

export default app;
