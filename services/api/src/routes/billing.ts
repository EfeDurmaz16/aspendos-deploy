/**
 * Billing API Routes
 * Handles billing status, checkout, and Polar webhooks.
 */
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import * as billingService from '../services/billing.service';
import * as polarService from '../services/polar.service';
import { createCheckoutSchema, getUsageQuerySchema } from '../validation/billing.schema';

const app = new Hono();

// ============================================
// AUTHENTICATED ROUTES
// ============================================

// GET /api/billing - Get billing status
app.get('/', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    const status = await billingService.getBillingStatus(userId);

    return c.json(status);
});

// POST /api/billing/sync - Sync user with Polar (create customer if needed)
app.post('/sync', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const user = c.get('user')!;

    try {
        // Create or get existing Polar customer
        const customer = await polarService.createCustomer({
            userId,
            email: user.email,
            name: user.name,
        });

        // Update billing account with Polar customer ID
        await billingService.getOrCreateBillingAccount(userId);

        return c.json({
            success: true,
            customerId: customer.id,
            message: 'Customer synced with Polar',
        });
    } catch (error) {
        console.error('Customer sync failed:', error);
        return c.json({ error: 'Failed to sync customer with Polar' }, 500);
    }
});

// GET /api/billing/usage - Get usage history
app.get('/usage', requireAuth, validateQuery(getUsageQuerySchema), async (c) => {
    const userId = c.get('userId')!;
    const validatedQuery = c.get('validatedQuery') as { limit: number };
    const limit = validatedQuery.limit;

    const history = await billingService.getUsageHistory(userId, limit);

    return c.json({ history });
});

// GET /api/billing/tiers - Get tier comparison
app.get('/tiers', async (c) => {
    const comparison = billingService.getTierComparison();
    return c.json(comparison);
});

// POST /api/billing/checkout - Create checkout session
app.post('/checkout', requireAuth, validateBody(createCheckoutSchema), async (c) => {
    const userId = c.get('userId')!;
    const user = c.get('user')!;
    const validatedBody = c.get('validatedBody') as {
        plan: 'starter' | 'pro' | 'ultra';
        cycle: 'monthly' | 'annual';
        success_url?: string;
        cancel_url?: string;
    };

    const { plan, cycle, success_url, cancel_url } = validatedBody;

    try {
        const { checkoutUrl, checkoutId } = await polarService.createCheckout({
            userId,
            email: user.email,
            plan,
            cycle,
            successUrl: success_url || `${process.env.FRONTEND_URL}/billing/success`,
            cancelUrl: cancel_url,
        });

        return c.json({
            checkout_url: checkoutUrl,
            checkout_id: checkoutId,
            plan,
            cycle,
        });
    } catch (error) {
        console.error('Checkout creation failed:', error);
        return c.json({ error: 'Failed to create checkout session' }, 500);
    }
});

// POST /api/billing/cancel - Cancel subscription
app.post('/cancel', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    const _account = await billingService.getBillingStatus(userId);

    // Get subscription ID from billing account
    const billingAccount = await billingService.getOrCreateBillingAccount(userId);

    if (!billingAccount.subscriptionId) {
        return c.json({ error: 'No active subscription found' }, 400);
    }

    try {
        await polarService.cancelSubscription(billingAccount.subscriptionId);

        return c.json({
            success: true,
            message: 'Subscription will be canceled at the end of the billing period',
        });
    } catch (error) {
        console.error('Subscription cancellation failed:', error);
        return c.json({ error: 'Failed to cancel subscription' }, 500);
    }
});

// GET /api/billing/portal - Get customer portal URL
app.get('/portal', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    const account = await billingService.getOrCreateBillingAccount(userId);

    if (!account.polarCustomerId) {
        return c.json({ error: 'No billing account linked' }, 400);
    }

    const portalUrl = await polarService.getCustomerPortalUrl(account.polarCustomerId);

    return c.json({ portal_url: portalUrl });
});

// ============================================
// WEBHOOK (NO AUTH - uses signature verification)
// ============================================

// POST /api/billing/webhook - Handle Polar webhooks
app.post('/webhook', async (c) => {
    const signature = c.req.header('polar-signature') || c.req.header('x-polar-signature') || '';
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET || '';

    // Get raw body for signature verification
    const rawBody = await c.req.text();

    // Verify signature
    if (webhookSecret && signature) {
        const isValid = polarService.verifyWebhookSignature(rawBody, signature, webhookSecret);
        if (!isValid) {
            console.error('Invalid webhook signature');
            return c.json({ error: 'Invalid signature' }, 401);
        }
    }

    try {
        const event = JSON.parse(rawBody) as polarService.PolarWebhookEvent;

        await polarService.handleWebhook(event);

        return c.json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        return c.json({ error: 'Webhook processing failed' }, 500);
    }
});

export default app;
