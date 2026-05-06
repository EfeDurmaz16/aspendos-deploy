import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import importRoutes from '../import';

vi.mock('@aspendos/db', () => ({
    prisma: {
        user: {
            findUnique: vi.fn().mockResolvedValue({ banned: false }),
        },
        importEntity: {
            findMany: vi.fn(),
        },
        memory: {
            create: vi.fn(),
        },
    },
}));

vi.mock('../../services/import.service', () => ({
    listImportJobs: vi.fn(),
    getImportJob: vi.fn(),
    executeImport: vi.fn(),
}));

vi.mock('../../middleware/tier-enforcement', () => ({
    enforceTierLimit: vi.fn(() => (_c: any, next: any) => next()),
}));

import * as importService from '../../services/import.service';

const mockPrisma = prisma as any;
const mockImportService = importService as any;

function createApiKeyAuthenticatedApp() {
    const app = new Hono();
    app.use('*', async (c, next) => {
        c.set('userId', 'import-user-1');
        c.set('apiKeyId', 'key-1');
        c.set('apiKeyPermissions', ['chat:read']);
        return next();
    });
    app.route('/import', importRoutes);
    return app;
}

function createSessionAuthenticatedApp() {
    const app = new Hono();
    app.use('*', async (c, next) => {
        c.set('userId', 'import-user-1');
        c.set('session', { id: 'session-1' });
        return next();
    });
    app.route('/import', importRoutes);
    return app;
}

describe('import route production boundaries', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockImportService.listImportJobs.mockResolvedValue([]);
        mockImportService.getImportJob.mockResolvedValue({
            id: 'job-1',
            status: 'READY',
        });
        mockImportService.executeImport.mockResolvedValue({
            total: 1,
            imported: 1,
            failed: 0,
        });
        mockPrisma.importEntity.findMany.mockResolvedValue([
            {
                title: 'Planning',
                content: {
                    messages: [{ role: 'user', content: 'Build a deterministic agent audit log' }],
                },
            },
        ]);
        mockPrisma.memory.create.mockResolvedValue({ id: 'memory-1' });
    });

    it('rejects API-key authenticated import access', async () => {
        const app = createApiKeyAuthenticatedApp();

        const res = await app.request('/import/jobs');

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'API key authentication is not allowed for this route',
        });
        expect(mockImportService.listImportJobs).not.toHaveBeenCalled();
    });

    it('persists import memory bridge entries through Prisma', async () => {
        const app = createSessionAuthenticatedApp();

        const res = await app.request('/import/jobs/job-1/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        expect(res.status).toBe(200);
        expect(mockPrisma.importEntity.findMany).toHaveBeenCalledWith({
            where: { jobId: 'job-1', imported: true },
            take: 50,
            select: { content: true, title: true },
        });
        expect(mockPrisma.memory.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: 'import-user-1',
                source: 'import_pending',
                tags: ['imported', 'job-1'],
            }),
        });
    });
});
