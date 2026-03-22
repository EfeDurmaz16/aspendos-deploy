/**
 * Memory Router Service
 *
 * Facade that routes memory operations to the correct backend
 * based on the MEMORY_BACKEND environment variable.
 *
 * Modes:
 * - openmemory: Routes to OpenMemory/Qdrant (current/legacy)
 * - supermemory: Routes to SuperMemory API
 * - dual: Writes to both, reads from SuperMemory (primary) with OpenMemory fallback
 * - off: PostgreSQL-only degraded mode
 *
 * Exports the same interface as openmemory.service.ts for drop-in replacement.
 */

import { prisma } from '@aspendos/db';
import { queueFallbackWrite, searchFallback } from '../lib/memory-fallback';
import type { MemoryResult, MemoryStats } from './openmemory.service';
import * as openMemoryService from './openmemory.service';
import * as superMemoryService from './supermemory.service';

// Re-export types
export type { MemoryResult, MemoryStats } from './openmemory.service';

// ============================================
// BACKEND SELECTION
// ============================================

type MemoryBackend = 'openmemory' | 'supermemory' | 'dual' | 'off';

function getBackend(): MemoryBackend {
    const backend = (process.env.MEMORY_BACKEND || 'openmemory') as MemoryBackend;
    if (!['openmemory', 'supermemory', 'dual', 'off'].includes(backend)) {
        console.warn(
            `[MemoryRouter] Invalid MEMORY_BACKEND="${backend}", falling back to "openmemory"`
        );
        return 'openmemory';
    }
    return backend;
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
    const backend = getBackend();

    switch (backend) {
        case 'supermemory':
            return superMemoryService.addMemory(content, userId, options);

        case 'dual': {
            // Write to both, return SuperMemory result
            const [smResult] = await Promise.allSettled([
                superMemoryService.addMemory(content, userId, options),
                openMemoryService.addMemory(content, userId, options),
            ]);
            if (smResult.status === 'fulfilled') return smResult.value;
            // SuperMemory failed, try OpenMemory result
            return openMemoryService.addMemory(content, userId, options);
        }

        case 'off':
            // PostgreSQL-only fallback
            return pgOnlyAdd(content, userId, options);

        case 'openmemory':
        default:
            return openMemoryService.addMemory(content, userId, options);
    }
}

/**
 * Add multiple memories in batch
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
    const backend = getBackend();

    switch (backend) {
        case 'supermemory':
            return superMemoryService.addMemoriesBatch(memories, userId, options);

        case 'dual': {
            // Write to both, return SuperMemory result
            const [smResult, _omResult] = await Promise.allSettled([
                superMemoryService.addMemoriesBatch(memories, userId, options),
                openMemoryService.addMemoriesBatch(memories, userId, options),
            ]);
            if (smResult.status === 'fulfilled') return smResult.value;
            return openMemoryService.addMemoriesBatch(memories, userId, options);
        }

        case 'off':
            return { succeeded: 0, failed: memories.length, results: [] };

        case 'openmemory':
        default:
            return openMemoryService.addMemoriesBatch(memories, userId, options);
    }
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
    const backend = getBackend();

    switch (backend) {
        case 'supermemory':
            return superMemoryService.searchMemories(query, userId, options);

        case 'dual': {
            // Read from SuperMemory primary, OpenMemory fallback
            try {
                return await superMemoryService.searchMemories(query, userId, options);
            } catch {
                console.warn(
                    '[MemoryRouter] SuperMemory search failed in dual mode, falling back to OpenMemory'
                );
                return openMemoryService.searchMemories(query, userId, options);
            }
        }

        case 'off':
            return (await searchFallback(userId, query, options?.limit || 5)).map((r) => ({
                id: r.id,
                content: r.content,
                sector: r.sector,
                salience: r.salience,
                createdAt: r.createdAt,
                metadata: r.metadata,
            }));

        case 'openmemory':
        default:
            return openMemoryService.searchMemories(query, userId, options);
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
    const backend = getBackend();

    switch (backend) {
        case 'supermemory':
            return superMemoryService.listMemories(userId, options);

        case 'dual':
            try {
                return await superMemoryService.listMemories(userId, options);
            } catch {
                return openMemoryService.listMemories(userId, options);
            }

        case 'off': {
            const pgMemories = await prisma.memory.findMany({
                where: { userId, isActive: true },
                orderBy: { createdAt: 'desc' },
                take: options?.limit || 50,
                skip: options?.offset || 0,
            });
            return pgMemories.map((m) => ({
                id: m.id,
                content: m.content,
                sector: m.sector || 'semantic',
                salience: m.confidence || 0,
                createdAt: m.createdAt.toISOString(),
            }));
        }

        case 'openmemory':
        default:
            return openMemoryService.listMemories(userId, options);
    }
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
    const backend = getBackend();

    switch (backend) {
        case 'supermemory':
            return superMemoryService.updateMemory(id, content, options);

        case 'dual':
            await Promise.allSettled([
                superMemoryService.updateMemory(id, content, options),
                openMemoryService.updateMemory(id, content, options),
            ]);
            return;

        case 'off':
            // Update PostgreSQL directly
            await prisma.memory.update({
                where: { id },
                data: {
                    ...(content ? { content } : {}),
                    ...(options?.sector ? { sector: options.sector } : {}),
                    ...(options?.tags ? { tags: options.tags } : {}),
                },
            });
            return;

        case 'openmemory':
        default:
            return openMemoryService.updateMemory(id, content, options);
    }
}

/**
 * Delete a memory
 */
export async function deleteMemory(id: string): Promise<void> {
    const backend = getBackend();

    switch (backend) {
        case 'supermemory':
            return superMemoryService.deleteMemory(id);

        case 'dual':
            await Promise.allSettled([
                superMemoryService.deleteMemory(id),
                openMemoryService.deleteMemory(id),
            ]);
            return;

        case 'off':
            await prisma.memory.update({
                where: { id },
                data: { isActive: false },
            });
            return;

        case 'openmemory':
        default:
            return openMemoryService.deleteMemory(id);
    }
}

/**
 * Reinforce a memory (increases salience)
 */
export async function reinforceMemory(id: string): Promise<void> {
    const backend = getBackend();

    switch (backend) {
        case 'supermemory':
            return superMemoryService.reinforceMemory(id);

        case 'dual':
            await Promise.allSettled([
                superMemoryService.reinforceMemory(id),
                openMemoryService.reinforceMemory(id),
            ]);
            return;

        case 'off':
            await prisma.memory.update({
                where: { id },
                data: { accessCount: { increment: 1 } },
            });
            return;

        case 'openmemory':
        default:
            return openMemoryService.reinforceMemory(id);
    }
}

/**
 * Get memory stats for a user
 */
export async function getMemoryStats(userId: string): Promise<MemoryStats> {
    const backend = getBackend();

    // Stats always come from PostgreSQL for consistency across backends
    if (backend === 'supermemory' || backend === 'dual') {
        return superMemoryService.getMemoryStats(userId);
    }

    if (backend === 'off') {
        return superMemoryService.getMemoryStats(userId); // Same PG-based logic
    }

    return openMemoryService.getMemoryStats(userId);
}

/**
 * Verify that a memory belongs to a specific user (IDOR prevention)
 */
export async function verifyMemoryOwnership(memoryId: string, userId: string): Promise<boolean> {
    const backend = getBackend();

    // Ownership always checked in PostgreSQL for reliability
    if (backend === 'supermemory' || backend === 'dual' || backend === 'off') {
        return superMemoryService.verifyMemoryOwnership(memoryId, userId);
    }

    return openMemoryService.verifyMemoryOwnership(memoryId, userId);
}

/**
 * Get the underlying memory client.
 * Returns the SuperMemory client when using supermemory/dual backend,
 * otherwise returns the OpenMemory client.
 */
export function getMemoryClient(): unknown {
    const backend = getBackend();
    if (backend === 'supermemory' || backend === 'dual') {
        return superMemoryService.getMemoryClient();
    }
    return openMemoryService.getMemoryClient();
}

// ============================================
// SUPERMEMORY-SPECIFIC EXPORTS
// (Only available when backend is supermemory or dual)
// ============================================

export const supermemory = {
    getUserProfile: superMemoryService.getUserProfile,
    processConversation: superMemoryService.processConversation,
    forgetMemory: superMemoryService.forgetMemory,
};

// ============================================
// HELPERS
// ============================================

async function pgOnlyAdd(
    content: string,
    userId: string,
    options?: {
        tags?: string[];
        sector?: string;
        metadata?: Record<string, unknown>;
    }
): Promise<MemoryResult> {
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
