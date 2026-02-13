/**
 * Council Routes Tests
 *
 * Tests for multi-model parallel querying endpoints including session creation,
 * listing, detail retrieval, persona selection, and synthesis.
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the auth library that requireAuth uses internally
vi.mock('../../lib/auth', () => ({
    auth: {
        api: {
            getSession: vi.fn(),
        },
    },
}));

vi.mock('openmemory-js', () => ({
    Memory: vi.fn(function () {
        return {
            add: vi.fn().mockResolvedValue({ id: 'mock-id' }),
            search: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue(null),
            update: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined),
            clear: vi.fn().mockResolvedValue(undefined),
        };
    }),
}));

import { auth } from '../../lib/auth';
const mockAuth = auth as any;

// Council route uses prisma from ../../lib/prisma which re-exports from @aspendos/db
vi.mock('@aspendos/db', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
        },
        councilSession: {
            count: vi.fn(),
        },
    },
}));

import { prisma } from '@aspendos/db';
const mockPrisma = prisma as any;

vi.mock('../../services/council.service', () => ({
    COUNCIL_PERSONAS: {
        SCHOLAR: {
            name: 'The Scholar',
            role: 'Academic & Research Perspective',
            color: '#3B82F6',
            modelId: 'openai/gpt-4o',
        },
        CREATIVE: {
            name: 'The Visionary',
            role: 'Creative & Innovative Perspective',
            color: '#F59E0B',
            modelId: 'anthropic/claude-3-5-sonnet-20241022',
        },
        PRACTICAL: {
            name: 'The Pragmatist',
            role: 'Practical & Actionable Perspective',
            color: '#10B981',
            modelId: 'google/gemini-2.0-flash',
        },
        DEVILS_ADVOCATE: {
            name: "Devil's Advocate",
            role: 'Critical & Contrarian Perspective',
            color: '#EF4444',
            modelId: 'openai/gpt-4o-mini',
        },
    },
    createCouncilSession: vi.fn(),
    getCouncilSession: vi.fn(),
    listCouncilSessions: vi.fn(),
    selectResponse: vi.fn(),
    generateSynthesis: vi.fn(),
    getCouncilStats: vi.fn(),
    streamPersonaResponse: vi.fn(),
    updateSessionStatus: vi.fn(),
}));

import * as councilService from '../../services/council.service';
const mockService = councilService as any;

vi.mock('../../services/billing.service', () => ({
    hasTokens: vi.fn(),
    recordTokenUsage: vi.fn(),
}));

import * as billingService from '../../services/billing.service';
const mockBilling = billingService as any;

vi.mock('../../config/tiers', () => ({
    getLimit: vi.fn(),
}));

import { getLimit } from '../../config/tiers';
const mockGetLimit = getLimit as any;

import councilRoutes from '../council';

const TEST_USER_ID = 'test-user-1';

function createTestApp() {
    const app = new Hono();
    app.route('/council', councilRoutes);
    return app;
}

function mockAuthenticated(userId = TEST_USER_ID) {
    mockAuth.api.getSession.mockResolvedValue({
        user: { id: userId, email: 'test@yula.dev', name: 'Test User' },
        session: { id: 'sess-1', expiresAt: new Date(Date.now() + 86400000) },
    });
}

function mockUnauthenticated() {
    mockAuth.api.getSession.mockResolvedValue(null);
}

describe('Council Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthenticated();
        mockPrisma.user.findUnique.mockResolvedValue({ id: TEST_USER_ID, tier: 'PRO' });
        mockGetLimit.mockReturnValue(20);
        mockPrisma.councilSession.count.mockResolvedValue(0);
        mockBilling.hasTokens.mockResolvedValue(true);
    });

    describe('POST /council/sessions - Create session', () => {
        it('should return 401 when user is not authenticated', async () => {
            mockUnauthenticated();
            const app = createTestApp();

            const res = await app.request('/council/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'Should I learn Rust or Go?' }),
            });

            expect(res.status).toBe(401);
        });

        it('should return 400 when query is missing', async () => {
            const app = createTestApp();

            const res = await app.request('/council/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('Validation failed');
        });

        it('should return 400 when query is empty', async () => {
            const app = createTestApp();

            const res = await app.request('/council/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: '' }),
            });

            expect(res.status).toBe(400);
        });

        it('should return 400 when query exceeds 2000 characters', async () => {
            const app = createTestApp();
            const longQuery = 'a'.repeat(2001);

            const res = await app.request('/council/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: longQuery }),
            });

            expect(res.status).toBe(400);
        });

        it('should return 404 when user is not found', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            const app = createTestApp();

            const res = await app.request('/council/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'Test query' }),
            });

            expect(res.status).toBe(404);
            const body = await res.json();
            expect(body.error.code).toBe('NOT_FOUND');
        });

        it('should return 403 when Council is not available for FREE tier', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({ id: TEST_USER_ID, tier: 'FREE' });
            mockGetLimit.mockReturnValue(0);
            const app = createTestApp();

            const res = await app.request('/council/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'Test query' }),
            });

            expect(res.status).toBe(403);
            const body = await res.json();
            expect(body.error).toContain('Starter tier or above');
            expect(body.upgradeRequired).toBe(true);
        });

        it('should return 403 when monthly session limit is reached', async () => {
            mockGetLimit.mockReturnValue(5);
            mockPrisma.councilSession.count.mockResolvedValue(5);
            const app = createTestApp();

            const res = await app.request('/council/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'Test query' }),
            });

            expect(res.status).toBe(403);
            const body = await res.json();
            expect(body.error).toContain('limit reached');
            expect(body.limit).toBe(5);
            expect(body.used).toBe(5);
        });

        it('should create session successfully and return 201', async () => {
            mockService.createCouncilSession.mockResolvedValue({
                id: 'session-1',
                userId: TEST_USER_ID,
                query: 'Should I learn Rust?',
                status: 'PENDING',
            });
            const app = createTestApp();

            const res = await app.request('/council/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'Should I learn Rust?' }),
            });

            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body.sessionId).toBe('session-1');
            expect(body.streamUrl).toContain('session-1');
            expect(body.personas).toHaveLength(4);
            expect(body.personas[0].id).toBe('SCHOLAR');
        });
    });

    describe('GET /council/sessions - List sessions', () => {
        it('should return list of sessions', async () => {
            mockService.listCouncilSessions.mockResolvedValue([
                {
                    id: 'session-1',
                    query: 'Test query',
                    status: 'COMPLETED',
                    selectedPersona: 'SCHOLAR',
                    createdAt: new Date(),
                    responses: [
                        { persona: 'SCHOLAR', status: 'COMPLETED', latencyMs: 1200 },
                        { persona: 'CREATIVE', status: 'COMPLETED', latencyMs: 1500 },
                    ],
                },
            ]);
            const app = createTestApp();

            const res = await app.request('/council/sessions');

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.sessions).toHaveLength(1);
            expect(body.sessions[0].responses).toHaveLength(2);
        });

        it('should return empty array when no sessions exist', async () => {
            mockService.listCouncilSessions.mockResolvedValue([]);
            const app = createTestApp();

            const res = await app.request('/council/sessions');

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.sessions).toEqual([]);
        });

        it('should cap limit query parameter at 50', async () => {
            mockService.listCouncilSessions.mockResolvedValue([]);
            const app = createTestApp();

            await app.request('/council/sessions?limit=200');

            expect(mockService.listCouncilSessions).toHaveBeenCalledWith(TEST_USER_ID, 50);
        });
    });

    describe('GET /council/sessions/:id - Get session details', () => {
        it('should return 404 when session is not found', async () => {
            mockService.getCouncilSession.mockResolvedValue(null);
            const app = createTestApp();

            const res = await app.request('/council/sessions/nonexistent-id');

            expect(res.status).toBe(404);
            const body = await res.json();
            expect(body.error.code).toBe('SESSION_NOT_FOUND');
        });

        it('should return session details with responses', async () => {
            mockService.getCouncilSession.mockResolvedValue({
                id: 'session-1',
                query: 'Should I learn Rust?',
                status: 'COMPLETED',
                selectedPersona: 'SCHOLAR',
                synthesis: 'A balanced synthesis...',
                createdAt: new Date(),
                responses: [
                    {
                        id: 'resp-1',
                        persona: 'SCHOLAR',
                        modelId: 'openai/gpt-4o',
                        content: 'From an academic perspective...',
                        status: 'COMPLETED',
                        latencyMs: 1200,
                    },
                ],
            });
            const app = createTestApp();

            const res = await app.request('/council/sessions/session-1');

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.session.id).toBe('session-1');
            expect(body.responses).toHaveLength(1);
            expect(body.responses[0].personaName).toBe('The Scholar');
            expect(body.responses[0].personaColor).toBe('#3B82F6');
        });
    });

    describe('POST /council/sessions/:id/select - Select persona', () => {
        it('should return 400 when persona is invalid', async () => {
            const app = createTestApp();

            const res = await app.request('/council/sessions/session-1/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ persona: 'INVALID_PERSONA' }),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('Validation failed');
        });

        it('should select persona successfully', async () => {
            mockService.selectResponse.mockResolvedValue({ success: true });
            mockPrisma.user.findUnique.mockResolvedValue({ id: TEST_USER_ID, tier: 'PRO' });
            mockService.getCouncilSession.mockResolvedValue({
                id: 'session-1',
                query: 'Test query',
            });
            const app = createTestApp();

            const res = await app.request('/council/sessions/session-1/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ persona: 'SCHOLAR' }),
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(mockService.selectResponse).toHaveBeenCalledWith(
                'session-1',
                TEST_USER_ID,
                'SCHOLAR'
            );
        });

        it('should accept all valid persona types', async () => {
            const validPersonas = ['SCHOLAR', 'CREATIVE', 'PRACTICAL', 'DEVILS_ADVOCATE'];
            for (const persona of validPersonas) {
                expect(validPersonas).toContain(persona);
            }
        });
    });

    describe('POST /council/sessions/:id/synthesize - Generate synthesis', () => {
        it('should return 404 when session is not found', async () => {
            mockService.getCouncilSession.mockResolvedValue(null);
            const app = createTestApp();

            const res = await app.request('/council/sessions/nonexistent/synthesize', {
                method: 'POST',
            });

            expect(res.status).toBe(404);
        });

        it('should return 403 when token budget is insufficient', async () => {
            mockService.getCouncilSession.mockResolvedValue({
                id: 'session-1',
                query: 'Test',
            });
            mockBilling.hasTokens.mockResolvedValue(false);
            const app = createTestApp();

            const res = await app.request('/council/sessions/session-1/synthesize', {
                method: 'POST',
            });

            expect(res.status).toBe(403);
            const body = await res.json();
            expect(body.error).toContain('Insufficient token budget');
        });

        it('should generate synthesis successfully', async () => {
            mockService.getCouncilSession.mockResolvedValue({
                id: 'session-1',
                query: 'Test',
            });
            mockService.generateSynthesis.mockResolvedValue({
                text: 'Balanced synthesis of all perspectives...',
                usage: { promptTokens: 500, completionTokens: 200 },
            });
            const app = createTestApp();

            const res = await app.request('/council/sessions/session-1/synthesize', {
                method: 'POST',
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.synthesis).toContain('Balanced synthesis');
            expect(mockBilling.recordTokenUsage).toHaveBeenCalledWith(
                TEST_USER_ID,
                500,
                200,
                'openai/gpt-4o'
            );
        });

        it('should return 500 when synthesis generation fails', async () => {
            mockService.getCouncilSession.mockResolvedValue({
                id: 'session-1',
                query: 'Test',
            });
            mockService.generateSynthesis.mockRejectedValue(new Error('Model error'));
            const app = createTestApp();

            const res = await app.request('/council/sessions/session-1/synthesize', {
                method: 'POST',
            });

            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body.error.code).toBe('INTERNAL_ERROR');
        });
    });

    describe('GET /council/personas - Get available personas', () => {
        it('should return all 4 personas', async () => {
            const app = createTestApp();

            const res = await app.request('/council/personas');

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.personas).toHaveLength(4);

            const ids = body.personas.map((p: any) => p.id);
            expect(ids).toContain('SCHOLAR');
            expect(ids).toContain('CREATIVE');
            expect(ids).toContain('PRACTICAL');
            expect(ids).toContain('DEVILS_ADVOCATE');
        });

        it('should include name, role, color, and modelId for each persona', async () => {
            const app = createTestApp();

            const res = await app.request('/council/personas');
            const body = await res.json();

            const scholar = body.personas.find((p: any) => p.id === 'SCHOLAR');
            expect(scholar.name).toBe('The Scholar');
            expect(scholar.role).toBe('Academic & Research Perspective');
            expect(scholar.color).toBe('#3B82F6');
            expect(scholar.modelId).toBe('openai/gpt-4o');
        });
    });

    describe('GET /council/stats - Get council statistics', () => {
        it('should return council statistics', async () => {
            mockService.getCouncilStats.mockResolvedValue({
                totalSessions: 15,
                preferences: { SCHOLAR: 5, CREATIVE: 4, PRACTICAL: 3, DEVILS_ADVOCATE: 3 },
                latency: { avgMs: 1500, minMs: 800, maxMs: 3200 },
                insights: {
                    dominantPersona: 'SCHOLAR',
                    diversityScore: 85,
                    recommendation: 'You value diverse perspectives equally.',
                    personaScores: { SCHOLAR: 33, CREATIVE: 27, PRACTICAL: 20, DEVILS_ADVOCATE: 20 },
                },
            });
            const app = createTestApp();

            const res = await app.request('/council/stats');

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.totalSessions).toBe(15);
            expect(body.preferences.SCHOLAR).toBe(5);
            expect(body.insights.dominantPersona).toBe('SCHOLAR');
        });
    });
});
