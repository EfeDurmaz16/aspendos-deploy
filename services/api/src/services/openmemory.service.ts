/**
 * OpenMemory Service
 *
 * Wrapper around openmemory-js SDK for Aspendos.
 * Provides cognitive memory with HMD sectors, decay, and explainable traces.
 */

import { Memory } from 'openmemory-js';
import { prisma } from '@aspendos/db';
import { breakers } from '../lib/circuit-breaker';
import { queueFallbackWrite, searchFallback } from '../lib/memory-fallback';

// Initialize OpenMemory client
const mem = new Memory();

/**
 * Graceful degradation wrapper for Qdrant operations.
 * If Qdrant is down, return fallback value instead of throwing.
 */
async function withQdrantFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
        return await breakers.qdrant.execute(fn);
    } catch (error) {
        console.warn(
            '[Qdrant] Service unavailable, using fallback:',
            error instanceof Error ? error.message : 'Unknown'
        );
        return fallback;
    }
}

// ============================================
// TYPES (matching OpenMemory response format)
// ============================================

import { q } from 'openmemory-js/dist/core/db';

/**
 * Apply recency boost to search results.
 * Newer memories get a small score boost, creating a "living memory" effect.
 * This is a moat differentiator: competitors return static results,
 * we surface recent context that's more likely to be relevant.
 */
function applyRecencyBoost(
    results: Array<{ id: string; score: number; createdAt?: string; [key: string]: unknown }>,
    boostFactor = 0.1
): typeof results {
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    return results
        .map((r) => {
            if (!r.createdAt) return r;
            const ageMs = now - new Date(r.createdAt).getTime();
            // Boost ranges from 0 to boostFactor, linear decay over 30 days
            const boost = Math.max(0, boostFactor * (1 - ageMs / THIRTY_DAYS_MS));
            return { ...r, score: r.score + boost };
        })
        .sort((a, b) => b.score - a.score);
}

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
    try {
        const result = await breakers.qdrant.execute(
            async () =>
                await mem.add(content, {
                    user_id: userId,
                    tags: options?.tags,
                    metadata: {
                        sector: options?.sector,
                        ...options?.metadata,
                    },
                })
        );

        return {
            id: result.id,
            content: result.content || content,
            sector: options?.sector,
            salience: result.salience,
            createdAt: result.created_at,
            metadata: result.metadata,
        };
    } catch (error) {
        console.warn(
            '[Qdrant] addMemory failed, using PostgreSQL fallback:',
            error instanceof Error ? error.message : 'Unknown'
        );

        const fallback = await queueFallbackWrite(userId, content, {
            tags: options?.tags,
            sector: options?.sector,
            metadata: options?.metadata,
        });

        return {
            id: fallback.id,
            content: fallback.content,
            sector: fallback.sector,
            salience: fallback.salience,
            createdAt: fallback.createdAt,
            metadata: fallback.metadata,
        };
    }
}

/**
 * Add multiple memories in batch for a user.
 * Flushes in configurable batch sizes with delay between batches to avoid rate limits.
 * Returns results for successful adds and logs errors for failures.
 */
export async function addMemoriesBatch(
    memories: Array<{
        content: string;
        tags?: string[];
        sector?: string;
        metadata?: Record<string, unknown>;
    }>,
    userId: string,
    options?: { batchSize?: number; delayMs?: number }
): Promise<{ succeeded: number; failed: number; results: MemoryResult[] }> {
    const batchSize = options?.batchSize || 100;
    const delayMs = options?.delayMs || 200;
    const results: MemoryResult[] = [];
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < memories.length; i += batchSize) {
        const batch = memories.slice(i, i + batchSize);

        // Process batch concurrently
        const batchResults = await Promise.allSettled(
            batch.map((m) =>
                addMemory(m.content, userId, {
                    tags: m.tags,
                    sector: m.sector,
                    metadata: m.metadata,
                })
            )
        );

        for (const result of batchResults) {
            if (result.status === 'fulfilled') {
                results.push(result.value);
                succeeded++;
            } else {
                console.error('[Qdrant] Batch add failed for item:', result.reason);
                failed++;
            }
        }

        // Delay between batches to avoid overwhelming Qdrant
        if (i + batchSize < memories.length) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }

    return { succeeded, failed, results };
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
    try {
        const results = await breakers.qdrant.execute(
            async () =>
                await mem.search(query, {
                    user_id: userId,
                    limit: options?.limit || 5,
                })
        );

        const mapped = results.map((r: any) => ({
            id: r.id,
            content: r.content,
            sector: ((r.metadata as Record<string, unknown>)?.sector as string) || 'semantic',
            salience: r.salience || 0,
            score: r.salience || 0,
            createdAt: r.created_at,
            metadata: r.metadata,
            isPinned: !!(r.metadata as Record<string, unknown>)?.isPinned,
            trace: r.trace,
        }));

        // Hybrid search: also query PostgreSQL for unembedded imported memories (decayScore: 0)
        // These are recently imported memories that haven't been embedded in Qdrant yet
        try {
            const queryWords = query
                .toLowerCase()
                .split(/\s+/)
                .filter((w) => w.length > 2);

            if (queryWords.length > 0) {
                const pgImports = await prisma.memory.findMany({
                    where: {
                        userId,
                        isActive: true,
                        decayScore: 0,
                        source: { in: ['import_pending', 'qdrant_fallback'] },
                        OR: queryWords.map((word) => ({
                            content: { contains: word, mode: 'insensitive' as const },
                        })),
                    },
                    orderBy: { createdAt: 'desc' },
                    take: options?.limit || 5,
                });

                // Merge with Qdrant results, deduplicating by content similarity
                const existingContents = new Set(mapped.map((m: { content: string }) => m.content.slice(0, 100)));
                for (const pg of pgImports) {
                    if (!existingContents.has(pg.content.slice(0, 100))) {
                        mapped.push({
                            id: pg.id,
                            content: pg.content,
                            sector: pg.sector || 'semantic',
                            salience: pg.confidence || 0.5,
                            score: pg.confidence || 0.5,
                            createdAt: pg.createdAt.toISOString(),
                            metadata: { source: pg.source },
                            isPinned: false,
                            trace: undefined,
                        });
                        existingContents.add(pg.content.slice(0, 100));
                    }
                }
            }
        } catch (pgError) {
            console.warn('[HybridSearch] PostgreSQL import search failed:', pgError);
        }

        // Apply recency boost to surface recent context
        const boosted = applyRecencyBoost(mapped);

        // Remove the score field and return as MemoryResult[]
        return boosted.map((item) => {
            const { score: _score, ...rest } = item;
            return rest as unknown as MemoryResult;
        });
    } catch (error) {
        console.warn(
            '[Qdrant] searchMemories failed, using PostgreSQL fallback:',
            error instanceof Error ? error.message : 'Unknown'
        );

        const fallbackResults = await searchFallback(userId, query, options?.limit || 5);

        return fallbackResults.map((r) => ({
            id: r.id,
            content: r.content,
            sector: r.sector,
            salience: r.salience,
            createdAt: r.createdAt,
            metadata: r.metadata,
        }));
    }
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
    const results = await withQdrantFallback(
        async () =>
            await mem.search('', {
                user_id: userId,
                limit: options?.limit || 50,
            }),
        []
    );

    return results.map((r: any) => ({
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
    content?: string,
    options?: {
        sector?: string;
        tags?: string[];
        metadata?: Record<string, unknown>;
    }
): Promise<void> {
    const memData = await q.get_mem.get(id);
    if (!memData) throw new Error('Memory not found');
    const nextContent = content ?? memData.memory;

    const currentMeta = memData.meta ? JSON.parse(memData.meta) : {};
    const newMeta = JSON.stringify({
        ...currentMeta,
        ...options?.metadata,
        sector: options?.sector || currentMeta.sector,
    });

    // Convert tags to string format if array
    const tagsStr = options?.tags ? options.tags.join(',') : memData.tags;

    if (options?.sector) {
        await q.upd_mem_with_sector.run(
            nextContent,
            options.sector,
            tagsStr,
            newMeta,
            Date.now(),
            id
        );
    } else {
        await q.upd_mem.run(nextContent, tagsStr, newMeta, Date.now(), id);
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
 * Verify that a memory belongs to a specific user (IDOR prevention)
 */
export async function verifyMemoryOwnership(memoryId: string, userId: string): Promise<boolean> {
    try {
        const memData = await q.get_mem.get(memoryId);
        if (!memData) return false;
        const meta = memData.meta ? JSON.parse(memData.meta) : {};
        // OpenMemory stores user_id in the memory record or metadata
        return memData.user_id === userId || meta.user_id === userId;
    } catch {
        return false;
    }
}

/**
 * Get OpenMemory client for direct access
 */
export function getMemoryClient(): Memory {
    return mem;
}
