/**
 * Memory API Routes (OpenMemory Integration)
 *
 * Uses OpenMemory SDK for cognitive memory with HMD sectors,
 * decay, waypoints, and explainable traces.
 */
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { consolidateMemories } from '../services/memory-agent';
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
    const limit = Math.max(1, Math.min(parseInt(c.req.query('limit') || '50', 10), 100));

    const memories = await openMemory.listMemories(userId, { limit });

    // Map to frontend expected format
    return c.json({
        memories: memories.map((m) => ({
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
 * PATCH /api/memory/dashboard/:id - Update a memory
 * Note: OpenMemory doesn't support direct updates, so we delete and re-add
 */
app.patch('/dashboard/:id', async (c) => {
    const userId = c.get('userId')!;
    const memoryId = c.req.param('id');
    const body = await c.req.json();

    // Verify ownership before update
    const isOwner = await openMemory.verifyMemoryOwnership(memoryId, userId);
    if (!isOwner) {
        return c.json({ error: 'Memory not found' }, 404);
    }

    // Update memory
    try {
        const metadata = { ...body.metadata };
        if (typeof body.isPinned === 'boolean') {
            metadata.isPinned = body.isPinned;
        }

        await openMemory.updateMemory(memoryId, body.content, {
            sector: body.sector,
            metadata: metadata,
        });

        return c.json({
            success: true,
            memory: {
                id: memoryId,
                content: body.content,
                sector: body.sector,
                metadata: metadata,
                isPinned: metadata.isPinned,
            },
        });
    } catch (_error) {
        return c.json({ error: 'Failed to update memory' }, 500);
    }
});

/**
 * DELETE /api/memory/dashboard/:id
 */
app.delete('/dashboard/:id', async (c) => {
    const userId = c.get('userId')!;
    const memoryId = c.req.param('id');

    // Verify ownership before delete
    const isOwner = await openMemory.verifyMemoryOwnership(memoryId, userId);
    if (!isOwner) {
        return c.json({ error: 'Memory not found' }, 404);
    }

    await openMemory.deleteMemory(memoryId);
    return c.json({ success: true, message: 'Memory deleted' });
});

/**
 * POST /api/memory/dashboard/bulk-delete - Bulk delete memories
 */
app.post('/dashboard/bulk-delete', async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();
    const ids = body.ids as string[];

    if (!Array.isArray(ids) || ids.length === 0) {
        return c.json({ error: 'ids array is required' }, 400);
    }

    // Cap bulk operations to prevent abuse
    if (ids.length > 100) {
        return c.json({ error: 'Maximum 100 items per bulk delete' }, 400);
    }

    let deleted = 0;
    for (const id of ids) {
        try {
            // Verify ownership before each delete
            const isOwner = await openMemory.verifyMemoryOwnership(id, userId);
            if (!isOwner) continue;
            await openMemory.deleteMemory(id);
            deleted++;
        } catch {
            // Continue with next
        }
    }

    return c.json({ success: true, deleted });
});

/**
 * POST /api/memory/dashboard/feedback
 * Positive feedback = reinforce memory
 */
app.post('/dashboard/feedback', async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    if (!body.memoryId || typeof body.wasHelpful !== 'boolean') {
        return c.json({ error: 'memoryId and wasHelpful are required' }, 400);
    }

    // Verify ownership before reinforcing
    const isOwner = await openMemory.verifyMemoryOwnership(body.memoryId, userId);
    if (!isOwner) {
        return c.json({ error: 'Memory not found' }, 404);
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
    const limit = Math.max(1, Math.min(parseInt(c.req.query('limit') || '10', 10) || 10, 100));

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

    if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
        return c.json({ error: 'content is required and must be a non-empty string' }, 400);
    }

    if (body.content.length > 10000) {
        return c.json({ error: 'content must be 10,000 characters or less' }, 400);
    }

    const VALID_SECTORS = ['semantic', 'episodic', 'procedural', 'emotional'];
    const sector = VALID_SECTORS.includes(body.sector) ? body.sector : 'semantic';

    const memory = await openMemory.addMemory(body.content.trim(), userId, {
        tags: Array.isArray(body.tags) ? body.tags.slice(0, 20).map(String) : undefined,
        sector,
        metadata: body.metadata,
    });

    return c.json(memory, 201);
});

/**
 * POST /api/memory/search - Semantic search with optional sector filtering
 */
app.post('/search', async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
        return c.json({ error: 'query is required and must be a non-empty string' }, 400);
    }

    if (body.query.length > 2000) {
        return c.json({ error: 'query must be 2,000 characters or less' }, 400);
    }

    const limit = Math.max(1, Math.min(parseInt(body.limit) || 5, 50));
    const VALID_SECTORS = ['semantic', 'episodic', 'procedural', 'emotional', 'reflective'];
    const sector = VALID_SECTORS.includes(body.sector) ? body.sector : undefined;

    let memories = await openMemory.searchMemories(body.query.trim(), userId, {
        limit: sector ? limit * 2 : limit, // Fetch more if filtering by sector
    });

    // Filter by sector if specified
    if (sector) {
        memories = memories.filter(m => m.sector === sector).slice(0, limit);
    }

    return c.json({
        memories,
        traces: memories.map((m) => m.trace).filter(Boolean),
        meta: {
            query: body.query.trim(),
            sector: sector || 'all',
            count: memories.length,
        },
    });
});

/**
 * POST /api/memory/reinforce/:id
 */
app.post('/reinforce/:id', async (c) => {
    const userId = c.get('userId')!;
    const memoryId = c.req.param('id');

    const isOwner = await openMemory.verifyMemoryOwnership(memoryId, userId);
    if (!isOwner) {
        return c.json({ error: 'Memory not found' }, 404);
    }

    await openMemory.reinforceMemory(memoryId);
    return c.json({ success: true });
});

/**
 * DELETE /api/memory/:id
 */
app.delete('/:id', async (c) => {
    const userId = c.get('userId')!;
    const memoryId = c.req.param('id');

    const isOwner = await openMemory.verifyMemoryOwnership(memoryId, userId);
    if (!isOwner) {
        return c.json({ error: 'Memory not found' }, 404);
    }

    await openMemory.deleteMemory(memoryId);
    return c.json({ success: true });
});

// ============================================
// CONSOLIDATION (MOAT FEATURE)
// ============================================

/**
 * POST /api/memory/consolidate - Run memory consolidation pipeline
 *
 * Deduplicates similar memories and applies temporal decay.
 * This is a key differentiator: we don't just store memories,
 * we intelligently maintain them like human memory does.
 */
app.post('/consolidate', async (c) => {
    const userId = c.get('userId')!;

    try {
        const memories = await openMemory.listMemories(userId, { limit: 500 });

        const result = await consolidateMemories(userId, memories);

        return c.json({
            success: true,
            consolidation: {
                totalMemories: memories.length,
                merged: result.merged,
                decayed: result.decayed,
                preserved: result.preserved,
            },
        });
    } catch {
        return c.json({ error: 'Consolidation failed' }, 500);
    }
});

export default app;
