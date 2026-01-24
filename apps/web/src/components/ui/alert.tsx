import { X } from '@phosphor-icons/react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * YULA OS Alert Component
 * Design System v2.0 - Monolith Aesthetic
 *
 * Border radius: 8px
 */
const alertVariants = cva(
    'relative w-full rounded-[8px] border px-4 py-3 text-sm flex gap-3 transition-colors duration-200',
    {
        variants: {
            variant: {
                info: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200',
                success:
                    'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200',
                warning:
                    'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200',
                error: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-200',
                // YULA Feature alerts
                import: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200',
                pac: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200',
                council:
                    'border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 text-violet-900 dark:text-violet-200',
            },
        },
        defaultVariants: {
            variant: 'info',
        },
    }
);

interface AlertProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof alertVariants> {
    onDismiss?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
    ({ className, variant, onDismiss, ...props }, ref) => (
        <div
            ref={ref}
            role="alert"
            className={cn(alertVariants({ variant }), className)}
            {...props}
        />
    )
);
Alert.displayName = 'Alert';

const AlertIcon = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
    ({ className, ...props }, ref) => (
        <span ref={ref} className={cn('mt-0.5 flex-shrink-0', className)} {...props} />
    )
);
AlertIcon.displayName = 'AlertIcon';

const AlertContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('flex-1', className)} {...props} />
    )
);
AlertContent.displayName = 'AlertContent';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h4 ref={ref} className={cn('mb-1 font-medium leading-none', className)} {...props} />
    )
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm opacity-90', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

const AlertClose = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => (
    <button
        ref={ref}
        className={cn(
            'flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded',
            className
        )}
        onClick={onClick}
        aria-label="Close alert"
        {...props}
    >
        <X className="h-4 w-4" weight="bold" />
    </button>
));
AlertClose.displayName = 'AlertClose';

export { Alert, AlertIcon, AlertContent, AlertTitle, AlertDescription, AlertClose, alertVariants };
