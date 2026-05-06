import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import enterpriseRoutes from '../enterprise';
import gamificationRoutes from '../gamification';
import searchRoutes from '../search';
import skillRoutes from '../skills';

vi.mock('@aspendos/db', () => ({
    prisma: {
        user: {
            findUnique: vi.fn().mockResolvedValue({ banned: false }),
        },
        chat: {
            findMany: vi.fn(),
        },
        memory: {
            findMany: vi.fn(),
        },
    },
}));

vi.mock('../../lib/convex', () => ({
    api: {
        organizations: {
            create: 'organizations.create',
            listByUser: 'organizations.listByUser',
        },
    },
    getConvexClient: vi.fn(),
    getConvexServiceSecret: vi.fn(),
}));

vi.mock('../../middleware/tier-gate', () => ({
    requireTier: vi.fn(() => async (_c: any, next: any) => next()),
}));

vi.mock('../../services/gamification.service', () => ({
    getProfileWithStats: vi.fn(),
    getUserRank: vi.fn(),
    getAchievements: vi.fn(),
    awardXp: vi.fn(),
    updateStreak: vi.fn(),
    getReferralStats: vi.fn(),
    processReferral: vi.fn(),
    getLeaderboard: vi.fn(),
    LEVELS: [],
    XP_ACTIONS: {},
}));

vi.mock('../../services/skill.service', () => ({
    listSkills: vi.fn(),
    getSkill: vi.fn(),
    getSkillAnalytics: vi.fn(),
    createSkill: vi.fn(),
    updateSkill: vi.fn(),
    deleteSkill: vi.fn(),
    recordExecution: vi.fn(),
    recordFeedback: vi.fn(),
    getSkillExecutions: vi.fn(),
}));

import * as gamificationService from '../../services/gamification.service';
import * as skillService from '../../services/skill.service';

const mockPrisma = prisma as any;
const mockGamificationService = gamificationService as any;
const mockSkillService = skillService as any;

function createApiKeyAuthenticatedApp(routePath: string, routes: Hono<any>) {
    const app = new Hono();
    app.use('*', async (c, next) => {
        c.set('userId', 'feature-user-1');
        c.set('apiKeyId', 'key-1');
        c.set('apiKeyPermissions', ['chat:read']);
        return next();
    });
    app.route(routePath, routes);
    return app;
}

describe('session-only feature route boundaries', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma.user.findUnique.mockResolvedValue({ banned: false });
        mockPrisma.chat.findMany.mockResolvedValue([]);
        mockPrisma.memory.findMany.mockResolvedValue([]);
        mockGamificationService.getProfileWithStats.mockResolvedValue({});
        mockSkillService.listSkills.mockResolvedValue([]);
    });

    it('rejects API-key authenticated search access', async () => {
        const app = createApiKeyAuthenticatedApp('/search', searchRoutes);

        const res = await app.request('/search?q=plan');

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'API key authentication is not allowed for this route',
        });
        expect(mockPrisma.chat.findMany).not.toHaveBeenCalled();
        expect(mockPrisma.memory.findMany).not.toHaveBeenCalled();
    });

    it('rejects API-key authenticated gamification access', async () => {
        const app = createApiKeyAuthenticatedApp('/gamification', gamificationRoutes);

        const res = await app.request('/gamification/profile');

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'API key authentication is not allowed for this route',
        });
        expect(mockGamificationService.getProfileWithStats).not.toHaveBeenCalled();
    });

    it('rejects API-key authenticated skills access', async () => {
        const app = createApiKeyAuthenticatedApp('/skills', skillRoutes);

        const res = await app.request('/skills');

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'API key authentication is not allowed for this route',
        });
        expect(mockSkillService.listSkills).not.toHaveBeenCalled();
    });

    it('rejects API-key authenticated enterprise access before tier or Convex work', async () => {
        const app = createApiKeyAuthenticatedApp('/enterprise', enterpriseRoutes);

        const res = await app.request('/enterprise/organizations');

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'API key authentication is not allowed for this route',
        });
    });
});
