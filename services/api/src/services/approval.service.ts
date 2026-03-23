/**
 * Agent Approval Service
 *
 * Human-in-the-loop approval workflow for sensitive agent operations.
 * Adapted from AGIT's approval.rs and SARDIS's approval_repository.py.
 *
 * Flow:
 * 1. Guard chain returns RequireApproval
 * 2. Create pending approval with TTL (default 5 min)
 * 3. User gets notified (push/in-app)
 * 4. User approves/rejects
 * 5. Agent resumes or adapts
 */

import { prisma } from '@aspendos/db';
import type { BlastRadiusReport } from '../lib/agent-guards';

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================
// TYPES
// ============================================

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

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Create a pending approval request.
 */
export async function createApproval(params: CreateApprovalParams) {
    const ttl = params.ttlMs ?? DEFAULT_TTL_MS;
    const expiresAt = new Date(Date.now() + ttl);

    return prisma.agentApproval.create({
        data: {
            userId: params.userId,
            sessionId: params.sessionId,
            agentId: params.agentId,
            toolName: params.toolName,
            toolArgs: params.toolArgs,
            reason: params.reason,
            blastRadius: params.blastRadius
                ? JSON.parse(JSON.stringify(params.blastRadius))
                : undefined,
            expiresAt,
        },
    });
}

/**
 * Approve a pending approval.
 */
export async function approveRequest(approvalId: string, decidedBy: string) {
    return prisma.agentApproval.update({
        where: { id: approvalId },
        data: {
            status: 'APPROVED',
            decidedBy,
            decidedAt: new Date(),
        },
    });
}

/**
 * Reject a pending approval.
 */
export async function rejectRequest(approvalId: string, decidedBy: string) {
    return prisma.agentApproval.update({
        where: { id: approvalId },
        data: {
            status: 'REJECTED',
            decidedBy,
            decidedAt: new Date(),
        },
    });
}

/**
 * Get pending approvals for a user.
 */
export async function getPendingApprovals(userId: string) {
    // Also expire any past-TTL approvals
    await expireStaleApprovals();

    return prisma.agentApproval.findMany({
        where: { userId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Get a specific approval by ID.
 */
export async function getApproval(approvalId: string) {
    return prisma.agentApproval.findUnique({
        where: { id: approvalId },
    });
}

/**
 * Expire all approvals that have passed their TTL.
 */
export async function expireStaleApprovals() {
    const now = new Date();
    await prisma.agentApproval.updateMany({
        where: {
            status: 'PENDING',
            expiresAt: { lt: now },
        },
        data: { status: 'EXPIRED' },
    });
}

// ============================================
// TOOL ALLOWLIST
// ============================================

/**
 * Add a tool to the user's allowlist.
 */
export async function addToAllowlist(
    userId: string,
    toolName: string,
    scope: 'session' | 'permanent',
    sessionId?: string
) {
    return prisma.toolAllowlist.upsert({
        where: {
            userId_toolName_scope: { userId, toolName, scope },
        },
        update: { sessionId },
        create: {
            userId,
            toolName,
            scope,
            sessionId: scope === 'session' ? sessionId : null,
        },
    });
}

/**
 * Check if a tool is in the user's allowlist.
 */
export async function isToolAllowed(
    userId: string,
    toolName: string,
    sessionId?: string
): Promise<boolean> {
    const permanent = await prisma.toolAllowlist.findFirst({
        where: { userId, toolName, scope: 'permanent' },
    });
    if (permanent) return true;

    if (sessionId) {
        const session = await prisma.toolAllowlist.findFirst({
            where: { userId, toolName, scope: 'session', sessionId },
        });
        if (session) return true;
    }

    return false;
}

/**
 * Remove a tool from the allowlist.
 */
export async function removeFromAllowlist(
    userId: string,
    toolName: string,
    scope?: 'session' | 'permanent'
) {
    if (scope) {
        await prisma.toolAllowlist.deleteMany({
            where: { userId, toolName, scope },
        });
    } else {
        await prisma.toolAllowlist.deleteMany({
            where: { userId, toolName },
        });
    }
}

/**
 * Get all allowlisted tools for a user.
 */
export async function getAllowlist(userId: string) {
    return prisma.toolAllowlist.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
}
