import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * YULA OS Button Component
 * Design System v2.0 - Monolith Aesthetic
 *
 * Sizes follow design tokens:
 * - sm: 32px height, 12px padding
 * - md: 40px height, 16px padding (default)
 * - lg: 48px height, 20px padding
 *
 * Border radius: 6px (--radius-button)
 */
const buttonVariants = cva(
    'inline-flex items-center justify-center whitespace-nowrap rounded-[6px] text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                // Primary - solid background
                primary:
                    'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]',
                // Secondary - bordered
                secondary:
                    'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
                // Tertiary - minimal
                tertiary: 'hover:bg-muted hover:text-muted-foreground active:scale-[0.98]',
                // Danger - destructive actions
                danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]',
                // Ghost - transparent with hover
                ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
                // Link - text only
                link: 'text-primary underline-offset-4 hover:underline',
                // Feature variants for YULA 3 Hooks
                import: 'bg-feature-import text-white hover:bg-feature-import/90 active:scale-[0.98]',
                pac: 'bg-feature-pac text-white hover:bg-feature-pac/90 active:scale-[0.98]',
                council:
                    'bg-feature-council text-white hover:bg-feature-council/90 active:scale-[0.98]',
                // Compatibility aliases
                default:
                    'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]',
                outline:
                    'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
            },
            size: {
                // Design System sizes: 32px, 40px, 48px
                sm: 'h-8 px-3 text-[13px]', // 32px
                default: 'h-10 px-4', // 40px
                lg: 'h-12 px-5 text-base', // 48px
                // Icon buttons
                icon: 'h-10 w-10',
                'icon-sm': 'h-8 w-8',
                'icon-lg': 'h-12 w-12',
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
