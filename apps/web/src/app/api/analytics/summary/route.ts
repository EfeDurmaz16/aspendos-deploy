import { prisma } from '@aspendos/db';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
    try {
        const session = await auth();

        if (!session?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [totalMessages, totalChats, aggregates, messagesThisMonth] = await Promise.all([
            prisma.message.count({ where: { userId: session.userId } }),
            prisma.chat.count({ where: { userId: session.userId } }),
            prisma.message.aggregate({
                where: { userId: session.userId },
                _sum: { tokensIn: true, tokensOut: true, costUsd: true },
            }),
            prisma.message.count({
                where: { userId: session.userId, createdAt: { gte: startOfMonth, lte: now } },
            }),
        ]);

        const totalTokensIn = aggregates._sum.tokensIn ?? 0;
        const totalTokensOut = aggregates._sum.tokensOut ?? 0;
        const totalCostUsd = aggregates._sum.costUsd ?? 0;

        return NextResponse.json({
            totalMessages,
            totalChats,
            totalTokensIn,
            totalTokensOut,
            totalTokens: totalTokensIn + totalTokensOut,
            totalCostUsd,
            messagesThisMonth,
        });
    } catch (error) {
        console.error('Analytics summary error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
