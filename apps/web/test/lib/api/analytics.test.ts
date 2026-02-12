import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Analytics API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    describe('GET /api/analytics/summary', () => {
        it('should return summary data on success', async () => {
            const mockSummary = {
                totalMessages: 1247,
                totalChats: 89,
                totalTokensIn: 456789,
                totalTokensOut: 234567,
                totalTokens: 691356,
                totalCostUsd: 12.45,
                messagesThisMonth: 342,
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSummary),
            });

            const response = await fetch('/api/analytics/summary', {
                credentials: 'include',
            });

            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(data.totalMessages).toBe(1247);
            expect(data.totalCostUsd).toBe(12.45);
        });

        it('should return 401 for unauthenticated requests', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ error: 'Unauthorized' }),
            });

            const response = await fetch('/api/analytics/summary');
            expect(response.ok).toBe(false);
            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/analytics/usage', () => {
        it('should return usage data with interval parameter', async () => {
            const mockUsage = {
                data: [
                    { date: '2026-01-20', totalTokens: 5000, costUsd: 0.15 },
                    { date: '2026-01-21', totalTokens: 7500, costUsd: 0.22 },
                ],
                interval: 'day',
                limit: 30,
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUsage),
            });

            const response = await fetch('/api/analytics/usage?interval=day&limit=30', {
                credentials: 'include',
            });

            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(data.data).toHaveLength(2);
            expect(data.interval).toBe('day');
        });

        it('should support different intervals', async () => {
            const intervals = ['day', 'week', 'month'];

            for (const interval of intervals) {
                (global.fetch as any).mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ data: [], interval }),
                });

                const response = await fetch(`/api/analytics/usage?interval=${interval}`, {
                    credentials: 'include',
                });

                expect(response.ok).toBe(true);
            }
        });
    });

    describe('GET /api/analytics/messages', () => {
        it('should return message count data', async () => {
            const mockMessages = {
                data: [
                    { date: '2026-01-20', userMessages: 15, assistantMessages: 15, total: 30 },
                    { date: '2026-01-21', userMessages: 20, assistantMessages: 18, total: 38 },
                ],
                limit: 30,
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockMessages),
            });

            const response = await fetch('/api/analytics/messages?limit=30', {
                credentials: 'include',
            });

            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(data.data[0].total).toBe(30);
        });
    });

    describe('GET /api/analytics/models', () => {
        it('should return model usage distribution', async () => {
            const mockModels = {
                data: [
                    { model: 'openai/gpt-4o', count: 245, percentage: 42.5 },
                    { model: 'anthropic/claude-3-5-sonnet', count: 189, percentage: 32.8 },
                    { model: 'google/gemini-2.0-flash', count: 87, percentage: 15.1 },
                    { model: 'groq/llama-3.3-70b', count: 56, percentage: 9.7 },
                ],
                days: 30,
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockModels),
            });

            const response = await fetch('/api/analytics/models?days=30', {
                credentials: 'include',
            });

            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(data.data).toHaveLength(4);
            expect(data.data.reduce((sum: number, m: any) => sum + m.percentage, 0)).toBeCloseTo(100, 0);
        });
    });
});
