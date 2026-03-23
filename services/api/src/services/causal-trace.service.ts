/**
 * Causal Tracing Service
 *
 * Answers "why did the agent do X?" via causal graph traversal.
 * Adapted from AGIT's causal.rs — simplified to use parentActionId chain
 * in PostgreSQL instead of merkle diff.
 *
 * Causal Relations (from AGIT):
 * - DirectParent: action directly triggered by parent
 * - StateDependent: action depends on state from another action
 * - Rollback: action reverts a previous action
 */

import { prisma } from '@aspendos/db';

// ============================================
// TYPES
// ============================================

export interface CausalNode {
    id: string;
    actionType: string;
    toolName: string | null;
    guardDecision: string | null;
    latencyMs: number;
    createdAt: Date;
    depth: number;
}

export interface CausalPath {
    nodes: CausalNode[];
    totalLatencyMs: number;
    depth: number;
}

// ============================================
// CAUSAL GRAPH OPERATIONS
// ============================================

/**
 * Get the full causal chain for an action (backward trace through parentActionId).
 * Returns the chain from root to the given action.
 */
export async function getCausalChain(actionId: string, maxDepth = 20): Promise<CausalPath> {
    const nodes: CausalNode[] = [];
    let currentId: string | null = actionId;
    let totalLatency = 0;

    for (let depth = 0; depth < maxDepth && currentId; depth++) {
        const action = await prisma.agentActionLog.findUnique({
            where: { id: currentId },
            select: {
                id: true,
                actionType: true,
                toolName: true,
                guardDecision: true,
                latencyMs: true,
                createdAt: true,
                parentActionId: true,
            },
        });
        if (!action) break;

        nodes.unshift({
            id: action.id,
            actionType: action.actionType,
            toolName: action.toolName,
            guardDecision: action.guardDecision,
            latencyMs: action.latencyMs,
            createdAt: action.createdAt,
            depth,
        });
        totalLatency += action.latencyMs;
        currentId = action.parentActionId;
    }

    return { nodes, totalLatencyMs: totalLatency, depth: nodes.length };
}

/**
 * Get effects of an action (forward trace through child actions).
 * BFS traversal to find all downstream actions.
 */
export async function getEffects(actionId: string, maxDepth = 10): Promise<CausalNode[]> {
    const effects: CausalNode[] = [];
    let currentIds = [actionId];

    for (let depth = 1; depth <= maxDepth && currentIds.length > 0; depth++) {
        const children = await prisma.agentActionLog.findMany({
            where: { parentActionId: { in: currentIds } },
            select: {
                id: true,
                actionType: true,
                toolName: true,
                guardDecision: true,
                latencyMs: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });
        if (children.length === 0) break;

        for (const child of children) {
            effects.push({ ...child, depth });
        }
        currentIds = children.map((c) => c.id);
    }

    return effects;
}

/**
 * Get the critical path for a session — the longest chain of dependent actions.
 * This identifies the bottleneck in agent execution.
 */
export async function getCriticalPath(userId: string, sessionId: string): Promise<CausalPath> {
    // Get all actions in the session
    const actions = await prisma.agentActionLog.findMany({
        where: { userId, sessionId },
        select: {
            id: true,
            actionType: true,
            toolName: true,
            guardDecision: true,
            latencyMs: true,
            createdAt: true,
            parentActionId: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    if (actions.length === 0) {
        return { nodes: [], totalLatencyMs: 0, depth: 0 };
    }

    // Build adjacency map
    const childrenOf = new Map<string, string[]>();
    const actionMap = new Map(actions.map((a) => [a.id, a]));

    for (const action of actions) {
        if (action.parentActionId) {
            const children = childrenOf.get(action.parentActionId) || [];
            children.push(action.id);
            childrenOf.set(action.parentActionId, children);
        }
    }

    // Find root nodes (no parent or parent outside session)
    const roots = actions.filter((a) => !a.parentActionId || !actionMap.has(a.parentActionId));

    // DFS to find the longest path
    let longestPath: CausalNode[] = [];
    let longestLatency = 0;

    function dfs(nodeId: string, path: CausalNode[], totalLatency: number, depth: number) {
        const action = actionMap.get(nodeId);
        if (!action) return;

        const node: CausalNode = {
            id: action.id,
            actionType: action.actionType,
            toolName: action.toolName,
            guardDecision: action.guardDecision,
            latencyMs: action.latencyMs,
            createdAt: action.createdAt,
            depth,
        };
        path.push(node);
        const newLatency = totalLatency + action.latencyMs;

        const children = childrenOf.get(nodeId) || [];
        if (children.length === 0) {
            // Leaf node — check if this is the longest path
            if (newLatency > longestLatency) {
                longestLatency = newLatency;
                longestPath = [...path];
            }
        } else {
            for (const childId of children) {
                dfs(childId, path, newLatency, depth + 1);
            }
        }

        path.pop();
    }

    for (const root of roots) {
        dfs(root.id, [], 0, 0);
    }

    return {
        nodes: longestPath,
        totalLatencyMs: longestLatency,
        depth: longestPath.length,
    };
}

/**
 * Get a summary of agent actions for a session (for dashboard).
 */
export async function getSessionSummary(userId: string, sessionId: string) {
    const actions = await prisma.agentActionLog.findMany({
        where: { userId, sessionId },
        select: {
            actionType: true,
            toolName: true,
            guardDecision: true,
            latencyMs: true,
        },
    });

    const toolCalls = actions.filter((a) => a.actionType === 'tool_call');
    const blocked = actions.filter((a) => a.guardDecision === 'block');
    const approvalRequired = actions.filter((a) => a.guardDecision === 'require_approval');
    const totalLatency = actions.reduce((sum, a) => sum + a.latencyMs, 0);

    const toolUsage: Record<string, number> = {};
    for (const a of toolCalls) {
        if (a.toolName) {
            toolUsage[a.toolName] = (toolUsage[a.toolName] || 0) + 1;
        }
    }

    return {
        totalActions: actions.length,
        toolCalls: toolCalls.length,
        blockedActions: blocked.length,
        approvalRequests: approvalRequired.length,
        totalLatencyMs: totalLatency,
        avgLatencyMs: actions.length > 0 ? Math.round(totalLatency / actions.length) : 0,
        toolUsage,
    };
}
