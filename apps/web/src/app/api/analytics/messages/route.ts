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
        const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '30'), 1), 365);
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - (limit - 1));

        const rows = (await prisma.$queryRaw`
            WITH series AS (
                SELECT generate_series(
                    date_trunc('day', ${start}::timestamp),
                    date_trunc('day', ${now}::timestamp),
                    interval '1 day'
                ) AS bucket
            ),
            agg AS (
                SELECT
                    date_trunc('day', "createdAt") AS bucket,
                    SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END)::int AS "userMessages",
                    SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END)::int AS "assistantMessages"
                FROM "Message"
                WHERE "userId" = ${session.userId}
                  AND "createdAt" >= ${start}
                  AND "createdAt" <= ${now}
                GROUP BY 1
            )
            SELECT
                to_char(series.bucket, 'YYYY-MM-DD') AS date,
                COALESCE(agg."userMessages", 0)::int AS "userMessages",
                COALESCE(agg."assistantMessages", 0)::int AS "assistantMessages"
            FROM series
            LEFT JOIN agg USING(bucket)
            ORDER BY series.bucket ASC;
        `) as unknown as Array<{ date: string; userMessages: number; assistantMessages: number }>;

        const data = rows.map((row) => ({
            date: row.date,
            userMessages: row.userMessages,
            assistantMessages: row.assistantMessages,
            total: row.userMessages + row.assistantMessages,
        }));

        return NextResponse.json({ data, limit });
    } catch (error) {
        console.error('Analytics messages error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
