import { describe, expect, it } from 'vitest';
import { calculateCost, MODEL_PRICING } from '../cost-tracker';

describe('Cost Tracker', () => {
    describe('MODEL_PRICING', () => {
        it('should contain pricing for all known models', () => {
            expect(MODEL_PRICING['gpt-4o']).toBeDefined();
            expect(MODEL_PRICING['gpt-4o-mini']).toBeDefined();
            expect(MODEL_PRICING['claude-sonnet-4-5-20250929']).toBeDefined();
            expect(MODEL_PRICING['claude-haiku-4-5-20251001']).toBeDefined();
            expect(MODEL_PRICING['gemini-2.0-flash']).toBeDefined();
            expect(MODEL_PRICING['llama-3.3-70b']).toBeDefined();
            expect(MODEL_PRICING.default).toBeDefined();
        });

        it('should have positive pricing values', () => {
            expect(MODEL_PRICING['gpt-4o'].input).toBeGreaterThan(0);
            expect(MODEL_PRICING['gpt-4o'].output).toBeGreaterThan(0);
            expect(MODEL_PRICING['gpt-4o-mini'].input).toBeGreaterThan(0);
            expect(MODEL_PRICING['gpt-4o-mini'].output).toBeGreaterThan(0);
        });

        it('should have output pricing higher than input pricing', () => {
            expect(MODEL_PRICING['gpt-4o'].output).toBeGreaterThan(MODEL_PRICING['gpt-4o'].input);
            expect(MODEL_PRICING['claude-sonnet-4-5-20250929'].output).toBeGreaterThan(
                MODEL_PRICING['claude-sonnet-4-5-20250929'].input
            );
        });
    });

    describe('calculateCost', () => {
        it('should calculate cost correctly for GPT-4o', () => {
            // 1000 tokens in, 1000 tokens out
            // input: (1000/1000) * 0.0025 = 0.0025
            // output: (1000/1000) * 0.01 = 0.01
            // total: 0.0125
            const cost = calculateCost('gpt-4o', 1000, 1000);
            expect(cost).toBe(0.0125);
        });

        it('should calculate cost correctly for GPT-4o-mini', () => {
            // 1000 tokens in, 1000 tokens out
            // input: (1000/1000) * 0.00015 = 0.00015
            // output: (1000/1000) * 0.0006 = 0.0006
            // total: 0.00075
            const cost = calculateCost('gpt-4o-mini', 1000, 1000);
            expect(cost).toBeCloseTo(0.00075, 5);
        });

        it('should calculate cost correctly for Claude Sonnet', () => {
            // 2000 tokens in, 500 tokens out
            // input: (2000/1000) * 0.003 = 0.006
            // output: (500/1000) * 0.015 = 0.0075
            // total: 0.0135
            const cost = calculateCost('claude-sonnet-4-5-20250929', 2000, 500);
            expect(cost).toBe(0.0135);
        });

        it('should calculate cost correctly for Claude Haiku', () => {
            // 3000 tokens in, 1500 tokens out
            // input: (3000/1000) * 0.0008 = 0.0024
            // output: (1500/1000) * 0.004 = 0.006
            // total: 0.0084
            const cost = calculateCost('claude-haiku-4-5-20251001', 3000, 1500);
            expect(cost).toBeCloseTo(0.0084, 4);
        });

        it('should calculate cost correctly for Gemini', () => {
            // 5000 tokens in, 2000 tokens out
            // input: (5000/1000) * 0.0001 = 0.0005
            // output: (2000/1000) * 0.0004 = 0.0008
            // total: 0.0013
            const cost = calculateCost('gemini-2.0-flash', 5000, 2000);
            expect(cost).toBe(0.0013);
        });

        it('should calculate cost correctly for Llama', () => {
            // 1000 tokens in, 1000 tokens out
            // input: (1000/1000) * 0.00059 = 0.00059
            // output: (1000/1000) * 0.00079 = 0.00079
            // total: 0.00138
            const cost = calculateCost('llama-3.3-70b', 1000, 1000);
            expect(cost).toBeCloseTo(0.00138, 5);
        });

        it('should use default pricing for unknown models', () => {
            // 1000 tokens in, 1000 tokens out
            // input: (1000/1000) * 0.001 = 0.001
            // output: (1000/1000) * 0.002 = 0.002
            // total: 0.003
            const cost = calculateCost('unknown-model-xyz', 1000, 1000);
            expect(cost).toBe(0.003);
        });

        it('should handle zero tokens', () => {
            const cost = calculateCost('gpt-4o', 0, 0);
            expect(cost).toBe(0);
        });

        it('should handle only input tokens', () => {
            // 1000 tokens in, 0 tokens out
            // input: (1000/1000) * 0.0025 = 0.0025
            // output: (0/1000) * 0.01 = 0
            // total: 0.0025
            const cost = calculateCost('gpt-4o', 1000, 0);
            expect(cost).toBe(0.0025);
        });

        it('should handle only output tokens', () => {
            // 0 tokens in, 1000 tokens out
            // input: (0/1000) * 0.0025 = 0
            // output: (1000/1000) * 0.01 = 0.01
            // total: 0.01
            const cost = calculateCost('gpt-4o', 0, 1000);
            expect(cost).toBe(0.01);
        });

        it('should calculate cost correctly for fractional tokens', () => {
            // 500 tokens in, 250 tokens out
            // input: (500/1000) * 0.0025 = 0.00125
            // output: (250/1000) * 0.01 = 0.0025
            // total: 0.00375
            const cost = calculateCost('gpt-4o', 500, 250);
            expect(cost).toBe(0.00375);
        });

        it('should handle large token counts', () => {
            // 100000 tokens in, 50000 tokens out
            // input: (100000/1000) * 0.0025 = 0.25
            // output: (50000/1000) * 0.01 = 0.5
            // total: 0.75
            const cost = calculateCost('gpt-4o', 100000, 50000);
            expect(cost).toBe(0.75);
        });

        it('should return precise floating point results', () => {
            const cost = calculateCost('gpt-4o-mini', 123, 456);
            expect(typeof cost).toBe('number');
            expect(cost).toBeGreaterThan(0);
            expect(cost).toBeLessThan(0.001);
        });
    });

    describe('Cost comparison', () => {
        it('should show GPT-4o is more expensive than GPT-4o-mini', () => {
            const costGpt4o = calculateCost('gpt-4o', 1000, 1000);
            const costGpt4oMini = calculateCost('gpt-4o-mini', 1000, 1000);
            expect(costGpt4o).toBeGreaterThan(costGpt4oMini);
        });

        it('should show Claude Sonnet is more expensive than Claude Haiku', () => {
            const costSonnet = calculateCost('claude-sonnet-4-5-20250929', 1000, 1000);
            const costHaiku = calculateCost('claude-haiku-4-5-20251001', 1000, 1000);
            expect(costSonnet).toBeGreaterThan(costHaiku);
        });

        it('should show Gemini is cheapest for same token count', () => {
            const tokens = { in: 10000, out: 10000 };
            const costs = [
                calculateCost('gpt-4o', tokens.in, tokens.out),
                calculateCost('gpt-4o-mini', tokens.in, tokens.out),
                calculateCost('claude-sonnet-4-5-20250929', tokens.in, tokens.out),
                calculateCost('claude-haiku-4-5-20251001', tokens.in, tokens.out),
                calculateCost('gemini-2.0-flash', tokens.in, tokens.out),
                calculateCost('llama-3.3-70b', tokens.in, tokens.out),
            ];

            const geminiCost = calculateCost('gemini-2.0-flash', tokens.in, tokens.out);
            const minCost = Math.min(...costs);
            expect(geminiCost).toBe(minCost);
        });
    });
});
