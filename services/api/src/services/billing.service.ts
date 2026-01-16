/**
 * Billing Database Service
 * Handles billing account and credit operations using Prisma.
 */
import { prisma, BillingAccount, Tier } from '@aspendos/db';

const TIER_CREDITS = {
    PRO: 50,      // $50/month
    ULTRA: 120,   // $120/month
    ENTERPRISE: 500,
};

/**
 * Get or create billing account for user
 */
export async function getOrCreateBillingAccount(userId: string): Promise<BillingAccount> {
    const existing = await prisma.billingAccount.findUnique({
        where: { userId },
    });

    if (existing) return existing;

    return prisma.billingAccount.create({
        data: {
            userId,
            plan: 'pro',
            monthlyCredit: TIER_CREDITS.PRO,
        },
    });
}

/**
 * Get billing status for user
 */
export async function getBillingStatus(userId: string) {
    const account = await getOrCreateBillingAccount(userId);

    const remainingCredit = account.monthlyCredit - account.creditUsed;
    const usagePercentage = (account.creditUsed / account.monthlyCredit) * 100;

    return {
        plan: account.plan,
        status: account.status,
        monthlyCredit: account.monthlyCredit,
        creditUsed: account.creditUsed,
        remainingCredit,
        usagePercentage: Math.round(usagePercentage),
        resetDate: account.resetDate,
    };
}

/**
 * Record credit usage
 */
export async function recordUsage(
    userId: string,
    amount: number,
    reason: string,
    metadata?: Record<string, unknown>
) {
    const account = await getOrCreateBillingAccount(userId);

    // Create credit log
    await prisma.creditLog.create({
        data: {
            billingAccountId: account.id,
            amount: -amount, // Negative for usage
            reason,
            metadata,
        },
    });

    // Update account credit used
    await prisma.billingAccount.update({
        where: { id: account.id },
        data: {
            creditUsed: { increment: amount },
        },
    });
}

/**
 * Check if user has sufficient credits
 */
export async function hasCredits(userId: string, amount: number): Promise<boolean> {
    const account = await getOrCreateBillingAccount(userId);
    return (account.monthlyCredit - account.creditUsed) >= amount;
}

/**
 * Upgrade user to new tier
 */
export async function upgradeTier(userId: string, newPlan: 'ultra' | 'enterprise') {
    const credits = newPlan === 'ultra' ? TIER_CREDITS.ULTRA : TIER_CREDITS.ENTERPRISE;

    return prisma.billingAccount.update({
        where: { userId },
        data: {
            plan: newPlan,
            monthlyCredit: credits,
        },
    });
}

/**
 * Reset monthly credits (called by cron job)
 */
export async function resetMonthlyCredits(userId: string) {
    const account = await prisma.billingAccount.findUnique({
        where: { userId },
    });

    if (!account) return;

    const credits = account.plan === 'ultra'
        ? TIER_CREDITS.ULTRA
        : account.plan === 'enterprise'
            ? TIER_CREDITS.ENTERPRISE
            : TIER_CREDITS.PRO;

    return prisma.billingAccount.update({
        where: { userId },
        data: {
            creditUsed: 0,
            monthlyCredit: credits,
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
