import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    addToAllowlist,
    approveRequest,
    createApproval,
    rejectRequest,
    removeFromAllowlist,
} from '../approval.service';

const convexMutation = vi.fn();
const convexQuery = vi.fn();

vi.mock('../../lib/convex', () => ({
    api: {
        users: {
            getByWorkOSId: 'users.getByWorkOSId',
        },
        approvals: {
            create: 'approvals.create',
            approve: 'approvals.approve',
            reject: 'approvals.reject',
        },
        toolAllowlist: {
            grant: 'toolAllowlist.grant',
            listByUser: 'toolAllowlist.listByUser',
            revoke: 'toolAllowlist.revoke',
        },
    },
    getConvexClient: vi.fn(() => ({
        mutation: convexMutation,
        query: convexQuery,
    })),
}));

describe('approval service persistence', () => {
    beforeEach(() => {
        convexMutation.mockReset();
        convexQuery.mockReset();
    });

    it('creates persisted approvals', async () => {
        convexQuery.mockResolvedValueOnce({ _id: 'convex-user-1' });
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
            user_id: 'convex-user-1',
            surface: 'api',
        });
    });

    it('does not fake approval creation when persistence fails', async () => {
        convexQuery.mockResolvedValueOnce({ _id: 'convex-user-1' });
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
        convexQuery.mockResolvedValueOnce({ _id: 'convex-user-1' });
        convexMutation.mockRejectedValueOnce(new Error('convex unavailable'));

        await expect(approveRequest('approval-1', 'user-1')).rejects.toThrow(
            'Failed to persist approval decision'
        );
    });

    it('does not fake reject decisions when persistence fails', async () => {
        convexQuery.mockResolvedValueOnce({ _id: 'convex-user-1' });
        convexMutation.mockRejectedValueOnce(new Error('convex unavailable'));

        await expect(rejectRequest('approval-1', 'user-1')).rejects.toThrow(
            'Failed to persist approval decision'
        );
    });

    it('scopes approval decisions to the resolved Convex user id', async () => {
        convexQuery.mockResolvedValueOnce({ _id: 'convex-user-1' });
        convexMutation.mockResolvedValueOnce(undefined);

        await expect(approveRequest('approval-1', 'workos-user-1')).resolves.toEqual({
            id: 'approval-1',
            status: 'approved',
        });

        expect(convexMutation).toHaveBeenCalledWith('approvals.approve', {
            id: 'approval-1',
            user_id: 'convex-user-1',
        });
    });

    it('scopes allowlist grants to the resolved Convex user id', async () => {
        convexQuery.mockResolvedValueOnce({ _id: 'convex-user-1' });
        convexMutation.mockResolvedValueOnce(undefined);

        await addToAllowlist('workos-user-1', 'file.write', 'permanent');

        expect(convexMutation).toHaveBeenCalledWith('toolAllowlist.grant', {
            user_id: 'convex-user-1',
            tool_name: 'file.write',
        });
    });

    it('scopes allowlist revoke by resolved user id and entry owner', async () => {
        convexQuery
            .mockResolvedValueOnce({ _id: 'convex-user-1' })
            .mockResolvedValueOnce([{ _id: 'entry-1', tool_name: 'file.write' }]);
        convexMutation.mockResolvedValueOnce(undefined);

        await removeFromAllowlist('workos-user-1', 'file.write');

        expect(convexMutation).toHaveBeenCalledWith('toolAllowlist.revoke', {
            id: 'entry-1',
            user_id: 'convex-user-1',
        });
    });

    it('does not silently ignore allowlist persistence failures', async () => {
        convexQuery.mockResolvedValueOnce({ _id: 'convex-user-1' });
        convexMutation.mockRejectedValueOnce(new Error('convex unavailable'));

        await expect(addToAllowlist('workos-user-1', 'file.write', 'permanent')).rejects.toThrow(
            'Failed to persist tool allowlist grant'
        );
    });
});
