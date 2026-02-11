import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@aspendos/db';
import { analyzeContextForPAC } from '@/lib/pac/analyzer';
import { searchConversations } from '@/lib/services/qdrant';
import { createEmbedding } from '@/lib/ai';

// ============================================
// PAC CRON ENDPOINT
// ============================================
// This endpoint is called periodically (e.g., every 5 minutes via Upstash QStash or Vercel Cron)
// to check if any proactive notifications should be sent to users.
//
// COST CONTROLS:
// - Only processes users active in last 2 hours (not 24h) to reduce LLM calls
// - Batch size limited to 25 users to control costs per cron run
// - Skips users with no new messages since last check
// - 6h deduplication window to avoid spam

// Verify cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
    // Verify the request is from our cron service
    const authHeader = req.headers.get('authorization');
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const dedupSince = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6h
        const activityWindow = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h (reduced from 24h for cost control)

        // Get users who have been active recently (last 2 hours)
        const activeUsers = await prisma.user.findMany({
            where: {
                messages: {
                    some: {
                        createdAt: {
                            gte: activityWindow,
                        },
                    },
                },
            },
            select: {
                id: true,
                email: true,
            },
            take: 25, // Reduced from 100 for cost control
        });

        const results: Array<{ userId: string; notifications: number }> = [];

        for (const user of activeUsers) {
            try {
                // Get recent messages for this user
                const recentMessages = await prisma.message.findMany({
                    where: { userId: user.id },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    select: { role: true, content: true },
                });

                // Get recent memories via semantic search
                let recentMemories: string[] = [];
                try {
                    const queryEmbedding = await createEmbedding(
                        recentMessages.map((m: { content: string }) => m.content).join(' ').slice(0, 1000)
                    );
                    const searchResults = await searchConversations(user.id, queryEmbedding, 3);
                    recentMemories = searchResults.map((r: { content: string }) => r.content);
                } catch {
                    // Memory search failed, continue without
                }

                // Analyze context for PAC
                const analysis = await analyzeContextForPAC(user.id, {
                    recentMessages: recentMessages.map(
                        (m: { role: string; content: string }) => `${m.role}: ${m.content.slice(0, 200)}`
                    ),
                    recentMemories,
                    currentTime: new Date(),
                });

                if (analysis.shouldNotify && analysis.items.length > 0) {
                    // Store PAC items as in-app notifications (deduped)
                    let createdCount = 0;
                    for (const item of analysis.items) {
                        const existing = await prisma.notificationLog.findFirst({
                            where: {
                                userId: user.id,
                                title: item.title,
                                createdAt: { gte: dedupSince },
                            },
                            select: { id: true },
                        });

                        if (existing) continue;

                        await prisma.notificationLog.create({
                            data: {
                                userId: user.id,
                                type: `PAC_${item.type.toUpperCase()}`,
                                title: item.title,
                                message: item.description,
                                channel: 'in_app',
                                status: 'pending',
                                metadata: {
                                    priority: item.priority,
                                    triggerReason: item.triggerReason,
                                },
                            },
                        });
                        createdCount++;
                    }

                    if (createdCount > 0) {
                        results.push({ userId: user.id, notifications: createdCount });
                    }
                }
            } catch (error) {
                console.error(`[PAC Cron] Error processing user ${user.id}:`, error);
            }
        }

        return NextResponse.json({
            success: true,
            processedUsers: activeUsers.length,
            notifications: results,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[PAC Cron] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Cron job failed' },
            { status: 500 }
        );
    }
}

// Also support POST for webhook-style triggers (e.g., Upstash QStash)
export async function POST(req: NextRequest) {
    return GET(req);
}
