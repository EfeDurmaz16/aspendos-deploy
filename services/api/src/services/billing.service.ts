/**
 * Billing Database Service
 * Handles billing account and credit operations using Prisma.
 */
import { type BillingAccount, prisma, type Tier } from '@aspendos/db';
import { getTierConfig, TIER_CONFIG, type TierName } from '../config/tiers';

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
 * Record token usage
 */
export async function recordTokenUsage(
    userId: string,
    tokensIn: number,
    tokensOut: number,
    modelId: string,
    metadata?: Record<string, unknown>
) {
    const account = await getOrCreateBillingAccount(userId);
    const totalTokens = tokensIn + tokensOut;
    const creditsUsed = totalTokens / 1000; // Store in K tokens

    // Create credit log
    await prisma.creditLog.create({
        data: {
            billingAccountId: account.id,
            amount: Math.round(-creditsUsed), // Negative for usage
            reason: 'model_inference',
            metadata: {
                model: modelId,
                tokens_in: tokensIn,
                tokens_out: tokensOut,
                ...metadata,
            },
        },
    });

    // Update account credit used
    await prisma.billingAccount.update({
        where: { id: account.id },
        data: {
            creditUsed: { increment: creditsUsed },
        },
    });
}

/**
 * Record chat usage
 */
export async function recordChatUsage(userId: string) {
    await prisma.billingAccount.updateMany({
        where: { userId },
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
    const dailyCeilingKTokens = (config.monthlyTokens / 1000) / 25;

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
    const percentUsed = dailyCeilingKTokens > 0 ? Math.round((dailySpend / dailyCeilingKTokens) * 100) : 0;

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
