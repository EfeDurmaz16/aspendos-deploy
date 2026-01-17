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

    return results.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        content: r.content as string,
        sector: (r.metadata as Record<string, unknown>)?.sector as string || 'semantic',
        salience: r.salience as number,
        createdAt: r.created_at as string,
        metadata: r.metadata as Record<string, unknown>,
        trace: r.trace as { recall_reason: string; waypoints?: string[] },
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
    const results = await mem.list({
        user_id: userId,
        limit: options?.limit || 50,
    });

    return results.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        content: r.content as string,
        sector: (r.metadata as Record<string, unknown>)?.sector as string || 'semantic',
        salience: r.salience as number,
        createdAt: r.created_at as string,
        metadata: r.metadata as Record<string, unknown>,
    }));
}

/**
 * Delete a memory
 */
export async function deleteMemory(id: string): Promise<void> {
    await mem.delete(id);
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
