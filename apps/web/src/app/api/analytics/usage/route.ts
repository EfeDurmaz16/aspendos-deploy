import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const headersList = await headers();
        const session = await auth.api.getSession({
            headers: headersList,
        });

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const interval = searchParams.get('interval') || 'day';
        const limit = parseInt(searchParams.get('limit') || '30');

        // Generate sample data for the last N days
        const data = [];
        const now = new Date();

        for (let i = limit - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);

            const tokensIn = Math.floor(Math.random() * 10000) + 2000;
            const tokensOut = Math.floor(Math.random() * 5000) + 1000;

            data.push({
                date: date.toISOString().split('T')[0],
                tokensIn,
                tokensOut,
                totalTokens: tokensIn + tokensOut,
                costUsd: ((tokensIn * 0.00001) + (tokensOut * 0.00003)).toFixed(4),
                messageCount: Math.floor(Math.random() * 50) + 10,
            });
        }

        return NextResponse.json({ data, interval, limit });
    } catch (error) {
        console.error('Analytics usage error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
