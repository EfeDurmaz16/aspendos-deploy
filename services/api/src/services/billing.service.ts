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

    // New users start on STARTER
    const starterConfig = getTierConfig('STARTER');

    return prisma.billingAccount.create({
        data: {
            userId,
            plan: 'starter',
            monthlyCredit: starterConfig.monthlyTokens / 1000, // Store in K tokens
            chatsRemaining: starterConfig.monthlyChats,
            voiceMinutesRemaining: starterConfig.dailyVoiceMinutes * 30,
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
        starter: TIER_CONFIG.STARTER,
        pro: TIER_CONFIG.PRO,
        ultra: TIER_CONFIG.ULTRA,
    };
}
