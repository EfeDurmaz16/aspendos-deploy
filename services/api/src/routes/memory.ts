/**
 * Memory API Routes
 * Handles memory CRUD operations.
 */
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import * as memoryService from '../services/memory.service';

const app = new Hono();

// Apply auth middleware
app.use('*', requireAuth);

// GET /api/memory - Search/list memories
app.get('/', async (c) => {
    const userId = c.get('userId')!;
    const chatId = c.req.query('chat_id');
    const type = c.req.query('type');
    const limit = parseInt(c.req.query('limit') || '20');

    const memories = await memoryService.searchMemories({
        userId,
        chatId: chatId || undefined,
        type: type || undefined,
        limit,
    });

    return c.json({ memories });
});

// GET /api/memory/global - Get global memories
app.get('/global', async (c) => {
    const userId = c.get('userId')!;
    const limit = parseInt(c.req.query('limit') || '50');

    const memories = await memoryService.getGlobalMemories(userId, limit);

    return c.json({ memories });
});

// POST /api/memory - Create a memory
app.post('/', async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    const memory = await memoryService.createMemory({
        userId,
        chatId: body.chat_id,
        content: body.content,
        type: body.type || 'context',
        source: body.source || 'user_input',
        importance: body.importance,
        tags: body.tags,
    });

    return c.json(memory, 201);
});

// GET /api/memory/:id - Get memory by ID
app.get('/:id', async (c) => {
    const userId = c.get('userId')!;
    const memoryId = c.req.param('id');

    const memory = await memoryService.getMemory(memoryId, userId);

    if (!memory) {
        return c.json({ error: 'Memory not found' }, 404);
    }

    // Update access time
    await memoryService.touchMemory(memoryId);

    return c.json(memory);
});

// DELETE /api/memory/:id - Delete memory
app.delete('/:id', async (c) => {
    const userId = c.get('userId')!;
    const memoryId = c.req.param('id');

    await memoryService.deleteMemory(memoryId, userId);

    return c.json({ success: true });
});

export default app;
