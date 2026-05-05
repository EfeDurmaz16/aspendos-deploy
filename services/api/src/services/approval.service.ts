/**
 * Agent Approval Service — backed by Convex
 *
 * Human-in-the-loop approval workflow for sensitive agent operations.
 */

import { canonicalJson, sha256Hex } from '../governance/canonical';
import type { BlastRadiusReport } from '../lib/agent-guards';
import { api, getConvexClient } from '../lib/convex';

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
    const user = await client.query(api.users.getByWorkOSId, { workos_id: userId });
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
        const convexUserId = await resolveConvexUserId(client, decidedBy);
        await client.mutation(api.approvals.approve, {
            id: approvalId as any,
            user_id: convexUserId,
        });
        return { id: approvalId, status: 'approved' as const };
    } catch (error) {
        throw new Error('Failed to persist approval decision', { cause: error });
    }
}

export async function rejectRequest(approvalId: string, decidedBy: string) {
    try {
        const client = getConvexClient();
        const convexUserId = await resolveConvexUserId(client, decidedBy);
        await client.mutation(api.approvals.reject, {
            id: approvalId as any,
            user_id: convexUserId,
        });
        return { id: approvalId, status: 'rejected' as const };
    } catch (error) {
        throw new Error('Failed to persist approval decision', { cause: error });
    }
}

export async function getPendingApprovals(userId: string) {
    try {
        const client = getConvexClient();
        const convexUserId = await resolveConvexUserId(client, userId);
        return await client.query(api.approvals.listPendingByUser, { user_id: convexUserId });
    } catch {
        return [];
    }
}

export async function getApprovalForUser(userId: string, approvalId: string) {
    try {
        const client = getConvexClient();
        const convexUserId = await resolveConvexUserId(client, userId);
        return await client.query(api.approvals.getByIdForUser, {
            id: approvalId as any,
            user_id: convexUserId,
        });
    } catch {
        return null;
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
            user_id: convexUserId,
            tool_name: toolName,
        });
    } catch {
        return false;
    }
}

export async function removeFromAllowlist(userId: string, toolName: string) {
    try {
        const client = getConvexClient();
        const convexUserId = await resolveConvexUserId(client, userId);
        const entries = await client.query(api.toolAllowlist.listByUser, {
            user_id: convexUserId,
        });
        const entry = (entries as any[]).find((e: any) => e.tool_name === toolName);
        if (entry) {
            await client.mutation(api.toolAllowlist.revoke, {
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
        return await client.query(api.toolAllowlist.listByUser, { user_id: convexUserId });
    } catch {
        return [];
    }
}
