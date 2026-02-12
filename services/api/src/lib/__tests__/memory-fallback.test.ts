import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================
// MOCKS (must be before imports of tested module)
// ============================================

vi.mock('@aspendos/db', () => ({
    prisma: {
        memory: {
            create: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            count: vi.fn(),
        },
    },
}));

vi.mock('../circuit-breaker', () => ({
    breakers: {
        qdrant: {
            getState: vi.fn().mockReturnValue({ state: 'CLOSED', failures: 0, name: 'Qdrant' }),
        },
    },
}));

// Mock openmemory-js to prevent real SDK initialization at module load
// Must use regular function (not arrow) since it's called with `new`
vi.mock('openmemory-js', () => ({
    Memory: vi.fn(function () {
        return { add: vi.fn().mockResolvedValue({ id: 'default-qdrant-id' }) };
    }),
}));

import { prisma } from '@aspendos/db';
import { breakers } from '../circuit-breaker';
import type { MemoryClient } from '../memory-fallback';
import {
    getPendingSyncCount,
    queueFallbackWrite,
    searchFallback,
    syncPendingMemories,
} from '../memory-fallback';

const mockPrisma = prisma as any;
const mockBreakers = breakers as any;

// ============================================
// HELPERS
// ============================================

function makePgMemory(overrides: Partial<{
    id: string;
    userId: string;
    content: string;
    sector: string;
    source: string;
    tags: string[];
    confidence: number;
    decayScore: number;
    isActive: boolean;
    createdAt: Date;
}> = {}) {
    return {
        id: overrides.id || 'mem-1',
        userId: overrides.userId || 'user-1',
        content: overrides.content || 'Test memory content',
        sector: overrides.sector || 'semantic',
        type: 'context',
        source: overrides.source || 'qdrant_fallback',
        tags: overrides.tags || [],
        importance: 50,
        confidence: overrides.confidence || 0.8,
        decayScore: overrides.decayScore ?? 0,
        isActive: overrides.isActive ?? true,
        createdAt: overrides.createdAt || new Date('2025-06-01T00:00:00Z'),
        updatedAt: new Date('2025-06-01T00:00:00Z'),
        lastAccessedAt: new Date('2025-06-01T00:00:00Z'),
        chatId: null,
        summary: null,
        isPinned: false,
        expiresAt: null,
        accessCount: 0,
    };
}

function createMockClient(): MemoryClient & { add: ReturnType<typeof vi.fn> } {
    return {
        add: vi.fn().mockResolvedValue({ id: 'qdrant-synced-id' }),
    };
}

// ============================================
// TESTS
// ============================================

describe('MemoryFallback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: Qdrant circuit is CLOSED
        mockBreakers.qdrant.getState.mockReturnValue({
            state: 'CLOSED',
            failures: 0,
            name: 'Qdrant',
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ========================================
    // queueFallbackWrite
    // ========================================

    describe('queueFallbackWrite', () => {
        it('should create a memory record in PostgreSQL with decayScore=0', async () => {
            const created = makePgMemory({ id: 'pg-mem-1' });
            mockPrisma.memory.create.mockResolvedValue(created);

            const result = await queueFallbackWrite('user-1', 'Remember this fact');

            expect(mockPrisma.memory.create).toHaveBeenCalledOnce();
            expect(mockPrisma.memory.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId: 'user-1',
                    content: 'Remember this fact',
                    source: 'qdrant_fallback',
                    decayScore: 0,
                    isActive: true,
                }),
            });
            expect(result.id).toBe('pg-mem-1');
            expect(result.content).toBe('Test memory content');
        });

        it('should use provided sector and tags', async () => {
            const created = makePgMemory({ sector: 'episodic', tags: ['travel', 'paris'] });
            mockPrisma.memory.create.mockResolvedValue(created);

            await queueFallbackWrite('user-1', 'Trip to Paris', {
                sector: 'episodic',
                tags: ['travel', 'paris'],
                type: 'insight',
            });

            expect(mockPrisma.memory.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    sector: 'episodic',
                    tags: ['travel', 'paris'],
                    type: 'insight',
                }),
            });
        });

        it('should default to semantic sector and context type', async () => {
            mockPrisma.memory.create.mockResolvedValue(makePgMemory());

            await queueFallbackWrite('user-1', 'Some content');

            expect(mockPrisma.memory.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    sector: 'semantic',
                    type: 'context',
                }),
            });
        });

        it('should return a FallbackMemory with correct shape', async () => {
            const created = makePgMemory({
                id: 'pg-id',
                content: 'My memory',
                sector: 'procedural',
                confidence: 0.9,
                createdAt: new Date('2025-06-15T12:00:00Z'),
            });
            mockPrisma.memory.create.mockResolvedValue(created);

            const result = await queueFallbackWrite('user-1', 'My memory', {
                metadata: { source: 'chat' },
            });

            expect(result).toEqual({
                id: 'pg-id',
                content: 'My memory',
                sector: 'procedural',
                salience: 0.9,
                createdAt: '2025-06-15T12:00:00.000Z',
                metadata: { source: 'chat' },
            });
        });
    });

    // ========================================
    // syncPendingMemories
    // ========================================

    describe('syncPendingMemories', () => {
        it('should skip sync when Qdrant circuit is OPEN', async () => {
            mockBreakers.qdrant.getState.mockReturnValue({ state: 'OPEN' });

            const result = await syncPendingMemories();

            expect(result.synced).toBe(0);
            expect(result.failed).toBe(0);
            expect(mockPrisma.memory.findMany).not.toHaveBeenCalled();
        });

        it('should return empty result when no pending memories exist', async () => {
            mockPrisma.memory.findMany.mockResolvedValue([]);

            const mockClient = createMockClient();
            const result = await syncPendingMemories(mockClient);

            expect(result.synced).toBe(0);
            expect(result.failed).toBe(0);
        });

        it('should sync pending memories and mark them as synced', async () => {
            const pending = [
                makePgMemory({ id: 'mem-1', content: 'Memory one' }),
                makePgMemory({ id: 'mem-2', content: 'Memory two' }),
            ];
            mockPrisma.memory.findMany.mockResolvedValue(pending);
            mockPrisma.memory.update.mockResolvedValue({});

            const mockClient = createMockClient();
            const result = await syncPendingMemories(mockClient);

            expect(result.synced).toBe(2);
            expect(result.failed).toBe(0);
            expect(mockClient.add).toHaveBeenCalledTimes(2);
            expect(mockPrisma.memory.update).toHaveBeenCalledTimes(2);
            expect(mockPrisma.memory.update).toHaveBeenCalledWith({
                where: { id: 'mem-1' },
                data: { decayScore: 1.0, source: 'qdrant_synced' },
            });
            expect(mockPrisma.memory.update).toHaveBeenCalledWith({
                where: { id: 'mem-2' },
                data: { decayScore: 1.0, source: 'qdrant_synced' },
            });
        });

        it('should query for unsynced memories with correct filters', async () => {
            mockPrisma.memory.findMany.mockResolvedValue([]);

            const mockClient = createMockClient();
            await syncPendingMemories(mockClient);

            expect(mockPrisma.memory.findMany).toHaveBeenCalledWith({
                where: {
                    source: 'qdrant_fallback',
                    decayScore: 0,
                    isActive: true,
                },
                take: 50,
                orderBy: { createdAt: 'asc' },
            });
        });

        it('should stop sync early if Qdrant circuit opens mid-batch', async () => {
            const pending = [
                makePgMemory({ id: 'mem-1' }),
                makePgMemory({ id: 'mem-2' }),
                makePgMemory({ id: 'mem-3' }),
            ];
            mockPrisma.memory.findMany.mockResolvedValue(pending);
            mockPrisma.memory.update.mockResolvedValue({});

            const mockClient = createMockClient();
            let callCount = 0;
            mockClient.add.mockImplementation(async () => {
                callCount++;
                if (callCount === 2) {
                    mockBreakers.qdrant.getState.mockReturnValue({ state: 'OPEN' });
                    throw new Error('Qdrant connection lost');
                }
                return { id: `qdrant-${callCount}` };
            });

            const result = await syncPendingMemories(mockClient);

            // First succeeds, second fails and triggers circuit open, third is skipped
            expect(result.synced).toBe(1);
            expect(result.failed).toBe(1);
            expect(result.errors.length).toBe(1);
            expect(result.errors[0]).toContain('mem-2');
        });

        it('should count failures and collect error messages', async () => {
            const pending = [makePgMemory({ id: 'mem-fail' })];
            mockPrisma.memory.findMany.mockResolvedValue(pending);

            const mockClient = createMockClient();
            mockClient.add.mockRejectedValue(new Error('Qdrant timeout'));

            const result = await syncPendingMemories(mockClient);

            expect(result.synced).toBe(0);
            expect(result.failed).toBe(1);
            expect(result.errors[0]).toContain('Qdrant timeout');
        });

        it('should pass correct arguments to the memory client', async () => {
            const pending = [
                makePgMemory({
                    id: 'mem-1',
                    userId: 'user-42',
                    content: 'Important fact',
                    sector: 'episodic',
                    tags: ['test'],
                }),
            ];
            mockPrisma.memory.findMany.mockResolvedValue(pending);
            mockPrisma.memory.update.mockResolvedValue({});

            const mockClient = createMockClient();
            await syncPendingMemories(mockClient);

            expect(mockClient.add).toHaveBeenCalledWith('Important fact', {
                user_id: 'user-42',
                tags: ['test'],
                metadata: {
                    sector: 'episodic',
                    pgFallbackId: 'mem-1',
                },
            });
        });
    });

    // ========================================
    // searchFallback
    // ========================================

    describe('searchFallback', () => {
        it('should search with case-insensitive text matching', async () => {
            mockPrisma.memory.findMany.mockResolvedValue([]);

            await searchFallback('user-1', 'favorite programming language');

            expect(mockPrisma.memory.findMany).toHaveBeenCalledWith({
                where: {
                    userId: 'user-1',
                    isActive: true,
                    OR: expect.arrayContaining([
                        { content: { contains: 'favorite', mode: 'insensitive' } },
                        { content: { contains: 'programming', mode: 'insensitive' } },
                        { content: { contains: 'language', mode: 'insensitive' } },
                    ]),
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            });
        });

        it('should filter out short words (<=2 chars)', async () => {
            mockPrisma.memory.findMany.mockResolvedValue([]);

            await searchFallback('user-1', 'I am a developer');

            // "I", "am", "a" are all <=2 chars, only "developer" remains
            expect(mockPrisma.memory.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: [{ content: { contains: 'developer', mode: 'insensitive' } }],
                    }),
                })
            );
        });

        it('should return recent memories when query has no meaningful words', async () => {
            const recentMemories = [makePgMemory({ id: 'recent-1' })];
            mockPrisma.memory.findMany.mockResolvedValue(recentMemories);

            const results = await searchFallback('user-1', 'a I');

            expect(mockPrisma.memory.findMany).toHaveBeenCalledWith({
                where: {
                    userId: 'user-1',
                    isActive: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            });
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('recent-1');
        });

        it('should respect the limit parameter', async () => {
            mockPrisma.memory.findMany.mockResolvedValue([]);

            await searchFallback('user-1', 'test query here', 10);

            expect(mockPrisma.memory.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 10 })
            );
        });

        it('should return results in FallbackMemory format', async () => {
            const pgResults = [
                makePgMemory({
                    id: 'result-1',
                    content: 'I love TypeScript',
                    sector: 'semantic',
                    confidence: 0.95,
                    createdAt: new Date('2025-07-01T00:00:00Z'),
                }),
            ];
            mockPrisma.memory.findMany.mockResolvedValue(pgResults);

            const results = await searchFallback('user-1', 'TypeScript');

            expect(results).toEqual([
                {
                    id: 'result-1',
                    content: 'I love TypeScript',
                    sector: 'semantic',
                    salience: 0.95,
                    createdAt: '2025-07-01T00:00:00.000Z',
                },
            ]);
        });

        it('should handle empty query string', async () => {
            mockPrisma.memory.findMany.mockResolvedValue([]);

            const results = await searchFallback('user-1', '');

            expect(results).toEqual([]);
            // Should use the recent-memories path (no OR clause)
            expect(mockPrisma.memory.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        userId: 'user-1',
                        isActive: true,
                    },
                })
            );
        });
    });

    // ========================================
    // getPendingSyncCount
    // ========================================

    describe('getPendingSyncCount', () => {
        it('should count unsynced memories', async () => {
            mockPrisma.memory.count.mockResolvedValue(7);

            const count = await getPendingSyncCount();

            expect(count).toBe(7);
            expect(mockPrisma.memory.count).toHaveBeenCalledWith({
                where: {
                    source: 'qdrant_fallback',
                    decayScore: 0,
                    isActive: true,
                },
            });
        });

        it('should return 0 when no pending memories exist', async () => {
            mockPrisma.memory.count.mockResolvedValue(0);

            const count = await getPendingSyncCount();

            expect(count).toBe(0);
        });
    });
});
