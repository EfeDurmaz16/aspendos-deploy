/**
 * Tool Trust Scoring System
 *
 * Adapted from FIDES trust graph scoring (services/trust-graph/src/services/scoring.ts).
 * Trust is computed from usage history, not stored — follows FIDES pattern where
 * scores are derived from edges/attestations, ensuring transparency.
 *
 * Trust Levels (from FIDES):
 * - NONE (0):      New/unknown tool, always requires approval
 * - LOW (25):      Approved <5 times, warn on sensitive ops
 * - MEDIUM (50):   Established, auto-approve routine ops
 * - HIGH (75):     Highly trusted, auto-approve most ops
 * - ABSOLUTE (100): Core system tools (calculator, current_time)
 *
 * Trust grows via: successful executions, explicit approvals
 * Trust decays via: failures, rejections, anomalous behavior
 * MCP chains: 0.85^depth transitive trust (from FIDES decay model)
 */

import { prisma } from '@aspendos/db';

// ============================================
// TYPES
// ============================================

export enum TrustLevel {
    NONE = 0,
    LOW = 25,
    MEDIUM = 50,
    HIGH = 75,
    ABSOLUTE = 100,
}

export interface ToolTrustScore {
    toolName: string;
    score: number;
    level: keyof typeof TrustLevel;
    approvalCount: number;
    successRate: number;
    totalExecutions: number;
}

// ============================================
// CONSTANTS
// ============================================

/** Built-in tools that start at ABSOLUTE trust */
const BUILTIN_TOOLS = new Set([
    'calculator',
    'current_time',
    'memory_search',
    'searchMemories',
    'getProfile',
]);

/** Transitive trust decay per hop for MCP chains (from FIDES) */
const TRUST_DECAY_PER_HOP = 0.85;

// ============================================
// TRUST COMPUTATION
// ============================================

/**
 * Compute trust score for a tool based on usage history.
 * Score ranges from 0 (NONE) to 100 (ABSOLUTE).
 */
export async function computeToolTrust(userId: string, toolName: string): Promise<ToolTrustScore> {
    // Built-in tools are always ABSOLUTE
    if (BUILTIN_TOOLS.has(toolName)) {
        return {
            toolName,
            score: TrustLevel.ABSOLUTE,
            level: 'ABSOLUTE',
            approvalCount: 0,
            successRate: 1.0,
            totalExecutions: 0,
        };
    }

    // Check permanent allowlist (user explicitly trusts this tool)
    const permanentAllow = await prisma.toolAllowlist.findFirst({
        where: { userId, toolName, scope: 'permanent' },
    });

    // Count successful executions from action log (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [successCount, totalCount] = await Promise.all([
        prisma.agentActionLog.count({
            where: {
                userId,
                toolName,
                actionType: 'tool_call',
                guardDecision: 'allow',
                createdAt: { gte: thirtyDaysAgo },
            },
        }),
        prisma.agentActionLog.count({
            where: {
                userId,
                toolName,
                actionType: 'tool_call',
                createdAt: { gte: thirtyDaysAgo },
            },
        }),
    ]);

    const successRate = totalCount > 0 ? successCount / totalCount : 0;

    // Count approval grants
    const approvalCount = await prisma.agentApproval.count({
        where: { userId, toolName, status: 'APPROVED' },
    });

    // Count rejections (trust penalties)
    const rejectionCount = await prisma.agentApproval.count({
        where: { userId, toolName, status: 'REJECTED' },
    });

    // Compute score
    let score = 0;

    if (permanentAllow) {
        // Permanent allowlist gives base HIGH trust
        score = TrustLevel.HIGH;
    }

    // Usage-based trust building
    if (totalCount >= 20 && successRate >= 0.95) {
        score = Math.max(score, TrustLevel.HIGH);
    } else if (totalCount >= 10 && successRate >= 0.9) {
        score = Math.max(score, TrustLevel.MEDIUM);
    } else if (totalCount >= 3 && successRate >= 0.8) {
        score = Math.max(score, TrustLevel.LOW);
    }

    // Approval-based trust boost
    score += Math.min(25, approvalCount * 5); // Each approval adds 5, capped at 25

    // Rejection-based trust penalty
    score -= rejectionCount * 10;

    // Clamp to valid range
    score = Math.max(TrustLevel.NONE, Math.min(TrustLevel.ABSOLUTE, score));

    return {
        toolName,
        score,
        level: scoreToLevel(score),
        approvalCount,
        successRate,
        totalExecutions: totalCount,
    };
}

/**
 * Compute trust for an MCP tool with transitive decay.
 * MCP tools from untrusted servers start at NONE and decay 0.85^depth.
 */
export function applyMCPDepthDecay(baseTrust: number, depth: number): number {
    if (depth <= 0) return baseTrust;
    return Math.round(baseTrust * TRUST_DECAY_PER_HOP ** depth);
}

/**
 * Check if a tool has sufficient trust for auto-approval.
 * Tools below MEDIUM trust require human approval for sensitive operations.
 */
export function requiresApproval(score: number, isSensitiveOp: boolean): boolean {
    if (score >= TrustLevel.ABSOLUTE) return false;
    if (score >= TrustLevel.HIGH && !isSensitiveOp) return false;
    if (score >= TrustLevel.MEDIUM && !isSensitiveOp) return false;
    return true;
}

// ============================================
// HELPERS
// ============================================

function scoreToLevel(score: number): keyof typeof TrustLevel {
    if (score >= TrustLevel.ABSOLUTE) return 'ABSOLUTE';
    if (score >= TrustLevel.HIGH) return 'HIGH';
    if (score >= TrustLevel.MEDIUM) return 'MEDIUM';
    if (score >= TrustLevel.LOW) return 'LOW';
    return 'NONE';
}
