/**
 * Memory Routes Validation Tests
 *
 * Tests Zod input validation on all POST, PATCH, DELETE memory endpoints.
 * Validates path params, request bodies, and error responses.
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock auth to always pass and set userId
vi.mock('../../middleware/auth', () => ({
    requireAuth: vi.fn(async (c: any, next: any) => {
        c.set('userId', 'test-user-123');
        await next();
    }),
    authMiddleware: vi.fn(async (c: any, next: any) => {
        c.set('userId', 'test-user-123');
        c.set('user', { userId: 'test-user-123', email: 'test@test.com' });
        await next();
    }),
}));

// Mock openmemory service
vi.mock('../../services/openmemory.service', () => ({
    verifyMemoryOwnership: vi.fn(),
    updateMemory: vi.fn(),
    deleteMemory: vi.fn(),
    addMemory: vi.fn(),
    searchMemories: vi.fn(),
    listMemories: vi.fn(),
    reinforceMemory: vi.fn(),
    getMemoryStats: vi.fn(),
}));

// Mock memory-agent service
vi.mock('../../services/memory-agent', () => ({
    consolidateMemories: vi.fn(),
    maybeAutoConsolidate: vi.fn().mockResolvedValue(undefined),
}));

// Mock audit-log
vi.mock('../../lib/audit-log', () => ({
    auditLog: vi.fn().mockResolvedValue(undefined),
}));

// Mock auth lib to prevent Better Auth initialization
vi.mock('../../lib/auth', () => ({
    auth: {
        api: {
            getSession: vi.fn().mockResolvedValue(null),
        },
    },
}));

import * as openMemory from '../../services/openmemory.service';
const mockOpenMemory = openMemory as any;

import memoryRoutes from '../memory';

function createTestApp() {
    const app = new Hono();
    app.route('/memory', memoryRoutes);
    return app;
}

function jsonRequest(method: string, path: string, body?: unknown): Request {
    const init: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) {
        init.body = JSON.stringify(body);
    }
    return new Request(`http://localhost${path}`, init);
}

describe('Memory Routes - Input Validation', () => {
    let app: Hono;

    beforeEach(() => {
        vi.clearAllMocks();
        app = createTestApp();
        mockOpenMemory.verifyMemoryOwnership.mockResolvedValue(true);
        mockOpenMemory.updateMemory.mockResolvedValue(undefined);
        mockOpenMemory.deleteMemory.mockResolvedValue(undefined);
        mockOpenMemory.reinforceMemory.mockResolvedValue(undefined);
        mockOpenMemory.addMemory.mockResolvedValue({
            id: 'new-mem-1',
            content: 'test',
            sector: 'semantic',
        });
        mockOpenMemory.searchMemories.mockResolvedValue([]);
        mockOpenMemory.listMemories.mockResolvedValue([]);
    });

    // =============================================
    // PATCH /memory/dashboard/:id
    // =============================================

    describe('PATCH /memory/dashboard/:id - param validation', () => {
        it('should reject an ID with special characters', async () => {
            const res = await app.request(
                jsonRequest('PATCH', '/memory/dashboard/bad!id%40here', {
                    content: 'updated content',
                })
            );
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.error).toBe('Path parameter validation failed');
        });

        it('should reject an ID with dots and slashes', async () => {
            const res = await app.request(
                jsonRequest('PATCH', '/memory/dashboard/..%2F..%2Fetc', {
                    content: 'updated content',
                })
            );
            expect(res.status).toBe(400);
        });

        it('should accept a valid UUID-style ID', async () => {
            const res = await app.request(
                jsonRequest('PATCH', '/memory/dashboard/550e8400-e29b-41d4-a716-446655440000', {
                    content: 'updated content',
                })
            );
            expect(res.status).not.toBe(400);
        });

        it('should accept a valid CUID-style ID', async () => {
            const res = await app.request(
                jsonRequest('PATCH', '/memory/dashboard/clh1abc2d0000abcdef123456', {
                    content: 'updated content',
                })
            );
            expect(res.status).not.toBe(400);
        });

        it('should accept a valid nanoid-style ID', async () => {
            const res = await app.request(
                jsonRequest('PATCH', '/memory/dashboard/V1StGXR8_Z5jdHi6B-myT', {
                    content: 'updated content',
                })
            );
            expect(res.status).not.toBe(400);
        });
    });

    describe('PATCH /memory/dashboard/:id - body validation', () => {
        const validId = 'valid-memory-id-123';

        it('should reject content that exceeds 10000 characters', async () => {
            const res = await app.request(
                jsonRequest('PATCH', `/memory/dashboard/${validId}`, {
                    content: 'a'.repeat(10001),
                })
            );
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.error).toBe('Validation failed');
            expect(json.details).toBeDefined();
            expect(json.details.some((d: any) => d.path.includes('content'))).toBe(true);
        });

        it('should reject empty string content', async () => {
            const res = await app.request(
                jsonRequest('PATCH', `/memory/dashboard/${validId}`, {
                    content: '',
                })
            );
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.error).toBe('Validation failed');
        });

        it('should reject an invalid sector value', async () => {
            const res = await app.request(
                jsonRequest('PATCH', `/memory/dashboard/${validId}`, {
                    sector: 'invalid-sector',
                })
            );
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.error).toBe('Validation failed');
            expect(json.details.some((d: any) => d.path.includes('sector'))).toBe(true);
        });

        it('should reject isPinned when it is a string instead of boolean', async () => {
            const res = await app.request(
                jsonRequest('PATCH', `/memory/dashboard/${validId}`, {
                    isPinned: 'true',
                })
            );
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.error).toBe('Validation failed');
            expect(json.details.some((d: any) => d.path.includes('isPinned'))).toBe(true);
        });

        it('should reject isPinned when it is a number', async () => {
            const res = await app.request(
                jsonRequest('PATCH', `/memory/dashboard/${validId}`, {
                    isPinned: 1,
                })
            );
            expect(res.status).toBe(400);
        });

        it('should accept a valid update with content only', async () => {
            const res = await app.request(
                jsonRequest('PATCH', `/memory/dashboard/${validId}`, {
                    content: 'Updated memory content',
                })
            );
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.success).toBe(true);
        });

        it('should accept a valid update with all fields', async () => {
            const res = await app.request(
                jsonRequest('PATCH', `/memory/dashboard/${validId}`, {
                    content: 'Updated memory content',
                    sector: 'episodic',
                    isPinned: true,
                    metadata: { source: 'test' },
                })
            );
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.success).toBe(true);
            expect(json.memory.sector).toBe('episodic');
        });

        it('should accept an empty object (all fields optional)', async () => {
            const res = await app.request(
                jsonRequest('PATCH', `/memory/dashboard/${validId}`, {})
            );
            expect(res.status).toBe(200);
        });

        it('should accept all valid sector values', async () => {
            const sectors = ['semantic', 'episodic', 'procedural', 'emotional', 'reflective'];
            for (const sector of sectors) {
                vi.clearAllMocks();
                mockOpenMemory.verifyMemoryOwnership.mockResolvedValue(true);
                mockOpenMemory.updateMemory.mockResolvedValue(undefined);
                const res = await app.request(
                    jsonRequest('PATCH', `/memory/dashboard/${validId}`, { sector })
                );
                expect(res.status).toBe(200);
            }
        });

        it('should still check ownership after validation passes', async () => {
            mockOpenMemory.verifyMemoryOwnership.mockResolvedValue(false);
            const res = await app.request(
                jsonRequest('PATCH', `/memory/dashboard/${validId}`, {
                    content: 'Updated content',
                })
            );
            expect(res.status).toBe(404);
            const json = await res.json();
            expect(json.error).toBe('Memory not found');
        });
    });

    // =============================================
    // DELETE /memory/dashboard/:id
    // =============================================

    describe('DELETE /memory/dashboard/:id - param validation', () => {
        it('should reject an ID with special characters', async () => {
            const res = await app.request(
                jsonRequest('DELETE', '/memory/dashboard/bad!id%40here')
            );
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.error).toBe('Path parameter validation failed');
        });

        it('should reject an ID that is too long', async () => {
            const longId = 'a'.repeat(129);
            const res = await app.request(
                jsonRequest('DELETE', `/memory/dashboard/${longId}`)
            );
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.error).toBe('Path parameter validation failed');
        });

        it('should accept a valid ID and proceed to ownership check', async () => {
            mockOpenMemory.verifyMemoryOwnership.mockResolvedValue(true);
            const res = await app.request(
                jsonRequest('DELETE', '/memory/dashboard/valid-memory-id-123')
            );
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.success).toBe(true);
        });

        it('should return 404 when ownership check fails after valid ID', async () => {
            mockOpenMemory.verifyMemoryOwnership.mockResolvedValue(false);
            const res = await app.request(
                jsonRequest('DELETE', '/memory/dashboard/valid-memory-id-123')
            );
            expect(res.status).toBe(404);
        });
    });

    // =============================================
    // DELETE /memory/:id (core route)
    // =============================================

    describe('DELETE /memory/:id - param validation', () => {
        it('should reject an ID with invalid characters', async () => {
            const res = await app.request(
                jsonRequest('DELETE', '/memory/bad!id%40here')
            );
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.error).toBe('Path parameter validation failed');
        });

        it('should accept a valid ID', async () => {
            mockOpenMemory.verifyMemoryOwnership.mockResolvedValue(true);
            const res = await app.request(
                jsonRequest('DELETE', '/memory/valid-id-456')
            );
            expect(res.status).toBe(200);
        });
    });

    // =============================================
    // POST /memory/reinforce/:id
    // =============================================

    describe('POST /memory/reinforce/:id - param validation', () => {
        it('should reject an ID with invalid characters', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/reinforce/bad!id%23')
            );
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.error).toBe('Path parameter validation failed');
        });

        it('should reject an ID that is too long', async () => {
            const longId = 'x'.repeat(129);
            const res = await app.request(
                jsonRequest('POST', `/memory/reinforce/${longId}`)
            );
            expect(res.status).toBe(400);
        });

        it('should accept a valid ID and reinforce', async () => {
            mockOpenMemory.verifyMemoryOwnership.mockResolvedValue(true);
            const res = await app.request(
                jsonRequest('POST', '/memory/reinforce/valid-mem-789')
            );
            expect(res.status).toBe(200);
            expect(mockOpenMemory.reinforceMemory).toHaveBeenCalledWith('valid-mem-789');
        });
    });

    // =============================================
    // POST /memory - Add memory
    // =============================================

    describe('POST /memory - body validation', () => {
        it('should reject missing content', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory', { sector: 'semantic' })
            );
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.error).toBe('Validation failed');
        });

        it('should reject empty content', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory', { content: '' })
            );
            expect(res.status).toBe(400);
        });

        it('should reject content exceeding max length', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory', { content: 'x'.repeat(10001) })
            );
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.details.some((d: any) => d.path.includes('content'))).toBe(true);
        });

        it('should reject an invalid sector', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory', {
                    content: 'test content',
                    sector: 'not-a-real-sector',
                })
            );
            expect(res.status).toBe(400);
        });

        it('should reject tags array exceeding max length', async () => {
            const tags = Array.from({ length: 21 }, (_, i) => `tag-${i}`);
            const res = await app.request(
                jsonRequest('POST', '/memory', { content: 'test', tags })
            );
            expect(res.status).toBe(400);
        });

        it('should reject empty string tags', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory', { content: 'test', tags: ['valid', ''] })
            );
            expect(res.status).toBe(400);
        });

        it('should reject tags with strings exceeding max length', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory', {
                    content: 'test',
                    tags: ['a'.repeat(101)],
                })
            );
            expect(res.status).toBe(400);
        });

        it('should accept valid content with defaults', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory', { content: 'Valid memory content' })
            );
            expect(res.status).toBe(201);
        });

        it('should accept valid content with all optional fields', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory', {
                    content: 'Full memory',
                    sector: 'procedural',
                    tags: ['coding', 'tips'],
                    metadata: { source: 'chat', chatId: 'abc' },
                })
            );
            expect(res.status).toBe(201);
        });

        it('should reject non-string content', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory', { content: 12345 })
            );
            expect(res.status).toBe(400);
        });
    });

    // =============================================
    // POST /memory/search
    // =============================================

    describe('POST /memory/search - body validation', () => {
        it('should reject missing query', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/search', { limit: 5 })
            );
            expect(res.status).toBe(400);
        });

        it('should reject empty query', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/search', { query: '' })
            );
            expect(res.status).toBe(400);
        });

        it('should reject query exceeding 2000 characters', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/search', { query: 'q'.repeat(2001) })
            );
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.details.some((d: any) => d.path.includes('query'))).toBe(true);
        });

        it('should reject limit exceeding max of 50', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/search', { query: 'test', limit: 51 })
            );
            expect(res.status).toBe(400);
        });

        it('should reject limit of 0', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/search', { query: 'test', limit: 0 })
            );
            expect(res.status).toBe(400);
        });

        it('should reject a non-integer limit', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/search', { query: 'test', limit: 3.5 })
            );
            expect(res.status).toBe(400);
        });

        it('should reject an invalid sector', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/search', {
                    query: 'test',
                    sector: 'invalid',
                })
            );
            expect(res.status).toBe(400);
        });

        it('should accept a valid search with defaults', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/search', { query: 'find this' })
            );
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.meta).toBeDefined();
            expect(json.meta.query).toBe('find this');
        });

        it('should accept a valid search with all options', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/search', {
                    query: 'find this',
                    sector: 'emotional',
                    limit: 20,
                })
            );
            expect(res.status).toBe(200);
        });
    });

    // =============================================
    // POST /memory/dashboard/bulk-delete
    // =============================================

    describe('POST /memory/dashboard/bulk-delete - body validation', () => {
        it('should reject missing ids field', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/dashboard/bulk-delete', {})
            );
            expect(res.status).toBe(400);
        });

        it('should reject empty ids array', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/dashboard/bulk-delete', { ids: [] })
            );
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.details.some((d: any) => d.message.includes('ids array is required'))).toBe(true);
        });

        it('should reject ids array exceeding 100 items', async () => {
            const ids = Array.from({ length: 101 }, (_, i) => `mem-${i}`);
            const res = await app.request(
                jsonRequest('POST', '/memory/dashboard/bulk-delete', { ids })
            );
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.details.some((d: any) => d.message.includes('Maximum 100'))).toBe(true);
        });

        it('should reject ids containing invalid characters', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/dashboard/bulk-delete', {
                    ids: ['valid-id', 'bad id!@#'],
                })
            );
            expect(res.status).toBe(400);
        });

        it('should reject ids containing empty strings', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/dashboard/bulk-delete', {
                    ids: ['valid-id', ''],
                })
            );
            expect(res.status).toBe(400);
        });

        it('should accept valid ids array', async () => {
            mockOpenMemory.verifyMemoryOwnership.mockResolvedValue(true);
            const res = await app.request(
                jsonRequest('POST', '/memory/dashboard/bulk-delete', {
                    ids: ['mem-1', 'mem-2', 'mem-3'],
                })
            );
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.success).toBe(true);
            expect(json.deleted).toBe(3);
        });
    });

    // =============================================
    // POST /memory/dashboard/feedback
    // =============================================

    describe('POST /memory/dashboard/feedback - body validation', () => {
        it('should reject missing memoryId', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/dashboard/feedback', {
                    wasHelpful: true,
                })
            );
            expect(res.status).toBe(400);
        });

        it('should reject empty memoryId', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/dashboard/feedback', {
                    memoryId: '',
                    wasHelpful: true,
                })
            );
            expect(res.status).toBe(400);
        });

        it('should reject memoryId with invalid characters', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/dashboard/feedback', {
                    memoryId: 'bad id!@#',
                    wasHelpful: true,
                })
            );
            expect(res.status).toBe(400);
        });

        it('should reject missing wasHelpful', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/dashboard/feedback', {
                    memoryId: 'valid-id',
                })
            );
            expect(res.status).toBe(400);
        });

        it('should reject wasHelpful as a string', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/dashboard/feedback', {
                    memoryId: 'valid-id',
                    wasHelpful: 'yes',
                })
            );
            expect(res.status).toBe(400);
        });

        it('should reject wasHelpful as a number', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/dashboard/feedback', {
                    memoryId: 'valid-id',
                    wasHelpful: 1,
                })
            );
            expect(res.status).toBe(400);
        });

        it('should accept valid feedback with wasHelpful=true', async () => {
            mockOpenMemory.verifyMemoryOwnership.mockResolvedValue(true);
            const res = await app.request(
                jsonRequest('POST', '/memory/dashboard/feedback', {
                    memoryId: 'valid-mem-id',
                    wasHelpful: true,
                })
            );
            expect(res.status).toBe(201);
            expect(mockOpenMemory.reinforceMemory).toHaveBeenCalledWith('valid-mem-id');
        });

        it('should accept valid feedback with wasHelpful=false', async () => {
            mockOpenMemory.verifyMemoryOwnership.mockResolvedValue(true);
            const res = await app.request(
                jsonRequest('POST', '/memory/dashboard/feedback', {
                    memoryId: 'valid-mem-id',
                    wasHelpful: false,
                })
            );
            expect(res.status).toBe(201);
            expect(mockOpenMemory.reinforceMemory).not.toHaveBeenCalled();
        });

        it('should check ownership after validation passes', async () => {
            mockOpenMemory.verifyMemoryOwnership.mockResolvedValue(false);
            const res = await app.request(
                jsonRequest('POST', '/memory/dashboard/feedback', {
                    memoryId: 'valid-mem-id',
                    wasHelpful: true,
                })
            );
            expect(res.status).toBe(404);
            const json = await res.json();
            expect(json.error).toBe('Memory not found');
        });
    });

    // =============================================
    // Validation error response format
    // =============================================

    describe('Validation error response format', () => {
        it('should return 400 status code for validation errors', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory', { content: '' })
            );
            expect(res.status).toBe(400);
        });

        it('should return structured error with details array', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory/search', { query: '', limit: -1 })
            );
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json).toHaveProperty('error');
            expect(json).toHaveProperty('details');
            expect(Array.isArray(json.details)).toBe(true);
            expect(json.details.length).toBeGreaterThan(0);
        });

        it('should include path and message in each detail', async () => {
            const res = await app.request(
                jsonRequest('POST', '/memory', { content: 123 })
            );
            expect(res.status).toBe(400);
            const json = await res.json();
            for (const detail of json.details) {
                expect(detail).toHaveProperty('path');
                expect(detail).toHaveProperty('message');
                expect(Array.isArray(detail.path)).toBe(true);
                expect(typeof detail.message).toBe('string');
            }
        });
    });
});
