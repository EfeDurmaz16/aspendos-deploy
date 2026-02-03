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
        const days = parseInt(searchParams.get('days') || '30');

        // Sample model usage data
        const models = [
            { model: 'openai/gpt-4o', count: 245, tokensIn: 123456, tokensOut: 67890 },
            { model: 'anthropic/claude-3-5-sonnet', count: 189, tokensIn: 98765, tokensOut: 54321 },
            { model: 'google/gemini-2.0-flash', count: 87, tokensIn: 45678, tokensOut: 23456 },
            { model: 'groq/llama-3.3-70b', count: 56, tokensIn: 34567, tokensOut: 17890 },
        ];

        const totalCount = models.reduce((sum, m) => sum + m.count, 0);

        const data = models.map((m) => ({
            ...m,
            totalTokens: m.tokensIn + m.tokensOut,
            costUsd: ((m.tokensIn * 0.00001) + (m.tokensOut * 0.00003)),
            percentage: (m.count / totalCount) * 100,
        }));

        return NextResponse.json({ data, days });
    } catch (error) {
        console.error('Analytics models error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
