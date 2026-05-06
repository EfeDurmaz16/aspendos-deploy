import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const convexMock = vi.hoisted(() => ({
    query: vi.fn(),
    mutation: vi.fn(),
}));

vi.mock('../../lib/convex', () => ({
    api: {
        actionLog: {
            log: 'actionLog.log',
            listByUser: 'actionLog.listByUser',
            listRecent: 'actionLog.listRecent',
        },
    },
    getConvexClient: () => convexMock,
    getConvexServiceSecret: () => 'test-service-secret',
}));

vi.mock('../memory-router.service', () => ({
    addMemory: vi.fn().mockResolvedValue({ id: 'memory-1' }),
}));

beforeEach(() => {
    convexMock.query.mockReset();
    convexMock.mutation.mockReset();
    vi.resetModules();
});

afterEach(() => {
    vi.resetModules();
});

const explicitCommitment = {
    content: 'call mom',
    type: 'EXPLICIT' as const,
    priority: 'MEDIUM' as const,
    triggerAt: new Date('2027-01-15T08:00:00.000Z'),
    confidence: 0.95,
};

describe('PAC service fail-loud behavior', () => {
    it('does not return an unpersisted reminder when reminder creation fails', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { createReminder } = await import('../pac.service');

        await expect(createReminder('user-1', explicitCommitment)).rejects.toThrow(
            'convex write unavailable'
        );
    });

    it('does not return an empty pending reminder list when reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { getPendingReminders } = await import('../pac.service');

        await expect(getPendingReminders('user-1')).rejects.toThrow('convex read unavailable');
    });

    it('does not return an empty due reminder list when recent log reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { getDueReminders } = await import('../pac.service');

        await expect(getDueReminders()).rejects.toThrow('convex read unavailable');
    });

    it('does not report reminder completion when response persistence fails', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { completeReminder } = await import('../pac.service');

        await expect(completeReminder('reminder-1', 'user-1')).rejects.toThrow(
            'convex write unavailable'
        );
    });

    it('does not report reminder dismissal when response persistence fails', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { dismissReminder } = await import('../pac.service');

        await expect(dismissReminder('reminder-1', 'user-1')).rejects.toThrow(
            'convex write unavailable'
        );
    });

    it('does not report a snooze when any snooze persistence write fails', async () => {
        convexMock.mutation
            .mockResolvedValueOnce({ id: 'snooze-1' })
            .mockRejectedValueOnce(new Error('convex write unavailable'));
        const { snoozeReminder } = await import('../pac.service');

        await expect(snoozeReminder('reminder-1', 'user-1', 30)).rejects.toThrow(
            'convex write unavailable'
        );
    });

    it('does not return default PAC settings when settings reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { getPACSettings } = await import('../pac.service');

        await expect(getPACSettings('user-1')).rejects.toThrow('convex read unavailable');
    });

    it('does not return unpersisted default PAC settings when default persistence fails', async () => {
        convexMock.query.mockResolvedValueOnce([]);
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { getPACSettings } = await import('../pac.service');

        await expect(getPACSettings('user-1')).rejects.toThrow('convex write unavailable');
    });

    it('does not report updated settings when settings persistence fails', async () => {
        convexMock.query.mockResolvedValueOnce([
            {
                event_type: 'pac_settings',
                details: {
                    userId: 'user-1',
                    enabled: true,
                    explicitEnabled: true,
                    implicitEnabled: true,
                    pushEnabled: true,
                    emailEnabled: false,
                    quietHoursStart: '22:00',
                    quietHoursEnd: '08:00',
                    escalationEnabled: true,
                    digestEnabled: false,
                    digestTime: '09:00',
                },
            },
        ]);
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { updatePACSettings } = await import('../pac.service');

        await expect(updatePACSettings('user-1', { enabled: false })).rejects.toThrow(
            'convex write unavailable'
        );
    });

    it('does not return zero PAC stats when stats reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { getPACStats } = await import('../pac.service');

        await expect(getPACStats('user-1')).rejects.toThrow('convex read unavailable');
    });

    it('does not return default effectiveness inside stats when effectiveness reads fail', async () => {
        convexMock.query
            .mockResolvedValueOnce([
                {
                    _id: 'reminder-1',
                    event_type: 'pac_reminder',
                    timestamp: 1_800_000_000_000,
                    details: { status: 'PENDING', triggerAt: 1_800_000_000_000 },
                },
            ])
            .mockRejectedValueOnce(new Error('convex read unavailable'));
        const { getPACStats } = await import('../pac.service');

        await expect(getPACStats('user-1')).rejects.toThrow('convex read unavailable');
    });
});
