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
        const limit = parseInt(searchParams.get('limit') || '30');

        // Generate sample data for the last N days
        const data = [];
        const now = new Date();

        for (let i = limit - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);

            const userMessages = Math.floor(Math.random() * 30) + 5;
            const assistantMessages = Math.floor(Math.random() * 30) + 5;

            data.push({
                date: date.toISOString().split('T')[0],
                userMessages,
                assistantMessages,
                total: userMessages + assistantMessages,
            });
        }

        return NextResponse.json({ data, limit });
    } catch (error) {
        console.error('Analytics messages error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
