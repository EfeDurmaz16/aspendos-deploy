/**
 * SuperMemory Service
 *
 * Wrapper around the SuperMemory API for YULA OS.
 * Provides the same interface as openmemory.service.ts for drop-in replacement.
 *
 * Key concepts:
 * - Container tags: `user_{userId}` for multi-tenant isolation
 * - HMD sectors stored as metadata on memories
 * - Profile API for auto-maintained user facts (static + dynamic)
 * - Conversation API for smart memory extraction with diffing
 */

import { prisma } from '@aspendos/db';
import { SuperMemory } from 'supermemory';
import { breakers } from '../lib/circuit-breaker';
import { queueFallbackWrite, searchFallback } from '../lib/memory-fallback';
import type { MemoryResult, MemoryStats } from './openmemory.service';

// ============================================
// CLIENT INITIALIZATION
// ============================================

let client: SuperMemory | null = null;

function getClient(): SuperMemory {
    if (!client) {
        const apiKey = process.env.SUPERMEMORY_API_KEY;
        if (!apiKey) {
            throw new Error('SUPERMEMORY_API_KEY is not set');
        }
        client = new SuperMemory({ apiKey });
    }
    return client;
}

// ============================================
// HELPERS
// ============================================

function containerTag(userId: string): string {
    return `user_${userId}`;
}

/**
 * Apply recency boost to search results (same logic as openmemory.service).
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
            const boost = Math.max(0, boostFactor * (1 - ageMs / THIRTY_DAYS_MS));
            return { ...r, score: r.score + boost };
        })
        .sort((a, b) => b.score - a.score);
}

/**
 * Graceful degradation wrapper for SuperMemory operations.
 */
async function withSupermemoryFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
        return await breakers.supermemory.execute(fn);
    } catch (error) {
        console.warn(
            '[SuperMemory] Service unavailable, using fallback:',
            error instanceof Error ? error.message : 'Unknown'
        );
        return fallback;
    }
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
        const sm = getClient();
        const result = await breakers.supermemory.execute(async () =>
            sm.memories.create({
                content,
                containerTags: [containerTag(userId)],
                metadata: {
                    sector: options?.sector || 'semantic',
                    ...options?.metadata,
                    tags: options?.tags,
                },
            })
        );

        return {
            id: result.id || crypto.randomUUID(),
            content,
            sector: options?.sector,
            salience: 1.0,
            createdAt: new Date().toISOString(),
            metadata: {
                sector: options?.sector,
                ...options?.metadata,
            },
        };
    } catch (error) {
        console.warn(
            '[SuperMemory] addMemory failed, using PostgreSQL fallback:',
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
                console.error('[SuperMemory] Batch add failed for item:', result.reason);
                failed++;
            }
        }

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
        const sm = getClient();
        const results = await breakers.supermemory.execute(async () =>
            sm.search.execute({
                q: query,
                containerTags: [containerTag(userId)],
                limit: options?.limit || 5,
            })
        );

        const mapped = (results.results || []).map((r: any) => ({
            id: r.id || crypto.randomUUID(),
            content: r.content || r.chunk || '',
            sector: r.metadata?.sector || 'semantic',
            salience: r.score || 0,
            score: r.score || 0,
            createdAt: r.createdAt || r.metadata?.createdAt,
            metadata: r.metadata,
            trace: {
                recall_reason: 'supermemory_search',
            },
        }));

        // Also check PostgreSQL for unsynced fallback memories (same hybrid pattern)
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
                        source: { in: ['import_pending', 'supermemory_fallback'] },
                        OR: queryWords.map((word) => ({
                            content: { contains: word, mode: 'insensitive' as const },
                        })),
                    },
                    orderBy: { createdAt: 'desc' },
                    take: options?.limit || 5,
                });

                const existingContents = new Set(
                    mapped.map((m: { content: string }) => m.content.slice(0, 100))
                );
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
                            trace: undefined,
                        });
                        existingContents.add(pg.content.slice(0, 100));
                    }
                }
            }
        } catch (pgError) {
            console.warn('[HybridSearch] PostgreSQL import search failed:', pgError);
        }

        const boosted = applyRecencyBoost(mapped);

        return boosted.map((item) => {
            const { score: _score, ...rest } = item;
            return rest as unknown as MemoryResult;
        });
    } catch (error) {
        console.warn(
            '[SuperMemory] searchMemories failed, using PostgreSQL fallback:',
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
    const sm = getClient();
    const results = await withSupermemoryFallback(
        async () =>
            sm.documents.list({
                containerTags: [containerTag(userId)],
                limit: options?.limit || 50,
                offset: options?.offset || 0,
            }),
        { documents: [], pagination: { total: 0, limit: 50, offset: 0, hasMore: false } }
    );

    return (results.documents || []).map((r: any) => ({
        id: r.id,
        content: r.content || r.title || '',
        sector: r.metadata?.sector || 'semantic',
        salience: r.metadata?.salience || 0,
        createdAt: r.createdAt,
        metadata: r.metadata,
    }));
}

/**
 * Update a memory (delete + re-add since SuperMemory has no in-place update for memories)
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
    const sm = getClient();

    // SuperMemory documents support PATCH
    await breakers.supermemory.execute(async () =>
        sm.documents.update(id, {
            ...(content ? { content } : {}),
            metadata: {
                ...options?.metadata,
                ...(options?.sector ? { sector: options.sector } : {}),
            },
        })
    );
}

/**
 * Delete a memory
 */
export async function deleteMemory(id: string): Promise<void> {
    const sm = getClient();
    try {
        await breakers.supermemory.execute(async () => sm.documents.delete(id));
    } catch (e) {
        console.error('[SuperMemory] Error deleting memory:', e);
        throw e;
    }
}

/**
 * Reinforce a memory (re-add with boosted metadata since SuperMemory has no native reinforce)
 */
export async function reinforceMemory(id: string): Promise<void> {
    // SuperMemory doesn't have a reinforce concept.
    // We track reinforcement in PostgreSQL and boost the metadata.
    const pgMemory = await prisma.memory.findFirst({ where: { id } });
    if (pgMemory) {
        await prisma.memory.update({
            where: { id },
            data: {
                accessCount: { increment: 1 },
                confidence: Math.min(1.0, (pgMemory.confidence || 0.5) + 0.1),
            },
        });
    }
}

/**
 * Get memory stats for a user (from PostgreSQL since SuperMemory has no stats endpoint)
 */
export async function getMemoryStats(userId: string): Promise<MemoryStats> {
    const memories = await prisma.memory.findMany({
        where: { userId, isActive: true },
        select: { sector: true, confidence: true },
    });

    const bySector: Record<string, number> = {};
    let totalSalience = 0;

    for (const m of memories) {
        const sector = m.sector || 'semantic';
        bySector[sector] = (bySector[sector] || 0) + 1;
        totalSalience += m.confidence || 0;
    }

    return {
        total: memories.length,
        bySector,
        avgSalience: memories.length > 0 ? totalSalience / memories.length : 0,
    };
}

/**
 * Verify that a memory belongs to a specific user (IDOR prevention)
 * Uses PostgreSQL since it's always the source of truth for ownership.
 */
export async function verifyMemoryOwnership(memoryId: string, userId: string): Promise<boolean> {
    const memory = await prisma.memory.findFirst({
        where: { id: memoryId, userId },
    });
    return !!memory;
}

/**
 * Get SuperMemory client for direct access
 */
export function getMemoryClient(): SuperMemory {
    return getClient();
}

// ============================================
// SUPERMEMORY-SPECIFIC FEATURES
// ============================================

/**
 * Get user profile (auto-maintained static + dynamic facts)
 */
export async function getUserProfile(
    userId: string,
    query?: string
): Promise<{ static: string[]; dynamic: string[]; searchResults?: string[] }> {
    const sm = getClient();
    try {
        const profile = await breakers.supermemory.execute(async () =>
            sm.profile({
                containerTags: [containerTag(userId)],
                ...(query ? { q: query } : {}),
            })
        );
        return {
            static: profile.static || [],
            dynamic: profile.dynamic || [],
            searchResults: profile.searchResults,
        };
    } catch (error) {
        console.warn('[SuperMemory] getUserProfile failed:', error);
        return { static: [], dynamic: [] };
    }
}

/**
 * Send conversation for auto memory extraction (smart diffing)
 */
export async function processConversation(
    conversationId: string,
    userId: string,
    messages: Array<{ role: string; content: string }>
): Promise<void> {
    const sm = getClient();
    try {
        await breakers.supermemory.execute(async () =>
            sm.conversations.create({
                conversationId,
                containerTags: [containerTag(userId)],
                messages: messages.map((m) => ({
                    role: m.role as 'user' | 'assistant' | 'system',
                    content: m.content,
                })),
            })
        );
    } catch (error) {
        console.warn('[SuperMemory] processConversation failed:', error);
    }
}

/**
 * Forget a memory (soft-delete via SuperMemory API)
 */
export async function forgetMemory(
    userId: string,
    options: { memoryId?: string; memoryContent?: string; reason?: string }
): Promise<void> {
    const sm = getClient();
    await breakers.supermemory.execute(async () =>
        sm.memories.forget({
            containerTags: [containerTag(userId)],
            ...(options.memoryId ? { memoryId: options.memoryId } : {}),
            ...(options.memoryContent ? { memoryContent: options.memoryContent } : {}),
            ...(options.reason ? { reason: options.reason } : {}),
        })
    );
}
