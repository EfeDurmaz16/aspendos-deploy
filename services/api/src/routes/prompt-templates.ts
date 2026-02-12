import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

type Variables = { userId: string };
const app = new Hono<{ Variables: Variables }>();

// GET / - List user's prompt templates
app.get('/', requireAuth, async (c) => {
    const userId = c.get('userId');
    const category = c.req.query('category');

    const templates = await prisma.promptTemplate.findMany({
        where: {
            userId,
            ...(category && { category }),
        },
        orderBy: { usageCount: 'desc' },
    });

    return c.json({ templates });
});

// POST / - Create a new prompt template
app.post('/', requireAuth, async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json();

    // Validate
    const { title, content, category, variables } = body;
    if (!title || !content) {
        return c.json({ error: 'Title and content are required' }, 400);
    }

    const template = await prisma.promptTemplate.create({
        data: {
            userId,
            title: title.slice(0, 200),
            content: content.slice(0, 10000),
            category: category || 'general',
            variables: variables || [], // e.g. ["topic", "tone"]
            usageCount: 0,
        },
    });

    return c.json({ template }, 201);
});

// PATCH /:id - Update template
app.patch('/:id', requireAuth, async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const body = await c.req.json();

    const existing = await prisma.promptTemplate.findFirst({
        where: { id, userId },
    });

    if (!existing) return c.json({ error: 'Template not found' }, 404);

    const template = await prisma.promptTemplate.update({
        where: { id },
        data: {
            ...(body.title && { title: body.title.slice(0, 200) }),
            ...(body.content && { content: body.content.slice(0, 10000) }),
            ...(body.category && { category: body.category }),
            ...(body.variables && { variables: body.variables }),
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
    const body = await c.req.json();
    const vars = body.variables || {};

    const template = await prisma.promptTemplate.findFirst({
        where: { id, userId },
    });

    if (!template) return c.json({ error: 'Template not found' }, 404);

    // Fill variables: replace {{variable}} with values
    let filled = template.content;
    for (const [key, value] of Object.entries(vars)) {
        filled = filled.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }

    // Increment usage count
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
