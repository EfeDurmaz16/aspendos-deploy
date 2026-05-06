import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getConvexServer } from '@/lib/convex-server';
import { api } from '../../../../../../../convex/_generated/api';
import type { Id } from '../../../../../../../convex/_generated/dataModel';

const SIGNATURE_HEADER = 'x-yula-signature';
const TIMESTAMP_HEADER = 'x-yula-timestamp';
const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

interface ApproveRequest {
    approvalId?: string;
    commitHash?: string;
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

function getConvexServiceSecret() {
    const secret = process.env.CONVEX_SERVICE_SECRET;
    if (!secret) {
        throw new Error('CONVEX_SERVICE_SECRET is not configured');
    }
    return secret;
}

function signedJsonRequestInit(payload: Record<string, unknown>): RequestInit {
    const secret = process.env.BOT_APPROVAL_WEBHOOK_SECRET;
    if (!secret) {
        throw new Error('BOT_APPROVAL_WEBHOOK_SECRET is required to sign agent resume callbacks');
    }

    const body = JSON.stringify(payload);
    const timestamp = Date.now().toString();
    return {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            [TIMESTAMP_HEADER]: timestamp,
            [SIGNATURE_HEADER]: `sha256=${createHmac('sha256', secret)
                .update(`${timestamp}.${body}`)
                .digest('hex')}`,
        },
        body,
    };
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

        let body: ApproveRequest;
        try {
            body = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { approvalId, commitHash, action, platform, platformUserId } = body;

        if ((!approvalId && !commitHash) || !action || !platform || !platformUserId) {
            return NextResponse.json(
                { error: 'Missing approvalId or commitHash, action, platform, or platformUserId' },
                { status: 400 }
            );
        }

        if (action !== 'approve' && action !== 'reject') {
            return NextResponse.json(
                { error: 'Action must be approve or reject' },
                { status: 400 }
            );
        }

        const serviceSecret = getConvexServiceSecret();
        const convex = getConvexServer();
        let id = approvalId as Id<'approvals'> | undefined;

        if (!id) {
            // Legacy fallback for old cards. New approval surfaces must send approvalId so
            // decisions are tied to a single approval row, not a potentially reused commit hash.
            const approvalResolution = await convex.query(
                api.approvals.resolvePendingByCommitHash,
                {
                    service_secret: serviceSecret,
                    commit_hash: commitHash!,
                }
            );

            if (approvalResolution.outcome === 'not_found') {
                return NextResponse.json(
                    { error: 'Approval not found for this commit hash' },
                    { status: 404 }
                );
            }
            if (approvalResolution.outcome === 'ambiguous') {
                return NextResponse.json(
                    {
                        error: 'Multiple pending approvals found for this commit hash; approvalId is required',
                    },
                    { status: 409 }
                );
            }
            id = approvalResolution.approval._id;
        }

        const decision = await convex.mutation(api.approvals.decide, {
            service_secret: serviceSecret,
            id,
            action,
            now: Date.now(),
            audit: {
                platform,
                platform_user_id: platformUserId,
                ...(body.surfaceMessageId === undefined
                    ? {}
                    : { surface_message_id: body.surfaceMessageId }),
            },
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

        const resolvedCommitHash = decision.commit_hash ?? commitHash;
        if (
            action === 'approve' &&
            process.env.AGENT_RESUME_URL &&
            resolvedCommitHash &&
            decision.outcome !== 'already_decided'
        ) {
            fetch(
                process.env.AGENT_RESUME_URL,
                signedJsonRequestInit({ approvalId: id, commitHash: resolvedCommitHash })
            ).catch(() => {
                // Non-critical: agent will poll for approval status
            });
        }

        return NextResponse.json({
            success: true,
            action,
            approvalId: id,
            ...(resolvedCommitHash ? { commitHash: resolvedCommitHash } : {}),
            idempotent: decision.outcome === 'already_decided',
        });
    } catch (error) {
        console.error('[bot/approve] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
