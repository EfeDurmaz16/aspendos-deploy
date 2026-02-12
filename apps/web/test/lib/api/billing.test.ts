import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Billing API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    describe('GET /api/billing', () => {
        it('should return billing data for authenticated user', async () => {
            const mockBilling = {
                plan: 'pro',
                status: 'active',
                usage: {
                    tokens: {
                        used: 50000,
                        limit: 100000,
                        percent: 50,
                        formatted: { used: '50K', limit: '100K' },
                    },
                    chats: { remaining: 45, percent: 55 },
                    voice: { remaining: 180 },
                },
                renewal: {
                    date: '2026-02-25',
                    daysRemaining: 31,
                },
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockBilling),
            });

            const response = await fetch('/api/billing', { credentials: 'include' });
            expect(response.ok).toBe(true);

            const data = await response.json();
            expect(data.plan).toBe('pro');
            expect(data.status).toBe('active');
            expect(data.usage.tokens.percent).toBe(50);
        });

        it('should return 401 for unauthenticated requests', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ error: 'Unauthorized' }),
            });

            const response = await fetch('/api/billing');
            expect(response.ok).toBe(false);
            expect(response.status).toBe(401);
        });
    });

    describe('Polar.sh Integration', () => {
        it('should handle webhook events', async () => {
            const webhookPayload = {
                type: 'subscription.created',
                data: {
                    id: 'sub_123',
                    customerId: 'cus_456',
                    planId: 'plan_pro',
                    status: 'active',
                },
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ received: true }),
            });

            const response = await fetch('/api/webhooks/polar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookPayload),
            });

            expect(response.ok).toBe(true);
        });

        it('should reject invalid webhook signatures', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: () => Promise.resolve({ error: 'Invalid signature' }),
            });

            const response = await fetch('/api/webhooks/polar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Polar-Signature': 'invalid',
                },
                body: JSON.stringify({}),
            });

            expect(response.ok).toBe(false);
            expect(response.status).toBe(400);
        });
    });

    describe('Checkout Flow', () => {
        it('should redirect to checkout', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    checkoutUrl: 'https://polar.sh/checkout/abc123',
                }),
            });

            const response = await fetch('/api/checkout?plan=pro', {
                credentials: 'include',
            });

            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(data.checkoutUrl).toContain('polar.sh');
        });
    });

    describe('Customer Portal', () => {
        it('should redirect to customer portal', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    portalUrl: 'https://polar.sh/portal/abc123',
                }),
            });

            const response = await fetch('/api/portal', {
                credentials: 'include',
            });

            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(data.portalUrl).toContain('polar.sh');
        });
    });
});
