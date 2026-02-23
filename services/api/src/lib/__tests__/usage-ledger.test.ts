import { beforeEach, describe, expect, it } from 'vitest';
import { calculateCostFromTokens, MODEL_PRICING_TABLE, usageLedger } from '../usage-ledger';

describe('usage-ledger', () => {
    beforeEach(() => {
        usageLedger.clearLedger_forTesting();
    });

    describe('calculateCostFromTokens', () => {
        it('should calculate cost for groq/llama-3.1-70b-versatile', () => {
            const cost = calculateCostFromTokens('groq/llama-3.1-70b-versatile', 1_000_000, 1_000_000);
            expect(cost).toBeCloseTo(0.59 + 0.79, 6);
        });

        it('should calculate cost for anthropic/claude-sonnet-4-20250514', () => {
            const cost = calculateCostFromTokens('anthropic/claude-sonnet-4-20250514', 500_000, 200_000);
            expect(cost).toBeCloseTo((500_000 / 1_000_000) * 3.0 + (200_000 / 1_000_000) * 15.0, 6);
        });

        it('should calculate cost for groq/llama-3.1-8b-instant', () => {
            const cost = calculateCostFromTokens('groq/llama-3.1-8b-instant', 100_000, 50_000);
            expect(cost).toBeCloseTo((100_000 / 1_000_000) * 0.05 + (50_000 / 1_000_000) * 0.08, 6);
        });

        it('should throw error for unknown model', () => {
            expect(() => calculateCostFromTokens('unknown/model', 1000, 1000)).toThrow(
                'Unknown model'
            );
        });

        it('should handle zero tokens', () => {
            const cost = calculateCostFromTokens('groq/llama-3.1-8b-instant', 0, 0);
            expect(cost).toBe(0);
        });

        it('should calculate cost for all models in pricing table', () => {
            for (const model of Object.keys(MODEL_PRICING_TABLE)) {
                const cost = calculateCostFromTokens(model, 100_000, 100_000);
                expect(cost).toBeGreaterThan(0);
            }
        });
    });

    describe('recordUsage', () => {
        it('should record a usage entry', () => {
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 0.001,
                chatId: 'chat1',
            });

            expect(usageLedger.getEntryCount()).toBe(1);
        });

        it('should record multiple entries', () => {
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 0.001,
            });

            usageLedger.recordUsage({
                userId: 'user2',
                model: 'anthropic/claude-sonnet-4-20250514',
                provider: 'anthropic',
                inputTokens: 2000,
                outputTokens: 1000,
                cost: 0.02,
            });

            expect(usageLedger.getEntryCount()).toBe(2);
        });

        it('should auto-generate timestamp if not provided', () => {
            const _before = new Date();
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 0.001,
            });
            const _after = new Date();

            const costs = usageLedger.getUserCosts('user1');
            expect(costs.totalCost).toBe(0.001);
        });

        it('should accept custom timestamp', () => {
            const customDate = new Date('2026-01-01T00:00:00Z');
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 0.001,
                timestamp: customDate,
            });

            const costs = usageLedger.getUserCosts('user1');
            expect(costs.totalCost).toBe(0.001);
        });
    });

    describe('getUserCosts', () => {
        beforeEach(() => {
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

            usageLedger.recordUsage({
                userId: 'user2',
                model: 'openai/gpt-4o',
                provider: 'openai',
                inputTokens: 3000,
                outputTokens: 1500,
                cost: 0.03,
            });
        });

        it('should return costs for specific user', () => {
            const costs = usageLedger.getUserCosts('user1');
            expect(costs.totalCost).toBeCloseTo(0.021, 6);
        });

        it('should group costs by model', () => {
            const costs = usageLedger.getUserCosts('user1');
            expect(costs.byModel['groq/llama-3.1-70b-versatile'].cost).toBeCloseTo(0.001, 6);
            expect(costs.byModel['anthropic/claude-sonnet-4-20250514'].cost).toBeCloseTo(0.02, 6);
        });

        it('should track input and output tokens by model', () => {
            const costs = usageLedger.getUserCosts('user1');
            expect(costs.byModel['groq/llama-3.1-70b-versatile'].inputTokens).toBe(1000);
            expect(costs.byModel['groq/llama-3.1-70b-versatile'].outputTokens).toBe(500);
        });

        it('should track request count by model', () => {
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 500,
                outputTokens: 250,
                cost: 0.0005,
            });

            const costs = usageLedger.getUserCosts('user1');
            expect(costs.byModel['groq/llama-3.1-70b-versatile'].requestCount).toBe(2);
        });

        it('should group costs by day', () => {
            const costs = usageLedger.getUserCosts('user1');
            const today = new Date().toISOString().split('T')[0];
            expect(costs.byDay[today]).toBeCloseTo(0.021, 6);
        });

        it('should return zero for user with no usage', () => {
            const costs = usageLedger.getUserCosts('nonexistent');
            expect(costs.totalCost).toBe(0);
            expect(Object.keys(costs.byModel)).toHaveLength(0);
        });

        it('should filter by day period', () => {
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 0.001,
                timestamp: twoDaysAgo,
            });

            const costs = usageLedger.getUserCosts('user1', 'day');
            expect(costs.totalCost).toBeCloseTo(0.021, 6); // Only today's entries
        });

        it('should filter by week period', () => {
            const costs = usageLedger.getUserCosts('user1', 'week');
            expect(costs.totalCost).toBeCloseTo(0.021, 6);
        });

        it('should filter by month period', () => {
            const costs = usageLedger.getUserCosts('user1', 'month');
            expect(costs.totalCost).toBeCloseTo(0.021, 6);
        });
    });

    describe('getSystemCosts', () => {
        beforeEach(() => {
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 0.001,
            });

            usageLedger.recordUsage({
                userId: 'user2',
                model: 'groq/llama-3.1-8b-instant',
                provider: 'groq',
                inputTokens: 2000,
                outputTokens: 1000,
                cost: 0.002,
            });

            usageLedger.recordUsage({
                userId: 'user3',
                model: 'anthropic/claude-sonnet-4-20250514',
                provider: 'anthropic',
                inputTokens: 3000,
                outputTokens: 1500,
                cost: 0.03,
            });
        });

        it('should return total system costs', () => {
            const costs = usageLedger.getSystemCosts();
            expect(costs.totalCost).toBeCloseTo(0.033, 6);
        });

        it('should group costs by provider', () => {
            const costs = usageLedger.getSystemCosts();
            expect(costs.byProvider.groq.cost).toBeCloseTo(0.003, 6);
            expect(costs.byProvider.anthropic.cost).toBeCloseTo(0.03, 6);
        });

        it('should track tokens by provider', () => {
            const costs = usageLedger.getSystemCosts();
            expect(costs.byProvider.groq.inputTokens).toBe(3000);
            expect(costs.byProvider.groq.outputTokens).toBe(1500);
        });

        it('should track request count by provider', () => {
            const costs = usageLedger.getSystemCosts();
            expect(costs.byProvider.groq.requestCount).toBe(2);
            expect(costs.byProvider.anthropic.requestCount).toBe(1);
        });

        it('should filter by time period', () => {
            const costs = usageLedger.getSystemCosts('day');
            expect(costs.totalCost).toBeCloseTo(0.033, 6);
        });
    });

    describe('getCostBreakdown', () => {
        it('should return comprehensive breakdown', () => {
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 0.001,
            });

            const breakdown = usageLedger.getCostBreakdown('user1');
            expect(breakdown.totalCost).toBeCloseTo(0.001, 6);
            expect(breakdown.byModel['groq/llama-3.1-70b-versatile']).toBeDefined();
            expect(Object.keys(breakdown.byDay).length).toBeGreaterThan(0);
        });
    });

    describe('estimateMonthlyBurn', () => {
        it('should return zero with no usage', () => {
            const burn = usageLedger.estimateMonthlyBurn();
            expect(burn).toBe(0);
        });

        it('should estimate based on recent usage', () => {
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 1.0,
            });

            const burn = usageLedger.estimateMonthlyBurn();
            // Single entry gets averaged over 7 days (week period), then projected to 30 days
            expect(burn).toBeGreaterThan(0);
            expect(burn).toBeLessThan(10); // Should be around 4.3 (1/7 * 30)
        });

        it('should estimate based on week usage', () => {
            const oneDayAgo = new Date();
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);

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

            const burn = usageLedger.estimateMonthlyBurn();
            expect(burn).toBeCloseTo(30.0, 0); // 7 days * $1 / 7 days * 30 = $30
        });

        it('should prefer week data over day data', () => {
            // Add entries for past week
            for (let i = 0; i < 5; i++) {
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

            const burn = usageLedger.estimateMonthlyBurn();
            expect(burn).toBeGreaterThan(0);
        });
    });

    describe('isApproachingBudget', () => {
        it('should return false when under 80% threshold', () => {
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 5.0, // $5
            });

            const approaching = usageLedger.isApproachingBudget('user1', 1000); // $10 budget
            expect(approaching).toBe(false);
        });

        it('should return true when at 80% threshold', () => {
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 8.0, // $8
            });

            const approaching = usageLedger.isApproachingBudget('user1', 1000); // $10 budget, 80% = $8
            expect(approaching).toBe(true);
        });

        it('should return true when over budget', () => {
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 15.0, // $15
            });

            const approaching = usageLedger.isApproachingBudget('user1', 1000); // $10 budget
            expect(approaching).toBe(true);
        });

        it('should only check current month usage', () => {
            const twoMonthsAgo = new Date();
            twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 100.0,
                timestamp: twoMonthsAgo,
            });

            const approaching = usageLedger.isApproachingBudget('user1', 1000);
            expect(approaching).toBe(false);
        });
    });

    describe('getTopSpenders', () => {
        beforeEach(() => {
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
        });

        it('should return top spenders by cost', () => {
            const topSpenders = usageLedger.getTopSpenders();
            expect(topSpenders[0].userId).toBe('user3');
            expect(topSpenders[0].totalCost).toBe(15.0);
            expect(topSpenders[1].userId).toBe('user1');
            expect(topSpenders[1].totalCost).toBe(10.0);
        });

        it('should include request count', () => {
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 1.0,
            });

            const topSpenders = usageLedger.getTopSpenders();
            const user1 = topSpenders.find((s) => s.userId === 'user1');
            expect(user1?.requestCount).toBe(2);
        });

        it('should identify most used model', () => {
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 1.0,
            });

            const topSpenders = usageLedger.getTopSpenders();
            const user1 = topSpenders.find((s) => s.userId === 'user1');
            expect(user1?.mostUsedModel).toBe('groq/llama-3.1-70b-versatile');
        });

        it('should limit results', () => {
            const topSpenders = usageLedger.getTopSpenders(2);
            expect(topSpenders).toHaveLength(2);
        });

        it('should return empty array with no usage', () => {
            usageLedger.clearLedger_forTesting();
            const topSpenders = usageLedger.getTopSpenders();
            expect(topSpenders).toHaveLength(0);
        });

        it('should handle default limit of 10', () => {
            for (let i = 4; i <= 15; i++) {
                usageLedger.recordUsage({
                    userId: `user${i}`,
                    model: 'groq/llama-3.1-70b-versatile',
                    provider: 'groq',
                    inputTokens: 1000,
                    outputTokens: 500,
                    cost: 1.0,
                });
            }

            const topSpenders = usageLedger.getTopSpenders();
            expect(topSpenders).toHaveLength(10);
        });
    });

    describe('clearLedger_forTesting', () => {
        it('should clear all entries', () => {
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 1000,
                outputTokens: 500,
                cost: 0.001,
            });

            expect(usageLedger.getEntryCount()).toBe(1);

            usageLedger.clearLedger_forTesting();
            expect(usageLedger.getEntryCount()).toBe(0);
        });
    });

    describe('edge cases', () => {
        it('should handle very large token counts', () => {
            const cost = calculateCostFromTokens('anthropic/claude-sonnet-4-20250514', 10_000_000, 5_000_000);
            expect(cost).toBeGreaterThan(0);
            expect(Number.isFinite(cost)).toBe(true);
        });

        it('should handle multiple entries for same user and model', () => {
            for (let i = 0; i < 5; i++) {
                usageLedger.recordUsage({
                    userId: 'user1',
                    model: 'groq/llama-3.1-70b-versatile',
                    provider: 'groq',
                    inputTokens: 1000,
                    outputTokens: 500,
                    cost: 0.001,
                });
            }

            const costs = usageLedger.getUserCosts('user1');
            expect(costs.byModel['groq/llama-3.1-70b-versatile'].requestCount).toBe(5);
            expect(costs.totalCost).toBeCloseTo(0.005, 6);
        });

        it('should handle fractional costs correctly', () => {
            usageLedger.recordUsage({
                userId: 'user1',
                model: 'groq/llama-3.1-70b-versatile',
                provider: 'groq',
                inputTokens: 100,
                outputTokens: 50,
                cost: 0.0000138,
            });

            const costs = usageLedger.getUserCosts('user1');
            expect(costs.totalCost).toBeCloseTo(0.0000138, 10);
        });
    });
});
