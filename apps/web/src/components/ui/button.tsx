import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                // Semantic variants (HeroUI v3 principles)
                primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
                secondary:
                    'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                tertiary: 'hover:bg-muted hover:text-muted-foreground',
                danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
                link: 'text-primary underline-offset-4 hover:underline',
                // Compatibility variants
                default: 'bg-primary text-primary-foreground hover:bg-primary/90',
                outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
            },
            size: {
                default: 'h-11 px-5 py-2.5', // Slightly larger than standard h-10 px-4
                sm: 'h-9 rounded-md px-3',
                lg: 'h-12 rounded-md px-8 text-base',
                icon: 'h-11 w-11',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'default',
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
