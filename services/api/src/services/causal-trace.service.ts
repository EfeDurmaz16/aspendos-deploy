/**
 * Causal Tracing Service
 *
 * Answers "why did the agent do X?" via causal graph traversal.
 * Adapted from AGIT's causal.rs — simplified to use parentActionId chain
 * in action_log instead of merkle diff.
 *
 * Backed by Convex action_log.
 *
 * Causal Relations (from AGIT):
 * - DirectParent: action directly triggered by parent
 * - StateDependent: action depends on state from another action
 * - Rollback: action reverts a previous action
 */

import { getConvexClient, api } from '../lib/convex';

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
    try {
        const client = getConvexClient();
        const allLogs = await client.query(api.actionLog.listRecent, { limit: 2000 });

        // Build a lookup map by action id (stored in details)
        const logMap = new Map<string, (typeof allLogs)[0]>();
        for (const log of allLogs) {
            const id = (log.details?.actionId as string) || (log._id as string);
            logMap.set(id, log);
        }

        const nodes: CausalNode[] = [];
        let currentId: string | null = actionId;
        let totalLatency = 0;

        for (let depth = 0; depth < maxDepth && currentId; depth++) {
            const action = logMap.get(currentId);
            if (!action) break;

            const latencyMs = (action.details?.latencyMs as number) || 0;
            nodes.unshift({
                id: currentId,
                actionType: action.event_type,
                toolName: (action.details?.toolName as string) || null,
                guardDecision: (action.details?.guardDecision as string) || null,
                latencyMs,
                createdAt: new Date(action.timestamp),
                depth,
            });
            totalLatency += latencyMs;
            currentId = (action.details?.parentActionId as string) || null;
        }

        return { nodes, totalLatencyMs: totalLatency, depth: nodes.length };
    } catch (error) {
        console.error('[CausalTrace] getCausalChain failed:', error);
        return { nodes: [], totalLatencyMs: 0, depth: 0 };
    }
}

/**
 * Get effects of an action (forward trace through child actions).
 * BFS traversal to find all downstream actions.
 */
export async function getEffects(actionId: string, maxDepth = 10): Promise<CausalNode[]> {
    try {
        const client = getConvexClient();
        const allLogs = await client.query(api.actionLog.listRecent, { limit: 2000 });

        // Build parent -> children map
        const childrenOf = new Map<string, (typeof allLogs)[0][]>();
        for (const log of allLogs) {
            const parentId = log.details?.parentActionId as string;
            if (parentId) {
                if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
                childrenOf.get(parentId)!.push(log);
            }
        }

        const effects: CausalNode[] = [];
        let currentIds = [actionId];

        for (let depth = 1; depth <= maxDepth && currentIds.length > 0; depth++) {
            const nextIds: string[] = [];
            for (const id of currentIds) {
                const children = childrenOf.get(id) || [];
                for (const child of children) {
                    const childId = (child.details?.actionId as string) || (child._id as string);
                    effects.push({
                        id: childId,
                        actionType: child.event_type,
                        toolName: (child.details?.toolName as string) || null,
                        guardDecision: (child.details?.guardDecision as string) || null,
                        latencyMs: (child.details?.latencyMs as number) || 0,
                        createdAt: new Date(child.timestamp),
                        depth,
                    });
                    nextIds.push(childId);
                }
            }
            currentIds = nextIds;
            if (currentIds.length === 0) break;
        }

        return effects;
    } catch (error) {
        console.error('[CausalTrace] getEffects failed:', error);
        return [];
    }
}

/**
 * Get the critical path for a session — the longest chain of dependent actions.
 * This identifies the bottleneck in agent execution.
 */
export async function getCriticalPath(userId: string, sessionId: string): Promise<CausalPath> {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: 2000,
        });

        // Filter to session actions
        const actions = logs
            .filter((l) => l.details?.sessionId === sessionId)
            .sort((a, b) => a.timestamp - b.timestamp);

        if (actions.length === 0) {
            return { nodes: [], totalLatencyMs: 0, depth: 0 };
        }

        // Build adjacency map
        const childrenOf = new Map<string, string[]>();
        const actionMap = new Map<string, (typeof actions)[0]>();

        for (const action of actions) {
            const id = (action.details?.actionId as string) || (action._id as string);
            actionMap.set(id, action);
            const parentId = action.details?.parentActionId as string;
            if (parentId) {
                const children = childrenOf.get(parentId) || [];
                children.push(id);
                childrenOf.set(parentId, children);
            }
        }

        // Find root nodes (no parent or parent outside session)
        const roots = actions.filter((a) => {
            const parentId = a.details?.parentActionId as string;
            return !parentId || !actionMap.has(parentId);
        });

        // DFS to find the longest path
        let longestPath: CausalNode[] = [];
        let longestLatency = 0;

        function dfs(nodeId: string, path: CausalNode[], totalLatency: number, depth: number) {
            const action = actionMap.get(nodeId);
            if (!action) return;

            const latencyMs = (action.details?.latencyMs as number) || 0;
            const node: CausalNode = {
                id: nodeId,
                actionType: action.event_type,
                toolName: (action.details?.toolName as string) || null,
                guardDecision: (action.details?.guardDecision as string) || null,
                latencyMs,
                createdAt: new Date(action.timestamp),
                depth,
            };
            path.push(node);
            const newLatency = totalLatency + latencyMs;

            const children = childrenOf.get(nodeId) || [];
            if (children.length === 0) {
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
            const rootId = (root.details?.actionId as string) || (root._id as string);
            dfs(rootId, [], 0, 0);
        }

        return {
            nodes: longestPath,
            totalLatencyMs: longestLatency,
            depth: longestPath.length,
        };
    } catch (error) {
        console.error('[CausalTrace] getCriticalPath failed:', error);
        return { nodes: [], totalLatencyMs: 0, depth: 0 };
    }
}

/**
 * Get a summary of agent actions for a session (for dashboard).
 */
export async function getSessionSummary(userId: string, sessionId: string) {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: 2000,
        });

        const actions = logs.filter((l) => l.details?.sessionId === sessionId);

        const toolCalls = actions.filter((a) => a.event_type === 'tool_call');
        const blocked = actions.filter((a) => a.details?.guardDecision === 'block');
        const approvalRequired = actions.filter(
            (a) => a.details?.guardDecision === 'require_approval'
        );
        const totalLatency = actions.reduce(
            (sum, a) => sum + ((a.details?.latencyMs as number) || 0),
            0
        );

        const toolUsage: Record<string, number> = {};
        for (const a of toolCalls) {
            const toolName = a.details?.toolName as string;
            if (toolName) {
                toolUsage[toolName] = (toolUsage[toolName] || 0) + 1;
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
    } catch (error) {
        console.error('[CausalTrace] getSessionSummary failed:', error);
        return {
            totalActions: 0,
            toolCalls: 0,
            blockedActions: 0,
            approvalRequests: 0,
            totalLatencyMs: 0,
            avgLatencyMs: 0,
            toolUsage: {},
        };
    }
}
