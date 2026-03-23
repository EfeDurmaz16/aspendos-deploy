'use client';

/**
 * Confirmation Component (AI Elements)
 *
 * UI for tool approval flow (needsApproval: true).
 * Renders approval request with approve/deny buttons.
 * Integrates with AI SDK's addToolApprovalResponse().
 *
 * States:
 * - approval-requested: Show approve/deny buttons
 * - approval-responded (approved): Show approved badge
 * - approval-responded (denied): Show denied badge
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// CONFIRMATION COMPONENT
// ============================================

interface ConfirmationProps {
    toolName: string;
    args?: Record<string, unknown>;
    state: 'approval-requested' | 'approval-responded';
    approved?: boolean;
    onApprove?: () => void;
    onDeny?: (reason?: string) => void;
    className?: string;
    children?: ReactNode;
}

export function Confirmation({
    toolName,
    args,
    state,
    approved,
    onApprove,
    onDeny,
    className,
    children,
}: ConfirmationProps) {
    return (
        <div
            className={cn(
                'border rounded-lg p-4 my-2',
                state === 'approval-requested'
                    ? 'border-orange-500/30 bg-orange-500/5'
                    : approved
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-red-500/30 bg-red-500/5',
                className
            )}
        >
            {state === 'approval-requested' ? (
                <ConfirmationRequest
                    toolName={toolName}
                    args={args}
                    onApprove={onApprove}
                    onDeny={onDeny}
                >
                    {children}
                </ConfirmationRequest>
            ) : approved ? (
                <ConfirmationAccepted toolName={toolName} />
            ) : (
                <ConfirmationRejected toolName={toolName} />
            )}
        </div>
    );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function ConfirmationRequest({
    toolName,
    args,
    onApprove,
    onDeny,
    children,
}: {
    toolName: string;
    args?: Record<string, unknown>;
    onApprove?: () => void;
    onDeny?: (reason?: string) => void;
    children?: ReactNode;
}) {
    return (
        <>
            <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-sm font-medium text-orange-300">Approval Required</span>
            </div>
            <p className="text-sm text-neutral-300 mb-1">
                <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">
                    {formatToolName(toolName)}
                </code>{' '}
                wants to execute.
            </p>
            {args && Object.keys(args).length > 0 && (
                <pre className="text-xs bg-white/5 rounded p-2 my-2 overflow-x-auto text-neutral-400">
                    {JSON.stringify(args, null, 2)}
                </pre>
            )}
            {children}
            <ConfirmationActions onApprove={onApprove} onDeny={onDeny} />
        </>
    );
}

function ConfirmationAccepted({ toolName }: { toolName: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-green-400">
                <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">
                    {formatToolName(toolName)}
                </code>{' '}
                approved
            </span>
        </div>
    );
}

function ConfirmationRejected({ toolName }: { toolName: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm text-red-400">
                <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">
                    {formatToolName(toolName)}
                </code>{' '}
                denied
            </span>
        </div>
    );
}

export function ConfirmationActions({
    onApprove,
    onDeny,
}: {
    onApprove?: () => void;
    onDeny?: (reason?: string) => void;
}) {
    return (
        <div className="flex gap-2 mt-3">
            <button
                type="button"
                onClick={onApprove}
                className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
                Approve
            </button>
            <button
                type="button"
                onClick={() => onDeny?.()}
                className="px-4 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-md transition-colors"
            >
                Deny
            </button>
        </div>
    );
}

// ============================================
// HELPERS
// ============================================

function formatToolName(name: string): string {
    return name
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^\w/, (c) => c.toUpperCase())
        .trim();
}
