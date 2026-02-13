import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

type Variables = { userId: string };
const app = new Hono<{ Variables: Variables }>();

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 30);
}

function escapeRegExp(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET / - List user's prompt templates
app.get('/', requireAuth, async (c) => {
    const userId = c.get('userId');
    const category = c.req.query('category');

    const templates = await prisma.promptTemplate.findMany({
        where: {
            userId,
            ...(category ? { category } : {}),
        },
        orderBy: { usageCount: 'desc' },
    });

    return c.json({ templates });
});

// POST / - Create a new prompt template
app.post('/', requireAuth, async (c) => {
    const userId = c.get('userId');
    const body = (await c.req.json()) as Record<string, unknown>;

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : 'general';
    const variables = toStringArray(body.variables);

    if (!title || !content) {
        return c.json({ error: 'Title and content are required' }, 400);
    }

    const template = await prisma.promptTemplate.create({
        data: {
            userId,
            title: title.slice(0, 200),
            content: content.slice(0, 10000),
            category: category || 'general',
            variables,
            usageCount: 0,
        },
    });

    return c.json({ template }, 201);
});

// PATCH /:id - Update template
app.patch('/:id', requireAuth, async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const body = (await c.req.json()) as Record<string, unknown>;

    const existing = await prisma.promptTemplate.findFirst({
        where: { id, userId },
    });
    if (!existing) return c.json({ error: 'Template not found' }, 404);

    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : undefined;
    const content =
        typeof body.content === 'string' ? body.content.trim().slice(0, 10000) : undefined;
    const category = typeof body.category === 'string' ? body.category.trim() : undefined;
    const variables = body.variables !== undefined ? toStringArray(body.variables) : undefined;

    const template = await prisma.promptTemplate.update({
        where: { id },
        data: {
            ...(title !== undefined ? { title } : {}),
            ...(content !== undefined ? { content } : {}),
            ...(category !== undefined ? { category } : {}),
            ...(variables !== undefined ? { variables } : {}),
        },
    });

    return c.json({ template });
});

// DELETE /:id - Delete template
app.delete('/:id', requireAuth, async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');

    const existing = await prisma.promptTemplate.findFirst({
        where: { id, userId },
    });
    if (!existing) return c.json({ error: 'Template not found' }, 404);

    await prisma.promptTemplate.delete({ where: { id } });
    return c.json({ success: true });
});

// POST /:id/use - Increment usage count and return filled template
app.post('/:id/use', requireAuth, async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const body = (await c.req.json()) as Record<string, unknown>;
    const vars = (body.variables && typeof body.variables === 'object'
        ? body.variables
        : {}) as Record<string, unknown>;

    const template = await prisma.promptTemplate.findFirst({
        where: { id, userId },
    });
    if (!template) return c.json({ error: 'Template not found' }, 404);

    let filled = template.content;
    for (const [key, value] of Object.entries(vars)) {
        if (!key) continue;
        const safeKey = escapeRegExp(key);
        filled = filled.replace(new RegExp(`\\{\\{${safeKey}\\}\\}`, 'g'), String(value ?? ''));
    }

    await prisma.promptTemplate.update({
        where: { id },
        data: { usageCount: { increment: 1 } },
    });

    return c.json({ content: filled, template });
});

// GET /discover - Get popular public templates (community feature)
app.get('/discover', async (c) => {
    const templates = await prisma.promptTemplate.findMany({
        where: { isPublic: true },
        orderBy: { usageCount: 'desc' },
        take: 50,
        select: {
            id: true,
            title: true,
            content: true,
            category: true,
            variables: true,
            usageCount: true,
        },
    });

    return c.json({ templates });
});

export default app;
