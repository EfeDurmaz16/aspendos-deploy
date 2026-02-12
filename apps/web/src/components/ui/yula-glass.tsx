'use client';

import { type HTMLMotionProps, motion } from 'framer-motion';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// Glass Panel - Core glassmorphism container for Yula OS
// =============================================================================

interface GlassPanelProps extends HTMLMotionProps<'div'> {
    variant?: 'default' | 'elevated' | 'subtle' | 'solid';
    glow?: boolean;
    glowColor?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
    (
        {
            className,
            children,
            variant = 'default',
            glow = false,
            glowColor = 'violet',
            padding = 'md',
            ...props
        },
        ref
    ) => {
        const variants = {
            default: 'bg-white/5 border-white/10 backdrop-blur-xl',
            elevated: 'bg-white/10 border-white/15 backdrop-blur-2xl shadow-xl shadow-black/20',
            subtle: 'bg-white/[0.02] border-white/5 backdrop-blur-sm',
            solid: 'bg-zinc-900/95 border-white/10 backdrop-blur-xl',
        };

        const paddings = {
            none: 'p-0',
            sm: 'p-3',
            md: 'p-4',
            lg: 'p-6',
        };

        const glowColors = {
            violet: 'before:bg-violet-500/20',
            blue: 'before:bg-blue-500/20',
            emerald: 'before:bg-emerald-500/20',
            amber: 'before:bg-amber-500/20',
            pink: 'before:bg-pink-500/20',
        };

        return (
            <motion.div
                ref={ref}
                className={cn(
                    'relative overflow-hidden rounded-xl border',
                    variants[variant],
                    paddings[padding],
                    glow && [
                        'before:absolute before:inset-0 before:-z-10 before:blur-2xl before:opacity-50',
                        glowColors[glowColor as keyof typeof glowColors] || glowColors.violet,
                    ],
                    className
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);

GlassPanel.displayName = 'GlassPanel';

// =============================================================================
// Glass Button - Glassmorphism-styled button
// =============================================================================

interface GlassButtonProps extends HTMLMotionProps<'button'> {
    variant?: 'default' | 'primary' | 'ghost';
    size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
    ({ className, children, variant = 'default', size = 'md', ...props }, ref) => {
        const variants = {
            default: 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20',
            primary: 'bg-violet-500/20 border-violet-500/30 hover:bg-violet-500/30 text-violet-300',
            ghost: 'bg-transparent border-transparent hover:bg-white/5',
        };

        const sizes = {
            sm: 'h-8 px-3 text-xs gap-1.5',
            md: 'h-10 px-4 text-sm gap-2',
            lg: 'h-12 px-6 text-base gap-2',
            icon: 'h-10 w-10',
        };

        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                    'inline-flex items-center justify-center rounded-lg border font-medium',
                    'text-zinc-300 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900',
                    'disabled:opacity-50 disabled:pointer-events-none',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {children}
            </motion.button>
        );
    }
);

GlassButton.displayName = 'GlassButton';

// =============================================================================
// Glass Input - Glassmorphism-styled input
// =============================================================================

interface GlassInputProps extends HTMLAttributes<HTMLInputElement> {
    type?: string;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
    ({ className, type = 'text', ...props }, ref) => {
        return (
            <input
                ref={ref}
                type={type}
                className={cn(
                    'flex h-10 w-full rounded-lg border px-4 py-2 text-sm',
                    'bg-white/5 border-white/10 text-white',
                    'placeholder:text-zinc-500',
                    'focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-all duration-200',
                    className
                )}
                {...props}
            />
        );
    }
);

GlassInput.displayName = 'GlassInput';

// =============================================================================
// Floating Animation Wrapper
// =============================================================================

interface FloatingProps extends HTMLMotionProps<'div'> {
    delay?: number;
    duration?: number;
    distance?: number;
}

export const Floating = forwardRef<HTMLDivElement, FloatingProps>(
    ({ className, children, delay = 0, duration = 3, distance = 10, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                animate={{
                    y: [-distance / 2, distance / 2, -distance / 2],
                }}
                transition={{
                    repeat: Infinity,
                    duration,
                    delay,
                    ease: 'easeInOut',
                }}
                className={className}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);

Floating.displayName = 'Floating';

// =============================================================================
// Pulse Animation Wrapper
// =============================================================================

interface PulseProps extends HTMLAttributes<HTMLDivElement> {
    color?: string;
}

export const Pulse = forwardRef<HTMLDivElement, PulseProps>(
    ({ className, children, color = 'violet', ...props }, ref) => {
        const colors = {
            violet: 'bg-violet-500',
            blue: 'bg-blue-500',
            emerald: 'bg-emerald-500',
            amber: 'bg-amber-500',
            red: 'bg-red-500',
        };

        return (
            <div ref={ref} className={cn('relative', className)} {...props}>
                <span
                    className={cn(
                        'absolute inset-0 rounded-full animate-ping opacity-75',
                        colors[color as keyof typeof colors] || colors.violet
                    )}
                />
                {children}
            </div>
        );
    }
);

Pulse.displayName = 'Pulse';

// =============================================================================
// Stagger Children Animation Container
// =============================================================================

interface StaggerContainerProps extends HTMLMotionProps<'div'> {
    staggerDelay?: number;
}

export const StaggerContainer = forwardRef<HTMLDivElement, StaggerContainerProps>(
    ({ className, children, staggerDelay = 0.1, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                initial="hidden"
                animate="visible"
                variants={{
                    visible: {
                        transition: {
                            staggerChildren: staggerDelay,
                        },
                    },
                }}
                className={className}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);

StaggerContainer.displayName = 'StaggerContainer';

// Animation variants for children
export const staggerItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 30 },
    },
};

// =============================================================================
// Shimmer Effect (Loading state)
// =============================================================================

export function Shimmer({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                'relative overflow-hidden bg-white/5 rounded-lg',
                'before:absolute before:inset-0 before:-translate-x-full',
                'before:animate-shimmer before:bg-gradient-to-r',
                'before:from-transparent before:via-white/10 before:to-transparent',
                className
            )}
        />
    );
}

// =============================================================================
// Glow Effect Container
// =============================================================================

interface GlowEffectProps extends HTMLAttributes<HTMLDivElement> {
    color?: string;
    intensity?: 'low' | 'medium' | 'high';
}

export const GlowEffect = forwardRef<HTMLDivElement, GlowEffectProps>(
    ({ className, children, color = 'violet', intensity = 'medium', ...props }, ref) => {
        const intensities = {
            low: 'opacity-20 blur-xl',
            medium: 'opacity-30 blur-2xl',
            high: 'opacity-50 blur-3xl',
        };

        const colors = {
            violet: 'bg-violet-500',
            blue: 'bg-blue-500',
            emerald: 'bg-emerald-500',
            amber: 'bg-amber-500',
            pink: 'bg-pink-500',
        };

        return (
            <div ref={ref} className={cn('relative', className)} {...props}>
                <div
                    className={cn(
                        'absolute inset-0 -z-10 rounded-full',
                        colors[color as keyof typeof colors] || colors.violet,
                        intensities[intensity]
                    )}
                />
                {children}
            </div>
        );
    }
);

GlowEffect.displayName = 'GlowEffect';
