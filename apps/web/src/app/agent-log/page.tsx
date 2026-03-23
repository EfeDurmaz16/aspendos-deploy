'use client';

/**
 * Agent Action Log Dashboard
 *
 * Displays:
 * - Recent agent actions timeline
 * - Pending approval requests
 * - Session summaries
 * - Causal trace visualization
 */

import { useCallback, useEffect, useState } from 'react';

interface AgentAction {
    id: string;
    actionType: string;
    toolName: string | null;
    guardDecision: string | null;
    guardWarnings: string[];
    latencyMs: number;
    modelUsed: string | null;
    createdAt: string;
}

interface PendingApproval {
    id: string;
    toolName: string;
    reason: string;
    status: string;
    expiresAt: string;
    createdAt: string;
}

export default function AgentLogPage() {
    const [actions, setActions] = useState<AgentAction[]>([]);
    const [approvals, setApprovals] = useState<PendingApproval[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [actionsRes, approvalsRes] = await Promise.all([
                fetch('/api/v1/traces/recent', { credentials: 'include' }),
                fetch('/api/v1/approvals', { credentials: 'include' }),
            ]);

            if (actionsRes.ok) {
                const data = await actionsRes.json();
                setActions(data.actions || []);
            }
            if (approvalsRes.ok) {
                const data = await approvalsRes.json();
                setApprovals(data.approvals || []);
            }
        } catch (error) {
            console.error('Failed to fetch agent data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleApprove = async (approvalId: string, alwaysAllow = false) => {
        try {
            const url = alwaysAllow
                ? `/api/v1/approvals/${approvalId}/approve?always_allow=true`
                : `/api/v1/approvals/${approvalId}/approve`;
            await fetch(url, { method: 'POST', credentials: 'include' });
            fetchData();
        } catch (error) {
            console.error('Approval failed:', error);
        }
    };

    const handleReject = async (approvalId: string) => {
        try {
            await fetch(`/api/v1/approvals/${approvalId}/reject`, {
                method: 'POST',
                credentials: 'include',
            });
            fetchData();
        } catch (error) {
            console.error('Rejection failed:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div
                    className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"
                    role="status"
                    aria-label="Loading"
                />
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Agent Activity</h1>

            {/* Pending Approvals */}
            {approvals.length > 0 && (
                <section className="mb-8">
                    <h2 className="text-lg font-semibold mb-3">
                        Pending Approvals ({approvals.length})
                    </h2>
                    <div className="space-y-3">
                        {approvals.map((approval) => (
                            <div
                                key={approval.id}
                                className="border border-yellow-500/30 bg-yellow-500/5 rounded-lg p-4"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-medium">
                                            Tool:{' '}
                                            <code className="text-sm bg-white/10 px-1.5 py-0.5 rounded">
                                                {approval.toolName}
                                            </code>
                                        </p>
                                        <p className="text-sm text-neutral-400 mt-1">
                                            {approval.reason}
                                        </p>
                                        <p className="text-xs text-neutral-500 mt-1">
                                            Expires:{' '}
                                            {new Date(approval.expiresAt).toLocaleTimeString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <button
                                            type="button"
                                            onClick={() => handleApprove(approval.id)}
                                            className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-green-400"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleApprove(approval.id, true)}
                                            className="px-3 py-1.5 text-sm bg-green-600/50 hover:bg-green-600/70 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-green-400"
                                        >
                                            Always Allow
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleReject(approval.id)}
                                            className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-red-400"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Action Timeline */}
            <section>
                <h2 className="text-lg font-semibold mb-3">Recent Actions</h2>
                {actions.length === 0 ? (
                    <p className="text-neutral-500">No agent actions recorded yet.</p>
                ) : (
                    <div className="space-y-2">
                        {actions.map((action) => (
                            <div
                                key={action.id}
                                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <div
                                    className={`w-2 h-2 rounded-full ${getDecisionColor(action.guardDecision)}`}
                                    aria-hidden="true"
                                />
                                <span className="sr-only">{action.guardDecision || 'allow'}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">
                                            {action.toolName || action.actionType}
                                        </span>
                                        {action.guardDecision &&
                                            action.guardDecision !== 'allow' && (
                                                <span
                                                    className={`text-xs px-1.5 py-0.5 rounded ${getDecisionBadge(action.guardDecision)}`}
                                                >
                                                    {action.guardDecision}
                                                </span>
                                            )}
                                    </div>
                                    {action.guardWarnings.length > 0 && (
                                        <p className="text-xs text-yellow-400 mt-0.5">
                                            {action.guardWarnings[0]}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right text-xs text-neutral-500">
                                    <div>{action.latencyMs}ms</div>
                                    <div>{new Date(action.createdAt).toLocaleTimeString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

function getDecisionColor(decision: string | null): string {
    switch (decision) {
        case 'allow':
            return 'bg-green-500';
        case 'warn':
            return 'bg-yellow-500';
        case 'block':
            return 'bg-red-500';
        case 'require_approval':
            return 'bg-orange-500';
        default:
            return 'bg-neutral-500';
    }
}

function getDecisionBadge(decision: string): string {
    switch (decision) {
        case 'warn':
            return 'bg-yellow-500/20 text-yellow-400';
        case 'block':
            return 'bg-red-500/20 text-red-400';
        case 'require_approval':
            return 'bg-orange-500/20 text-orange-400';
        default:
            return 'bg-neutral-500/20 text-neutral-400';
    }
}
