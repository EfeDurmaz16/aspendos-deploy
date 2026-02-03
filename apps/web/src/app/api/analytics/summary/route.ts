import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const headersList = await headers();
        const session = await auth.api.getSession({
            headers: headersList,
        });

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // In production, this would query the database
        // For now, return sample data
        const summary = {
            totalMessages: 1247,
            totalChats: 89,
            totalTokensIn: 456789,
            totalTokensOut: 234567,
            totalTokens: 691356,
            totalCostUsd: 12.45,
            messagesThisMonth: 342,
        };

        return NextResponse.json(summary);
    } catch (error) {
        console.error('Analytics summary error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
