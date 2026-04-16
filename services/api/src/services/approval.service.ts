/**
 * Agent Approval Service — backed by Convex
 *
 * Human-in-the-loop approval workflow for sensitive agent operations.
 */

import type { BlastRadiusReport } from '../lib/agent-guards';
import { getConvexClient, api } from '../lib/convex';

const DEFAULT_TTL_MS = 5 * 60 * 1000;

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

export async function createApproval(params: CreateApprovalParams) {
    const ttl = params.ttlMs ?? DEFAULT_TTL_MS;
    const expiresAt = Date.now() + ttl;
    const commitHash = `approval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
        const client = getConvexClient();
        const id = await client.mutation(api.approvals.create, {
            user_id: params.userId as any,
            commit_hash: commitHash,
            surface: 'api',
            expires_at: expiresAt,
        });
        return { id, commitHash, toolName: params.toolName, status: 'pending' as const, expiresAt };
    } catch {
        return {
            id: commitHash,
            commitHash,
            toolName: params.toolName,
            status: 'pending' as const,
            expiresAt,
        };
    }
}

export async function approveRequest(approvalId: string, _decidedBy: string) {
    try {
        const client = getConvexClient();
        await client.mutation(api.approvals.approve, { id: approvalId as any });
        return { id: approvalId, status: 'approved' as const };
    } catch {
        return { id: approvalId, status: 'approved' as const };
    }
}

export async function rejectRequest(approvalId: string, _decidedBy: string) {
    try {
        const client = getConvexClient();
        await client.mutation(api.approvals.reject, { id: approvalId as any });
        return { id: approvalId, status: 'rejected' as const };
    } catch {
        return { id: approvalId, status: 'rejected' as const };
    }
}

export async function getPendingApprovals(userId: string) {
    try {
        const client = getConvexClient();
        return await client.query(api.approvals.listPendingByUser, { user_id: userId as any });
    } catch {
        return [];
    }
}

export async function getApproval(commitHash: string) {
    try {
        const client = getConvexClient();
        return await client.query(api.approvals.getByCommitHash, { commit_hash: commitHash });
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
        await client.mutation(api.toolAllowlist.grant, {
            user_id: userId as any,
            tool_name: toolName,
        });
    } catch {
        // graceful fallback
    }
}

export async function isToolAllowed(userId: string, toolName: string): Promise<boolean> {
    try {
        const client = getConvexClient();
        return await client.query(api.toolAllowlist.isAllowed, {
            user_id: userId as any,
            tool_name: toolName,
        });
    } catch {
        return false;
    }
}

export async function removeFromAllowlist(userId: string, toolName: string) {
    try {
        const client = getConvexClient();
        const entries = await client.query(api.toolAllowlist.listByUser, {
            user_id: userId as any,
        });
        const entry = (entries as any[]).find((e: any) => e.tool_name === toolName);
        if (entry) {
            await client.mutation(api.toolAllowlist.revoke, { id: entry._id });
        }
    } catch {
        // graceful fallback
    }
}

export async function getAllowlist(userId: string) {
    try {
        const client = getConvexClient();
        return await client.query(api.toolAllowlist.listByUser, { user_id: userId as any });
    } catch {
        return [];
    }
}
