/**
 * Billing Database Service
 * Handles billing account and credit operations using Prisma.
 */
import { type BillingAccount, prisma, type Tier } from '@aspendos/db';
import { getTierConfig, TIER_CONFIG, type TierName } from '../config/tiers';

/**
 * Per-model pricing in USD per 1M tokens (industry standard)
 * Used for actual cost tracking and billing transparency
 */
const MODEL_PRICING: Record<string, { promptPer1M: number; completionPer1M: number }> = {
    // Groq - Primary models (all tiers)
    'groq/llama-3.1-70b-versatile': { promptPer1M: 0.59, completionPer1M: 0.79 },
    'groq/llama-3.1-8b-instant': { promptPer1M: 0.05, completionPer1M: 0.08 },
    'groq/mixtral-8x7b-32768': { promptPer1M: 0.24, completionPer1M: 0.24 },
    'groq/llama3-8b-8192': { promptPer1M: 0.05, completionPer1M: 0.08 },
    // ULTRA tier premium models
    'openai/gpt-4o': { promptPer1M: 2.5, completionPer1M: 10.0 },
    'openai/o1': { promptPer1M: 15.0, completionPer1M: 60.0 },
    'anthropic/claude-sonnet-4-20250514': { promptPer1M: 3.0, completionPer1M: 15.0 },
    'anthropic/claude-opus-4-20250514': { promptPer1M: 15.0, completionPer1M: 75.0 },
};

/**
 * Get or create billing account for user
 */
export async function getOrCreateBillingAccount(userId: string): Promise<BillingAccount> {
    const existing = await prisma.billingAccount.findUnique({
        where: { userId },
    });

    if (existing) return existing;

    // New users start on FREE
    const freeConfig = getTierConfig('FREE');

    return prisma.billingAccount.create({
        data: {
            userId,
            plan: 'free',
            monthlyCredit: freeConfig.monthlyTokens / 1000, // Store in K tokens
            chatsRemaining: freeConfig.monthlyChats,
            voiceMinutesRemaining: freeConfig.dailyVoiceMinutes * 30,
        },
    });
}

/**
 * Get billing status for user
 */
export async function getBillingStatus(userId: string) {
    const account = await getOrCreateBillingAccount(userId);
    const tier = account.plan.toUpperCase() as TierName;
    const config = getTierConfig(tier);

    const tokensUsed = account.creditUsed * 1000; // Convert from K tokens
    const tokensRemaining = (account.monthlyCredit - account.creditUsed) * 1000;
    const usagePercentage = (account.creditUsed / account.monthlyCredit) * 100;

    return {
        // Plan info
        plan: account.plan,
        tier,
        status: account.status,

        // Pricing
        monthlyPrice: config.monthlyPrice,
        weeklyPrice: config.weeklyPrice,
        annualPrice: config.annualPrice,
        annualSavings: Math.round(
            ((config.monthlyPrice * 12 - config.annualPrice) / (config.monthlyPrice * 12)) * 100
        ),

        // Usage
        tokens: {
            used: tokensUsed,
            remaining: tokensRemaining,
            limit: config.monthlyTokens,
            percentage: Math.round(usagePercentage),
        },
        chats: {
            used: config.monthlyChats - (account.chatsRemaining || config.monthlyChats),
            remaining: account.chatsRemaining || config.monthlyChats,
            limit: config.monthlyChats,
        },
        voice: {
            dailyMinutes: config.dailyVoiceMinutes,
        },

        // Features
        features: {
            multiModel: config.multiModel,
            multiModelLimit: config.multiModelLimit,
            memoryLevel: config.memoryLevel,
            memoryInspector: config.memoryInspector,
            customAgents: config.customAgents,
            routingPriority: config.routingPriority,
        },

        // Billing dates
        resetDate: account.resetDate,
        subscriptionId: account.subscriptionId,
    };
}

/**
 * Record token usage (atomic transaction to prevent race conditions)
 */
export async function recordTokenUsage(
    userId: string,
    tokensIn: number,
    tokensOut: number,
    modelId: string,
    metadata?: Record<string, unknown>
) {
    const totalTokens = tokensIn + tokensOut;
    const creditsUsed = totalTokens / 1000; // Store in K tokens

    // Calculate actual USD cost based on model pricing (per 1M tokens)
    const pricing = MODEL_PRICING[modelId];
    let usdCost = 0;
    if (pricing) {
        const inputCost = (tokensIn * pricing.promptPer1M) / 1_000_000;
        const outputCost = (tokensOut * pricing.completionPer1M) / 1_000_000;
        usdCost = inputCost + outputCost;
    } else {
        // Default conservative pricing for unknown models (per 1M tokens)
        usdCost = (tokensIn * 1.0 + tokensOut * 3.0) / 1_000_000;
    }

    // Atomic transaction to prevent race conditions on credit balance
    await prisma.$transaction(async (tx) => {
        const account = await tx.billingAccount.findUnique({ where: { userId } });
        if (!account) {
            // Create account if it doesn't exist
            const freeConfig = getTierConfig('FREE');
            const newAccount = await tx.billingAccount.create({
                data: {
                    userId,
                    plan: 'free',
                    monthlyCredit: freeConfig.monthlyTokens / 1000,
                    chatsRemaining: freeConfig.monthlyChats,
                    voiceMinutesRemaining: freeConfig.dailyVoiceMinutes * 30,
                },
            });

            // Create credit log
            await tx.creditLog.create({
                data: {
                    billingAccountId: newAccount.id,
                    amount: -Math.ceil(creditsUsed), // Negative for usage, ceil to prevent sub-1K queries being free
                    reason: 'model_inference',
                    metadata: {
                        model: modelId,
                        tokens_in: tokensIn,
                        tokens_out: tokensOut,
                        usd_cost: usdCost,
                        ...metadata,
                    },
                },
            });

            // Update credit used
            await tx.billingAccount.update({
                where: { id: newAccount.id },
                data: {
                    creditUsed: { increment: creditsUsed },
                },
            });
            return;
        }

        // Update credit used atomically
        await tx.billingAccount.update({
            where: { userId },
            data: {
                creditUsed: { increment: creditsUsed },
            },
        });

        // Create credit log entry
        await tx.creditLog.create({
            data: {
                billingAccountId: account.id,
                amount: -Math.ceil(creditsUsed), // Negative for usage, ceil to prevent sub-1K queries being free
                reason: 'model_inference',
                metadata: {
                    model: modelId,
                    tokens_in: tokensIn,
                    tokens_out: tokensOut,
                    usd_cost: usdCost,
                    ...metadata,
                },
            },
        });
    });
}

/**
 * Record chat usage (atomic - prevents going negative)
 */
export async function recordChatUsage(userId: string) {
    await prisma.billingAccount.updateMany({
        where: { userId, chatsRemaining: { gt: 0 } },
        data: {
            chatsRemaining: { decrement: 1 },
        },
    });
}

/**
 * Check if user has sufficient tokens
 */
export async function hasTokens(userId: string, estimatedTokens: number): Promise<boolean> {
    const account = await getOrCreateBillingAccount(userId);
    const estimatedCredits = estimatedTokens / 1000;
    return account.monthlyCredit - account.creditUsed >= estimatedCredits;
}

/**
 * Check if user has chats remaining
 */
export async function hasChatsRemaining(userId: string): Promise<boolean> {
    const account = await getOrCreateBillingAccount(userId);
    return (account.chatsRemaining || 0) > 0;
}

/**
 * Check if user has voice minutes remaining
 */
export async function hasVoiceMinutes(userId: string): Promise<boolean> {
    const account = await getOrCreateBillingAccount(userId);
    return (account.voiceMinutesRemaining || 0) > 0;
}

/**
 * Record voice usage (decrement voice minutes)
 */
export async function recordVoiceUsage(userId: string, durationMinutes: number) {
    const account = await getOrCreateBillingAccount(userId);

    await prisma.creditLog.create({
        data: {
            billingAccountId: account.id,
            amount: Math.round(-durationMinutes * 100) / 100,
            reason: 'voice_usage',
            metadata: {
                duration_minutes: durationMinutes,
            },
        },
    });

    await prisma.billingAccount.updateMany({
        where: { userId, voiceMinutesRemaining: { gt: 0 } },
        data: {
            voiceMinutesRemaining: { decrement: Math.ceil(durationMinutes) },
        },
    });
}

/**
 * Upgrade user to new tier
 */
export async function upgradeTier(userId: string, newPlan: 'starter' | 'pro' | 'ultra') {
    const tier = newPlan.toUpperCase() as TierName;
    const config = getTierConfig(tier);

    // Update billing account
    await prisma.billingAccount.update({
        where: { userId },
        data: {
            plan: newPlan,
            monthlyCredit: config.monthlyTokens / 1000,
            chatsRemaining: config.monthlyChats,
        },
    });

    // Update user tier
    await prisma.user.update({
        where: { id: userId },
        data: { tier: tier as Tier },
    });
}

/**
 * Reset monthly credits (called by cron job or webhook)
 */
export async function resetMonthlyCredits(userId: string) {
    const account = await prisma.billingAccount.findUnique({
        where: { userId },
    });

    if (!account) return;

    const tier = account.plan.toUpperCase() as TierName;
    const config = getTierConfig(tier);

    return prisma.billingAccount.update({
        where: { userId },
        data: {
            creditUsed: 0,
            chatsRemaining: config.monthlyChats,
            monthlyCredit: config.monthlyTokens / 1000,
            resetDate: new Date(),
        },
    });
}

/**
 * Check if user has exceeded their daily cost ceiling.
 * Prevents runaway API spend from bugs, loops, or abuse.
 * Returns { allowed, dailySpend, dailyCeiling, percentUsed }
 */
export async function checkCostCeiling(userId: string): Promise<{
    allowed: boolean;
    dailySpend: number;
    dailyCeiling: number;
    percentUsed: number;
    warning: boolean;
}> {
    const account = await getOrCreateBillingAccount(userId);
    const tier = account.plan.toUpperCase() as TierName;
    const config = getTierConfig(tier);

    // Daily ceiling = monthly tokens / 25 working days (generous buffer)
    const dailyCeilingKTokens = config.monthlyTokens / 1000 / 25;

    // Sum today's usage from credit logs
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todaysLogs = await prisma.creditLog.findMany({
        where: {
            billingAccountId: account.id,
            createdAt: { gte: startOfDay },
            reason: 'model_inference',
        },
        select: { amount: true },
    });

    const dailySpend = todaysLogs.reduce((sum, log) => sum + Math.abs(log.amount), 0);
    const percentUsed =
        dailyCeilingKTokens > 0 ? Math.round((dailySpend / dailyCeilingKTokens) * 100) : 0;

    return {
        allowed: dailySpend < dailyCeilingKTokens,
        dailySpend: Math.round(dailySpend * 10) / 10,
        dailyCeiling: Math.round(dailyCeilingKTokens * 10) / 10,
        percentUsed,
        warning: percentUsed >= 80, // Alert at 80%
    };
}

/**
 * Get usage history for user
 */
export async function getUsageHistory(userId: string, limit?: number) {
    const account = await prisma.billingAccount.findUnique({
        where: { userId },
    });

    if (!account) return [];

    return prisma.creditLog.findMany({
        where: { billingAccountId: account.id },
        orderBy: { createdAt: 'desc' },
        take: limit || 50,
    });
}

/**
 * Get tier comparison for upgrade UI
 */
export function getTierComparison() {
    return {
        free: TIER_CONFIG.FREE,
        starter: TIER_CONFIG.STARTER,
        pro: TIER_CONFIG.PRO,
        ultra: TIER_CONFIG.ULTRA,
    };
}

/**
 * Get spending alerts for user
 * Returns warnings when user approaches token or cost limits
 */
export async function getSpendingAlerts(userId: string): Promise<{
    alerts: Array<{ level: 'info' | 'warning' | 'critical'; message: string }>;
}> {
    const account = await getOrCreateBillingAccount(userId);
    const alerts: Array<{ level: 'info' | 'warning' | 'critical'; message: string }> = [];

    // Check monthly token usage
    const usagePercent = (account.creditUsed / account.monthlyCredit) * 100;
    if (usagePercent >= 95) {
        alerts.push({
            level: 'critical',
            message: `You've used ${Math.round(usagePercent)}% of your monthly tokens. Consider upgrading your plan.`,
        });
    } else if (usagePercent >= 80) {
        alerts.push({
            level: 'warning',
            message: `You've used ${Math.round(usagePercent)}% of your monthly tokens.`,
        });
    }

    // Check daily cost ceiling
    const ceiling = await checkCostCeiling(userId);
    if (ceiling.percentUsed >= 95) {
        alerts.push({
            level: 'critical',
            message: `You've used ${ceiling.percentUsed}% of your daily cost ceiling (${ceiling.dailySpend}K/${ceiling.dailyCeiling}K tokens today).`,
        });
    } else if (ceiling.percentUsed >= 80) {
        alerts.push({
            level: 'warning',
            message: `You've used ${ceiling.percentUsed}% of your daily cost ceiling (${ceiling.dailySpend}K/${ceiling.dailyCeiling}K tokens today).`,
        });
    }

    return { alerts };
}

/**
 * Get cost summary by model and day for current billing period
 */
export async function getCostSummary(userId: string): Promise<{
    byModel: Array<{
        model: string;
        tokensIn: number;
        tokensOut: number;
        totalTokens: number;
        usdCost: number;
        requestCount: number;
    }>;
    byDay: Array<{
        date: string;
        tokensIn: number;
        tokensOut: number;
        totalTokens: number;
        usdCost: number;
        requestCount: number;
    }>;
    totalUsdCost: number;
    billingPeriodStart: Date;
}> {
    const account = await getOrCreateBillingAccount(userId);

    // Get all logs since last reset
    const logs = await prisma.creditLog.findMany({
        where: {
            billingAccountId: account.id,
            createdAt: { gte: account.resetDate },
            reason: 'model_inference',
        },
        orderBy: { createdAt: 'desc' },
    });

    // Group by model
    const byModelMap = new Map<
        string,
        {
            model: string;
            tokensIn: number;
            tokensOut: number;
            totalTokens: number;
            usdCost: number;
            requestCount: number;
        }
    >();

    // Group by day
    const byDayMap = new Map<
        string,
        {
            date: string;
            tokensIn: number;
            tokensOut: number;
            totalTokens: number;
            usdCost: number;
            requestCount: number;
        }
    >();

    let totalUsdCost = 0;

    for (const log of logs) {
        const metadata = log.metadata as {
            model?: string;
            tokens_in?: number;
            tokens_out?: number;
            usd_cost?: number;
        };
        const model = metadata.model || 'unknown';
        const tokensIn = metadata.tokens_in || 0;
        const tokensOut = metadata.tokens_out || 0;
        const usdCost = metadata.usd_cost || 0;

        totalUsdCost += usdCost;

        // Aggregate by model
        if (!byModelMap.has(model)) {
            byModelMap.set(model, {
                model,
                tokensIn: 0,
                tokensOut: 0,
                totalTokens: 0,
                usdCost: 0,
                requestCount: 0,
            });
        }
        const modelStats = byModelMap.get(model)!;
        modelStats.tokensIn += tokensIn;
        modelStats.tokensOut += tokensOut;
        modelStats.totalTokens += tokensIn + tokensOut;
        modelStats.usdCost += usdCost;
        modelStats.requestCount += 1;

        // Aggregate by day
        const date = log.createdAt.toISOString().split('T')[0];
        if (!byDayMap.has(date)) {
            byDayMap.set(date, {
                date,
                tokensIn: 0,
                tokensOut: 0,
                totalTokens: 0,
                usdCost: 0,
                requestCount: 0,
            });
        }
        const dayStats = byDayMap.get(date)!;
        dayStats.tokensIn += tokensIn;
        dayStats.tokensOut += tokensOut;
        dayStats.totalTokens += tokensIn + tokensOut;
        dayStats.usdCost += usdCost;
        dayStats.requestCount += 1;
    }

    return {
        byModel: Array.from(byModelMap.values()).sort((a, b) => b.usdCost - a.usdCost),
        byDay: Array.from(byDayMap.values()).sort((a, b) => b.date.localeCompare(a.date)),
        totalUsdCost: Math.round(totalUsdCost * 10000) / 10000, // Round to 4 decimals
        billingPeriodStart: account.resetDate,
    };
}

/**
 * Project end-of-month cost based on current usage trend.
 * Helps users understand if they'll hit limits before period ends.
 */
export async function getCostProjection(userId: string): Promise<{
    projectedTokens: number;
    projectedCostUsd: number;
    tokenLimit: number;
    willExceedLimit: boolean;
    daysRemaining: number;
    dailyAvgTokens: number;
    recommendation: string | null;
}> {
    const account = await getOrCreateBillingAccount(userId);
    const tier = account.plan.toUpperCase() as TierName;
    const config = getTierConfig(tier);

    // Days elapsed since reset
    const now = new Date();
    const resetDate = new Date(account.resetDate);
    const daysElapsed = Math.max(
        1,
        Math.ceil((now.getTime() - resetDate.getTime()) / (24 * 60 * 60 * 1000))
    );

    // Days remaining in billing period (assume 30-day cycles)
    const daysRemaining = Math.max(0, 30 - daysElapsed);

    // Current usage
    const tokensUsed = account.creditUsed * 1000;
    const dailyAvgTokens = Math.round(tokensUsed / daysElapsed);

    // Project to end of month
    const projectedTokens = tokensUsed + dailyAvgTokens * daysRemaining;
    const tokenLimit = config.monthlyTokens;
    const willExceedLimit = projectedTokens > tokenLimit;

    // Estimate USD cost projection
    const costSoFar = await getCostSummary(userId);
    const dailyAvgCost = daysElapsed > 0 ? costSoFar.totalUsdCost / daysElapsed : 0;
    const projectedCostUsd =
        Math.round((costSoFar.totalUsdCost + dailyAvgCost * daysRemaining) * 100) / 100;

    // Recommendation
    let recommendation: string | null = null;
    if (willExceedLimit && tier === 'FREE') {
        recommendation =
            'You are on track to exceed your free tier limit. Consider upgrading to Starter ($20/mo).';
    } else if (willExceedLimit && tier === 'STARTER') {
        recommendation = 'Your usage suggests Pro tier ($49/mo) would be a better fit.';
    } else if (willExceedLimit && tier === 'PRO') {
        recommendation = 'Heavy usage detected. Ultra tier ($99/mo) offers 4x more capacity.';
    }

    return {
        projectedTokens,
        projectedCostUsd,
        tokenLimit,
        willExceedLimit,
        daysRemaining,
        dailyAvgTokens,
        recommendation,
    };
}

/**
 * Proactively check spending and create notifications for the user.
 * Called after token usage recording to surface alerts in real-time.
 */
export async function maybeCreateSpendingNotification(userId: string): Promise<void> {
    try {
        const { alerts } = await getSpendingAlerts(userId);
        if (alerts.length === 0) return;

        // Only create critical/warning notifications (not info)
        const importantAlerts = alerts.filter(
            (a) => a.level === 'critical' || a.level === 'warning'
        );
        if (importantAlerts.length === 0) return;

        // Deduplicate: don't create if we already sent a spending alert today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const existingAlert = await prisma.notificationLog.findFirst({
            where: {
                userId,
                type: 'SPENDING_ALERT',
                createdAt: { gte: startOfDay },
            },
        });

        if (existingAlert) return; // Already alerted today

        const topAlert = importantAlerts[0];
        await prisma.notificationLog.create({
            data: {
                userId,
                type: 'SPENDING_ALERT',
                title: topAlert.level === 'critical' ? 'Usage limit approaching' : 'Usage notice',
                message: topAlert.message,
                channel: 'in_app',
                status: 'pending',
            },
        });
    } catch {
        // Non-blocking: billing alerts should never break the main flow
    }
}

/**
 * Get unit economics for a user: revenue vs cost per billing period.
 * This is critical for proving the business model works.
 * Tracks: monthly revenue (tier price), actual API cost, gross margin.
 */
export async function getUnitEconomics(userId: string): Promise<{
    monthlyRevenue: number;
    periodApiCost: number;
    grossMargin: number;
    grossMarginPercent: number;
    costPerChat: number;
    ltv30d: number;
    healthStatus: 'profitable' | 'break_even' | 'unprofitable';
}> {
    const account = await getOrCreateBillingAccount(userId);
    const tier = account.plan.toUpperCase() as TierName;
    const config = getTierConfig(tier);

    const monthlyRevenue = config.monthlyPrice;

    // Sum actual API costs this billing period
    const logs = await prisma.creditLog.findMany({
        where: {
            billingAccountId: account.id,
            createdAt: { gte: account.resetDate },
            reason: 'model_inference',
        },
        select: { metadata: true },
    });

    let periodApiCost = 0;
    for (const log of logs) {
        const meta = log.metadata as { usd_cost?: number } | null;
        periodApiCost += meta?.usd_cost || 0;
    }
    periodApiCost = Math.round(periodApiCost * 10000) / 10000;

    const grossMargin = monthlyRevenue - periodApiCost;
    const grossMarginPercent =
        monthlyRevenue > 0 ? Math.round((grossMargin / monthlyRevenue) * 100) : 0;

    // Cost per chat
    const chatsUsed = config.monthlyChats - (account.chatsRemaining || 0);
    const costPerChat = chatsUsed > 0 ? Math.round((periodApiCost / chatsUsed) * 10000) / 10000 : 0;

    // Simple 30-day LTV proxy
    const ltv30d = monthlyRevenue;

    // Health assessment
    let healthStatus: 'profitable' | 'break_even' | 'unprofitable' = 'profitable';
    if (monthlyRevenue === 0 && periodApiCost > 0) {
        healthStatus = 'unprofitable'; // Free tier with usage
    } else if (grossMarginPercent < 10) {
        healthStatus = 'break_even';
    } else if (grossMarginPercent < 0) {
        healthStatus = 'unprofitable';
    }

    return {
        monthlyRevenue,
        periodApiCost,
        grossMargin,
        grossMarginPercent,
        costPerChat,
        ltv30d,
        healthStatus,
    };
}
