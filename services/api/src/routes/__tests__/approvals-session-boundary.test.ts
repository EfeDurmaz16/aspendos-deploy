import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import approvalRoutes from '../approvals';

vi.mock('@aspendos/db', () => ({
    prisma: {
        user: {
            findUnique: vi.fn().mockResolvedValue({ banned: false }),
        },
    },
}));

vi.mock('../../services/approval.service', () => ({
    getPendingApprovals: vi.fn(),
    getApprovalForUser: vi.fn(),
    approveRequest: vi.fn(),
    rejectRequest: vi.fn(),
    addToAllowlist: vi.fn(),
    getAllowlist: vi.fn(),
    removeFromAllowlist: vi.fn(),
}));

import * as approvalService from '../../services/approval.service';

const mockApprovalService = approvalService as any;
const mockPrisma = prisma as any;

function createApiKeyAuthenticatedApp() {
    const app = new Hono();
    app.use('*', async (c, next) => {
        c.set('userId', 'approval-user-1');
        c.set('apiKeyId', 'key-1');
        c.set('apiKeyPermissions', ['chat:read']);
        return next();
    });
    app.route('/approvals', approvalRoutes);
    return app;
}

describe('approval route session boundary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma.user.findUnique.mockResolvedValue({ banned: false });
        mockApprovalService.getPendingApprovals.mockResolvedValue([]);
    });

    it('rejects API-key authenticated approval access', async () => {
        const app = createApiKeyAuthenticatedApp();

        const res = await app.request('/approvals');

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'API key authentication is not allowed for this route',
        });
        expect(mockApprovalService.getPendingApprovals).not.toHaveBeenCalled();
    });
});
