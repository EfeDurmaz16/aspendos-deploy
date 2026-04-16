/**
 * Memory Router Service
 *
 * Thin facade over SuperMemory. Previously routed across multiple backends
 * (OpenMemory/Qdrant/dual/off) via MEMORY_BACKEND — SuperMemory is now the
 * only backend in v1 (ADR 0001). Kept as a facade so callers can continue to
 * import from memory-router.service and we can swap backends later without a
 * codebase-wide find/replace.
 */

import * as superMemoryService from './supermemory.service';

// ============================================
// TYPES
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

export async function addMemory(
    content: string,
    userId: string,
    options?: {
        tags?: string[];
        sector?: string;
        metadata?: Record<string, unknown>;
    }
): Promise<MemoryResult> {
    return superMemoryService.addMemory(content, userId, options);
}

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
    return superMemoryService.addMemoriesBatch(memories, userId, options);
}

export async function searchMemories(
    query: string,
    userId: string,
    options?: {
        limit?: number;
        threshold?: number;
    }
): Promise<MemoryResult[]> {
    return superMemoryService.searchMemories(query, userId, options);
}

export async function listMemories(
    userId: string,
    options?: {
        limit?: number;
        offset?: number;
    }
): Promise<MemoryResult[]> {
    return superMemoryService.listMemories(userId, options);
}

export async function updateMemory(
    id: string,
    content?: string,
    options?: {
        sector?: string;
        tags?: string[];
        metadata?: Record<string, unknown>;
    }
): Promise<void> {
    return superMemoryService.updateMemory(id, content, options);
}

export async function deleteMemory(id: string): Promise<void> {
    return superMemoryService.deleteMemory(id);
}

export async function reinforceMemory(id: string): Promise<void> {
    return superMemoryService.reinforceMemory(id);
}

export async function getMemoryStats(userId: string): Promise<MemoryStats> {
    return superMemoryService.getMemoryStats(userId);
}

export async function verifyMemoryOwnership(memoryId: string, userId: string): Promise<boolean> {
    return superMemoryService.verifyMemoryOwnership(memoryId, userId);
}

export function getMemoryClient(): unknown {
    return superMemoryService.getMemoryClient();
}

// ============================================
// SUPERMEMORY-SPECIFIC EXPORTS
// ============================================

export const supermemory = {
    getUserProfile: superMemoryService.getUserProfile,
    processConversation: superMemoryService.processConversation,
    forgetMemory: superMemoryService.forgetMemory,
};
