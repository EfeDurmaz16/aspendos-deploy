import { prisma } from '@aspendos/db';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const session = await auth();

        if (!session?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30'), 1), 365);

        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - days);

        const grouped = await prisma.message.groupBy({
            by: ['modelUsed'],
            where: {
                userId: session.userId,
                role: 'assistant',
                modelUsed: { not: null },
                createdAt: { gte: start, lte: now },
            },
            _count: { _all: true },
            _sum: { tokensIn: true, tokensOut: true, costUsd: true },
            orderBy: { _count: { id: 'desc' } },
        });

        const totalCount = grouped.reduce((sum, item) => sum + item._count._all, 0) || 1;

        const data = grouped.map((item) => {
            const tokensIn = item._sum.tokensIn ?? 0;
            const tokensOut = item._sum.tokensOut ?? 0;
            return {
                model: item.modelUsed,
                count: item._count._all,
                tokensIn,
                tokensOut,
                totalTokens: tokensIn + tokensOut,
                costUsd: item._sum.costUsd ?? 0,
                percentage: (item._count._all / totalCount) * 100,
            };
        });

        return NextResponse.json({ data, days });
    } catch (error) {
        console.error('Analytics models error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
