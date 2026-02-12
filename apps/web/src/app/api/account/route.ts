import { prisma } from '@aspendos/db';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteUserMemories } from '@/lib/services/qdrant';

/**
 * DELETE /api/account
 * GDPR Article 17 - Right to Erasure
 * Permanently deletes all user data including:
 * - Messages, chats, memories
 * - Billing accounts and credit history
 * - Import jobs and entities
 * - PAC reminders and settings
 * - Council sessions
 * - Gamification profile, achievements, XP logs
 * - Notification logs and preferences
 * - Push subscriptions
 * - API keys
 * - Sessions and accounts (Better Auth)
 * - User record itself
 * - Vector embeddings in Qdrant
 */
export async function DELETE() {
    const session = await auth();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Use a transaction to delete all user data atomically
        await prisma.$transaction(async (tx) => {
            // Delete user messages
            await tx.message.deleteMany({
                where: { userId },
            });

            // Delete user chats
            await tx.chat.deleteMany({
                where: { userId },
            });

            // Delete billing account and credit history (cascade will handle creditHistory)
            await tx.billingAccount.deleteMany({
                where: { userId },
            });

            // Delete import entities (must delete before jobs due to foreign key)
            const importJobs = await tx.importJob.findMany({
                where: { userId },
                select: { id: true },
            });
            for (const job of importJobs) {
                await tx.importEntity.deleteMany({
                    where: { jobId: job.id },
                });
            }

            // Delete import jobs
            await tx.importJob.deleteMany({
                where: { userId },
            });

            // Delete PAC escalations (must delete before reminders)
            const pacReminders = await tx.pACReminder.findMany({
                where: { userId },
                select: { id: true },
            });
            for (const reminder of pacReminders) {
                await tx.pACEscalation.deleteMany({
                    where: { reminderId: reminder.id },
                });
            }

            // Delete PAC reminders
            await tx.pACReminder.deleteMany({
                where: { userId },
            });

            // Delete PAC settings
            await tx.pACSettings.deleteMany({
                where: { userId },
            });

            // Delete council responses (must delete before sessions)
            const councilSessions = await tx.councilSession.findMany({
                where: { userId },
                select: { id: true },
            });
            for (const session of councilSessions) {
                await tx.councilResponse.deleteMany({
                    where: { sessionId: session.id },
                });
            }

            // Delete council sessions
            await tx.councilSession.deleteMany({
                where: { userId },
            });

            // Delete gamification achievements and XP logs (must delete before profile)
            const gamificationProfile = await tx.gamificationProfile.findUnique({
                where: { userId },
                select: { id: true },
            });
            if (gamificationProfile) {
                await tx.achievement.deleteMany({
                    where: { profileId: gamificationProfile.id },
                });
                await tx.xPLog.deleteMany({
                    where: { profileId: gamificationProfile.id },
                });
            }

            // Delete gamification profile
            await tx.gamificationProfile.deleteMany({
                where: { userId },
            });

            // Delete notification logs
            await tx.notificationLog.deleteMany({
                where: { userId },
            });

            // Delete notification preferences
            await tx.notificationPreferences.deleteMany({
                where: { userId },
            });

            // Delete push subscriptions
            await tx.pushSubscription.deleteMany({
                where: { userId },
            });

            // Delete API keys
            await tx.apiKey.deleteMany({
                where: { userId },
            });

            // Delete scheduled tasks
            await tx.scheduledTask.deleteMany({
                where: { userId },
            });

            // Delete agents
            await tx.agent.deleteMany({
                where: { userId },
            });

            // Delete memory feedback (must delete before memories)
            const memories = await tx.memory.findMany({
                where: { userId },
                select: { id: true },
            });
            for (const memory of memories) {
                await tx.memoryFeedback.deleteMany({
                    where: { memoryId: memory.id },
                });
            }

            // Delete memories
            await tx.memory.deleteMany({
                where: { userId },
            });

            // Delete passkeys
            await tx.passkey.deleteMany({
                where: { userId },
            });

            // Delete sessions
            await tx.session.deleteMany({
                where: { userId },
            });

            // Delete accounts (OAuth connections)
            await tx.account.deleteMany({
                where: { userId },
            });

            // Finally, delete the user record itself
            await tx.user.delete({
                where: { id: userId },
            });
        });

        // Delete user memories from Qdrant (vector database)
        // This is outside the transaction because it's a separate service
        try {
            await deleteUserMemories(userId);
        } catch (qdrantError) {
            console.error('[DELETE /api/account] Failed to delete Qdrant memories:', qdrantError);
            // Continue even if Qdrant fails - user data in DB is already deleted
        }

        // Audit log for GDPR compliance - record the deletion event
        // This is logged after deletion since the user record no longer exists
        console.info(
            JSON.stringify({
                event: 'account_deleted',
                userId,
                timestamp: new Date().toISOString(),
                ip: '***',
                gdprArticle: '17',
            })
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[DELETE /api/account] Error:', error);
        return NextResponse.json(
            { error: 'Failed to delete account. Please contact support.' },
            { status: 500 }
        );
    }
}
