import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import publicApi from '../public-api';

const mocks = vi.hoisted(() => ({
    verifyCommit: vi.fn(),
    historyForUser: vi.fn(),
    runToolStep: vi.fn(),
}));

vi.mock('../../audit/agit', () => ({
    getAgit: vi.fn(() => ({
        historyForUser: mocks.historyForUser,
        verifyCommit: mocks.verifyCommit,
    })),
}));

vi.mock('../../orchestrator/step', () => ({
    runToolStep: mocks.runToolStep,
}));

describe('public audit verification route', () => {
    it('returns 200 only when AGIT verifies the commit', async () => {
        mocks.verifyCommit.mockResolvedValueOnce(true);

        const response = await publicApi.request('/audit/verify/abc12345');

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            hash: 'abc12345',
            verified: true,
        });
    });

    it('returns 404 when AGIT cannot verify the commit', async () => {
        mocks.verifyCommit.mockResolvedValueOnce(false);

        const response = await publicApi.request('/audit/verify/missing123');

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            hash: 'missing123',
            verified: false,
            error: 'Commit verification failed',
        });
    });
});

describe('public tool execution route', () => {
    it('reports failed when the deterministic tool step fails', async () => {
        mocks.runToolStep.mockResolvedValueOnce({
            toolName: 'file.write',
            metadata: {
                reversibility_class: 'undoable',
                approval_required: false,
                rollback_strategy: { kind: 'snapshot' },
                human_explanation: 'Write a file',
            },
            commitHash: 'commit-1',
            result: {
                success: false,
                error: 'Execution failed',
            },
            blocked: false,
            awaitingApproval: false,
        });

        const app = new Hono();
        app.use('*', async (c, next) => {
            c.set('userId', 'user-1');
            await next();
        });
        app.route('/', publicApi);

        const response = await app.request('/tools/file.write/execute', {
            method: 'POST',
            body: JSON.stringify({ path: '/tmp/x', content: 'hello' }),
            headers: { 'Content-Type': 'application/json' },
        });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            tool: 'file.write',
            status: 'failed',
            commitHash: 'commit-1',
            result: {
                success: false,
                error: 'Execution failed',
            },
        });
    });
});

describe('public audit timeline route', () => {
    it('requires authentication', async () => {
        const response = await publicApi.request('/audit/user-1/timeline');

        expect(response.status).toBe(401);
        expect(mocks.historyForUser).not.toHaveBeenCalled();
    });

    it('does not expose another user timeline', async () => {
        const app = new Hono();
        app.use('*', async (c, next) => {
            c.set('userId', 'user-1');
            await next();
        });
        app.route('/', publicApi);

        const response = await app.request('/audit/user-2/timeline');

        expect(response.status).toBe(404);
        expect(mocks.historyForUser).not.toHaveBeenCalled();
    });

    it('returns only the authenticated user timeline', async () => {
        mocks.historyForUser.mockResolvedValueOnce([{ hash: 'commit-1' }]);
        const app = new Hono();
        app.use('*', async (c, next) => {
            c.set('userId', 'user-1');
            await next();
        });
        app.route('/', publicApi);

        const response = await app.request('/audit/user-1/timeline?limit=10');

        expect(response.status).toBe(200);
        expect(mocks.historyForUser).toHaveBeenCalledWith('user-1', 10);
        await expect(response.json()).resolves.toEqual({
            userId: 'user-1',
            commits: [{ hash: 'commit-1' }],
        });
    });
});
