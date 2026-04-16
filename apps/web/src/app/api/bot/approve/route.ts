import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ApproveRequest {
    commitHash: string;
    action: 'approve' | 'reject';
    platform: string;
    platformUserId: string;
    surfaceMessageId?: string;
}

/**
 * POST /api/bot/approve
 *
 * Receives approval/rejection from any messaging platform.
 * Updates the Convex approvals table and triggers agent resumption.
 */
export async function POST(request: Request) {
    try {
        const body: ApproveRequest = await request.json();
        const { commitHash, action, platform, platformUserId } = body;

        if (!commitHash || !action) {
            return NextResponse.json({ error: 'Missing commitHash or action' }, { status: 400 });
        }

        if (action !== 'approve' && action !== 'reject') {
            return NextResponse.json(
                { error: 'Action must be approve or reject' },
                { status: 400 }
            );
        }

        // Look up the approval record by commit hash
        const approval = await convex.query(api.approvals.getByCommitHash, {
            commit_hash: commitHash,
        });

        if (!approval) {
            return NextResponse.json(
                { error: 'Approval not found for this commit hash' },
                { status: 404 }
            );
        }

        if (approval.status !== 'pending') {
            return NextResponse.json(
                { error: `Approval already ${approval.status}` },
                { status: 409 }
            );
        }

        // Check expiration
        if (approval.expires_at < Date.now()) {
            await convex.mutation(api.approvals.expire, { id: approval._id });
            return NextResponse.json({ error: 'Approval has expired' }, { status: 410 });
        }

        // Execute the approval or rejection
        if (action === 'approve') {
            await convex.mutation(api.approvals.approve, { id: approval._id });
        } else {
            await convex.mutation(api.approvals.reject, { id: approval._id });
        }

        // Log the action
        await convex.mutation(api.actionLog.log, {
            event_type: `approval.${action}`,
            details: {
                commit_hash: commitHash,
                platform,
                platform_user_id: platformUserId,
                surface_message_id: body.surfaceMessageId,
            },
        });

        // If approved, trigger agent execution resumption
        if (action === 'approve') {
            // Fire-and-forget: notify the agent service to resume
            fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/agent/resume`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commitHash }),
            }).catch(() => {
                // Non-critical: agent will poll for approval status
            });
        }

        return NextResponse.json({
            success: true,
            action,
            commitHash,
        });
    } catch (error) {
        console.error('[bot/approve] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
