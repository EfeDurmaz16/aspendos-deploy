/**
 * Usage Ledger - In-memory cost tracking for AI operations
 *
 * Tracks per-user, per-model costs with real-time analytics
 * for budget monitoring and cost optimization.
 */

export interface UsageEntry {
    userId: string;
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    cost: number; // in USD
    chatId?: string;
    timestamp: Date;
}

export interface ModelPricing {
    input: number; // cost per 1M tokens
    output: number; // cost per 1M tokens
}

export interface CostBreakdown {
    totalCost: number;
    byModel: Record<
        string,
        {
            cost: number;
            inputTokens: number;
            outputTokens: number;
            requestCount: number;
        }
    >;
    byDay: Record<string, number>;
}

export interface SystemCosts {
    totalCost: number;
    byProvider: Record<
        string,
        {
            cost: number;
            inputTokens: number;
            outputTokens: number;
            requestCount: number;
        }
    >;
}

export interface TopSpender {
    userId: string;
    totalCost: number;
    requestCount: number;
    mostUsedModel: string;
}

export type Period = 'day' | 'week' | 'month' | 'all';

/**
 * Model pricing table (cost per 1M tokens in USD)
 */
export const MODEL_PRICING_TABLE: Record<string, ModelPricing> = {
    'groq/llama-3.3-70b': { input: 0.59, output: 0.79 },
    'groq/llama-3.1-8b': { input: 0.05, output: 0.08 },
    'anthropic/claude-sonnet': { input: 3.0, output: 15.0 },
    'anthropic/claude-haiku': { input: 0.8, output: 4.0 },
    'openai/gpt-4o': { input: 2.5, output: 10.0 },
    'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
    'google/gemini-2.0-flash': { input: 0.075, output: 0.3 },
    'google/gemini-2.5-pro': { input: 1.25, output: 10.0 },
};

/**
 * Calculate cost from tokens and model pricing
 */
export function calculateCostFromTokens(
    model: string,
    inputTokens: number,
    outputTokens: number
): number {
    const pricing = MODEL_PRICING_TABLE[model];
    if (!pricing) {
        throw new Error(`Unknown model: ${model}. Cannot calculate cost.`);
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
}

/**
 * In-memory ledger for usage tracking
 */
class UsageLedger {
    private entries: UsageEntry[] = [];

    /**
     * Record a usage entry
     */
    recordUsage(entry: Omit<UsageEntry, 'timestamp'> & { timestamp?: Date }): void {
        this.entries.push({
            ...entry,
            timestamp: entry.timestamp || new Date(),
        });
    }

    /**
     * Get filtered entries based on userId and time period
     */
    private getFilteredEntries(userId?: string, period?: Period): UsageEntry[] {
        let filtered = userId ? this.entries.filter((e) => e.userId === userId) : this.entries;

        if (period && period !== 'all') {
            const now = new Date();
            const cutoff = new Date();

            switch (period) {
                case 'day':
                    cutoff.setDate(now.getDate() - 1);
                    break;
                case 'week':
                    cutoff.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    cutoff.setMonth(now.getMonth() - 1);
                    break;
            }

            filtered = filtered.filter((e) => e.timestamp >= cutoff);
        }

        return filtered;
    }

    /**
     * Get costs for a specific user grouped by model
     */
    getUserCosts(userId: string, period: Period = 'all'): CostBreakdown {
        const entries = this.getFilteredEntries(userId, period);

        const byModel: Record<
            string,
            {
                cost: number;
                inputTokens: number;
                outputTokens: number;
                requestCount: number;
            }
        > = {};

        const byDay: Record<string, number> = {};

        let totalCost = 0;

        for (const entry of entries) {
            totalCost += entry.cost;

            // By model
            if (!byModel[entry.model]) {
                byModel[entry.model] = {
                    cost: 0,
                    inputTokens: 0,
                    outputTokens: 0,
                    requestCount: 0,
                };
            }
            byModel[entry.model].cost += entry.cost;
            byModel[entry.model].inputTokens += entry.inputTokens;
            byModel[entry.model].outputTokens += entry.outputTokens;
            byModel[entry.model].requestCount += 1;

            // By day
            const day = entry.timestamp.toISOString().split('T')[0];
            byDay[day] = (byDay[day] || 0) + entry.cost;
        }

        return { totalCost, byModel, byDay };
    }

    /**
     * Get total platform costs grouped by provider
     */
    getSystemCosts(period: Period = 'all'): SystemCosts {
        const entries = this.getFilteredEntries(undefined, period);

        const byProvider: Record<
            string,
            {
                cost: number;
                inputTokens: number;
                outputTokens: number;
                requestCount: number;
            }
        > = {};

        let totalCost = 0;

        for (const entry of entries) {
            totalCost += entry.cost;

            if (!byProvider[entry.provider]) {
                byProvider[entry.provider] = {
                    cost: 0,
                    inputTokens: 0,
                    outputTokens: 0,
                    requestCount: 0,
                };
            }

            byProvider[entry.provider].cost += entry.cost;
            byProvider[entry.provider].inputTokens += entry.inputTokens;
            byProvider[entry.provider].outputTokens += entry.outputTokens;
            byProvider[entry.provider].requestCount += 1;
        }

        return { totalCost, byProvider };
    }

    /**
     * Get per-model, per-day breakdown for a user
     */
    getCostBreakdown(userId: string): CostBreakdown {
        return this.getUserCosts(userId, 'all');
    }

    /**
     * Estimate monthly burn rate based on recent usage
     */
    estimateMonthlyBurn(): number {
        const dayEntries = this.getFilteredEntries(undefined, 'day');
        const weekEntries = this.getFilteredEntries(undefined, 'week');

        if (dayEntries.length === 0 && weekEntries.length === 0) {
            return 0;
        }

        // Use week data for better estimation, fallback to day
        const useWeek = weekEntries.length > 0;
        const entries = useWeek ? weekEntries : dayEntries;
        const periodDays = useWeek ? 7 : 1;

        const totalCost = entries.reduce((sum, e) => sum + e.cost, 0);
        const dailyAverage = totalCost / periodDays;

        return dailyAverage * 30; // Project to 30 days
    }

    /**
     * Check if user is approaching their budget
     */
    isApproachingBudget(userId: string, budgetCents: number): boolean {
        const monthCosts = this.getUserCosts(userId, 'month');
        const budgetUsd = budgetCents / 100;
        const threshold = budgetUsd * 0.8; // 80% threshold

        return monthCosts.totalCost >= threshold;
    }

    /**
     * Get top spenders ranked by total cost
     */
    getTopSpenders(limit = 10): TopSpender[] {
        const userMap = new Map<
            string,
            {
                totalCost: number;
                requestCount: number;
                modelCounts: Map<string, number>;
            }
        >();

        for (const entry of this.entries) {
            if (!userMap.has(entry.userId)) {
                userMap.set(entry.userId, {
                    totalCost: 0,
                    requestCount: 0,
                    modelCounts: new Map(),
                });
            }

            const userData = userMap.get(entry.userId)!;
            userData.totalCost += entry.cost;
            userData.requestCount += 1;
            userData.modelCounts.set(entry.model, (userData.modelCounts.get(entry.model) || 0) + 1);
        }

        const spenders: TopSpender[] = [];

        for (const [userId, data] of userMap) {
            let mostUsedModel = '';
            let maxCount = 0;

            for (const [model, count] of data.modelCounts) {
                if (count > maxCount) {
                    maxCount = count;
                    mostUsedModel = model;
                }
            }

            spenders.push({
                userId,
                totalCost: data.totalCost,
                requestCount: data.requestCount,
                mostUsedModel,
            });
        }

        return spenders.sort((a, b) => b.totalCost - a.totalCost).slice(0, limit);
    }

    /**
     * Clear ledger (for testing only)
     */
    clearLedger_forTesting(): void {
        this.entries = [];
    }

    /**
     * Get total entry count (for testing)
     */
    getEntryCount(): number {
        return this.entries.length;
    }
}

// Singleton instance
export const usageLedger = new UsageLedger();
