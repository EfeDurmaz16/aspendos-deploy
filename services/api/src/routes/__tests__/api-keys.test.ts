import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aspendos/db', () => ({
    prisma: {
        apiKey: {
            count: vi.fn(),
            create: vi.fn(),
            delete: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
        },
    },
}));

vi.mock('../../middleware/auth', () => ({
    requireAuth: vi.fn(async (c: any, next: any) => {
        c.set('userId', 'user-api-key-test');
        return next();
    }),
}));

const mockPrisma = prisma as any;

async function requestApiKeys(path: string, init?: RequestInit) {
    const { default: apiKeysApp } = await import('../api-keys');
    const app = new Hono();
    app.route('/api-keys', apiKeysApp);
    const suffix = path === '/' ? '' : path;
    return await app.request(`/api-keys${suffix}`, init);
}

describe('API key routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('lists API keys from the database for the authenticated user', async () => {
        mockPrisma.apiKey.findMany.mockResolvedValue([
            {
                id: 'key-1',
                name: 'Production key',
                keyPrefix: 'yula_abcdefg',
                permissions: ['chat:write'],
                lastUsedAt: null,
                expiresAt: null,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
            },
        ]);

        const res = await requestApiKeys('/');

        expect(res.status).toBe(200);
        expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: 'user-api-key-test' },
            })
        );
        expect(await res.json()).toMatchObject({
            keys: [
                {
                    id: 'key-1',
                    name: 'Production key',
                    permissions: ['chat:write'],
                },
            ],
        });
    });

    it('creates hashed API keys and only returns the raw key once', async () => {
        mockPrisma.apiKey.count.mockResolvedValue(0);
        mockPrisma.apiKey.create.mockImplementation(async ({ data }: any) => ({
            id: 'key-created',
            name: data.name,
            keyPrefix: data.keyPrefix,
            permissions: data.permissions,
            expiresAt: data.expiresAt,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }));

        const res = await requestApiKeys('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'CLI key',
                permissions: ['chat:write'],
                expiresInDays: 30,
            }),
        });

        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.key).toMatch(/^yula_[a-f0-9]+$/);
        expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: 'user-api-key-test',
                name: 'CLI key',
                keyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
                keyPrefix: expect.stringMatching(/^yula_[a-f0-9]+$/),
                permissions: ['chat:write'],
                expiresAt: expect.any(Date),
            }),
        });
    });
});
