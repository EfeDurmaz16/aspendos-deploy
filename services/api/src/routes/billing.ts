/**
 * Billing API Routes
 * Handles billing status, checkout, and webhooks.
 * Stripe checkout, portal, and webhook lifecycle are owned by the web app.
 */
import { Hono } from 'hono';

import { rejectApiKeyAuth, requireAuth } from '../middleware/auth';

import { validateBody, validateQuery } from '../middleware/validate';
import * as billingService from '../services/billing.service';
import { createCheckoutSchema, getUsageQuerySchema } from '../validation/billing.schema';

type Variables = {
    validatedBody?: unknown;
    validatedQuery?: unknown;
    validatedParams?: unknown;
};

const app = new Hono<{ Variables: Variables }>();

const WEB_OWNED_BILLING_RESPONSE = {
    error: 'Billing lifecycle is handled by the web app Stripe routes',
    code: 'BILLING_LIFECYCLE_OWNED_BY_WEB',
    owner: 'apps/web/src/app/api/billing',
};

// ============================================
// AUTHENTICATED ROUTES
// ============================================

// GET /api/billing - Get billing status
app.get('/', requireAuth, rejectApiKeyAuth, async (c) => {
    const userId = c.get('userId')!;

    const status = await billingService.getBillingStatus(userId);

    return c.json(status);
});

// POST /api/billing/sync - Web app owns Stripe customer lifecycle
app.post('/sync', requireAuth, rejectApiKeyAuth, async (c) => {
    const _userId = c.get('userId')!;
    const _user = c.get('user')!;
    return c.json(WEB_OWNED_BILLING_RESPONSE, 503);
});

// GET /api/billing/usage - Get usage history
app.get('/usage', requireAuth, rejectApiKeyAuth, validateQuery(getUsageQuerySchema), async (c) => {
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

// POST /api/billing/checkout - Web app owns Stripe checkout session creation
app.post(
    '/checkout',
    requireAuth,
    rejectApiKeyAuth,
    validateBody(createCheckoutSchema),
    async (c) => {
        const _userId = c.get('userId')!;
        const _user = c.get('user')!;
        const _validatedBody = c.get('validatedBody');
        return c.json(WEB_OWNED_BILLING_RESPONSE, 503);
    }
);

// POST /api/billing/cancel - Web app owns Stripe subscription cancellation
app.post('/cancel', requireAuth, rejectApiKeyAuth, async (c) => {
    const _userId = c.get('userId')!;
    return c.json(WEB_OWNED_BILLING_RESPONSE, 503);
});

// GET /api/billing/portal - Web app owns Stripe customer portal links
app.get('/portal', requireAuth, rejectApiKeyAuth, async (c) => {
    const _userId = c.get('userId')!;
    return c.json(WEB_OWNED_BILLING_RESPONSE, 503);
});

// GET /api/billing/cost-ceiling - Check daily cost ceiling status
app.get('/cost-ceiling', requireAuth, rejectApiKeyAuth, async (c) => {
    const userId = c.get('userId')!;
    const ceiling = await billingService.checkCostCeiling(userId);
    return c.json(ceiling);
});

// GET /api/billing/cost-summary - Get cost breakdown by model and day
app.get('/cost-summary', requireAuth, rejectApiKeyAuth, async (c) => {
    const userId = c.get('userId')!;
    const summary = await billingService.getCostSummary(userId);
    return c.json(summary);
});

// GET /api/billing/spending-alerts - Get spending alerts for user
app.get('/spending-alerts', requireAuth, rejectApiKeyAuth, async (c) => {
    const userId = c.get('userId')!;
    const alerts = await billingService.getSpendingAlerts(userId);
    return c.json(alerts);
});

// GET /api/billing/unit-economics - Get per-user unit economics (admin/self)
app.get('/unit-economics', requireAuth, rejectApiKeyAuth, async (c) => {
    const userId = c.get('userId')!;
    const economics = await billingService.getUnitEconomics(userId);
    return c.json(economics);
});

// GET /api/billing/projection - Get end-of-month cost projection
app.get('/projection', requireAuth, rejectApiKeyAuth, async (c) => {
    const userId = c.get('userId')!;
    const projection = await billingService.getCostProjection(userId);
    return c.json(projection);
});

// ============================================
// WEBHOOK (NO AUTH - uses signature verification)
// ============================================

// POST /api/billing/webhook - Retired legacy API webhook.
// Stripe webhook handling lives in apps/web/src/app/api/billing/webhook/route.ts,
// which writes subscription state to Convex. Keeping the old API webhook active
// would create a second billing truth source against Prisma BillingAccount rows.
app.post('/webhook', async (c) => {
    return c.json(
        {
            error: 'Legacy API billing webhook is retired',
            code: 'BILLING_WEBHOOK_RETIRED',
            provider: 'stripe',
            owner: 'apps/web/src/app/api/billing/webhook/route.ts',
        },
        410
    );
});

export default app;
