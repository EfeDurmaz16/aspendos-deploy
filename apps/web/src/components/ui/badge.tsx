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
                    'border border-border bg-foreground/5 text-foreground hover:bg-foreground/10',
                warning:
                    'border border-border bg-foreground/5 text-muted-foreground hover:bg-foreground/10',
                danger: 'border border-border bg-foreground/5 text-foreground hover:bg-foreground/10',
                outline: 'border border-border text-foreground hover:bg-accent',
                // YULA Feature variants - 3 Hooks
                import: 'border border-border bg-foreground/5 text-foreground hover:bg-foreground/10',
                pac: 'border border-border bg-foreground/5 text-muted-foreground hover:bg-foreground/10',
                council:
                    'border border-border bg-muted-foreground/5 text-muted-foreground hover:bg-muted-foreground/10',
                // Additional feature variants
                personas:
                    'border border-border bg-foreground/5 text-foreground hover:bg-foreground/10',
                memory: 'border border-border bg-foreground/5 text-foreground hover:bg-foreground/10',
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
