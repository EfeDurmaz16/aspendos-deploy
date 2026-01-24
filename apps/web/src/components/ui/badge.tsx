import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * YULA OS Badge Component
 * Design System v2.0 - Monolith Aesthetic
 *
 * Border radius: 4px (--radius-sm) for badges, full for pills
 * Font size: 11px (text-xs)
 *
 * Feature variants for YULA 3 Hooks:
 * - import: Electric Blue
 * - pac: Electric Amber
 * - council: Electric Violet
 * - personas: Electric Emerald
 * - memory: Electric Rose
 */
const badgeVariants = cva(
    'inline-flex items-center rounded-[4px] px-2 py-0.5 text-[11px] font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    {
        variants: {
            variant: {
                // Semantic variants
                primary: 'border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20',
                secondary:
                    'border border-secondary/30 bg-secondary/10 text-secondary-foreground hover:bg-secondary/20',
                tertiary: 'border border-muted/30 bg-muted text-muted-foreground hover:bg-muted/80',
                success:
                    'border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-950/40',
                warning:
                    'border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/40',
                danger: 'border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-950/40',
                outline: 'border border-border text-foreground hover:bg-accent',
                // YULA Feature variants - 3 Hooks
                import: 'border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-950/40',
                pac: 'border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/40',
                council:
                    'border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-200 hover:bg-violet-100 dark:hover:bg-violet-950/40',
                // Additional feature variants
                personas:
                    'border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-950/40',
                memory: 'border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-950/40',
            },
            shape: {
                default: 'rounded-[4px]',
                pill: 'rounded-full',
            },
        },
        defaultVariants: {
            variant: 'primary',
            shape: 'default',
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof badgeVariants> {
    dot?: boolean;
}

function Badge({ className, variant, shape, dot, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant, shape }), className)} {...props}>
            {dot && (
                <span className="mr-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-current opacity-80" />
            )}
            {props.children}
        </div>
    );
}
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
