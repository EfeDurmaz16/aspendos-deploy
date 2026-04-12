/**
 * Billing Database Service
 * Handles billing account and credit operations using Convex.
 */
type BillingAccount = any;

import { getConvexClient, api } from '../lib/convex';
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
 * Get or create billing account for user.
 * In Convex model, subscription acts as billing account.
 * Returns a shim object compatible with legacy BillingAccount shape.
 */
export async function getOrCreateBillingAccount(userId: string): Promise<BillingAccount> {
    try {
        const client = getConvexClient();
        const sub = await client.query(api.subscriptions.getByUser, { user_id: userId as any });
        if (sub) {
            const tierName = (sub.tier || 'free').toUpperCase() as TierName;
            const config = getTierConfig(tierName);
            return {
                id: sub._id,
                userId,
                plan: sub.tier || 'free',
                status: sub.status || 'active',
                monthlyCredit: config.monthlyTokens / 1000,
                creditUsed: 0, // Convex doesn't track granular credit — return 0
                chatsRemaining: config.monthlyChats,
                voiceMinutesRemaining: config.dailyVoiceMinutes * 30,
                resetDate: new Date(sub.current_period_end),
                subscriptionId: sub.stripe_subscription_id,
            };
        }
    } catch {
        // fall through to default
    }

    // No subscription found — return a free-tier shim (no DB write needed)
    const freeConfig = getTierConfig('FREE');
    return {
        id: null,
        userId,
        plan: 'free',
        status: 'active',
        monthlyCredit: freeConfig.monthlyTokens / 1000,
        creditUsed: 0,
        chatsRemaining: freeConfig.monthlyChats,
        voiceMinutesRemaining: freeConfig.dailyVoiceMinutes * 30,
        resetDate: new Date(),
        subscriptionId: null,
    };
}

/**
 * Get billing status for user
 */
export async function getBillingStatus(userId: string) {
    const account = await getOrCreateBillingAccount(userId);
    const tier = account.plan.toUpperCase() as TierName;
    const config = getTierConfig(tier);

    const tokensUsed = account.creditUsed * 1000;
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
 * Record token usage — logs as action_log event in Convex
 */
export async function recordTokenUsage(
    userId: string,
    tokensIn: number,
    tokensOut: number,
    modelId: string,
    metadata?: Record<string, unknown>
) {
    const totalTokens = tokensIn + tokensOut;
    const creditsUsed = totalTokens / 1000;

    // Calculate actual USD cost based on model pricing (per 1M tokens)
    const pricing = MODEL_PRICING[modelId];
    let usdCost = 0;
    if (pricing) {
        const inputCost = (tokensIn * pricing.promptPer1M) / 1_000_000;
        const outputCost = (tokensOut * pricing.completionPer1M) / 1_000_000;
        usdCost = inputCost + outputCost;
    } else {
        usdCost = (tokensIn * 1.0 + tokensOut * 3.0) / 1_000_000;
    }

    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'token_usage',
            details: {
                model: modelId,
                tokens_in: tokensIn,
                tokens_out: tokensOut,
                credits_used: creditsUsed,
                usd_cost: usdCost,
                ...metadata,
            },
        });
    } catch {
        // Non-blocking: usage tracking should never break the main flow
    }
}

/**
 * Record chat usage — logs as action_log event
 */
export async function recordChatUsage(userId: string) {
    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'chat_usage',
            details: { decremented: 1 },
        });
    } catch {
        // Non-blocking
    }
}

/**
 * Check if user has sufficient tokens
 */
export async function hasTokens(userId: string, _estimatedTokens: number): Promise<boolean> {
    try {
        const account = await getOrCreateBillingAccount(userId);
        const estimatedCredits = _estimatedTokens / 1000;
        return account.monthlyCredit - account.creditUsed >= estimatedCredits;
    } catch {
        return true; // Fail open
    }
}

/**
 * Check if user has chats remaining
 */
export async function hasChatsRemaining(userId: string): Promise<boolean> {
    try {
        const account = await getOrCreateBillingAccount(userId);
        return (account.chatsRemaining || 0) > 0;
    } catch {
        return true;
    }
}

/**
 * Check if user has voice minutes remaining
 */
export async function hasVoiceMinutes(userId: string): Promise<boolean> {
    try {
        const account = await getOrCreateBillingAccount(userId);
        return (account.voiceMinutesRemaining || 0) > 0;
    } catch {
        return true;
    }
}

/**
 * Record voice usage — logs as action_log event
 */
export async function recordVoiceUsage(userId: string, durationMinutes: number) {
    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'voice_usage',
            details: { duration_minutes: durationMinutes },
        });
    } catch {
        // Non-blocking
    }
}

/**
 * Upgrade user to new tier — logs as action_log event.
 * Actual Stripe subscription management happens via webhooks → subscriptions.upsertFromStripe.
 */
export async function upgradeTier(userId: string, newPlan: 'starter' | 'pro' | 'ultra') {
    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'tier_upgrade',
            details: { new_plan: newPlan },
        });
    } catch {
        // Non-blocking
    }
}

/**
 * Reset monthly credits — logs as action_log event
 */
export async function resetMonthlyCredits(userId: string) {
    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'monthly_credit_reset',
            details: { reset_at: Date.now() },
        });
    } catch {
        // Non-blocking
    }
}

/**
 * Check if user has exceeded their daily cost ceiling.
 * Queries action_log for today's token_usage events and sums costs.
 */
export async function checkCostCeiling(userId: string): Promise<{
    allowed: boolean;
    dailySpend: number;
    dailyCeiling: number;
    percentUsed: number;
    warning: boolean;
}> {
    try {
        const account = await getOrCreateBillingAccount(userId);
        const tier = account.plan.toUpperCase() as TierName;
        const config = getTierConfig(tier);

        const dailyCeilingKTokens = config.monthlyTokens / 1000 / 25;

        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: 500,
        });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startTs = startOfDay.getTime();

        const todaysUsage = (logs || []).filter(
            (l: any) => l.event_type === 'token_usage' && l.timestamp >= startTs
        );

        const dailySpend = todaysUsage.reduce(
            (sum: number, l: any) => sum + Math.abs(l.details?.credits_used || 0),
            0
        );

        const percentUsed =
            dailyCeilingKTokens > 0 ? Math.round((dailySpend / dailyCeilingKTokens) * 100) : 0;

        return {
            allowed: dailySpend < dailyCeilingKTokens,
            dailySpend: Math.round(dailySpend * 10) / 10,
            dailyCeiling: Math.round(dailyCeilingKTokens * 10) / 10,
            percentUsed,
            warning: percentUsed >= 80,
        };
    } catch {
        return { allowed: true, dailySpend: 0, dailyCeiling: 999, percentUsed: 0, warning: false };
    }
}

/**
 * Get usage history for user — reads from action_log
 */
export async function getUsageHistory(userId: string, limit?: number) {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: limit || 50,
        });
        return (logs || []).filter(
            (l: any) => l.event_type === 'token_usage' || l.event_type === 'voice_usage'
        );
    } catch {
        return [];
    }
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
 */
export async function getSpendingAlerts(userId: string): Promise<{
    alerts: Array<{ level: 'info' | 'warning' | 'critical'; message: string }>;
}> {
    const account = await getOrCreateBillingAccount(userId);
    const alerts: Array<{ level: 'info' | 'warning' | 'critical'; message: string }> = [];

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

    let logs: any[] = [];
    try {
        const client = getConvexClient();
        const allLogs = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: 1000,
        });
        const resetTs = account.resetDate instanceof Date ? account.resetDate.getTime() : 0;
        logs = (allLogs || []).filter(
            (l: any) => l.event_type === 'token_usage' && l.timestamp >= resetTs
        );
    } catch {
        // empty
    }

    const byModelMap = new Map<
        string,
        { model: string; tokensIn: number; tokensOut: number; totalTokens: number; usdCost: number; requestCount: number }
    >();
    const byDayMap = new Map<
        string,
        { date: string; tokensIn: number; tokensOut: number; totalTokens: number; usdCost: number; requestCount: number }
    >();

    let totalUsdCost = 0;

    for (const log of logs) {
        const d = log.details || {};
        const model = d.model || 'unknown';
        const tokensIn = d.tokens_in || 0;
        const tokensOut = d.tokens_out || 0;
        const usdCost = d.usd_cost || 0;

        totalUsdCost += usdCost;

        if (!byModelMap.has(model)) {
            byModelMap.set(model, { model, tokensIn: 0, tokensOut: 0, totalTokens: 0, usdCost: 0, requestCount: 0 });
        }
        const ms = byModelMap.get(model)!;
        ms.tokensIn += tokensIn;
        ms.tokensOut += tokensOut;
        ms.totalTokens += tokensIn + tokensOut;
        ms.usdCost += usdCost;
        ms.requestCount += 1;

        const date = new Date(log.timestamp).toISOString().split('T')[0];
        if (!byDayMap.has(date)) {
            byDayMap.set(date, { date, tokensIn: 0, tokensOut: 0, totalTokens: 0, usdCost: 0, requestCount: 0 });
        }
        const ds = byDayMap.get(date)!;
        ds.tokensIn += tokensIn;
        ds.tokensOut += tokensOut;
        ds.totalTokens += tokensIn + tokensOut;
        ds.usdCost += usdCost;
        ds.requestCount += 1;
    }

    return {
        byModel: Array.from(byModelMap.values()).sort((a, b) => b.usdCost - a.usdCost),
        byDay: Array.from(byDayMap.values()).sort((a, b) => b.date.localeCompare(a.date)),
        totalUsdCost: Math.round(totalUsdCost * 10000) / 10000,
        billingPeriodStart: account.resetDate,
    };
}

/**
 * Project end-of-month cost based on current usage trend.
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

    const now = new Date();
    const resetDate = new Date(account.resetDate);
    const daysElapsed = Math.max(
        1,
        Math.ceil((now.getTime() - resetDate.getTime()) / (24 * 60 * 60 * 1000))
    );

    const daysRemaining = Math.max(0, 30 - daysElapsed);
    const tokensUsed = account.creditUsed * 1000;
    const dailyAvgTokens = Math.round(tokensUsed / daysElapsed);
    const projectedTokens = tokensUsed + dailyAvgTokens * daysRemaining;
    const tokenLimit = config.monthlyTokens;
    const willExceedLimit = projectedTokens > tokenLimit;

    const costSoFar = await getCostSummary(userId);
    const dailyAvgCost = daysElapsed > 0 ? costSoFar.totalUsdCost / daysElapsed : 0;
    const projectedCostUsd =
        Math.round((costSoFar.totalUsdCost + dailyAvgCost * daysRemaining) * 100) / 100;

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
 * Logs as action_log event instead of separate notification table.
 */
export async function maybeCreateSpendingNotification(userId: string): Promise<void> {
    try {
        const { alerts } = await getSpendingAlerts(userId);
        if (alerts.length === 0) return;

        const importantAlerts = alerts.filter(
            (a) => a.level === 'critical' || a.level === 'warning'
        );
        if (importantAlerts.length === 0) return;

        // Deduplicate: check if we already logged a spending alert today
        const client = getConvexClient();
        const recentLogs = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: 50,
        });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startTs = startOfDay.getTime();

        const existingAlert = (recentLogs || []).find(
            (l: any) => l.event_type === 'spending_alert' && l.timestamp >= startTs
        );
        if (existingAlert) return;

        const topAlert = importantAlerts[0];
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'spending_alert',
            details: {
                level: topAlert.level,
                title: topAlert.level === 'critical' ? 'Usage limit approaching' : 'Usage notice',
                message: topAlert.message,
            },
        });
    } catch {
        // Non-blocking
    }
}

/**
 * Get unit economics for a user
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

    let periodApiCost = 0;
    try {
        const client = getConvexClient();
        const allLogs = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: 1000,
        });
        const resetTs = account.resetDate instanceof Date ? account.resetDate.getTime() : 0;
        const logs = (allLogs || []).filter(
            (l: any) => l.event_type === 'token_usage' && l.timestamp >= resetTs
        );
        for (const log of logs) {
            periodApiCost += log.details?.usd_cost || 0;
        }
    } catch {
        // empty
    }
    periodApiCost = Math.round(periodApiCost * 10000) / 10000;

    const grossMargin = monthlyRevenue - periodApiCost;
    const grossMarginPercent =
        monthlyRevenue > 0 ? Math.round((grossMargin / monthlyRevenue) * 100) : 0;

    const chatsUsed = config.monthlyChats - (account.chatsRemaining || 0);
    const costPerChat = chatsUsed > 0 ? Math.round((periodApiCost / chatsUsed) * 10000) / 10000 : 0;

    const ltv30d = monthlyRevenue;

    let healthStatus: 'profitable' | 'break_even' | 'unprofitable' = 'profitable';
    if (monthlyRevenue === 0 && periodApiCost > 0) {
        healthStatus = 'unprofitable';
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
