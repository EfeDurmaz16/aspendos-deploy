import { Hono } from 'hono';
import { api, getConvexClient, getConvexServiceSecret } from '../lib/convex';
import { runToolStep } from '../orchestrator/step';
import type { ToolContext } from '../reversibility/types';
import { registry } from '../tools/registry';

const publicApi = new Hono();

function stepStatus(result: Awaited<ReturnType<typeof runToolStep>>) {
    if (result.blocked) return 'blocked';
    if (result.awaitingApproval) return 'awaiting_approval';
    if (!result.result.success) return 'failed';
    return 'executed';
}

publicApi.get('/tools', (c) => {
    const tools = registry.list().map((t) => ({
        name: t.name,
        description: t.description,
    }));
    return c.json({ tools });
});

publicApi.post('/tools/:name/classify', async (c) => {
    const { name } = c.req.param();
    const args = await c.req.json();
    const metadata = registry.classify(name, args);
    return c.json({ tool: name, metadata });
});

publicApi.post('/tools/:name/execute', async (c) => {
    const { name } = c.req.param();
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Authentication required' }, 401);

    const sessionId = c.req.header('x-yula-session-id') ?? c.req.header('idempotency-key');
    if (!sessionId) {
        return c.json({ error: 'x-yula-session-id header required' }, 400);
    }

    const args = await c.req.json();
    const ctx: ToolContext = { userId, sessionId };
    const result = await runToolStep(name, args, ctx);

    return c.json({
        tool: name,
        status: stepStatus(result),
        commitHash: result.commitHash,
        reversibilityClass: result.metadata.reversibility_class,
        result: result.result,
    });
});

publicApi.get('/audit/:userId/timeline', async (c) => {
    const { userId } = c.req.param();
    const currentUserId = c.get('userId');
    if (!currentUserId) {
        return c.json({ error: 'Authentication required' }, 401);
    }
    if (userId !== currentUserId) {
        return c.json({ error: 'Timeline not found' }, 404);
    }

    const limit = Number(c.req.query('limit') || '50');

    try {
        const client = getConvexClient();
        const user = await client.query(api.users.getByWorkOSId, { workos_id: userId });
        if (!user?._id) {
            return c.json({ error: 'Timeline not found' }, 404);
        }

        const timeline = await client.query(api.governance.getCommitChain, {
            service_secret: getConvexServiceSecret(),
            user_id: user._id,
            limit,
        });
        return c.json({
            userId,
            commits: timeline.commits,
            nextCursor: timeline.nextCursor,
        });
    } catch {
        return c.json({ error: 'Timeline service unavailable' }, 503);
    }
});

publicApi.get('/audit/verify/:hash', async (c) => {
    const { hash } = c.req.param();

    try {
        const verification = await getConvexClient().query(api.governance.verifyCommit, { hash });
        if (!verification.valid) {
            return c.json(
                {
                    hash,
                    verified: false,
                    error: verification.error ?? 'Commit verification failed',
                    checks: verification.checks,
                },
                404
            );
        }

        return c.json({
            hash,
            verified: true,
            checks: verification.checks,
            status: verification.commit?.status,
            fides_signer_did: verification.commit?.fides_signer_did,
            timestamp: verification.commit?.timestamp,
            tool_name: verification.commit?.tool_name,
            reversibility_class: verification.commit?.reversibility_class,
        });
    } catch {
        return c.json(
            {
                hash,
                verified: false,
                error: 'Verification service unavailable',
            },
            503
        );
    }
});

publicApi.get('/health', (c) => {
    return c.json({
        status: 'ok',
        version: '1.0.0',
        toolCount: registry.names().length,
    });
});

export default publicApi;
