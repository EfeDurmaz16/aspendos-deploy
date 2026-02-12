import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const kbdVariants = cva(
    'inline-flex h-5 items-center gap-1 rounded border border-neutral-200 bg-neutral-100 px-1.5 font-mono text-[10px] font-medium text-neutral-900 opacity-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50',
    {
        variants: {
            variant: {
                default: '',
                outline: 'bg-transparent',
                ghost: 'bg-transparent border-none',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

export interface KbdProps
    extends React.HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof kbdVariants> {}

const Kbd = React.forwardRef<HTMLSpanElement, KbdProps>(({ className, variant, ...props }, ref) => {
    return <kbd className={cn(kbdVariants({ variant }), className)} ref={ref} {...props} />;
});
Kbd.displayName = 'Kbd';

export { Kbd };
