import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usageLedger } from '../../lib/usage-ledger';
import usageRoutes from '../usage';

// Mock dependencies
vi.mock('@aspendos/db', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
        },
    },
}));

vi.mock('../../lib/audit-log', () => ({
    auditLog: vi.fn(),
}));

vi.mock('../../middleware/auth', () => ({
    requireAuth: vi.fn(async (_c, next) => {
        await next();
    }),
}));

describe('Usage Routes', () => {
    let app: Hono<{ Variables: { userId?: string } }>;

    beforeEach(() => {
        usageLedger.clearLedger_forTesting();
        vi.clearAllMocks();

        // Create test app with context
        app = new Hono<{ Variables: { userId?: string } }>();

        // Add middleware to set userId from header for testing
        app.use('*', async (c, next) => {
            const userId = c.req.header('x-test-user-id');
            if (userId) {
                c.set('userId', userId);
            }
            await next();
        });

        app.route('/api/usage', usageRoutes);
    });

    describe('GET /api/usage/costs', () => {
        it('should return user cost breakdown', async () => {
            // Record some usage
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 0.001,
            });

            usageLedger.recordUsage({
                userId: 'user1',
                model: 'anthropic/claude-sonnet-4-20250514',
                provider: 'anthropic',
                inputTokens: 2000,
                outputTokens: 1000,
                cost: 0.02,
            });

            const res = await app.request('/api/usage/costs', {
                headers: { 'x-test-user-id': 'user1' },
            });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.userId).toBe('user1');
            expect(data.period).toBe('month');
            expect(data.totalCost).toBeCloseTo(0.021, 6);
            expect(data.byModel['groq/llama-3.1-70b-versatile']).toBeDefined();
            expect(data.byModel['anthropic/claude-sonnet-4-20250514']).toBeDefined();
            expect(Object.keys(data.byDay).length).toBeGreaterThan(0);
        });

        it('should filter by period', async () => {
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 0.001,
            });

            const res = await app.request('/api/usage/costs?period=day', {
                headers: { 'x-test-user-id': 'user1' },
            });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.period).toBe('day');
        });

        it('should reject invalid period', async () => {
            const res = await app.request('/api/usage/costs?period=invalid', {
                headers: { 'x-test-user-id': 'user1' },
            });
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data.error).toContain('Invalid period');
        });

        it('should return 401 without authentication', async () => {
            const res = await app.request('/api/usage/costs');
            expect(res.status).toBe(401);
        });

        it('should return empty breakdown for user with no usage', async () => {
            const res = await app.request('/api/usage/costs', {
                headers: { 'x-test-user-id': 'user-no-usage' },
            });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.totalCost).toBe(0);
            expect(Object.keys(data.byModel)).toHaveLength(0);
        });
    });

    describe('GET /api/usage/admin/costs', () => {
        beforeEach(() => {
            // Mock admin auth
            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 'admin1',
                email: 'admin@test.com',
                tier: 'ULTRA',
                name: 'Admin User',
                createdAt: new Date(),
                updatedAt: new Date(),
                image: null,
                emailVerified: false,
                banned: false,
                banReason: null,
                credits: 100,
            } as any);
        });

        it('should return system costs and top spenders', async () => {
            // Record usage for multiple users
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 10.0,
            });

            usageLedger.recordUsage({
                userId: 'user2',
                model: 'anthropic/claude-sonnet-4-20250514',
                provider: 'anthropic',
                inputTokens: 2000,
                outputTokens: 1000,
                cost: 5.0,
            });

            usageLedger.recordUsage({
                userId: 'user3',
                model: 'openai/gpt-4o',
                provider: 'openai',
                inputTokens: 3000,
                outputTokens: 1500,
                cost: 15.0,
            });

            // Mock user lookup for enrichment
            vi.mocked(prisma.user.findMany).mockResolvedValue([
                {
                    id: 'user1',
                    email: 'user1@test.com',
                    name: 'User One',
                    tier: 'PRO',
                } as any,
                {
                    id: 'user2',
                    email: 'user2@test.com',
                    name: 'User Two',
                    tier: 'FREE',
                } as any,
                {
                    id: 'user3',
                    email: 'user3@test.com',
                    name: 'User Three',
                    tier: 'PRO',
                } as any,
            ]);

            const res = await app.request('/api/usage/admin/costs', {
                headers: { 'x-test-user-id': 'admin1' },
            });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.period).toBe('month');
            expect(data.system.totalCost).toBeCloseTo(30.0, 1);
            expect(data.system.byProvider).toBeDefined();
            expect(data.topSpenders).toHaveLength(3);
            expect(data.topSpenders[0].userId).toBe('user3'); // Highest cost
            expect(data.topSpenders[0].totalCost).toBe(15.0);
            expect(data.topSpenders[0].email).toBe('user3@test.com');
        });

        it('should filter by period', async () => {
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 1.0,
            });

            vi.mocked(prisma.user.findMany).mockResolvedValue([
                {
                    id: 'user1',
                    email: 'user1@test.com',
                    name: 'User One',
                    tier: 'PRO',
                } as any,
            ]);

            const res = await app.request('/api/usage/admin/costs?period=week', {
                headers: { 'x-test-user-id': 'admin1' },
            });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.period).toBe('week');
        });

        it('should limit top spenders', async () => {
            // Create 15 users with usage
            for (let i = 1; i <= 15; i++) {
                usageLedger.recordUsage({
                    userId: `user${i}`,
                    model: 'groq/llama-3.1-70b-versatile',
                    provider: 'groq',
                    inputTokens: 1000,
                    outputTokens: 500,
                    cost: i * 1.0,
                });
            }

            vi.mocked(prisma.user.findMany).mockResolvedValue(
                Array.from({ length: 5 }, (_, i) => ({
                    id: `user${i + 11}`,
                    email: `user${i + 11}@test.com`,
                    name: `User ${i + 11}`,
                    tier: 'PRO',
                })) as any
            );

            const res = await app.request('/api/usage/admin/costs?limit=5', {
                headers: { 'x-test-user-id': 'admin1' },
            });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.topSpenders).toHaveLength(5);
        });

        it('should reject non-admin users', async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 'user1',
                email: 'user@test.com',
                tier: 'FREE',
            } as any);

            const res = await app.request('/api/usage/admin/costs', {
                headers: { 'x-test-user-id': 'user1' },
            });
            expect(res.status).toBe(403);
        });

        it('should reject invalid period', async () => {
            const res = await app.request('/api/usage/admin/costs?period=invalid', {
                headers: { 'x-test-user-id': 'admin1' },
            });
            const data = await res.json();

            expect(res.status).toBe(400);
            expect(data.error).toContain('Invalid period');
        });
    });

    describe('GET /api/usage/admin/burn-rate', () => {
        beforeEach(() => {
            // Mock admin auth
            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 'admin1',
                email: 'admin@test.com',
                tier: 'ULTRA',
            } as any);
        });

        it('should return burn rate projection', async () => {
            // Add usage to calculate burn rate
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                usageLedger.recordUsage({
                    userId: 'user1',
                    model: 'groq/llama-3.1-70b-versatile',
                    provider: 'groq',
                    inputTokens: 1000,
                    outputTokens: 500,
                    cost: 1.0,
                    timestamp: date,
                });
            }

            const res = await app.request('/api/usage/admin/burn-rate', {
                headers: { 'x-test-user-id': 'admin1' },
            });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.estimatedMonthlyBurn).toBeGreaterThan(0);
            expect(data.basedOnPeriod).toBeDefined();
            expect(['day', 'week']).toContain(data.basedOnPeriod);
            expect(data.currentDailyCost).toBeDefined();
            expect(data.currentWeeklyCost).toBeDefined();
        });

        it('should return zero with no usage', async () => {
            const res = await app.request('/api/usage/admin/burn-rate', {
                headers: { 'x-test-user-id': 'admin1' },
            });
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.estimatedMonthlyBurn).toBe(0);
        });

        it('should reject non-admin users', async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 'user1',
                email: 'user@test.com',
                tier: 'FREE',
            } as any);

            const res = await app.request('/api/usage/admin/burn-rate', {
                headers: { 'x-test-user-id': 'user1' },
            });
            expect(res.status).toBe(403);
        });
    });
});
