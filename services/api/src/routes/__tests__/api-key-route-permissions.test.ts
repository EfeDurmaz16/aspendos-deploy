import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aspendos/db', () => ({
    prisma: {
        apiKey: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        user: {
            findUnique: vi.fn(),
        },
        councilSession: {
            count: vi.fn(),
        },
    },
}));

vi.mock('../../lib/auth', () => ({
    auth: {
        api: {
            getSession: vi.fn().mockResolvedValue(null),
        },
    },
}));

vi.mock('../../services/memory-router.service', () => ({
    addMemory: vi.fn().mockResolvedValue({ id: 'mem-1', content: 'stored' }),
    listMemories: vi.fn().mockResolvedValue([]),
    searchMemories: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/memory-agent', () => ({
    consolidateMemories: vi.fn(),
    maybeAutoConsolidate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/council.service', () => ({
    COUNCIL_PERSONAS: {},
    createCouncilSession: vi.fn().mockResolvedValue({ id: 'session-1' }),
}));

vi.mock('../../services/pac.service', () => ({
    getPACSettings: vi.fn().mockResolvedValue({
        enabled: true,
        explicitEnabled: true,
        implicitEnabled: true,
        pushEnabled: true,
        emailEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        escalationEnabled: true,
        digestEnabled: false,
        digestTime: '09:00',
    }),
}));

vi.mock('../../services/billing.service', () => ({
    hasTokens: vi.fn().mockResolvedValue(true),
    recordTokenUsage: vi.fn(),
}));

vi.mock('../../config/tiers', () => ({
    getLimit: vi.fn().mockReturnValue(20),
}));

vi.mock('../../middleware/tier-enforcement', () => ({
    enforceTierLimit: vi.fn(() => (_c: any, next: any) => next()),
}));

vi.mock('../../lib/audit-log', () => ({
    auditLog: vi.fn().mockResolvedValue(undefined),
}));

const mockPrisma = prisma as any;

async function createApp() {
    const [{ default: memoryRoutes }, { default: councilRoutes }, { default: pacRoutes }] =
        await Promise.all([import('../memory'), import('../council'), import('../pac')]);
    const app = new Hono();
    app.route('/memory', memoryRoutes);
    app.route('/council', councilRoutes);
    app.route('/pac', pacRoutes);
    return app;
}

function mockApiKey(permissions: string[]) {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        userId: 'user-1',
        permissions,
        expiresAt: null,
    });
    mockPrisma.apiKey.update.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ banned: false, tier: 'PRO' });
    mockPrisma.councilSession.count.mockResolvedValue(0);
}

const headers = {
    authorization: 'Bearer yula_test_key',
    'content-type': 'application/json',
};

describe('API key route permissions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('requires memory:read for memory reads', async () => {
        mockApiKey(['chat:read']);
        const app = await createApp();

        const response = await app.request('/memory', { headers });

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({
            error: 'API key missing required permission: memory:read',
        });
    });

    it('requires memory:write for memory writes', async () => {
        mockApiKey(['memory:read']);
        const app = await createApp();

        const response = await app.request('/memory', {
            method: 'POST',
            headers,
            body: JSON.stringify({ content: 'remember this' }),
        });

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({
            error: 'API key missing required permission: memory:write',
        });
    });

    it('requires council:write before creating council sessions', async () => {
        mockApiKey(['council:read']);
        const app = await createApp();

        const response = await app.request('/council/sessions', {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: 'Compare two options' }),
        });

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({
            error: 'API key missing required permission: council:write',
        });
    });

    it('requires pac:read for PAC settings reads', async () => {
        mockApiKey(['pac:write']);
        const app = await createApp();

        const response = await app.request('/pac/settings', { headers });

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({
            error: 'API key missing required permission: pac:read',
        });
    });
});
