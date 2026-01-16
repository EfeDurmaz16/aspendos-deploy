/**
 * Billing API Routes
 * Handles billing status, usage, and subscriptions.
 */
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import * as billingService from '../services/billing.service';

const app = new Hono();

// Apply auth middleware
app.use('*', requireAuth);

// GET /api/billing - Get billing status
app.get('/', async (c) => {
    const userId = c.get('userId')!;

    const status = await billingService.getBillingStatus(userId);

    return c.json(status);
});

// GET /api/billing/usage - Get usage history
app.get('/usage', async (c) => {
    const userId = c.get('userId')!;
    const limit = parseInt(c.req.query('limit') || '50');

    const history = await billingService.getUsageHistory(userId, limit);

    return c.json({ history });
});

// POST /api/billing/upgrade - Upgrade subscription
app.post('/upgrade', async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    const plan = body.plan as 'ultra' | 'enterprise';

    if (!['ultra', 'enterprise'].includes(plan)) {
        return c.json({ error: 'Invalid plan' }, 400);
    }

    // TODO: Integrate with Polar for payment
    // For now, just update the database

    await billingService.upgradeTier(userId, plan);

    return c.json({
        success: true,
        message: `Upgraded to ${plan}`,
        // In production, return Polar checkout URL
        // checkout_url: 'https://polar.sh/checkout/...'
    });
});

// POST /api/billing/webhook - Handle Polar webhooks
app.post('/webhook', async (c) => {
    // Skip auth for webhooks - verify Polar signature instead
    const body = await c.req.json();

    // TODO: Verify Polar webhook signature
    // const signature = c.req.header('polar-signature');

    const event = body.type;

    switch (event) {
        case 'subscription.created':
        case 'subscription.updated':
            // Update user's subscription
            break;
        case 'subscription.canceled':
            // Handle cancellation
            break;
        case 'invoice.paid':
            // Reset monthly credits
            break;
    }

    return c.json({ received: true });
});

export default app;
