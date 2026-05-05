import { beforeEach, describe, expect, it, vi } from 'vitest';
import { approveRequest, createApproval, rejectRequest } from '../approval.service';

const convexMutation = vi.fn();

vi.mock('../../lib/convex', () => ({
    api: {
        approvals: {
            create: 'approvals.create',
            approve: 'approvals.approve',
            reject: 'approvals.reject',
        },
    },
    getConvexClient: vi.fn(() => ({
        mutation: convexMutation,
    })),
}));

describe('approval service persistence', () => {
    beforeEach(() => {
        convexMutation.mockReset();
    });

    it('creates persisted approvals', async () => {
        convexMutation.mockResolvedValueOnce('approval-1');

        const approval = await createApproval({
            userId: 'user-1',
            sessionId: 'session-1',
            toolName: 'file.write',
            toolArgs: { path: 'README.md' },
            reason: 'Needs write approval',
        });

        expect(approval).toMatchObject({
            id: 'approval-1',
            toolName: 'file.write',
            status: 'pending',
        });
        expect(convexMutation.mock.calls[0]?.[1]).toMatchObject({
            user_id: 'user-1',
            surface: 'api',
        });
    });

    it('does not fake approval creation when persistence fails', async () => {
        convexMutation.mockRejectedValueOnce(new Error('convex unavailable'));

        await expect(
            createApproval({
                userId: 'user-1',
                sessionId: 'session-1',
                toolName: 'file.write',
                toolArgs: {},
                reason: 'Needs write approval',
            })
        ).rejects.toThrow('Failed to persist approval request');
    });

    it('does not fake approve decisions when persistence fails', async () => {
        convexMutation.mockRejectedValueOnce(new Error('convex unavailable'));

        await expect(approveRequest('approval-1', 'user-1')).rejects.toThrow(
            'Failed to persist approval decision'
        );
    });

    it('does not fake reject decisions when persistence fails', async () => {
        convexMutation.mockRejectedValueOnce(new Error('convex unavailable'));

        await expect(rejectRequest('approval-1', 'user-1')).rejects.toThrow(
            'Failed to persist approval decision'
        );
    });
});
