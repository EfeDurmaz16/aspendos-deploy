/**
 * Agent Action Log Service
 *
 * Persistent logging of every agent action for observability and causal tracing.
 * Replaces the in-memory AuditStore ring buffer for agent-specific events.
 * Adapted from AGIT's hash-chained commit model.
 */

// TODO(phase-a-day-3): replaced by Convex — see convex/schema.ts
// import { prisma } from '@aspendos/db';
const prisma = {} as any;

import type { GuardChainResult } from '../lib/agent-guards';

// ============================================
// TYPES
// ============================================

export type ActionType = 'tool_call' | 'llm_response' | 'memory_write' | 'approval_request';

export interface LogActionParams {
    userId: string;
    sessionId: string;
    chatId?: string;
    actionType: ActionType;
    toolName?: string;
    toolArgs?: Record<string, unknown>;
    toolResult?: unknown;
    guardResult?: GuardChainResult;
    parentActionId?: string;
    latencyMs?: number;
    modelUsed?: string;
    tokenCost?: number;
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Log an agent action to the persistent store.
 */
export async function logAction(params: LogActionParams): Promise<string> {
    const record = await prisma.agentActionLog.create({
        data: {
            userId: params.userId,
            sessionId: params.sessionId,
            chatId: params.chatId,
            actionType: params.actionType,
            toolName: params.toolName,
            toolArgs: params.toolArgs ?? undefined,
            toolResult:
                params.toolResult != null
                    ? JSON.parse(JSON.stringify(params.toolResult))
                    : undefined,
            guardDecision: params.guardResult?.decision.type,
            guardWarnings: params.guardResult?.warnings ?? [],
            parentActionId: params.parentActionId,
            blastRadius:
                params.guardResult?.decision.type === 'require_approval'
                    ? (params.guardResult.decision as any).blastRadius
                    : undefined,
            latencyMs: params.latencyMs ?? 0,
            modelUsed: params.modelUsed,
            tokenCost: params.tokenCost ?? 0,
        },
    });

    return record.id;
}

/**
 * Log a tool call with timing.
 */
export async function logToolCall(
    userId: string,
    sessionId: string,
    chatId: string | undefined,
    toolName: string,
    toolArgs: Record<string, unknown>,
    toolResult: unknown,
    guardResult: GuardChainResult,
    parentActionId?: string,
    latencyMs?: number
): Promise<string> {
    return logAction({
        userId,
        sessionId,
        chatId,
        actionType: 'tool_call',
        toolName,
        toolArgs,
        toolResult,
        guardResult,
        parentActionId,
        latencyMs,
    });
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get action log entries for a session.
 */
export async function getSessionActions(
    userId: string,
    sessionId: string,
    options?: { limit?: number; offset?: number }
) {
    return prisma.agentActionLog.findMany({
        where: { userId, sessionId },
        orderBy: { createdAt: 'asc' },
        take: options?.limit ?? 100,
        skip: options?.offset ?? 0,
    });
}

/**
 * Get the causal chain for an action (trace back through parentActionId).
 */
export async function getCausalChain(actionId: string, maxDepth = 20) {
    const chain = [];
    let currentId: string | null = actionId;

    for (let i = 0; i < maxDepth && currentId; i++) {
        const action = await prisma.agentActionLog.findUnique({
            where: { id: currentId },
        });
        if (!action) break;
        chain.unshift(action);
        currentId = action.parentActionId;
    }

    return chain;
}

/**
 * Get effects of an action (forward trace through child actions).
 */
export async function getActionEffects(actionId: string, maxDepth = 10) {
    const effects = [];
    let currentIds = [actionId];

    for (let depth = 0; depth < maxDepth && currentIds.length > 0; depth++) {
        const children = await prisma.agentActionLog.findMany({
            where: { parentActionId: { in: currentIds } },
            orderBy: { createdAt: 'asc' },
        });
        if (children.length === 0) break;
        effects.push(...children);
        currentIds = children.map((c) => c.id);
    }

    return effects;
}

/**
 * Get recent actions for a user (for dashboard).
 */
export async function getRecentActions(
    userId: string,
    options?: { limit?: number; toolName?: string }
) {
    return prisma.agentActionLog.findMany({
        where: {
            userId,
            ...(options?.toolName ? { toolName: options.toolName } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 50,
    });
}
