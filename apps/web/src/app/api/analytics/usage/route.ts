import { prisma } from '@aspendos/db';
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const session = await auth();

        if (!session?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const intervalParam = (searchParams.get('interval') || 'day').toLowerCase();
        const interval = intervalParam === 'week' || intervalParam === 'month' ? intervalParam : 'day';
        const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '30'), 1), 365);

        const now = new Date();
        const start = new Date(now);
        if (interval === 'month') start.setMonth(start.getMonth() - (limit - 1));
        else if (interval === 'week') start.setDate(start.getDate() - (limit - 1) * 7);
        else start.setDate(start.getDate() - (limit - 1));

        // Use parameterized queries to prevent SQL injection
        let rows: Array<{
            date: string;
            tokensIn: number;
            tokensOut: number;
            totalTokens: number;
            costUsd: number;
            messageCount: number;
        }>;

        if (interval === 'week') {
            rows = await prisma.$queryRaw`
                WITH series AS (
                    SELECT generate_series(
                        date_trunc('week', ${start}::timestamp),
                        date_trunc('week', ${now}::timestamp),
                        interval '1 week'
                    ) AS bucket
                ),
                agg AS (
                    SELECT
                        date_trunc('week', "createdAt") AS bucket,
                        COALESCE(SUM("tokensIn"), 0)::int AS "tokensIn",
                        COALESCE(SUM("tokensOut"), 0)::int AS "tokensOut",
                        COALESCE(SUM("tokensIn" + "tokensOut"), 0)::int AS "totalTokens",
                        COALESCE(SUM("costUsd"), 0)::double precision AS "costUsd",
                        COUNT(*)::int AS "messageCount"
                    FROM "Message"
                    WHERE "userId" = ${session.userId}
                      AND "createdAt" >= ${start}
                      AND "createdAt" <= ${now}
                    GROUP BY 1
                )
                SELECT
                    to_char(series.bucket, 'YYYY-MM-DD') AS date,
                    COALESCE(agg."tokensIn", 0)::int AS "tokensIn",
                    COALESCE(agg."tokensOut", 0)::int AS "tokensOut",
                    COALESCE(agg."totalTokens", 0)::int AS "totalTokens",
                    COALESCE(agg."costUsd", 0)::double precision AS "costUsd",
                    COALESCE(agg."messageCount", 0)::int AS "messageCount"
                FROM series
                LEFT JOIN agg USING(bucket)
                ORDER BY series.bucket ASC;
            `;
        } else if (interval === 'month') {
            rows = await prisma.$queryRaw`
                WITH series AS (
                    SELECT generate_series(
                        date_trunc('month', ${start}::timestamp),
                        date_trunc('month', ${now}::timestamp),
                        interval '1 month'
                    ) AS bucket
                ),
                agg AS (
                    SELECT
                        date_trunc('month', "createdAt") AS bucket,
                        COALESCE(SUM("tokensIn"), 0)::int AS "tokensIn",
                        COALESCE(SUM("tokensOut"), 0)::int AS "tokensOut",
                        COALESCE(SUM("tokensIn" + "tokensOut"), 0)::int AS "totalTokens",
                        COALESCE(SUM("costUsd"), 0)::double precision AS "costUsd",
                        COUNT(*)::int AS "messageCount"
                    FROM "Message"
                    WHERE "userId" = ${session.userId}
                      AND "createdAt" >= ${start}
                      AND "createdAt" <= ${now}
                    GROUP BY 1
                )
                SELECT
                    to_char(series.bucket, 'YYYY-MM-DD') AS date,
                    COALESCE(agg."tokensIn", 0)::int AS "tokensIn",
                    COALESCE(agg."tokensOut", 0)::int AS "tokensOut",
                    COALESCE(agg."totalTokens", 0)::int AS "totalTokens",
                    COALESCE(agg."costUsd", 0)::double precision AS "costUsd",
                    COALESCE(agg."messageCount", 0)::int AS "messageCount"
                FROM series
                LEFT JOIN agg USING(bucket)
                ORDER BY series.bucket ASC;
            `;
        } else {
            rows = await prisma.$queryRaw`
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
                        COALESCE(SUM("tokensIn"), 0)::int AS "tokensIn",
                        COALESCE(SUM("tokensOut"), 0)::int AS "tokensOut",
                        COALESCE(SUM("tokensIn" + "tokensOut"), 0)::int AS "totalTokens",
                        COALESCE(SUM("costUsd"), 0)::double precision AS "costUsd",
                        COUNT(*)::int AS "messageCount"
                    FROM "Message"
                    WHERE "userId" = ${session.userId}
                      AND "createdAt" >= ${start}
                      AND "createdAt" <= ${now}
                    GROUP BY 1
                )
                SELECT
                    to_char(series.bucket, 'YYYY-MM-DD') AS date,
                    COALESCE(agg."tokensIn", 0)::int AS "tokensIn",
                    COALESCE(agg."tokensOut", 0)::int AS "tokensOut",
                    COALESCE(agg."totalTokens", 0)::int AS "totalTokens",
                    COALESCE(agg."costUsd", 0)::double precision AS "costUsd",
                    COALESCE(agg."messageCount", 0)::int AS "messageCount"
                FROM series
                LEFT JOIN agg USING(bucket)
                ORDER BY series.bucket ASC;
            `;
        }

        const data = rows.map((row) => ({
            ...row,
            costUsd: row.costUsd.toFixed(4),
        }));

        return NextResponse.json({ data, interval, limit });
    } catch (error) {
        console.error('Analytics usage error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
