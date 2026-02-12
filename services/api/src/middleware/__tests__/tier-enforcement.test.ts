import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enforceTierLimit } from '../tier-enforcement';

// Mock the prisma import used inside tier-enforcement.ts
vi.mock('../../lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
        },
    },
}));

// Import the mocked prisma so we can control return values
import { prisma } from '../../lib/prisma';
const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;

describe('Tier Enforcement Middleware', () => {
    let app: Hono;

    beforeEach(() => {
        vi.clearAllMocks();
        app = new Hono();
    });

    describe('enforceTierLimit', () => {
        it('should return 401 when user is not authenticated', async () => {
            app.use('*', async (c, next) => {
                c.set('userId', null);
                await next();
            });
            app.post('/test', enforceTierLimit('memoryInspector'), (c) =>
                c.json({ success: true })
            );

            const res = await app.request('/test', { method: 'POST' });
            expect(res.status).toBe(401);

            const body = await res.json();
            expect(body.error).toBe('Unauthorized');
        });

        it('should return 403 when feature is not available on FREE tier (boolean feature)', async () => {
            mockFindUnique.mockResolvedValue({ tier: 'FREE' });

            app.use('*', async (c, next) => {
                c.set('userId', 'user-free-123');
                await next();
            });
            // memoryInspector is false on FREE
            app.post('/test', enforceTierLimit('memoryInspector'), (c) =>
                c.json({ success: true })
            );

            const res = await app.request('/test', { method: 'POST' });
            expect(res.status).toBe(403);

            const body = await res.json();
            expect(body.error).toBe('Feature not available on your plan');
            expect(body.upgradeRequired).toBe(true);
            expect(body.feature).toBe('memoryInspector');
            expect(body.currentTier).toBe('FREE');
        });

        it('should return 403 when numeric limit is 0 on FREE tier', async () => {
            mockFindUnique.mockResolvedValue({ tier: 'FREE' });

            app.use('*', async (c, next) => {
                c.set('userId', 'user-free-456');
                await next();
            });
            // dailyVoiceMinutes is 0 on FREE
            app.post('/test', enforceTierLimit('dailyVoiceMinutes'), (c) =>
                c.json({ success: true })
            );

            const res = await app.request('/test', { method: 'POST' });
            expect(res.status).toBe(403);

            const body = await res.json();
            expect(body.error).toBe('Feature not available on your plan');
            expect(body.upgradeRequired).toBe(true);
            expect(body.feature).toBe('dailyVoiceMinutes');
        });

        it('should return 403 for monthlyImageGenerations on FREE tier', async () => {
            mockFindUnique.mockResolvedValue({ tier: 'FREE' });

            app.use('*', async (c, next) => {
                c.set('userId', 'user-free-789');
                await next();
            });
            // monthlyImageGenerations is 0 on FREE
            app.post('/test', enforceTierLimit('monthlyImageGenerations'), (c) =>
                c.json({ success: true })
            );

            const res = await app.request('/test', { method: 'POST' });
            expect(res.status).toBe(403);

            const body = await res.json();
            expect(body.upgradeRequired).toBe(true);
        });

        it('should pass through when feature is available on ULTRA tier (boolean)', async () => {
            mockFindUnique.mockResolvedValue({ tier: 'ULTRA' });

            app.use('*', async (c, next) => {
                c.set('userId', 'user-ultra-123');
                await next();
            });
            // memoryInspector is true on ULTRA
            app.post('/test', enforceTierLimit('memoryInspector'), (c) =>
                c.json({ success: true })
            );

            const res = await app.request('/test', { method: 'POST' });
            expect(res.status).toBe(200);

            const body = await res.json();
            expect(body.success).toBe(true);
        });

        it('should pass through when numeric limit is > 0 on PRO tier', async () => {
            mockFindUnique.mockResolvedValue({ tier: 'PRO' });

            app.use('*', async (c, next) => {
                c.set('userId', 'user-pro-123');
                await next();
            });
            // dailyVoiceMinutes is 60 on PRO
            app.post('/test', enforceTierLimit('dailyVoiceMinutes'), (c) =>
                c.json({ success: true })
            );

            const res = await app.request('/test', { method: 'POST' });
            expect(res.status).toBe(200);

            const body = await res.json();
            expect(body.success).toBe(true);
        });

        it('should pass through when numeric limit is > 0 on STARTER tier', async () => {
            mockFindUnique.mockResolvedValue({ tier: 'STARTER' });

            app.use('*', async (c, next) => {
                c.set('userId', 'user-starter-123');
                await next();
            });
            // monthlyImageGenerations is 50 on STARTER
            app.post('/test', enforceTierLimit('monthlyImageGenerations'), (c) =>
                c.json({ success: true })
            );

            const res = await app.request('/test', { method: 'POST' });
            expect(res.status).toBe(200);

            const body = await res.json();
            expect(body.success).toBe(true);
        });

        it('should pass through for monthlyChats (always > 0 on all tiers)', async () => {
            mockFindUnique.mockResolvedValue({ tier: 'FREE' });

            app.use('*', async (c, next) => {
                c.set('userId', 'user-free-chat');
                await next();
            });
            // monthlyChats is 100 on FREE, so it should pass
            app.post('/test', enforceTierLimit('monthlyChats'), (c) =>
                c.json({ success: true })
            );

            const res = await app.request('/test', { method: 'POST' });
            expect(res.status).toBe(200);
        });

        it('should return 403 for monthlyCouncilSessions on FREE tier', async () => {
            mockFindUnique.mockResolvedValue({ tier: 'FREE' });

            app.use('*', async (c, next) => {
                c.set('userId', 'user-free-council');
                await next();
            });
            // monthlyCouncilSessions is 0 on FREE
            app.post('/test', enforceTierLimit('monthlyCouncilSessions'), (c) =>
                c.json({ success: true })
            );

            const res = await app.request('/test', { method: 'POST' });
            expect(res.status).toBe(403);

            const body = await res.json();
            expect(body.upgradeRequired).toBe(true);
            expect(body.feature).toBe('monthlyCouncilSessions');
        });

        it('should default to FREE tier when user is not found in database', async () => {
            mockFindUnique.mockResolvedValue(null);

            app.use('*', async (c, next) => {
                c.set('userId', 'nonexistent-user');
                await next();
            });
            // dailyVoiceMinutes is 0 on FREE -> should block
            app.post('/test', enforceTierLimit('dailyVoiceMinutes'), (c) =>
                c.json({ success: true })
            );

            const res = await app.request('/test', { method: 'POST' });
            expect(res.status).toBe(403);
        });

        it('should default to FREE tier when database query fails', async () => {
            mockFindUnique.mockRejectedValue(new Error('DB connection lost'));

            app.use('*', async (c, next) => {
                c.set('userId', 'user-db-error');
                await next();
            });
            // dailyVoiceMinutes is 0 on FREE -> should block
            app.post('/test', enforceTierLimit('dailyVoiceMinutes'), (c) =>
                c.json({ success: true })
            );

            const res = await app.request('/test', { method: 'POST' });
            expect(res.status).toBe(403);
        });

        it('should include currentTier in the 403 response', async () => {
            mockFindUnique.mockResolvedValue({ tier: 'STARTER' });

            app.use('*', async (c, next) => {
                c.set('userId', 'user-starter-no-inspector');
                await next();
            });
            // memoryInspector is false on STARTER
            app.post('/test', enforceTierLimit('memoryInspector'), (c) =>
                c.json({ success: true })
            );

            const res = await app.request('/test', { method: 'POST' });
            expect(res.status).toBe(403);

            const body = await res.json();
            expect(body.currentTier).toBe('STARTER');
        });
    });

    describe('Tier progression', () => {
        it('should allow ULTRA tier access to all features', async () => {
            mockFindUnique.mockResolvedValue({ tier: 'ULTRA' });

            app.use('*', async (c, next) => {
                c.set('userId', 'user-ultra-all');
                await next();
            });

            // Test multiple features that are restricted on lower tiers
            const features = [
                'memoryInspector',
                'dailyVoiceMinutes',
                'monthlyImageGenerations',
                'monthlyCouncilSessions',
                'customAgents',
            ] as const;

            for (const feature of features) {
                const featureApp = new Hono();
                featureApp.use('*', async (c, next) => {
                    c.set('userId', 'user-ultra-all');
                    await next();
                });
                featureApp.post('/test', enforceTierLimit(feature), (c) =>
                    c.json({ success: true })
                );

                const res = await featureApp.request('/test', { method: 'POST' });
                expect(res.status).toBe(200);
            }
        });

        it('should block FREE tier from premium boolean features', async () => {
            mockFindUnique.mockResolvedValue({ tier: 'FREE' });

            const blockedFeatures = [
                'memoryInspector',
                'customAgents',
                'agentTemplates',
                'multiModel',
            ] as const;

            for (const feature of blockedFeatures) {
                const featureApp = new Hono();
                featureApp.use('*', async (c, next) => {
                    c.set('userId', 'user-free-blocked');
                    await next();
                });
                featureApp.post('/test', enforceTierLimit(feature), (c) =>
                    c.json({ success: true })
                );

                const res = await featureApp.request('/test', { method: 'POST' });
                expect(res.status).toBe(403);
            }
        });
    });
});
