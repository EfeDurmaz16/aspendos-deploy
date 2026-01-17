import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@aspendos/db'

/**
 * GET /api/billing
 * Returns detailed billing information for the current user
 */
export async function GET() {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { clerkId },
            include: {
                billingAccount: {
                    include: {
                        creditHistory: {
                            orderBy: { createdAt: 'desc' },
                            take: 20
                        }
                    }
                }
            }
        })

        if (!user || !user.billingAccount) {
            return NextResponse.json({ error: 'Billing account not found' }, { status: 404 })
        }

        const billing = user.billingAccount

        // Calculate usage percentages
        const tokenUsagePercent = Math.round((billing.creditUsed / billing.monthlyCredit) * 100)
        const chatsUsagePercent = Math.round(((300 - billing.chatsRemaining) / 300) * 100) // Approx based on starter

        // Days until reset
        const now = new Date()
        const resetDate = new Date(billing.resetDate)
        resetDate.setMonth(resetDate.getMonth() + 1) // Next reset is 1 month after last reset
        const daysUntilReset = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

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
                    }
                },
                chats: {
                    remaining: billing.chatsRemaining,
                    percent: 100 - chatsUsagePercent,
                },
                voice: {
                    remaining: billing.voiceMinutesRemaining,
                }
            },

            renewal: {
                date: resetDate.toISOString(),
                daysRemaining: Math.max(0, daysUntilReset),
            },

            subscription: {
                polarCustomerId: billing.polarCustomerId,
                subscriptionId: billing.subscriptionId,
            },

            recentActivity: billing.creditHistory.map((log) => ({
                id: log.id,
                amount: log.amount,
                reason: log.reason,
                metadata: log.metadata,
                createdAt: log.createdAt,
            })),
        })
    } catch (error) {
        console.error('[API /billing] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
