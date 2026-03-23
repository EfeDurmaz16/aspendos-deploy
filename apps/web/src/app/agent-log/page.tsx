'use client';

/**
 * Agent Action Log Dashboard
 *
 * Displays:
 * - Recent agent actions timeline
 * - Pending approval requests
 * - Session summaries
 */

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setError(null);
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
        } catch (err) {
            console.error('Failed to fetch agent data:', err);
            setError('Failed to load agent data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleApprove = async (approvalId: string, alwaysAllow = false) => {
        const url = alwaysAllow
            ? `/api/v1/approvals/${approvalId}/approve?always_allow=true`
            : `/api/v1/approvals/${approvalId}/approve`;
        await fetch(url, { method: 'POST', credentials: 'include' }).catch(() => {});
        fetchData();
    };

    const handleReject = async (approvalId: string) => {
        await fetch(`/api/v1/approvals/${approvalId}/reject`, {
            method: 'POST',
            credentials: 'include',
        }).catch(() => {});
        fetchData();
    };

    if (loading) {
        return (
            <main
                className="container mx-auto max-w-4xl px-4 py-8 space-y-4"
                aria-busy="true"
                aria-label="Loading agent activity"
            >
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </main>
        );
    }

    return (
        <main className="container mx-auto max-w-4xl px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Agent Activity</h1>

            {error && (
                <Card className="mb-6 border-foreground/20 bg-foreground/5">
                    <CardContent className="p-4" role="alert">
                        <p className="text-sm text-foreground/70">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Pending Approvals */}
            {approvals.length > 0 && (
                <section className="mb-8">
                    <h2 className="text-lg font-semibold mb-3">
                        Pending Approvals ({approvals.length})
                    </h2>
                    <div className="space-y-3">
                        {approvals.map((approval) => (
                            <Card key={approval.id} className="border-foreground/20 bg-foreground/5">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium">
                                                Tool:{' '}
                                                <Badge variant="outline">{approval.toolName}</Badge>
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {approval.reason}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Expires:{' '}
                                                {new Date(approval.expiresAt).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={() => handleApprove(approval.id)}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleApprove(approval.id, true)}
                                            >
                                                Always Allow
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={() => handleReject(approval.id)}
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {/* Action Timeline */}
            <section aria-live="polite">
                <h2 className="text-lg font-semibold mb-3">Recent Actions</h2>
                {actions.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No agent actions recorded yet.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {actions.map((action) => (
                            <Card key={action.id} className="hover:shadow-lg transition-shadow">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <span className="sr-only">
                                        {action.guardDecision || 'allow'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">
                                                {action.toolName || action.actionType}
                                            </span>
                                            {action.guardDecision &&
                                                action.guardDecision !== 'allow' && (
                                                    <Badge
                                                        variant={getDecisionVariant(
                                                            action.guardDecision
                                                        )}
                                                    >
                                                        {action.guardDecision}
                                                    </Badge>
                                                )}
                                        </div>
                                        {action.guardWarnings.length > 0 && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {action.guardWarnings[0]}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right text-xs text-muted-foreground">
                                        <div>{action.latencyMs}ms</div>
                                        <div>{new Date(action.createdAt).toLocaleTimeString()}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}

function getDecisionVariant(decision: string): 'warning' | 'danger' | 'outline' {
    switch (decision) {
        case 'warn':
            return 'warning';
        case 'block':
        case 'require_approval':
            return 'danger';
        default:
            return 'outline';
    }
}
