/**
 * A/B Testing & Experiments routes - /api/experiments/*
 */
import { Hono } from 'hono';

const experimentsRoutes = new Hono();

// GET / - List experiments
experimentsRoutes.get('/', async (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { listExperiments } = await import('../lib/ab-testing');
    const status = c.req.query('status') as
        | 'draft'
        | 'running'
        | 'paused'
        | 'completed'
        | undefined;
    const experiments = listExperiments(status);

    return c.json({ experiments });
});

// GET /:id/results - Get experiment results
experimentsRoutes.get('/:id/results', async (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { getExperimentResults } = await import('../lib/ab-testing');
    const experimentId = c.req.param('id');
    const confidenceLevel = c.req.query('confidence')
        ? parseFloat(c.req.query('confidence')!)
        : 0.95;

    try {
        const results = getExperimentResults(experimentId, confidenceLevel);
        return c.json(results);
    } catch (error) {
        const err = error as Error;
        return c.json({ error: err.message }, 404);
    }
});

export default experimentsRoutes;
