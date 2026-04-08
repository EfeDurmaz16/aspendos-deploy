/**
 * Billing API Routes
 * Handles billing status, checkout, and webhooks.
 * TODO(stripe-migration): Re-wire checkout/webhook/portal/cancel to Stripe service.
 * Polar has been removed; endpoints return 503 until Stripe is wired up.
 */
import { Hono } from 'hono';

// TODO(phase-a-day-3): replaced by Convex — see convex/schema.ts
// import { prisma } from '@aspendos/db';
const prisma = {} as any;

import { auditLog as _auditLog } from '../lib/audit-log';
import { createLogger } from '../lib/logger';
import { requireAuth } from '../middleware/auth';

const log = createLogger({ action: 'billing' });

import { validateBody, validateQuery } from '../middleware/validate';
import * as billingService from '../services/billing.service';
// TODO(stripe-migration): replace with stripe.service
// import * as polarService from '../services/polar.service';
import { createCheckoutSchema, getUsageQuerySchema } from '../validation/billing.schema';

type Variables = {
    validatedBody?: unknown;
    validatedQuery?: unknown;
    validatedParams?: unknown;
};

const app = new Hono<{ Variables: Variables }>();

// TODO(stripe-migration): re-enable webhook retry queue once Stripe webhook handler is wired up.
// (Previously processed Polar webhook retries with exponential backoff; removed with polar.service.ts.)

// ============================================
// AUTHENTICATED ROUTES
// ============================================

// GET /api/billing - Get billing status
app.get('/', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    const status = await billingService.getBillingStatus(userId);

    return c.json(status);
});

// POST /api/billing/sync - Sync user with billing provider (create customer if needed)
// TODO(stripe-migration): re-wire to stripe.service.createCustomer
app.post('/sync', requireAuth, async (c) => {
    const _userId = c.get('userId')!;
    const _user = c.get('user')!;
    return c.json({ error: 'Billing sync is temporarily disabled during Stripe migration' }, 503);
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
// TODO(stripe-migration): re-wire to stripe.service.createCheckout
app.post('/checkout', requireAuth, validateBody(createCheckoutSchema), async (c) => {
    const _userId = c.get('userId')!;
    const _user = c.get('user')!;
    const _validatedBody = c.get('validatedBody');
    return c.json({ error: 'Checkout is temporarily disabled during Stripe migration' }, 503);
});

// POST /api/billing/cancel - Cancel subscription
// TODO(stripe-migration): re-wire to stripe.service.cancelSubscription
app.post('/cancel', requireAuth, async (c) => {
    const _userId = c.get('userId')!;
    return c.json(
        { error: 'Subscription cancel is temporarily disabled during Stripe migration' },
        503
    );
});

// GET /api/billing/portal - Get customer portal URL
// TODO(stripe-migration): re-wire to stripe.service.getCustomerPortalUrl
app.get('/portal', requireAuth, async (c) => {
    const _userId = c.get('userId')!;
    return c.json(
        { error: 'Customer portal is temporarily disabled during Stripe migration' },
        503
    );
});

// GET /api/billing/cost-ceiling - Check daily cost ceiling status
app.get('/cost-ceiling', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const ceiling = await billingService.checkCostCeiling(userId);
    return c.json(ceiling);
});

// GET /api/billing/cost-summary - Get cost breakdown by model and day
app.get('/cost-summary', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const summary = await billingService.getCostSummary(userId);
    return c.json(summary);
});

// GET /api/billing/spending-alerts - Get spending alerts for user
app.get('/spending-alerts', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const alerts = await billingService.getSpendingAlerts(userId);
    return c.json(alerts);
});

// GET /api/billing/unit-economics - Get per-user unit economics (admin/self)
app.get('/unit-economics', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const economics = await billingService.getUnitEconomics(userId);
    return c.json(economics);
});

// GET /api/billing/projection - Get end-of-month cost projection
app.get('/projection', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const projection = await billingService.getCostProjection(userId);
    return c.json(projection);
});

// ============================================
// WEBHOOK (NO AUTH - uses signature verification)
// ============================================

// POST /api/billing/webhook - Handle billing provider webhooks
// TODO(stripe-migration): replace with stripe.service.verifyWebhookSignature + handleWebhook.
// Previously wired to Polar; polar.service.ts has been removed.
app.post('/webhook', async (c) => {
    log.warn('Billing webhook received while provider is being migrated to Stripe');
    // Silence unused import warning until Stripe is wired up.
    void prisma;
    return c.json(
        { error: 'Billing webhook is temporarily disabled during Stripe migration' },
        503
    );
});

export default app;
