import { prisma } from './prisma';

/**
 * Model pricing per 1K tokens (in USD)
 */
export const MODEL_PRICING = {
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'claude-sonnet-4-5-20250929': { input: 0.003, output: 0.015 },
    'claude-haiku-4-5-20251001': { input: 0.0008, output: 0.004 },
    'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
    'llama-3.3-70b': { input: 0.00059, output: 0.00079 },
    default: { input: 0.001, output: 0.002 },
} as const;

/**
 * Calculate cost in USD based on model ID and token usage
 */
export function calculateCost(modelId: string, tokensIn: number, tokensOut: number): number {
    const pricing = MODEL_PRICING[modelId as keyof typeof MODEL_PRICING] || MODEL_PRICING.default;

    const inputCost = (tokensIn / 1000) * pricing.input;
    const outputCost = (tokensOut / 1000) * pricing.output;

    return inputCost + outputCost;
}

/**
 * Track usage and log to CreditLog
 */
export async function trackUsage(params: {
    userId: string;
    modelId: string;
    tokensIn: number;
    tokensOut: number;
    reason?: string;
}): Promise<{ costUsd: number }> {
    const { userId, modelId, tokensIn, tokensOut, reason } = params;

    const costUsd = calculateCost(modelId, tokensIn, tokensOut);
    const account = await prisma.billingAccount.findUnique({
        where: { userId },
        select: { id: true },
    });

    if (!account) {
        return { costUsd };
    }

    await prisma.creditLog.create({
        data: {
            billingAccountId: account.id,
            amount: -Math.round(costUsd * 1_000_000),
            reason: reason || `${modelId} usage: ${tokensIn} in, ${tokensOut} out`,
            metadata: {
                modelId,
                tokensIn,
                tokensOut,
                costUsd,
            },
        },
    });

    return { costUsd };
}

/**
 * Get usage summary for a user within a date range
 */
export async function getUsageSummary(userId: string, startDate?: Date, endDate?: Date) {
    const account = await prisma.billingAccount.findUnique({
        where: { userId },
        select: { id: true },
    });

    if (!account) {
        return {
            totalCost: 0,
            logs: [],
            groupedByReason: {} as Record<
                string,
                {
                    count: number;
                    totalCost: number;
                    totalTokensIn: number;
                    totalTokensOut: number;
                }
            >,
        };
    }

    const logs = await prisma.creditLog.findMany({
        where: {
            billingAccountId: account.id,
            createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    const groupedByReason = logs.reduce(
        (acc, log) => {
            const reason = log.reason || 'unknown';
            if (!acc[reason]) {
                acc[reason] = {
                    count: 0,
                    totalCost: 0,
                    totalTokensIn: 0,
                    totalTokensOut: 0,
                };
            }

            acc[reason].count += 1;
            acc[reason].totalCost += Math.abs(log.amount) / 1_000_000;

            if (log.metadata && typeof log.metadata === 'object') {
                const metadata = log.metadata as {
                    tokensIn?: number;
                    tokensOut?: number;
                };
                acc[reason].totalTokensIn += metadata.tokensIn || 0;
                acc[reason].totalTokensOut += metadata.tokensOut || 0;
            }

            return acc;
        },
        {} as Record<
            string,
            {
                count: number;
                totalCost: number;
                totalTokensIn: number;
                totalTokensOut: number;
            }
        >
    );

    const totalCost = logs.reduce((sum, log) => sum + Math.abs(log.amount) / 1_000_000, 0);

    return {
        totalCost,
        logs,
        groupedByReason,
    };
}
