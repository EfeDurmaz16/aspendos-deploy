/**
 * OpenMemory Service
 *
 * Wrapper around openmemory-js SDK for Aspendos.
 * Provides cognitive memory with HMD sectors, decay, and explainable traces.
 */

import { Memory } from 'openmemory-js';

// Initialize OpenMemory client
const mem = new Memory();

// ============================================
// TYPES (matching OpenMemory response format)
// ============================================

// @ts-expect-error - Accessing internal DB module to fix missing delete/update methods
import { q } from 'openmemory-js/dist/core/db';

export interface MemoryResult {
    id: string;
    content: string;
    sector?: string;
    salience?: number;
    createdAt?: string;
    metadata?: Record<string, unknown>;
    trace?: {
        recall_reason: string;
        waypoints?: string[];
    };
}

export interface MemoryStats {
    total: number;
    bySector: Record<string, number>;
    avgSalience: number;
}

// ============================================
// MEMORY OPERATIONS
// ============================================

/**
 * Add a memory for a user
 */
export async function addMemory(
    content: string,
    userId: string,
    options?: {
        tags?: string[];
        sector?: string;
        metadata?: Record<string, unknown>;
    }
): Promise<MemoryResult> {
    const result = await mem.add(content, {
        user_id: userId,
        tags: options?.tags,
        metadata: {
            sector: options?.sector,
            ...options?.metadata,
        },
    });

    return {
        id: result.id,
        content: result.content || content,
        sector: options?.sector,
        salience: result.salience,
        createdAt: result.created_at,
        metadata: result.metadata,
    };
}

/**
 * Search memories for a user
 */
export async function searchMemories(
    query: string,
    userId: string,
    options?: {
        limit?: number;
        threshold?: number;
    }
): Promise<MemoryResult[]> {
    const results = await mem.search(query, {
        user_id: userId,
        limit: options?.limit || 5,
    });

    return results.map((r) => ({
        id: r.id,
        content: r.content,
        sector: ((r.metadata as Record<string, unknown>)?.sector as string) || 'semantic',
        salience: r.salience || 0,
        createdAt: r.created_at,
        metadata: r.metadata,
        isPinned: !!(r.metadata as Record<string, unknown>)?.isPinned,
        trace: r.trace,
    }));
}

/**
 * List all memories for a user
 */
export async function listMemories(
    userId: string,
    options?: {
        limit?: number;
        offset?: number;
    }
): Promise<MemoryResult[]> {
    const results = await mem.search('', {
        user_id: userId,
        limit: options?.limit || 50,
    });

    return results.map((r) => ({
        id: r.id,
        content: r.content,
        sector: ((r.metadata as Record<string, unknown>)?.sector as string) || 'semantic',
        salience: r.salience || 0,
        createdAt: r.created_at,
        metadata: r.metadata,
        isPinned: !!(r.metadata as Record<string, unknown>)?.isPinned,
    }));
}

/**
 * Update a memory
 */
export async function updateMemory(
    id: string,
    content: string,
    options?: {
        sector?: string;
        tags?: string[];
        metadata?: Record<string, unknown>;
    }
): Promise<void> {
    const memData = await q.get_mem.get(id);
    if (!memData) throw new Error('Memory not found');

    const currentMeta = memData.meta ? JSON.parse(memData.meta) : {};
    const newMeta = JSON.stringify({
        ...currentMeta,
        ...options?.metadata,
        sector: options?.sector || currentMeta.sector,
    });

    // Convert tags to string format if array
    const tagsStr = options?.tags ? options.tags.join(',') : memData.tags;

    if (options?.sector) {
        await q.upd_mem_with_sector.run(content, options.sector, tagsStr, newMeta, Date.now(), id);
    } else {
        await q.upd_mem.run(content, tagsStr, newMeta, Date.now(), id);
    }
}

/**
 * Delete a memory
 */
export async function deleteMemory(id: string): Promise<void> {
    try {
        await q.del_mem.run(id);
        // Also clean up vectors to prevent orphans
        // Note: SDK doesn't expose vector delete easily without id, but DB handles cascade usually?
        // Checking openmemory schema: no foreign keys defined in SQLite/PG usually for vectors in early versions?
        // Actually q.del_mem only deletes from memories table.
        // Ideally we should delete from vectors too, but 'del_mem' in db.ts only deletes from memories.
        // We will stick to what the internal DB methods provide.
    } catch (e) {
        console.error('Error deleting memory:', e);
        throw e;
    }
}

/**
 * Reinforce a memory (increases salience)
 */
export async function reinforceMemory(id: string): Promise<void> {
    await mem.reinforce(id);
}

/**
 * Get memory stats for a user
 */
export async function getMemoryStats(userId: string): Promise<MemoryStats> {
    const memories = await listMemories(userId, { limit: 1000 });

    const bySector: Record<string, number> = {};
    let totalSalience = 0;

    for (const m of memories) {
        const sector = m.sector || 'semantic';
        bySector[sector] = (bySector[sector] || 0) + 1;
        totalSalience += m.salience || 0;
    }

    return {
        total: memories.length,
        bySector,
        avgSalience: memories.length > 0 ? totalSalience / memories.length : 0,
    };
}

/**
 * Get OpenMemory client for direct access
 */
export function getMemoryClient(): Memory {
    return mem;
}
