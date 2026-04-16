'use client';

import { useState, useRef, useEffect } from 'react';
import type { ReversibilityClass } from '@/lib/reversibility/types';
import { REVERSIBILITY_SPECS } from '@/lib/reversibility/types';

interface ReversibilityBadgeProps {
    cls: ReversibilityClass;
    /** Show tooltip on hover (default: true) */
    showTooltip?: boolean;
    /** Compact mode — emoji only, no label */
    compact?: boolean;
}

export function ReversibilityBadge({
    cls,
    showTooltip = true,
    compact = false,
}: ReversibilityBadgeProps) {
    const spec = REVERSIBILITY_SPECS[cls];
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleMouseEnter = () => {
        if (!showTooltip) return;
        timeoutRef.current = setTimeout(() => setTooltipVisible(true), 300);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setTooltipVisible(false);
    };

    return (
        <span
            className="relative inline-flex"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${spec.color} ${spec.textColor} ${spec.borderColor}`}
            >
                <span aria-hidden="true">{spec.emoji}</span>
                {!compact && <span>{spec.label}</span>}
            </span>

            {showTooltip && tooltipVisible && (
                <span
                    role="tooltip"
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 shadow-lg pointer-events-none"
                >
                    <span className="block font-medium text-neutral-100 mb-0.5">
                        {spec.emoji} {spec.label}
                    </span>
                    <span className="block">{spec.description}</span>
                    {spec.canUndo && (
                        <span className="mt-1 block text-green-400 text-[10px] font-medium">
                            Undo available
                        </span>
                    )}
                    {/* tooltip arrow */}
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-700" />
                </span>
            )}
        </span>
    );
}
