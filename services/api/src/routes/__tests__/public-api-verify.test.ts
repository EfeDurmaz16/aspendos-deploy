import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import publicApi from '../public-api';

const mocks = vi.hoisted(() => ({
    convexQuery: vi.fn(),
    runToolStep: vi.fn(),
}));

vi.mock('../../lib/convex', () => ({
    api: {
        governance: {
            getCommitChain: 'governance.getCommitChain',
            verifyCommit: 'governance.verifyCommit',
        },
        users: {
            getByWorkOSId: 'users.getByWorkOSId',
        },
    },
    getConvexClient: vi.fn(() => ({
        query: mocks.convexQuery,
    })),
}));

vi.mock('../../orchestrator/step', () => ({
    runToolStep: mocks.runToolStep,
}));

beforeEach(() => {
    mocks.convexQuery.mockReset();
    mocks.runToolStep.mockReset();
});

describe('public audit verification route', () => {
    it('returns 200 only when Convex governance verifies the commit', async () => {
        mocks.convexQuery.mockResolvedValueOnce({
            valid: true,
            checks: {
                hash_integrity: true,
                payload_integrity: true,
                fides_signature: true,
                parent_exists: true,
            },
            commit: {
                hash: 'abc12345',
                status: 'executed',
                fides_signer_did: 'did:yula:agent:user-1',
                timestamp: 123,
                tool_name: 'file.write',
                reversibility_class: 'undoable',
            },
        });

        const response = await publicApi.request('/audit/verify/abc12345');

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            checks: {
                hash_integrity: true,
                payload_integrity: true,
                fides_signature: true,
                parent_exists: true,
            },
            fides_signer_did: 'did:yula:agent:user-1',
            hash: 'abc12345',
            reversibility_class: 'undoable',
            status: 'executed',
            timestamp: 123,
            tool_name: 'file.write',
            verified: true,
        });
        expect(mocks.convexQuery).toHaveBeenCalledWith('governance.verifyCommit', {
            hash: 'abc12345',
        });
    });

    it('returns 404 when Convex governance cannot verify the commit', async () => {
        mocks.convexQuery.mockResolvedValueOnce({
            valid: false,
            error: 'Commit not found',
            checks: {},
        });

        const response = await publicApi.request('/audit/verify/missing123');

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            hash: 'missing123',
            verified: false,
            error: 'Commit not found',
            checks: {},
        });
    });

    it('fails closed when Convex governance verification is unavailable', async () => {
        mocks.convexQuery.mockRejectedValueOnce(new Error('convex unavailable'));

        const response = await publicApi.request('/audit/verify/abc12345');

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toEqual({
            hash: 'abc12345',
            verified: false,
            error: 'Verification service unavailable',
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
            headers: {
                'Content-Type': 'application/json',
                'x-yula-session-id': 'api-session-1',
            },
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
        expect(mocks.runToolStep).toHaveBeenCalledWith(
            'file.write',
            { path: '/tmp/x', content: 'hello' },
            { userId: 'user-1', sessionId: 'api-session-1' }
        );
    });

    it('fails closed when tool execution has no session header', async () => {
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

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            error: 'x-yula-session-id header required',
        });
        expect(mocks.runToolStep).not.toHaveBeenCalled();
    });
});

describe('public audit timeline route', () => {
    it('requires authentication', async () => {
        const response = await publicApi.request('/audit/user-1/timeline');

        expect(response.status).toBe(401);
        expect(mocks.convexQuery).not.toHaveBeenCalled();
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
        expect(mocks.convexQuery).not.toHaveBeenCalled();
    });

    it('returns only the authenticated user timeline from Convex governance', async () => {
        mocks.convexQuery.mockResolvedValueOnce({ _id: 'convex-user-1' }).mockResolvedValueOnce({
            commits: [{ hash: 'commit-1', status: 'executed' }],
            nextCursor: 'commit-0',
        });
        const app = new Hono();
        app.use('*', async (c, next) => {
            c.set('userId', 'user-1');
            await next();
        });
        app.route('/', publicApi);

        const response = await app.request('/audit/user-1/timeline?limit=10');

        expect(response.status).toBe(200);
        expect(mocks.convexQuery).toHaveBeenNthCalledWith(1, 'users.getByWorkOSId', {
            workos_id: 'user-1',
        });
        expect(mocks.convexQuery).toHaveBeenNthCalledWith(2, 'governance.getCommitChain', {
            user_id: 'convex-user-1',
            limit: 10,
        });
        await expect(response.json()).resolves.toEqual({
            userId: 'user-1',
            commits: [{ hash: 'commit-1', status: 'executed' }],
            nextCursor: 'commit-0',
        });
    });

    it('fails closed when Convex timeline is unavailable', async () => {
        mocks.convexQuery.mockRejectedValueOnce(new Error('convex unavailable'));
        const app = new Hono();
        app.use('*', async (c, next) => {
            c.set('userId', 'user-1');
            await next();
        });
        app.route('/', publicApi);

        const response = await app.request('/audit/user-1/timeline');

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toEqual({
            error: 'Timeline service unavailable',
        });
    });
});
