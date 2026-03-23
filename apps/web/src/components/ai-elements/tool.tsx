'use client';

/**
 * Tool Component (AI Elements)
 *
 * Displays tool calls with status, input/output, and approval UI.
 * Supports all tool part states:
 * - input-streaming → input-available → output-available
 * - approval-requested → approval-responded → output-available | output-denied
 */

import { type ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// TOOL COMPONENT
// ============================================

interface ToolProps {
    name: string;
    state: string;
    children: ReactNode;
    className?: string;
}

export function Tool({ name, state, children, className }: ToolProps) {
    const [isOpen, setIsOpen] = useState(state !== 'output-available');

    return (
        <div className={cn('border border-white/10 rounded-lg overflow-hidden my-2', className)}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none rounded-t-lg"
            >
                <div className="flex items-center gap-2">
                    <ToolStatusDot state={state} />
                    <span className="font-medium text-neutral-200">{formatToolName(name)}</span>
                </div>
                <ToolStatusBadge state={state} />
            </button>
            {isOpen && <div className="px-3 pb-3 border-t border-white/5">{children}</div>}
        </div>
    );
}

// ============================================
// SUB-COMPONENTS
// ============================================

export function ToolHeader({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('flex items-center gap-2 py-1', className)}>{children}</div>;
}

export function ToolContent({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('mt-2', className)}>{children}</div>;
}

export function ToolInput({ data, className }: { data: unknown; className?: string }) {
    if (!data) return null;
    return (
        <div className={cn('mt-2', className)}>
            <div className="text-xs text-neutral-400 mb-1">Input</div>
            <pre className="text-xs bg-white/5 rounded p-2 overflow-x-auto text-neutral-300">
                {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
            </pre>
        </div>
    );
}

export function ToolOutput({ data, className }: { data: unknown; className?: string }) {
    if (!data) return null;
    return (
        <div className={cn('mt-2', className)}>
            <div className="text-xs text-neutral-400 mb-1">Output</div>
            <pre className="text-xs bg-white/5 rounded p-2 overflow-x-auto text-neutral-300">
                {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
            </pre>
        </div>
    );
}

// ============================================
// STATUS INDICATORS
// ============================================

function ToolStatusDot({ state }: { state: string }) {
    const color =
        state === 'output-available'
            ? 'bg-green-500'
            : state === 'output-error' || state === 'output-denied'
              ? 'bg-red-500'
              : state === 'approval-requested'
                ? 'bg-orange-500'
                : state.includes('streaming')
                  ? 'bg-blue-500 motion-safe:animate-pulse'
                  : 'bg-neutral-500';

    return <div className={cn('w-2 h-2 rounded-full', color)} aria-hidden="true" />;
}

function ToolStatusBadge({ state }: { state: string }) {
    const labels: Record<string, { text: string; color: string }> = {
        'input-streaming': { text: 'Running...', color: 'text-blue-400' },
        'input-available': { text: 'Processing', color: 'text-yellow-400' },
        'output-available': { text: 'Done', color: 'text-green-400' },
        'output-error': { text: 'Error', color: 'text-red-400' },
        'output-denied': { text: 'Denied', color: 'text-red-400' },
        'approval-requested': { text: 'Approval needed', color: 'text-orange-400' },
        'approval-responded': { text: 'Approved', color: 'text-green-400' },
    };

    const label = labels[state] || { text: state, color: 'text-neutral-400' };
    return <span className={cn('text-xs', label.color)}>{label.text}</span>;
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
