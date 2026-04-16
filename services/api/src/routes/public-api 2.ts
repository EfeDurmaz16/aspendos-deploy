import { Hono } from 'hono';
import { runToolStep } from '../orchestrator/step';
import { registry } from '../tools/registry';
import { getAgit } from '../audit/agit';
import type { ToolContext } from '../reversibility/types';

const publicApi = new Hono();

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

    const args = await c.req.json();
    const ctx: ToolContext = { userId };
    const result = await runToolStep(name, args, ctx);

    return c.json({
        tool: name,
        status: result.blocked
            ? 'blocked'
            : result.awaitingApproval
              ? 'awaiting_approval'
              : 'executed',
        commitHash: result.commitHash,
        reversibilityClass: result.metadata.reversibility_class,
        result: result.result,
    });
});

publicApi.get('/audit/:userId/timeline', async (c) => {
    const { userId } = c.req.param();
    const limit = Number(c.req.query('limit') || '50');
    const agit = getAgit();
    const history = await agit.historyForUser(userId, limit);
    return c.json({ userId, commits: history });
});

publicApi.get('/audit/verify/:hash', async (c) => {
    const { hash } = c.req.param();
    const agit = getAgit();
    const verified = await agit.verifyCommit(hash);
    return c.json({ hash, verified });
});

publicApi.get('/health', (c) => {
    return c.json({
        status: 'ok',
        version: '1.0.0',
        toolCount: registry.names().length,
    });
});

export default publicApi;
