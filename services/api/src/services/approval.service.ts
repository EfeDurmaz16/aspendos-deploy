/**
 * Agent Approval Service — backed by Convex
 *
 * Human-in-the-loop approval workflow for sensitive agent operations.
 */

import { canonicalJson, sha256Hex } from '../governance/canonical';
import type { BlastRadiusReport } from '../lib/agent-guards';
import { api, getConvexClient, getConvexServiceSecret } from '../lib/convex';

const DEFAULT_TTL_MS = 5 * 60 * 1000;
type ConvexClient = ReturnType<typeof getConvexClient>;

export interface CreateApprovalParams {
    userId: string;
    sessionId: string;
    agentId?: string;
    toolName: string;
    toolArgs: Record<string, unknown>;
    reason: string;
    blastRadius?: BlastRadiusReport;
    ttlMs?: number;
}

async function resolveConvexUserId(client: ConvexClient, userId: string) {
    const user = await client.query(api.users.getByWorkOSId, {
        service_secret: getConvexServiceSecret(),
        workos_id: userId,
    });
    if (!user?._id) {
        throw new Error('Authenticated user is not provisioned in Convex');
    }
    return user._id;
}

async function createApprovalCommitHash(params: CreateApprovalParams): Promise<string> {
    const digest = await sha256Hex(
        canonicalJson({
            agentId: params.agentId ?? null,
            blastRadius: params.blastRadius ?? null,
            reason: params.reason,
            sessionId: params.sessionId,
            toolArgs: params.toolArgs,
            toolName: params.toolName,
            userId: params.userId,
        })
    );

    return `approval_${digest.slice(0, 40)}`;
}

export async function createApproval(params: CreateApprovalParams) {
    const ttl = params.ttlMs ?? DEFAULT_TTL_MS;
    const expiresAt = Date.now() + ttl;
    const commitHash = await createApprovalCommitHash(params);

    try {
        const client = getConvexClient();
        const convexUserId = await resolveConvexUserId(client, params.userId);
        const id = await client.mutation(api.approvals.create, {
            service_secret: getConvexServiceSecret(),
            user_id: convexUserId,
            commit_hash: commitHash,
            surface: 'api',
            expires_at: expiresAt,
        });
        return { id, commitHash, toolName: params.toolName, status: 'pending' as const, expiresAt };
    } catch (error) {
        throw new Error('Failed to persist approval request', { cause: error });
    }
}

export async function approveRequest(approvalId: string, decidedBy: string) {
    try {
        const client = getConvexClient();
        await resolveConvexUserId(client, decidedBy);
        const decision = await client.mutation(api.approvals.decide, {
            service_secret: getConvexServiceSecret(),
            id: approvalId as any,
            action: 'approve',
            now: Date.now(),
            audit: {
                platform: 'api',
                platform_user_id: decidedBy,
            },
        });
        if (decision.outcome === 'not_found') {
            throw new Error('Approval not found');
        }
        if (decision.outcome === 'expired') {
            throw new Error('Approval has expired');
        }
        if (decision.outcome === 'already_decided' && !decision.idempotent) {
            throw new Error(`Approval already ${decision.status}`);
        }
        return { id: approvalId, status: 'approved' as const };
    } catch (error) {
        throw new Error('Failed to persist approval decision', { cause: error });
    }
}

export async function rejectRequest(approvalId: string, decidedBy: string) {
    try {
        const client = getConvexClient();
        await resolveConvexUserId(client, decidedBy);
        const decision = await client.mutation(api.approvals.decide, {
            service_secret: getConvexServiceSecret(),
            id: approvalId as any,
            action: 'reject',
            now: Date.now(),
            audit: {
                platform: 'api',
                platform_user_id: decidedBy,
            },
        });
        if (decision.outcome === 'not_found') {
            throw new Error('Approval not found');
        }
        if (decision.outcome === 'expired') {
            throw new Error('Approval has expired');
        }
        if (decision.outcome === 'already_decided' && !decision.idempotent) {
            throw new Error(`Approval already ${decision.status}`);
        }
        return { id: approvalId, status: 'rejected' as const };
    } catch (error) {
        throw new Error('Failed to persist approval decision', { cause: error });
    }
}

export async function getPendingApprovals(userId: string) {
    try {
        const client = getConvexClient();
        const convexUserId = await resolveConvexUserId(client, userId);
        return await client.query(api.approvals.listPendingByUser, {
            service_secret: getConvexServiceSecret(),
            user_id: convexUserId,
        });
    } catch (error) {
        throw new Error('Failed to load pending approvals', { cause: error });
    }
}

export async function getApprovalForUser(userId: string, approvalId: string) {
    try {
        const client = getConvexClient();
        const convexUserId = await resolveConvexUserId(client, userId);
        return await client.query(api.approvals.getByIdForUser, {
            service_secret: getConvexServiceSecret(),
            id: approvalId as any,
            user_id: convexUserId,
        });
    } catch (error) {
        throw new Error('Failed to load approval request', { cause: error });
    }
}

export async function addToAllowlist(
    userId: string,
    toolName: string,
    _scope: 'session' | 'permanent'
) {
    try {
        const client = getConvexClient();
        const convexUserId = await resolveConvexUserId(client, userId);
        await client.mutation(api.toolAllowlist.grant, {
            service_secret: getConvexServiceSecret(),
            user_id: convexUserId,
            tool_name: toolName,
        });
    } catch (error) {
        throw new Error('Failed to persist tool allowlist grant', { cause: error });
    }
}

export async function isToolAllowed(userId: string, toolName: string): Promise<boolean> {
    try {
        const client = getConvexClient();
        const convexUserId = await resolveConvexUserId(client, userId);
        return await client.query(api.toolAllowlist.isAllowed, {
            service_secret: getConvexServiceSecret(),
            user_id: convexUserId,
            tool_name: toolName,
        });
    } catch (error) {
        throw new Error('Failed to check tool allowlist', { cause: error });
    }
}

export async function removeFromAllowlist(userId: string, toolName: string) {
    try {
        const client = getConvexClient();
        const convexUserId = await resolveConvexUserId(client, userId);
        const entries = await client.query(api.toolAllowlist.listByUser, {
            service_secret: getConvexServiceSecret(),
            user_id: convexUserId,
        });
        const entry = (entries as any[]).find((e: any) => e.tool_name === toolName);
        if (entry) {
            await client.mutation(api.toolAllowlist.revoke, {
                service_secret: getConvexServiceSecret(),
                id: entry._id,
                user_id: convexUserId,
            });
        }
    } catch (error) {
        throw new Error('Failed to persist tool allowlist revoke', { cause: error });
    }
}

export async function getAllowlist(userId: string) {
    try {
        const client = getConvexClient();
        const convexUserId = await resolveConvexUserId(client, userId);
        return await client.query(api.toolAllowlist.listByUser, {
            service_secret: getConvexServiceSecret(),
            user_id: convexUserId,
        });
    } catch (error) {
        throw new Error('Failed to load tool allowlist', { cause: error });
    }
}
