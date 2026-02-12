/**
 * Memory Fallback Service
 *
 * Provides PostgreSQL-based fallback for memory operations when Qdrant is unavailable.
 * When the Qdrant circuit breaker is OPEN or operations fail, memories are written to
 * PostgreSQL and later synced back to Qdrant on recovery.
 *
 * Flow:
 * 1. Qdrant write fails -> queueFallbackWrite() stores in PostgreSQL with qdrantSynced=false
 * 2. Periodic syncPendingMemories() picks up unsynced rows and writes them to Qdrant
 * 3. Qdrant search fails -> searchFallback() uses PostgreSQL ILIKE text search
 */

import { prisma } from '@aspendos/db';
import { Memory as OpenMemoryClient } from 'openmemory-js';
import { breakers } from './circuit-breaker';

// Re-use the shared OpenMemory client for sync operations
const mem = new OpenMemoryClient();

/**
 * Interface for the memory client used during sync.
 * Allows injection of a mock client in tests.
 */
export interface MemoryClient {
    add(content: string, options: Record<string, unknown>): Promise<{ id: string }>;
}

// ============================================
// TYPES
// ============================================

export interface FallbackMemory {
    id: string;
    content: string;
    sector: string;
    salience: number;
    createdAt: string;
    metadata?: Record<string, unknown>;
}

export interface FallbackWriteOptions {
    tags?: string[];
    sector?: string;
    type?: string;
    metadata?: Record<string, unknown>;
}

export interface SyncResult {
    synced: number;
    failed: number;
    errors: string[];
}

// ============================================
// CONSTANTS
// ============================================

const FALLBACK_SOURCE = 'qdrant_fallback';
const DEFAULT_SECTOR = 'semantic';
const DEFAULT_TYPE = 'context';
const SYNC_BATCH_SIZE = 50;

// ============================================
// FALLBACK WRITE
// ============================================

/**
 * Store a memory in PostgreSQL when Qdrant is unavailable.
 * The memory is marked with source='qdrant_fallback' and decayScore=0
 * to indicate it has not been synced to Qdrant yet.
 *
 * We use decayScore=0 as the "unsynced" flag since:
 * - Normal memories start with decayScore=1.0
 * - A value of 0 unambiguously means "pending Qdrant sync"
 * - No schema migration is needed
 */
export async function queueFallbackWrite(
    userId: string,
    content: string,
    options?: FallbackWriteOptions
): Promise<FallbackMemory> {
    console.warn(
        `[MemoryFallback] Qdrant unavailable, writing memory to PostgreSQL for user=${userId}`
    );

    const record = await prisma.memory.create({
        data: {
            userId,
            content,
            type: options?.type || DEFAULT_TYPE,
            sector: options?.sector || DEFAULT_SECTOR,
            source: FALLBACK_SOURCE,
            tags: options?.tags || [],
            importance: 50,
            confidence: 0.8,
            decayScore: 0, // 0 = not synced to Qdrant
            isActive: true,
        },
    });

    return {
        id: record.id,
        content: record.content,
        sector: record.sector,
        salience: record.confidence,
        createdAt: record.createdAt.toISOString(),
        metadata: options?.metadata,
    };
}

// ============================================
// SYNC PENDING MEMORIES
// ============================================

/**
 * Sync memories that were written to PostgreSQL during Qdrant downtime
 * back to Qdrant. This should be called periodically (e.g., every 60s)
 * or when the Qdrant circuit breaker transitions from OPEN to CLOSED.
 *
 * Only attempts sync when the Qdrant breaker is not OPEN.
 */
export async function syncPendingMemories(client?: MemoryClient): Promise<SyncResult> {
    const memClient = client || mem;
    const result: SyncResult = { synced: 0, failed: 0, errors: [] };

    // Do not attempt sync if Qdrant is still down
    const qdrantState = breakers.qdrant.getState();
    if (qdrantState.state === 'OPEN') {
        console.warn('[MemoryFallback] Qdrant circuit still OPEN, skipping sync');
        return result;
    }

    // Find all unsynced memories (decayScore=0, source=qdrant_fallback)
    const pendingMemories = await prisma.memory.findMany({
        where: {
            source: FALLBACK_SOURCE,
            decayScore: 0,
            isActive: true,
        },
        take: SYNC_BATCH_SIZE,
        orderBy: { createdAt: 'asc' },
    });

    if (pendingMemories.length === 0) {
        return result;
    }

    console.info(
        `[MemoryFallback] Syncing ${pendingMemories.length} pending memories to Qdrant`
    );

    for (const memory of pendingMemories) {
        try {
            // Write to Qdrant via OpenMemory SDK
            await memClient.add(memory.content, {
                user_id: memory.userId,
                tags: memory.tags,
                metadata: {
                    sector: memory.sector,
                    pgFallbackId: memory.id,
                },
            });

            // Mark as synced: restore decayScore to 1.0 and update source
            await prisma.memory.update({
                where: { id: memory.id },
                data: {
                    decayScore: 1.0,
                    source: 'qdrant_synced',
                },
            });

            result.synced++;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            result.failed++;
            result.errors.push(`Memory ${memory.id}: ${message}`);

            // If Qdrant circuit opens again during sync, stop early
            if (breakers.qdrant.getState().state === 'OPEN') {
                console.warn(
                    '[MemoryFallback] Qdrant circuit opened during sync, stopping batch'
                );
                break;
            }
        }
    }

    console.info(
        `[MemoryFallback] Sync complete: ${result.synced} synced, ${result.failed} failed`
    );

    return result;
}

// ============================================
// SEARCH FALLBACK
// ============================================

/**
 * Basic PostgreSQL text search fallback when Qdrant is unavailable.
 * Uses case-insensitive text matching via Prisma's `contains` mode.
 *
 * This is intentionally a degraded experience compared to semantic search,
 * but it keeps the application functional during Qdrant outages.
 */
export async function searchFallback(
    userId: string,
    query: string,
    limit = 5
): Promise<FallbackMemory[]> {
    console.warn(
        `[MemoryFallback] Using PostgreSQL text search fallback for user=${userId}`
    );

    // Split query into individual words for broader matching
    const queryWords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);

    if (queryWords.length === 0) {
        // If no meaningful words, return recent memories
        const recent = await prisma.memory.findMany({
            where: {
                userId,
                isActive: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return recent.map(toFallbackMemory);
    }

    // Build OR conditions for each word using case-insensitive contains
    const results = await prisma.memory.findMany({
        where: {
            userId,
            isActive: true,
            OR: queryWords.map((word) => ({
                content: {
                    contains: word,
                    mode: 'insensitive' as const,
                },
            })),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    return results.map(toFallbackMemory);
}

// ============================================
// PENDING COUNT (for health checks)
// ============================================

/**
 * Returns the number of memories waiting to be synced to Qdrant.
 * Useful for health check endpoints and monitoring dashboards.
 */
export async function getPendingSyncCount(): Promise<number> {
    return prisma.memory.count({
        where: {
            source: FALLBACK_SOURCE,
            decayScore: 0,
            isActive: true,
        },
    });
}

// ============================================
// HELPERS
// ============================================

function toFallbackMemory(record: {
    id: string;
    content: string;
    sector: string;
    confidence: number;
    createdAt: Date;
}): FallbackMemory {
    return {
        id: record.id,
        content: record.content,
        sector: record.sector,
        salience: record.confidence,
        createdAt: record.createdAt.toISOString(),
    };
}
