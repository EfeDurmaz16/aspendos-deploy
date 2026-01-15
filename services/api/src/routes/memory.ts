import { Hono } from 'hono';

const app = new Hono();

// GET /api/memory - Search memories
app.get('/', async (c) => {
    const query = c.req.query('q');
    // TODO: Implement with Qdrant vector search
    return c.json({ memories: [], query });
});

// POST /api/memory - Create a new memory
app.post('/', async (c) => {
    const body = await c.req.json();
    // TODO: Implement with Prisma + Qdrant embedding
    return c.json({ id: 'new-memory-id', content: body.content }, 201);
});

// DELETE /api/memory/:id - Delete a memory
app.delete('/:id', async (c) => {
    const memoryId = c.req.param('id');
    // TODO: Implement with Prisma
    return c.json({ deleted: true, id: memoryId });
});

export default app;
