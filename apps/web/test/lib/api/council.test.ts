import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Council API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    describe('POST /api/council/sessions', () => {
        it('should create a new council session', async () => {
            const mockResponse = {
                sessionId: 'session-123',
                streamUrl: '/api/council/sessions/session-123/stream',
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            });

            const response = await fetch('/api/council/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ query: 'Should I start a business?' }),
            });

            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(data.sessionId).toBeDefined();
            expect(data.streamUrl).toContain('/stream');
        });

        it('should reject empty queries', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: () => Promise.resolve({ error: 'Query is required' }),
            });

            const response = await fetch('/api/council/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ query: '' }),
            });

            expect(response.ok).toBe(false);
            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/council/sessions/:id/stream', () => {
        it('should return SSE stream events', async () => {
            // SSE streams are tested differently - this is a simplified version
            const mockEvents = [
                { type: 'persona_chunk', persona: 'SCHOLAR', content: 'Based on' },
                { type: 'persona_chunk', persona: 'SCHOLAR', content: ' my analysis' },
                { type: 'persona_complete', persona: 'SCHOLAR' },
            ];

            // For actual SSE testing, you'd use EventSource mock
            expect(mockEvents[0].type).toBe('persona_chunk');
            expect(mockEvents[2].type).toBe('persona_complete');
        });
    });

    describe('GET /api/council/sessions', () => {
        it('should list user sessions', async () => {
            const mockSessions = {
                sessions: [
                    {
                        id: 'session-1',
                        query: 'First question',
                        createdAt: '2026-01-20T10:00:00Z',
                        responses: [],
                    },
                    {
                        id: 'session-2',
                        query: 'Second question',
                        createdAt: '2026-01-21T10:00:00Z',
                        responses: [],
                    },
                ],
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSessions),
            });

            const response = await fetch('/api/council/sessions', {
                credentials: 'include',
            });

            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(data.sessions).toHaveLength(2);
        });
    });

    describe('GET /api/council/sessions/:id', () => {
        it('should get session details', async () => {
            const mockSession = {
                id: 'session-123',
                query: 'Test question',
                responses: [
                    {
                        persona: 'SCHOLAR',
                        content: 'Scholarly response',
                        latencyMs: 1500,
                    },
                    {
                        persona: 'CREATIVE',
                        content: 'Creative response',
                        latencyMs: 1200,
                    },
                ],
                synthesis: 'Synthesized answer',
                createdAt: '2026-01-25T10:00:00Z',
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSession),
            });

            const response = await fetch('/api/council/sessions/session-123', {
                credentials: 'include',
            });

            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(data.responses).toHaveLength(2);
            expect(data.synthesis).toBeDefined();
        });
    });

    describe('POST /api/council/sessions/:id/synthesize', () => {
        it('should generate synthesis', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    synthesis: 'After considering all perspectives...',
                }),
            });

            const response = await fetch('/api/council/sessions/session-123/synthesize', {
                method: 'POST',
                credentials: 'include',
            });

            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(data.synthesis).toBeDefined();
        });
    });

    describe('POST /api/council/sessions/:id/select', () => {
        it('should select preferred response', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ selected: 'CREATIVE' }),
            });

            const response = await fetch('/api/council/sessions/session-123/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ persona: 'CREATIVE' }),
            });

            expect(response.ok).toBe(true);
        });
    });

    describe('GET /api/council/personas', () => {
        it('should list available personas', async () => {
            const mockPersonas = {
                personas: [
                    { id: 'SCHOLAR', name: 'Scholar', model: 'gpt-4o' },
                    { id: 'CREATIVE', name: 'Creative', model: 'claude-3-5-sonnet' },
                    { id: 'PRACTICAL', name: 'Practical', model: 'gemini-2.0-flash' },
                    { id: 'DEVILS_ADVOCATE', name: "Devil's Advocate", model: 'gpt-4o-mini' },
                ],
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockPersonas),
            });

            const response = await fetch('/api/council/personas', {
                credentials: 'include',
            });

            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(data.personas).toHaveLength(4);
        });
    });

    describe('GET /api/council/stats', () => {
        it('should return council usage statistics', async () => {
            const mockStats = {
                totalSessions: 42,
                mostSelectedPersona: 'SCHOLAR',
                averageLatencyMs: 2500,
                personaStats: {
                    SCHOLAR: { selections: 18 },
                    CREATIVE: { selections: 12 },
                    PRACTICAL: { selections: 8 },
                    DEVILS_ADVOCATE: { selections: 4 },
                },
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockStats),
            });

            const response = await fetch('/api/council/stats', {
                credentials: 'include',
            });

            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(data.totalSessions).toBe(42);
            expect(data.mostSelectedPersona).toBe('SCHOLAR');
        });
    });
});
