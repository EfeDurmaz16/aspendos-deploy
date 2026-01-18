import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@aspendos/db'

/**
 * GET /api/user
 * Returns the current user's data including billing information
 */
export async function GET() {
    const session = await auth()

    if (!session?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            include: {
                billingAccount: true,
                _count: {
                    select: {
                        chats: true,
                        memories: true,
                        agents: true,
                    }
                }
            }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json({
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            tier: user.tier,
            billing: user.billingAccount ? {
                plan: user.billingAccount.plan,
                status: user.billingAccount.status,
                billingCycle: user.billingAccount.billingCycle,
                monthlyCredit: user.billingAccount.monthlyCredit,
                creditUsed: user.billingAccount.creditUsed,
                chatsRemaining: user.billingAccount.chatsRemaining,
                voiceMinutesRemaining: user.billingAccount.voiceMinutesRemaining,
                resetDate: user.billingAccount.resetDate,
            } : null,
            stats: {
                totalChats: user._count.chats,
                totalMemories: user._count.memories,
                totalAgents: user._count.agents,
            },
            createdAt: user.createdAt,
        })
    } catch (error) {
        console.error('[API /user] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
