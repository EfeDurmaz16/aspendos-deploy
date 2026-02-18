/**
 * Feedback & NPS routes - /api/feedback/*
 */
import { Hono } from 'hono';
import { auditLog } from '../lib/audit-log';

const adminUserIds = new Set(
    (process.env.ADMIN_USER_IDS || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
);

function isAdminUser(userId: string | null): boolean {
    return !!userId && adminUserIds.has(userId);
}

const feedbackRoutes = new Hono();

// POST /nps - Submit NPS score (PMF Measurement)
feedbackRoutes.post('/nps', async (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    try {
        const body = await c.req.json();
        const score = Number(body.score);
        const comment = typeof body.comment === 'string' ? body.comment.slice(0, 1000) : '';

        if (!Number.isInteger(score) || score < 0 || score > 10) {
            return c.json({ error: 'Score must be an integer between 0 and 10' }, 400);
        }

        const { prisma } = await import('../lib/prisma');

        // Rate limit: 1 NPS per user per day
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const existing = await prisma.notificationLog.findFirst({
            where: { userId, type: 'NPS_RESPONSE', createdAt: { gte: startOfDay } },
        });
        if (existing) {
            return c.json({ error: 'Already submitted NPS today' }, 429);
        }

        // Store as notification record (reusing existing table)
        await prisma.notificationLog.create({
            data: {
                userId,
                type: 'NPS_RESPONSE',
                title: `NPS: ${score}`,
                message: comment || `Score: ${score}/10`,
                channel: 'in_app',
                status: 'delivered',
                deliveredAt: new Date(),
                readAt: new Date(), // Not a user-facing notification
                metadata: { score, comment, submittedAt: new Date().toISOString() },
            },
        });

        await auditLog({ userId, action: 'NPS_SUBMIT', resource: 'feedback', metadata: { score } });

        return c.json({ success: true, score });
    } catch (error) {
        console.error('[NPS] Submission failed:', error);
        return c.json({ error: 'Failed to submit feedback' }, 500);
    }
});

// GET /nps/summary - Aggregate NPS score (admin only)
feedbackRoutes.get('/nps/summary', async (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!isAdminUser(userId)) return c.json({ error: 'Forbidden' }, 403);

    try {
        const { prisma } = await import('../lib/prisma');

        const responses = await prisma.notificationLog.findMany({
            where: { type: 'NPS_RESPONSE' },
            select: { metadata: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1000,
        });

        let promoters = 0;
        let passives = 0;
        let detractors = 0;
        const scores: number[] = [];

        for (const r of responses) {
            const meta = r.metadata as { score?: number } | null;
            const score = meta?.score;
            if (typeof score !== 'number') continue;
            scores.push(score);
            if (score >= 9) promoters++;
            else if (score >= 7) passives++;
            else detractors++;
        }

        const total = promoters + passives + detractors;
        const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

        return c.json({
            npsScore,
            totalResponses: total,
            distribution: { promoters, passives, detractors },
            avgScore:
                scores.length > 0
                    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
                    : 0,
        });
    } catch (error) {
        console.error('[NPS] Summary failed:', error);
        return c.json({ error: 'Failed to fetch NPS summary' }, 500);
    }
});

export default feedbackRoutes;
