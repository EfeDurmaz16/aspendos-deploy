/**
 * Agent Action Log Service
 *
 * Persistent logging of every agent action for observability and causal tracing.
 * Uses Convex HTTP client for persistence.
 * Adapted from AGIT's hash-chained commit model.
 */

import { getConvexClient, api } from '../lib/convex';
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
    try {
        const client = getConvexClient();
        const id = await client.mutation(api.actionLog.log, {
            user_id: params.userId as any,
            event_type: params.actionType,
            details: {
                sessionId: params.sessionId,
                chatId: params.chatId,
                toolName: params.toolName,
                toolArgs: params.toolArgs,
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

        return id as string;
    } catch (err) {
        console.error('[action-log.service] logAction error:', err);
        return '';
    }
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
    try {
        const client = getConvexClient();
        const all = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: options?.limit ?? 100,
        });

        // Filter by sessionId in JS (Convex action_log doesn't have sessionId index)
        const filtered = (all || []).filter(
            (a: any) => a.details?.sessionId === sessionId
        );

        const offset = options?.offset ?? 0;
        return filtered.slice(offset, offset + (options?.limit ?? 100));
    } catch {
        return [];
    }
}

/**
 * Get the causal chain for an action (trace back through parentActionId).
 * With Convex's simpler schema, we approximate by fetching recent logs and filtering.
 */
export async function getCausalChain(actionId: string, _maxDepth = 20) {
    try {
        const client = getConvexClient();
        const recent = await client.query(api.actionLog.listRecent, { limit: 200 });
        if (!recent) return [];

        // Build lookup map
        const byId = new Map<string, any>();
        for (const entry of recent) {
            byId.set(entry._id, entry);
        }

        // Trace backwards
        const chain: any[] = [];
        let currentId: string | null = actionId;
        for (let i = 0; i < _maxDepth && currentId; i++) {
            const action = byId.get(currentId);
            if (!action) break;
            chain.unshift(action);
            currentId = action.details?.parentActionId ?? null;
        }

        return chain;
    } catch {
        return [];
    }
}

/**
 * Get effects of an action (forward trace through child actions).
 */
export async function getActionEffects(actionId: string, maxDepth = 10) {
    try {
        const client = getConvexClient();
        const recent = await client.query(api.actionLog.listRecent, { limit: 500 });
        if (!recent) return [];

        // Build parent->children map
        const childrenMap = new Map<string, any[]>();
        for (const entry of recent) {
            const parentId = entry.details?.parentActionId;
            if (parentId) {
                if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
                childrenMap.get(parentId)!.push(entry);
            }
        }

        const effects: any[] = [];
        let currentIds = [actionId];

        for (let depth = 0; depth < maxDepth && currentIds.length > 0; depth++) {
            const children: any[] = [];
            for (const id of currentIds) {
                const c = childrenMap.get(id) || [];
                children.push(...c);
            }
            if (children.length === 0) break;
            effects.push(...children);
            currentIds = children.map((c) => c._id);
        }

        return effects;
    } catch {
        return [];
    }
}

/**
 * Get recent actions for a user (for dashboard).
 */
export async function getRecentActions(
    userId: string,
    options?: { limit?: number; toolName?: string }
) {
    try {
        const client = getConvexClient();
        let actions = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: options?.limit ?? 50,
        });

        if (!actions) return [];

        // Filter by toolName in JS if requested
        if (options?.toolName) {
            actions = actions.filter(
                (a: any) => a.details?.toolName === options.toolName
            );
        }

        return actions;
    } catch {
        return [];
    }
}
