/**
 * Memory API Routes (OpenMemory Integration)
 *
 * Uses OpenMemory SDK for cognitive memory with HMD sectors,
 * decay, waypoints, and explainable traces.
 */
import { Hono } from 'hono';
import { auditLog } from '../lib/audit-log';
import { requireApiKeyPermission, requireAuth } from '../middleware/auth';
import { enforceTierLimit } from '../middleware/tier-enforcement';
import { validateBody, validateParams } from '../middleware/validate';
import { consolidateMemories, maybeAutoConsolidate } from '../services/memory-agent';
import * as openMemory from '../services/memory-router.service';
import {
    addMemorySchema,
    bulkDeleteSchema,
    memoryFeedbackSchema,
    memoryIdParamSchema,
    searchMemorySchema,
    updateMemorySchema,
} from '../validation/memory.schema';

type Variables = {
    validatedBody?: unknown;
    validatedQuery?: unknown;
    validatedParams?: unknown;
};

const app = new Hono<{ Variables: Variables }>();

app.use('*', requireAuth);

// ============================================
// DASHBOARD ROUTES
// ============================================

/**
 * GET /api/memory/dashboard/stats
 */
app.get('/dashboard/stats', requireApiKeyPermission('memory:read'), async (c) => {
    const userId = c.get('userId')!;
    const stats = await openMemory.getMemoryStats(userId);
    return c.json(stats);
});

/**
 * GET /api/memory/dashboard/list
 */
app.get('/dashboard/list', requireApiKeyPermission('memory:read'), async (c) => {
    const userId = c.get('userId')!;
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
    const limit = Math.max(1, Math.min(parseInt(c.req.query('limit') || '50', 10), 100));
    const offset = (page - 1) * limit;

    // Get total count first
    const allMemories = await openMemory.listMemories(userId, { limit: 10000 });
    const total = allMemories.length;
    const totalPages = Math.ceil(total / limit);

    // Get paginated slice
    const memories = allMemories.slice(offset, offset + limit);

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
        pagination: {
            page,
            limit,
            total,
            totalPages,
        },
    });
});

/**
 * PATCH /api/memory/dashboard/:id - Update a memory
 * Note: OpenMemory doesn't support direct updates, so we delete and re-add
 */
app.patch(
    '/dashboard/:id',
    requireApiKeyPermission('memory:write'),
    validateParams(memoryIdParamSchema),
    validateBody(updateMemorySchema),
    async (c) => {
        const userId = c.get('userId')!;
        const { id: memoryId } = c.get('validatedParams') as { id: string };
        const body = c.get('validatedBody') as {
            content?: string;
            sector?: string;
            isPinned?: boolean;
            metadata?: Record<string, unknown>;
        };

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
    }
);

/**
 * DELETE /api/memory/dashboard/:id
 */
app.delete(
    '/dashboard/:id',
    requireApiKeyPermission('memory:write'),
    validateParams(memoryIdParamSchema),
    async (c) => {
        const userId = c.get('userId')!;
        const { id: memoryId } = c.get('validatedParams') as { id: string };

        // Verify ownership before delete
        const isOwner = await openMemory.verifyMemoryOwnership(memoryId, userId);
        if (!isOwner) {
            return c.json({ error: 'Memory not found' }, 404);
        }

        await openMemory.deleteMemory(memoryId);
        return c.json({ success: true, message: 'Memory deleted' });
    }
);

/**
 * POST /api/memory/dashboard/bulk-delete - Bulk delete memories
 */
app.post(
    '/dashboard/bulk-delete',
    requireApiKeyPermission('memory:write'),
    validateBody(bulkDeleteSchema),
    async (c) => {
        const userId = c.get('userId')!;
        const { ids } = c.get('validatedBody') as { ids: string[] };

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

        // Audit log the bulk delete
        await auditLog({
            userId,
            action: 'BULK_DELETE',
            resource: 'memory',
            metadata: { count: deleted, requestedIds: ids.length },
        });

        return c.json({ success: true, deleted });
    }
);

/**
 * POST /api/memory/dashboard/feedback
 * Positive feedback = reinforce memory
 */
app.post(
    '/dashboard/feedback',
    requireApiKeyPermission('memory:write'),
    validateBody(memoryFeedbackSchema),
    async (c) => {
        const userId = c.get('userId')!;
        const { memoryId, wasHelpful } = c.get('validatedBody') as {
            memoryId: string;
            wasHelpful: boolean;
        };

        // Verify ownership before reinforcing
        const isOwner = await openMemory.verifyMemoryOwnership(memoryId, userId);
        if (!isOwner) {
            return c.json({ error: 'Memory not found' }, 404);
        }

        if (wasHelpful) {
            await openMemory.reinforceMemory(memoryId);
        }

        return c.json({ success: true }, 201);
    }
);

// ============================================
// CORE MEMORY ROUTES
// ============================================

/**
 * GET /api/memory - Search memories
 */
app.get('/', requireApiKeyPermission('memory:read'), async (c) => {
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
app.post('/', requireApiKeyPermission('memory:write'), validateBody(addMemorySchema), async (c) => {
    const userId = c.get('userId')!;
    const { content, sector, tags, metadata } = c.get('validatedBody') as {
        content: string;
        sector?: string;
        tags?: string[];
        metadata?: Record<string, unknown>;
    };

    const memory = await openMemory.addMemory(content.trim(), userId, {
        tags,
        sector,
        metadata,
    });

    // Fire-and-forget: auto-consolidate if memory count is high
    maybeAutoConsolidate(userId).catch(() => {
        /* non-blocking */
    });

    return c.json(memory, 201);
});

/**
 * POST /api/memory/search - Semantic search with optional sector filtering
 */
app.post(
    '/search',
    requireApiKeyPermission('memory:read'),
    validateBody(searchMemorySchema),
    async (c) => {
        const userId = c.get('userId')!;
        const { query, sector, limit } = c.get('validatedBody') as {
            query: string;
            sector?: string;
            limit: number;
        };

        let memories = await openMemory.searchMemories(query.trim(), userId, {
            limit: sector ? limit * 2 : limit, // Fetch more if filtering by sector
        });

        // Filter by sector if specified
        if (sector) {
            memories = memories.filter((m) => m.sector === sector).slice(0, limit);
        }

        return c.json({
            memories,
            traces: memories.map((m) => m.trace).filter(Boolean),
            meta: {
                query: query.trim(),
                sector: sector || 'all',
                count: memories.length,
            },
        });
    }
);

/**
 * POST /api/memory/reinforce/:id
 */
app.post(
    '/reinforce/:id',
    requireApiKeyPermission('memory:write'),
    validateParams(memoryIdParamSchema),
    async (c) => {
        const userId = c.get('userId')!;
        const { id: memoryId } = c.get('validatedParams') as { id: string };

        const isOwner = await openMemory.verifyMemoryOwnership(memoryId, userId);
        if (!isOwner) {
            return c.json({ error: 'Memory not found' }, 404);
        }

        await openMemory.reinforceMemory(memoryId);
        return c.json({ success: true });
    }
);

/**
 * DELETE /api/memory/:id
 */
app.delete(
    '/:id',
    requireApiKeyPermission('memory:write'),
    validateParams(memoryIdParamSchema),
    async (c) => {
        const userId = c.get('userId')!;
        const { id: memoryId } = c.get('validatedParams') as { id: string };

        const isOwner = await openMemory.verifyMemoryOwnership(memoryId, userId);
        if (!isOwner) {
            return c.json({ error: 'Memory not found' }, 404);
        }

        await openMemory.deleteMemory(memoryId);
        return c.json({ success: true });
    }
);

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
app.post(
    '/consolidate',
    requireApiKeyPermission('memory:write'),
    enforceTierLimit('memoryInspector'),
    async (c) => {
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
    }
);

export default app;
