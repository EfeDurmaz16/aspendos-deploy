/**
 * Memory API Routes (OpenMemory Integration)
 * 
 * Uses OpenMemory SDK for cognitive memory with HMD sectors,
 * decay, waypoints, and explainable traces.
 */
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import * as openMemory from '../services/openmemory.service';

const app = new Hono();

app.use('*', requireAuth);

// ============================================
// DASHBOARD ROUTES
// ============================================

/**
 * GET /api/memory/dashboard/stats
 */
app.get('/dashboard/stats', async (c) => {
    const userId = c.get('userId')!;
    const stats = await openMemory.getMemoryStats(userId);
    return c.json(stats);
});

/**
 * GET /api/memory/dashboard/list
 */
app.get('/dashboard/list', async (c) => {
    const userId = c.get('userId')!;
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);

    const memories = await openMemory.listMemories(userId, { limit });

    // Map to frontend expected format
    return c.json({
        memories: memories.map(m => ({
            id: m.id,
            content: m.content,
            sector: m.sector || 'semantic',
            confidence: m.salience || 0.8,
            createdAt: m.createdAt,
            accessCount: 0, // OpenMemory handles this internally
            isPinned: false,
            isActive: true,
        })),
        total: memories.length,
        page: 1,
        totalPages: 1,
    });
});

/**
 * DELETE /api/memory/dashboard/:id
 */
app.delete('/dashboard/:id', async (c) => {
    const memoryId = c.req.param('id');
    await openMemory.deleteMemory(memoryId);
    return c.json({ success: true, message: 'Memory deleted' });
});

/**
 * POST /api/memory/dashboard/feedback
 * Positive feedback = reinforce memory
 */
app.post('/dashboard/feedback', async (c) => {
    const body = await c.req.json();

    if (!body.memoryId || typeof body.wasHelpful !== 'boolean') {
        return c.json({ error: 'memoryId and wasHelpful are required' }, 400);
    }

    if (body.wasHelpful) {
        await openMemory.reinforceMemory(body.memoryId);
    }

    return c.json({ success: true }, 201);
});

// ============================================
// CORE MEMORY ROUTES
// ============================================

/**
 * GET /api/memory - Search memories
 */
app.get('/', async (c) => {
    const userId = c.get('userId')!;
    const query = c.req.query('q') || '';
    const limit = parseInt(c.req.query('limit') || '10');

    if (query) {
        const memories = await openMemory.searchMemories(query, userId, { limit });
        return c.json({ memories });
    }

    const memories = await openMemory.listMemories(userId, { limit });
    return c.json({ memories });
});

/**
 * POST /api/memory - Add a memory
 */
app.post('/', async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    const memory = await openMemory.addMemory(body.content, userId, {
        tags: body.tags,
        sector: body.sector || 'semantic',
        metadata: body.metadata,
    });

    return c.json(memory, 201);
});

/**
 * POST /api/memory/search - Semantic search
 */
app.post('/search', async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    const memories = await openMemory.searchMemories(
        body.query,
        userId,
        { limit: body.limit || 5 }
    );

    return c.json({
        memories,
        traces: memories.map(m => m.trace).filter(Boolean),
    });
});

/**
 * POST /api/memory/reinforce/:id
 */
app.post('/reinforce/:id', async (c) => {
    const memoryId = c.req.param('id');
    await openMemory.reinforceMemory(memoryId);
    return c.json({ success: true });
});

/**
 * DELETE /api/memory/:id
 */
app.delete('/:id', async (c) => {
    const memoryId = c.req.param('id');
    await openMemory.deleteMemory(memoryId);
    return c.json({ success: true });
});

export default app;
