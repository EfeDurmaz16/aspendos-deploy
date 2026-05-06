import { createHmac, timingSafeEqual } from 'node:crypto';
import { ConvexHttpClient } from 'convex/browser';
import { NextResponse } from 'next/server';
import { api } from '../../../../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const SIGNATURE_HEADER = 'x-yula-signature';
const TIMESTAMP_HEADER = 'x-yula-timestamp';
const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

interface ApproveRequest {
    commitHash: string;
    action: 'approve' | 'reject';
    platform: string;
    platformUserId: string;
    surfaceMessageId?: string;
}

function isProduction() {
    return process.env.NODE_ENV === 'production';
}

function verifySignature(rawBody: string, request: Request) {
    const secret = process.env.BOT_APPROVAL_WEBHOOK_SECRET;
    if (!secret) {
        return !isProduction();
    }

    const timestamp = request.headers.get(TIMESTAMP_HEADER);
    const signature = request.headers.get(SIGNATURE_HEADER);
    if (!timestamp || !signature) {
        return false;
    }

    const timestampMs = Number(timestamp);
    if (
        !Number.isFinite(timestampMs) ||
        Math.abs(Date.now() - timestampMs) > SIGNATURE_TOLERANCE_MS
    ) {
        return false;
    }

    const expected = `sha256=${createHmac('sha256', secret)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex')}`;

    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature);
    return (
        expectedBuffer.length === actualBuffer.length &&
        timingSafeEqual(expectedBuffer, actualBuffer)
    );
}

/**
 * POST /api/bot/approve
 *
 * Receives approval/rejection from any messaging platform.
 * Updates the Convex approvals table and triggers agent resumption.
 */
export async function POST(request: Request) {
    try {
        const rawBody = await request.text();
        if (!verifySignature(rawBody, request)) {
            return NextResponse.json({ error: 'Invalid approval signature' }, { status: 401 });
        }

        const body: ApproveRequest = JSON.parse(rawBody);
        const { commitHash, action, platform, platformUserId } = body;

        if (!commitHash || !action || !platform || !platformUserId) {
            return NextResponse.json(
                { error: 'Missing commitHash, action, platform, or platformUserId' },
                { status: 400 }
            );
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

        const decision = await convex.mutation(api.approvals.decide, {
            id: approval._id,
            action,
            now: Date.now(),
        });

        if (decision.outcome === 'not_found') {
            return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
        }

        if (decision.outcome === 'already_decided' && !decision.idempotent) {
            return NextResponse.json(
                { error: `Approval already ${decision.status}` },
                { status: 409 }
            );
        }

        if (decision.outcome === 'expired') {
            return NextResponse.json({ error: 'Approval has expired' }, { status: 410 });
        }

        // Log the action
        await convex.mutation(api.actionLog.log, {
            user_id: approval.user_id,
            event_type: `approval.${action}`,
            details: {
                commit_hash: commitHash,
                platform,
                platform_user_id: platformUserId,
                surface_message_id: body.surfaceMessageId,
                idempotent: decision.outcome === 'already_decided',
            },
        });

        if (
            action === 'approve' &&
            process.env.AGENT_RESUME_URL &&
            decision.outcome !== 'already_decided'
        ) {
            fetch(process.env.AGENT_RESUME_URL, {
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
            idempotent: decision.outcome === 'already_decided',
        });
    } catch (error) {
        console.error('[bot/approve] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
