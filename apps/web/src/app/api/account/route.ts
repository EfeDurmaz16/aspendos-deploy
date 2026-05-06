export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const ACCOUNT_DELETION_DISABLED = {
    error: 'Account deletion is not wired to external memory erasure',
    detail: 'Refusing to report GDPR erasure success until Convex/SuperMemory deletion is connected.',
};

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
 * - Sessions and accounts
 * - User record itself
 * - Vector embeddings
 */
export async function DELETE() {
    const session = await auth();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(ACCOUNT_DELETION_DISABLED, { status: 501 });
}
