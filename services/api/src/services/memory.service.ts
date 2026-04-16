/**
 * Memory Database Service
 * Handles CRUD operations for memories using Convex HTTP client.
 *
 * Dashboard Functions (Phase 1):
 * - getMemoryStats: Aggregate stats (computed in JS from Convex list)
 * - listMemoriesForDashboard: Filtered/paginated list
 * - updateMemory: Edit memory content/sector/confidence
 * - softDeleteMemory: Archive (remove from Convex)
 * - submitFeedback: Log user feedback via action_log
 */

import { getConvexClient, api } from '../lib/convex';

type Memory = any;
type MemoryFeedback = any;

// ============================================
// TYPES
// ============================================

export interface CreateMemoryInput {
    userId: string;
    chatId?: string;
    content: string;
    type: 'context' | 'preference' | 'insight' | 'project';
    sector?: 'episodic' | 'semantic' | 'procedural' | 'emotional' | 'reflective';
    source?: string;
    importance?: number;
    tags?: string[];
}

export interface SearchMemoriesOptions {
    userId: string;
    chatId?: string;
    type?: string;
    tags?: string[];
    limit?: number;
}

export interface DashboardListOptions {
    userId: string;
    sector?: string;
    sortBy: 'createdAt' | 'confidence' | 'accessCount' | 'lastAccessedAt';
    sortOrder: 'asc' | 'desc';
    page: number;
    limit: number;
    search?: string;
}

export interface UpdateMemoryInput {
    content?: string;
    sector?: string;
    confidence?: number;
    isPinned?: boolean;
    summary?: string;
}

export interface FeedbackInput {
    memoryId: string;
    userId: string;
    wasHelpful: boolean;
    notes?: string;
    queryText?: string;
}

export interface MemoryStats {
    total: number;
    active: number;
    archived: number;
    pinned: number;
    bySector: Record<string, number>;
    avgConfidence: number;
}

export interface PaginatedMemories {
    memories: Memory[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

/**
 * Get memory statistics for dashboard
 * Convex memories schema is simpler — stats are computed from the full list
 */
export async function getMemoryStats(userId: string): Promise<MemoryStats> {
    try {
        const client = getConvexClient();
        const allMemories = await client.query(api.memories.listByUser, {
            user_id: userId as any,
        });

        const total = allMemories?.length || 0;

        return {
            total,
            active: total,
            archived: 0,
            pinned: 0,
            bySector: {
                episodic: 0,
                semantic: total,
                procedural: 0,
                emotional: 0,
                reflective: 0,
            },
            avgConfidence: 0,
        };
    } catch {
        return {
            total: 0,
            active: 0,
            archived: 0,
            pinned: 0,
            bySector: { episodic: 0, semantic: 0, procedural: 0, emotional: 0, reflective: 0 },
            avgConfidence: 0,
        };
    }
}

/**
 * List memories for dashboard with filtering and pagination
 */
export async function listMemoriesForDashboard(
    options: DashboardListOptions
): Promise<PaginatedMemories> {
    const { userId, page, limit, search } = options;

    try {
        const client = getConvexClient();
        let memories = await client.query(api.memories.listByUser, {
            user_id: userId as any,
        });

        if (!memories) memories = [];

        // Filter by search term in JS
        if (search) {
            const lower = search.toLowerCase();
            memories = memories.filter(
                (m: any) =>
                    m.content_preview?.toLowerCase().includes(lower) ||
                    m.source?.toLowerCase().includes(lower)
            );
        }

        const total = memories.length;

        // Paginate in JS
        const start = (page - 1) * limit;
        const paginated = memories.slice(start, start + limit);

        return {
            memories: paginated,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    } catch {
        return {
            memories: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
        };
    }
}

/**
 * Update a memory
 * Convex memories schema is minimal — log the update as action_log
 */
export async function updateMemory(id: string, data: UpdateMemoryInput): Promise<Memory> {
    try {
        const client = getConvexClient();
        // Convex memories table doesn't have update mutation — log the intent
        await client.mutation(api.actionLog.log, {
            event_type: 'memory_update',
            details: { memoryId: id, ...data },
        });
        return { id, ...data };
    } catch {
        return null;
    }
}

/**
 * Soft delete a memory (archive) — in Convex, this is a hard delete
 */
export async function softDeleteMemory(id: string): Promise<Memory> {
    try {
        const client = getConvexClient();
        await client.mutation(api.memories.remove, { id: id as any });
        return { id, isActive: false };
    } catch {
        return null;
    }
}

/**
 * Submit feedback on a memory — logged via action_log
 */
export async function submitFeedback(input: FeedbackInput): Promise<MemoryFeedback> {
    try {
        const client = getConvexClient();
        const id = await client.mutation(api.actionLog.log, {
            user_id: input.userId as any,
            event_type: 'memory_feedback',
            details: {
                memoryId: input.memoryId,
                wasHelpful: input.wasHelpful,
                notes: input.notes,
                queryText: input.queryText,
            },
        });
        return { id, ...input };
    } catch {
        return null as any;
    }
}

// ============================================
// LEGACY CRUD FUNCTIONS
// ============================================

/**
 * Create a memory
 */
export async function createMemory(input: CreateMemoryInput): Promise<Memory> {
    try {
        const client = getConvexClient();
        const id = await client.mutation(api.memories.create, {
            user_id: input.userId as any,
            content_preview: input.content,
            source: input.source || 'user_input',
        });
        return {
            id,
            userId: input.userId,
            content: input.content,
            type: input.type,
            source: input.source,
        };
    } catch {
        return null;
    }
}

/**
 * Search memories
 */
export async function searchMemories(options: SearchMemoriesOptions): Promise<Memory[]> {
    try {
        const client = getConvexClient();
        const memories = await client.query(api.memories.listByUser, {
            user_id: options.userId as any,
            limit: options.limit || 20,
        });
        return memories || [];
    } catch {
        return [];
    }
}

/**
 * Get memory by ID
 */
export async function getMemory(id: string, _userId: string): Promise<Memory | null> {
    try {
        const client = getConvexClient();
        // Convex memories doesn't have a single-get query — list and find
        // For now return null; in practice SuperMemory handles retrieval
        return null;
    } catch {
        return null;
    }
}

/**
 * Update memory access time and count — no-op in Convex (schema doesn't track access)
 */
export async function touchMemory(_id: string) {
    // Convex memories schema doesn't have lastAccessedAt or accessCount
    return null;
}

/**
 * Hard delete memory
 */
export async function deleteMemory(id: string, _userId: string) {
    try {
        const client = getConvexClient();
        await client.mutation(api.memories.remove, { id: id as any });
        return { count: 1 };
    } catch {
        return { count: 0 };
    }
}

/**
 * Get user's global memories (not tied to a specific chat)
 */
export async function getGlobalMemories(userId: string, limit?: number): Promise<Memory[]> {
    try {
        const client = getConvexClient();
        const memories = await client.query(api.memories.listByUser, {
            user_id: userId as any,
            limit: limit || 50,
        });
        return memories || [];
    } catch {
        return [];
    }
}

/**
 * Synthesize recent memories into a coherent narrative
 * Retrieves recent memories and creates a summarized view
 */
export async function synthesizeMemories(userId: string): Promise<string> {
    try {
        const client = getConvexClient();
        const recentMemories = await client.query(api.memories.listByUser, {
            user_id: userId as any,
            limit: 20,
        });

        if (!recentMemories || recentMemories.length === 0) {
            return 'No memories available to synthesize.';
        }

        // Build a narrative from content_preview fields
        const lines = recentMemories.map(
            (m: any, i: number) =>
                `${i + 1}. ${m.content_preview || '(no preview)'} [source: ${m.source || 'unknown'}]`
        );

        return `# Memory Synthesis for User ${userId}\n\n${lines.join('\n')}`;
    } catch {
        return 'No memories available to synthesize.';
    }
}
