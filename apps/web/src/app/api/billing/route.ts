import { prisma } from '@aspendos/db';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * GET /api/billing
 * Returns detailed billing information for the current user
 */
export async function GET() {
    const session = await auth();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                billingAccount: {
                    include: {
                        creditHistory: {
                            orderBy: { createdAt: 'desc' },
                            take: 20,
                        },
                    },
                },
            },
        });

        if (!user || !user.billingAccount) {
            return NextResponse.json({ error: 'Billing account not found' }, { status: 404 });
        }

        const billing = user.billingAccount;

        // Tier-based chat limits for accurate usage calculation
        const TIER_CHAT_LIMITS: Record<string, number> = {
            FREE: 100,
            STARTER: 300,
            PRO: 1500,
            ULTRA: 5000,
        };
        const tierChatLimit = TIER_CHAT_LIMITS[user.tier] || 300;

        // Calculate usage percentages
        const tokenUsagePercent = Math.round((billing.creditUsed / billing.monthlyCredit) * 100);
        const chatsUsagePercent = Math.round(
            ((tierChatLimit - billing.chatsRemaining) / tierChatLimit) * 100
        );

        // Days until reset
        const now = new Date();
        const resetDate = new Date(billing.resetDate);
        resetDate.setMonth(resetDate.getMonth() + 1); // Next reset is 1 month after last reset
        const daysUntilReset = Math.ceil(
            (resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        return NextResponse.json({
            plan: billing.plan,
            status: billing.status,
            billingCycle: billing.billingCycle,

            usage: {
                tokens: {
                    used: billing.creditUsed,
                    limit: billing.monthlyCredit,
                    percent: tokenUsagePercent,
                    formatted: {
                        used: `${(billing.creditUsed / 1000).toFixed(1)}M`,
                        limit: `${(billing.monthlyCredit / 1000).toFixed(1)}M`,
                    },
                },
                chats: {
                    remaining: billing.chatsRemaining,
                    percent: 100 - chatsUsagePercent,
                },
                voice: {
                    remaining: billing.voiceMinutesRemaining,
                },
            },

            renewal: {
                date: resetDate.toISOString(),
                daysRemaining: Math.max(0, daysUntilReset),
            },

            subscription: {
                hasSubscription: !!(billing.polarCustomerId && billing.subscriptionId),
            },

            recentActivity: billing.creditHistory.map(
                (log: {
                    id: string;
                    amount: number;
                    reason: string;
                    metadata: unknown;
                    createdAt: Date;
                }) => ({
                    id: log.id,
                    amount: log.amount,
                    reason: log.reason,
                    metadata: log.metadata,
                    createdAt: log.createdAt,
                })
            ),
        });
    } catch (error) {
        console.error('[API /billing] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
