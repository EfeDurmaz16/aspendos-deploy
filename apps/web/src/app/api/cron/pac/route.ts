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

// Verify cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
    // Verify the request is from our cron service
    const authHeader = req.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[PAC Cron] Starting heartbeat check...');

    try {
        // Get users who have been active recently (last 24 hours)
        const activeUsers = await prisma.user.findMany({
            where: {
                messages: {
                    some: {
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                        },
                    },
                },
            },
            select: {
                id: true,
                email: true,
            },
            take: 100, // Process in batches
        });

        console.log(`[PAC Cron] Found ${activeUsers.length} active users`);

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
                        recentMessages.map((m) => m.content).join(' ').slice(0, 1000)
                    );
                    const searchResults = await searchConversations(user.id, queryEmbedding, 3);
                    recentMemories = searchResults.map((r) => r.content);
                } catch {
                    // Memory search failed, continue without
                }

                // Analyze context for PAC
                const analysis = await analyzeContextForPAC(user.id, {
                    recentMessages: recentMessages.map((m) => `${m.role}: ${m.content.slice(0, 200)}`),
                    recentMemories,
                    currentTime: new Date(),
                });

                if (analysis.shouldNotify && analysis.items.length > 0) {
                    console.log(`[PAC Cron] User ${user.id}: ${analysis.items.length} notifications`);

                    // Store PAC items for delivery
                    // In production, you would push these to a notification queue
                    // For now, we log them
                    for (const item of analysis.items) {
                        console.log(`[PAC] ${item.type.toUpperCase()}: ${item.title}`);
                        console.log(`      ${item.description}`);
                        console.log(`      Priority: ${item.priority}`);
                        console.log(`      Reason: ${item.triggerReason}`);
                    }

                    results.push({ userId: user.id, notifications: analysis.items.length });
                }
            } catch (error) {
                console.error(`[PAC Cron] Error processing user ${user.id}:`, error);
            }
        }

        console.log(`[PAC Cron] Completed. Generated ${results.reduce((acc, r) => acc + r.notifications, 0)} notifications`);

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
