/**
 * Memory API Routes
 * Handles memory CRUD operations and Memory Dashboard.
 * 
 * Dashboard Routes (Phase 1):
 * - GET  /dashboard/stats     - Memory statistics
 * - GET  /dashboard/list      - Filtered memory list
 * - POST /dashboard/edit/:id  - Edit memory
 * - DELETE /dashboard/:id     - Soft delete memory
 * - POST /dashboard/feedback  - Submit feedback
 */
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import * as memoryService from '../services/memory.service';

const app = new Hono();

// Apply auth middleware
app.use('*', requireAuth);

// ============================================
// DASHBOARD ROUTES
// ============================================

/**
 * GET /api/memory/dashboard/stats
 * Returns memory statistics for the dashboard
 */
app.get('/dashboard/stats', async (c) => {
    const userId = c.get('userId')!;

    const stats = await memoryService.getMemoryStats(userId);

    return c.json(stats);
});

/**
 * GET /api/memory/dashboard/list
 * Returns filtered/sorted memory list with pagination
 * 
 * Query params:
 * - sector: Filter by sector (episodic, semantic, procedural, emotional, reflective)
 * - sort: Sort field (createdAt, confidence, accessCount, lastAccessedAt)
 * - order: Sort order (asc, desc)
 * - page: Page number (1-indexed)
 * - limit: Items per page (default 20)
 * - search: Search term for content
 */
app.get('/dashboard/list', async (c) => {
    const userId = c.get('userId')!;
    const sector = c.req.query('sector');
    const sort = c.req.query('sort') || 'createdAt';
    const order = c.req.query('order') || 'desc';
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const search = c.req.query('search');

    const result = await memoryService.listMemoriesForDashboard({
        userId,
        sector: sector || undefined,
        sortBy: sort as 'createdAt' | 'confidence' | 'accessCount' | 'lastAccessedAt',
        sortOrder: order as 'asc' | 'desc',
        page,
        limit,
        search: search || undefined,
    });

    return c.json(result);
});

/**
 * POST /api/memory/dashboard/edit/:id
 * Updates memory content, sector, confidence, or pin status
 */
app.post('/dashboard/edit/:id', async (c) => {
    const userId = c.get('userId')!;
    const memoryId = c.req.param('id');
    const body = await c.req.json();

    // Validate ownership first
    const existing = await memoryService.getMemory(memoryId, userId);
    if (!existing) {
        return c.json({ error: 'Memory not found' }, 404);
    }

    const updated = await memoryService.updateMemory(memoryId, {
        content: body.content,
        sector: body.sector,
        confidence: body.confidence,
        isPinned: body.isPinned,
        summary: body.summary,
    });

    return c.json(updated);
});

/**
 * DELETE /api/memory/dashboard/:id
 * Soft deletes a memory (sets isActive = false)
 */
app.delete('/dashboard/:id', async (c) => {
    const userId = c.get('userId')!;
    const memoryId = c.req.param('id');

    // Validate ownership
    const existing = await memoryService.getMemory(memoryId, userId);
    if (!existing) {
        return c.json({ error: 'Memory not found' }, 404);
    }

    await memoryService.softDeleteMemory(memoryId);

    return c.json({ success: true, message: 'Memory archived' });
});

/**
 * POST /api/memory/dashboard/feedback
 * Logs user feedback on memory helpfulness
 */
app.post('/dashboard/feedback', async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    if (!body.memoryId || typeof body.wasHelpful !== 'boolean') {
        return c.json({ error: 'memoryId and wasHelpful are required' }, 400);
    }

    // Validate memory exists
    const memory = await memoryService.getMemory(body.memoryId, userId);
    if (!memory) {
        return c.json({ error: 'Memory not found' }, 404);
    }

    const feedback = await memoryService.submitFeedback({
        memoryId: body.memoryId,
        userId,
        wasHelpful: body.wasHelpful,
        notes: body.notes,
        queryText: body.queryText,
    });

    return c.json(feedback, 201);
});

// ============================================
// LEGACY MEMORY ROUTES
// ============================================

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
        sector: body.sector || 'semantic',
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

    // Update access time and count
    await memoryService.touchMemory(memoryId);

    return c.json(memory);
});

// DELETE /api/memory/:id - Hard delete memory (legacy)
app.delete('/:id', async (c) => {
    const userId = c.get('userId')!;
    const memoryId = c.req.param('id');

    await memoryService.deleteMemory(memoryId, userId);

    return c.json({ success: true });
});

export default app;
