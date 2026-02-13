'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    getSpotlightTarget,
    ONBOARDING_STEPS,
    type OnboardingStep,
    type SpotlightTarget,
    useOnboardingStore,
} from '@/lib/stores/onboarding-store';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface SpotlightRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface TooltipPosition {
    x: number;
    y: number;
    placement: 'top' | 'bottom' | 'left' | 'right';
}

interface SpotlightOverlayProps {
    children?: React.ReactNode;
    className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const TRANSITION_DURATION = 0.3; // 300ms
const DEFAULT_PADDING = 12;
const TOOLTIP_GAP = 16;
const VIEWPORT_PADDING = 16;

// ============================================
// UTILITIES
// ============================================

/**
 * Calculate element rect with optional padding
 */
const getElementRect = (
    selector: string,
    padding: number = DEFAULT_PADDING
): SpotlightRect | null => {
    const element = document.querySelector(selector);
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    return {
        x: rect.x - padding,
        y: rect.y - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
    };
};

/**
 * Calculate optimal tooltip position based on spotlight and viewport
 */
const calculateTooltipPosition = (
    spotlight: SpotlightRect,
    preferredPosition: SpotlightTarget['position'] = 'auto',
    tooltipWidth: number = 320,
    tooltipHeight: number = 200
): TooltipPosition => {
    const viewport = {
        width: typeof window !== 'undefined' ? window.innerWidth : 1024,
        height: typeof window !== 'undefined' ? window.innerHeight : 768,
    };

    // Calculate available space in each direction
    const space = {
        top: spotlight.y - VIEWPORT_PADDING,
        bottom: viewport.height - (spotlight.y + spotlight.height) - VIEWPORT_PADDING,
        left: spotlight.x - VIEWPORT_PADDING,
        right: viewport.width - (spotlight.x + spotlight.width) - VIEWPORT_PADDING,
    };

    // Determine best position
    let placement: TooltipPosition['placement'];

    if (preferredPosition !== 'auto') {
        placement = preferredPosition;
    } else {
        // Auto-select based on available space
        if (space.bottom >= tooltipHeight + TOOLTIP_GAP) {
            placement = 'bottom';
        } else if (space.top >= tooltipHeight + TOOLTIP_GAP) {
            placement = 'top';
        } else if (space.right >= tooltipWidth + TOOLTIP_GAP) {
            placement = 'right';
        } else {
            placement = 'left';
        }
    }

    // Calculate position based on placement
    let x: number;
    let y: number;

    switch (placement) {
        case 'top':
            x = spotlight.x + spotlight.width / 2 - tooltipWidth / 2;
            y = spotlight.y - tooltipHeight - TOOLTIP_GAP;
            break;
        case 'bottom':
            x = spotlight.x + spotlight.width / 2 - tooltipWidth / 2;
            y = spotlight.y + spotlight.height + TOOLTIP_GAP;
            break;
        case 'left':
            x = spotlight.x - tooltipWidth - TOOLTIP_GAP;
            y = spotlight.y + spotlight.height / 2 - tooltipHeight / 2;
            break;
        case 'right':
            x = spotlight.x + spotlight.width + TOOLTIP_GAP;
            y = spotlight.y + spotlight.height / 2 - tooltipHeight / 2;
            break;
    }

    // Clamp to viewport
    x = Math.max(VIEWPORT_PADDING, Math.min(x, viewport.width - tooltipWidth - VIEWPORT_PADDING));
    y = Math.max(VIEWPORT_PADDING, Math.min(y, viewport.height - tooltipHeight - VIEWPORT_PADDING));

    return { x, y, placement };
};

// ============================================
// COMPONENTS
// ============================================

/**
 * SVG mask that creates the spotlight cutout
 */
const SpotlightMask = ({
    spotlight,
    prefersReducedMotion,
}: {
    spotlight: SpotlightRect | null;
    prefersReducedMotion: boolean;
}) => {
    const transitionProps = prefersReducedMotion
        ? {}
        : {
              transition: { duration: TRANSITION_DURATION, ease: 'easeInOut' as const },
          };

    return (
        <svg
            className="absolute inset-0 h-full w-full pointer-events-none"
            preserveAspectRatio="none"
        >
            <defs>
                <mask id="spotlight-mask">
                    {/* White = visible, black = hidden */}
                    <rect x="0" y="0" width="100%" height="100%" fill="white" />
                    {spotlight && (
                        <motion.rect
                            x={spotlight.x}
                            y={spotlight.y}
                            width={spotlight.width}
                            height={spotlight.height}
                            rx={12}
                            fill="black"
                            initial={false}
                            animate={{
                                x: spotlight.x,
                                y: spotlight.y,
                                width: spotlight.width,
                                height: spotlight.height,
                            }}
                            {...transitionProps}
                        />
                    )}
                </mask>
            </defs>
            <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.8)"
                mask="url(#spotlight-mask)"
            />
        </svg>
    );
};

/**
 * Tooltip that appears near the spotlight
 */
const SpotlightTooltip = ({
    step,
    position,
    onNext,
    onPrev,
    onSkip,
    canGoNext,
    canGoPrev,
    currentIndex,
    totalSteps,
    prefersReducedMotion,
}: {
    step: OnboardingStep;
    position: TooltipPosition;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
    canGoNext: boolean;
    canGoPrev: boolean;
    currentIndex: number;
    totalSteps: number;
    prefersReducedMotion: boolean;
}) => {
    const config = ONBOARDING_STEPS[step];
    const tooltipRef = useRef<HTMLDivElement>(null);

    const animationProps = prefersReducedMotion
        ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
        : {
              initial: { opacity: 0, scale: 0.95, y: 10 },
              animate: { opacity: 1, scale: 1, y: 0 },
              exit: { opacity: 0, scale: 0.95, y: 10 },
              transition: { duration: TRANSITION_DURATION, ease: 'easeOut' as const },
          };

    return (
        <motion.div
            ref={tooltipRef}
            className={cn(
                'fixed z-[60] w-80 rounded-xl',
                'border border-white/10 bg-zinc-900/95 backdrop-blur-xl',
                'shadow-2xl shadow-black/50'
            )}
            style={{
                left: position.x,
                top: position.y,
            }}
            {...animationProps}
        >
            {/* Accent color bar */}
            <div
                className="h-1 w-full rounded-t-xl"
                style={{ backgroundColor: config.accentColor }}
            />

            <div className="p-5">
                {/* Progress indicator */}
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex gap-1">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    'h-1.5 w-6 rounded-full transition-colors',
                                    i <= currentIndex ? 'bg-white' : 'bg-white/20'
                                )}
                                style={
                                    i === currentIndex
                                        ? { backgroundColor: config.accentColor }
                                        : undefined
                                }
                            />
                        ))}
                    </div>
                    <span className="text-xs text-zinc-500">
                        {currentIndex + 1} / {totalSteps}
                    </span>
                </div>

                {/* Content */}
                <h3 className="mb-1 text-lg font-semibold text-white">{config.title}</h3>
                <p className="mb-5 text-sm text-zinc-400">{config.description}</p>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={onSkip}
                        className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                    >
                        Skip tour
                    </button>
                    <div className="flex gap-2">
                        {canGoPrev && (
                            <button
                                onClick={onPrev}
                                className={cn(
                                    'rounded-lg px-3 py-1.5 text-sm font-medium',
                                    'border border-white/10 text-white',
                                    'transition-colors hover:bg-white/5'
                                )}
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={onNext}
                            className={cn(
                                'rounded-lg px-4 py-1.5 text-sm font-medium',
                                'text-white transition-colors'
                            )}
                            style={{ backgroundColor: config.accentColor }}
                        >
                            {canGoNext ? 'Next' : 'Finish'}
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export function SpotlightOverlay({ children, className }: SpotlightOverlayProps) {
    const {
        currentStep,
        isActive,
        nextStep,
        prevStep,
        skipTour,
        canGoNext,
        canGoPrev,
        getCurrentStepIndex,
        getTotalSteps,
    } = useOnboardingStore();

    const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    // Check for reduced motion preference
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    // Update spotlight position when step changes
    const updateSpotlight = useCallback(() => {
        const target = getSpotlightTarget(currentStep);

        if (target) {
            const rect = getElementRect(target.selector, target.padding);
            setSpotlight(rect);

            if (rect) {
                const position = calculateTooltipPosition(rect, target.position);
                setTooltipPosition(position);
            } else {
                setTooltipPosition(null);
            }
        } else {
            // No spotlight target for this step (e.g., welcome, complete)
            setSpotlight(null);
            // Center the tooltip for steps without spotlight
            setTooltipPosition({
                x: typeof window !== 'undefined' ? window.innerWidth / 2 - 160 : 400,
                y: typeof window !== 'undefined' ? window.innerHeight / 2 - 100 : 300,
                placement: 'bottom',
            });
        }
    }, [currentStep]);

    // Update on step change and window resize
    useEffect(() => {
        if (!isActive) return;

        updateSpotlight();

        // Handle resize
        const handleResize = () => updateSpotlight();
        window.addEventListener('resize', handleResize);

        // Handle scroll
        const handleScroll = () => updateSpotlight();
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isActive, currentStep, updateSpotlight]);

    // Keyboard navigation
    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowRight':
                case 'Enter':
                    if (canGoNext()) nextStep();
                    break;
                case 'ArrowLeft':
                    if (canGoPrev()) prevStep();
                    break;
                case 'Escape':
                    skipTour();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isActive, canGoNext, canGoPrev, nextStep, prevStep, skipTour]);

    if (!isActive) return null;

    return (
        <AnimatePresence>
            <motion.div
                className={cn('fixed inset-0 z-50', className)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : TRANSITION_DURATION }}
                role="dialog"
                aria-modal="true"
                aria-label="Onboarding tour"
            >
                {/* Overlay with spotlight cutout */}
                <div className="absolute inset-0 pointer-events-auto" onClick={skipTour}>
                    <SpotlightMask
                        spotlight={spotlight}
                        prefersReducedMotion={prefersReducedMotion}
                    />
                </div>

                {/* Spotlight ring effect (optional visual enhancement) */}
                {spotlight && (
                    <motion.div
                        className="absolute pointer-events-none rounded-xl ring-2 ring-white/30"
                        style={{
                            left: spotlight.x,
                            top: spotlight.y,
                            width: spotlight.width,
                            height: spotlight.height,
                        }}
                        initial={false}
                        animate={{
                            left: spotlight.x,
                            top: spotlight.y,
                            width: spotlight.width,
                            height: spotlight.height,
                        }}
                        transition={
                            prefersReducedMotion
                                ? {}
                                : { duration: TRANSITION_DURATION, ease: 'easeInOut' as const }
                        }
                    />
                )}

                {/* Tooltip */}
                {tooltipPosition && (
                    <SpotlightTooltip
                        step={currentStep}
                        position={tooltipPosition}
                        onNext={nextStep}
                        onPrev={prevStep}
                        onSkip={skipTour}
                        canGoNext={canGoNext()}
                        canGoPrev={canGoPrev()}
                        currentIndex={getCurrentStepIndex()}
                        totalSteps={getTotalSteps()}
                        prefersReducedMotion={prefersReducedMotion}
                    />
                )}

                {/* Additional content (e.g., demo animations) */}
                {children}
            </motion.div>
        </AnimatePresence>
    );
}

// ============================================
// EXPORTS
// ============================================

export type { SpotlightRect, TooltipPosition, SpotlightTarget };
