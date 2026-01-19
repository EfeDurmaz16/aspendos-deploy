import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    {
        variants: {
            variant: {
                primary: 'border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20',
                secondary: 'border border-secondary/30 bg-secondary/10 text-secondary-foreground hover:bg-secondary/20',
                tertiary: 'border border-muted/30 bg-muted text-muted-foreground hover:bg-muted/80',
                success: 'border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-950/40',
                warning: 'border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/40',
                danger: 'border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-950/40',
                outline: 'border border-border text-foreground hover:bg-accent',
            },
        },
        defaultVariants: {
            variant: 'primary',
        },
    }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
    dot?: boolean;
}

function Badge({ className, variant, dot, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props}>
            {dot && <span className="mr-1.5 inline-flex h-2 w-2 rounded-full bg-current opacity-80" />}
            {props.children}
        </div>
    );
}
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
