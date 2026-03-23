'use client';

/**
 * Shimmer Component (AI Elements)
 *
 * Loading animation for streaming text. Shows a gradient shimmer
 * effect while the AI is generating a response.
 */

import { cn } from '@/lib/utils';

interface ShimmerProps {
    className?: string;
    lines?: number;
}

export function Shimmer({ className, lines = 3 }: ShimmerProps) {
    return (
        <div className={cn('space-y-2', className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={`shimmer-${i}`}
                    className="h-4 rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer"
                    style={{
                        width: i === lines - 1 ? '60%' : '100%',
                        animationDelay: `${i * 0.1}s`,
                    }}
                />
            ))}
        </div>
    );
}

export function ShimmerText({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                'inline-block h-4 w-16 rounded bg-gradient-to-r from-white/5 via-white/15 to-white/5 animate-shimmer',
                className
            )}
        />
    );
}
