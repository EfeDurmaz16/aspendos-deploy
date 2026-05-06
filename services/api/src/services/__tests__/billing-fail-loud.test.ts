import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const convexMock = vi.hoisted(() => ({
    query: vi.fn(),
    mutation: vi.fn(),
}));

vi.mock('../../lib/convex', () => ({
    api: {
        subscriptions: {
            getByUser: 'subscriptions.getByUser',
        },
        actionLog: {
            log: 'actionLog.log',
            listByUser: 'actionLog.listByUser',
        },
    },
    getConvexClient: () => convexMock,
    getConvexServiceSecret: () => 'test-service-secret',
}));

beforeEach(() => {
    convexMock.query.mockReset();
    convexMock.mutation.mockReset();
    vi.resetModules();
});

afterEach(() => {
    vi.resetModules();
});

const proSubscription = {
    _id: 'sub-1',
    tier: 'pro',
    status: 'active',
    current_period_end: Date.now() + 30 * 24 * 60 * 60 * 1000,
    stripe_subscription_id: 'stripe-sub-1',
};

describe('billing service fail-loud behavior', () => {
    it('does not return a free billing account when subscription reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { getOrCreateBillingAccount } = await import('../billing.service');

        await expect(getOrCreateBillingAccount('user-1')).rejects.toThrow(
            'convex read unavailable'
        );
    });

    it('still returns a free billing account when the user has no subscription', async () => {
        convexMock.query.mockResolvedValueOnce(null);
        const { getOrCreateBillingAccount } = await import('../billing.service');

        const account = await getOrCreateBillingAccount('user-1');

        expect(account.plan).toBe('free');
        expect(account.userId).toBe('user-1');
    });

    it('does not fail open token checks when billing reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { hasTokens } = await import('../billing.service');

        await expect(hasTokens('user-1', 1000)).rejects.toThrow('convex read unavailable');
    });

    it('does not fail open chat checks when billing reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { hasChatsRemaining } = await import('../billing.service');

        await expect(hasChatsRemaining('user-1')).rejects.toThrow('convex read unavailable');
    });

    it('does not fail open voice checks when billing reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { hasVoiceMinutes } = await import('../billing.service');

        await expect(hasVoiceMinutes('user-1')).rejects.toThrow('convex read unavailable');
    });

    it('does not allow cost ceiling checks when usage reads fail', async () => {
        convexMock.query
            .mockResolvedValueOnce(proSubscription)
            .mockRejectedValueOnce(new Error('convex read unavailable'));
        const { checkCostCeiling } = await import('../billing.service');

        await expect(checkCostCeiling('user-1')).rejects.toThrow('convex read unavailable');
    });

    it('does not return empty usage history when usage reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { getUsageHistory } = await import('../billing.service');

        await expect(getUsageHistory('user-1')).rejects.toThrow('convex read unavailable');
    });

    it('does not return an empty cost summary when usage reads fail', async () => {
        convexMock.query
            .mockResolvedValueOnce(proSubscription)
            .mockRejectedValueOnce(new Error('convex read unavailable'));
        const { getCostSummary } = await import('../billing.service');

        await expect(getCostSummary('user-1')).rejects.toThrow('convex read unavailable');
    });

    it('does not return zero unit economics when usage reads fail', async () => {
        convexMock.query
            .mockResolvedValueOnce(proSubscription)
            .mockRejectedValueOnce(new Error('convex read unavailable'));
        const { getUnitEconomics } = await import('../billing.service');

        await expect(getUnitEconomics('user-1')).rejects.toThrow('convex read unavailable');
    });

    it('keeps token usage tracking non-blocking after main flow completion', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { recordTokenUsage } = await import('../billing.service');

        await expect(recordTokenUsage('user-1', 100, 200, 'groq/llama-4-scout')).resolves.toBe(
            undefined
        );
    });
});
