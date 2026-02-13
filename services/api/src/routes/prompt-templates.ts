import { Hono } from 'hono';
import type { Context } from 'hono';
import { requireAuth } from '../middleware/auth';

type Variables = { userId: string };
const app = new Hono<{ Variables: Variables }>();

const FEATURE_MESSAGE =
    'Prompt templates are temporarily unavailable because the current database schema does not include a prompt template model.';
const FEATURE_CODE = 'PROMPT_TEMPLATES_UNAVAILABLE';

function featureUnavailable(c: Context) {
    return c.json({ error: FEATURE_MESSAGE, code: FEATURE_CODE }, 501);
}

// Prompt template endpoints are intentionally disabled until schema support exists.
app.get('/', requireAuth, featureUnavailable);
app.post('/', requireAuth, featureUnavailable);
app.patch('/:id', requireAuth, featureUnavailable);
app.delete('/:id', requireAuth, featureUnavailable);
app.post('/:id/use', requireAuth, featureUnavailable);
app.get('/discover', featureUnavailable);

export default app;
