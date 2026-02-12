'use client';

import { Sparkle, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useYulaStore } from '@/stores/yula-store';
import { FeatureCard, FeatureTour, features } from './feature-tour';

interface WelcomeGuideProps {
    forceShow?: boolean;
    onClose?: () => void;
}

export function WelcomeGuide({ forceShow = false, onClose }: WelcomeGuideProps) {
    const { settings, markWelcomeSeen } = useYulaStore();
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(-1); // -1 = intro, 0-3 = features

    // Check if should show
    useEffect(() => {
        if (forceShow || !settings.hasSeenWelcome) {
            setIsOpen(true);
        }
    }, [forceShow, settings.hasSeenWelcome]);

    const handleClose = useCallback(() => {
        markWelcomeSeen();
        setIsOpen(false);
        onClose?.();
    }, [markWelcomeSeen, onClose]);

    const handleNext = useCallback(() => {
        if (currentStep < features.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleClose();
        }
    }, [currentStep, handleClose]);

    const handleStartTour = useCallback(() => {
        setCurrentStep(0);
    }, []);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={cn(
                        'relative w-full max-w-lg overflow-hidden rounded-2xl',
                        'border border-white/10 bg-zinc-900/95 backdrop-blur-xl',
                        'shadow-2xl shadow-black/50'
                    )}
                >
                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="p-8">
                        <AnimatePresence mode="wait">
                            {currentStep === -1 ? (
                                // Intro screen
                                <motion.div
                                    key="intro"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="flex flex-col items-center text-center"
                                >
                                    {/* Logo/Icon */}
                                    <motion.div
                                        initial={{ scale: 0.5, rotate: -10 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: 'spring', delay: 0.1 }}
                                        className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20"
                                    >
                                        <Sparkle
                                            className="h-10 w-10 text-violet-400"
                                            weight="fill"
                                        />
                                    </motion.div>

                                    {/* Title */}
                                    <h2 className="mb-2 text-2xl font-bold text-white">
                                        Welcome to Yula
                                    </h2>

                                    {/* Subtitle */}
                                    <p className="mb-6 text-sm text-zinc-400">
                                        Your Proactive AI Operating System
                                    </p>

                                    {/* Important distinction */}
                                    <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                                        <p className="text-sm leading-relaxed text-zinc-300">
                                            <span className="font-semibold text-white">
                                                Yula isn't a chatbot.
                                            </span>{' '}
                                            It's an intelligent layer that learns, anticipates, and
                                            assists. Think of it as your personal AI companion that
                                            grows with you.
                                        </p>
                                    </div>

                                    {/* Feature preview grid */}
                                    <div className="mb-8 grid w-full grid-cols-2 gap-3">
                                        {features.map((feature, i) => (
                                            <FeatureCard
                                                key={feature.id}
                                                feature={feature}
                                                index={i}
                                            />
                                        ))}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex w-full flex-col gap-2">
                                        <button
                                            onClick={handleStartTour}
                                            className={cn(
                                                'flex w-full items-center justify-center gap-2 rounded-lg py-3',
                                                'bg-white text-zinc-900 font-semibold',
                                                'transition-all hover:bg-zinc-200'
                                            )}
                                        >
                                            <Sparkle className="h-4 w-4" weight="fill" />
                                            Take the Tour
                                        </button>
                                        <button
                                            onClick={handleClose}
                                            className="py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                                        >
                                            Skip and explore on my own
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                // Feature tour
                                <FeatureTour
                                    currentStep={currentStep}
                                    totalSteps={features.length}
                                    onNext={handleNext}
                                    onSkip={handleClose}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// Trigger button to show welcome guide again
export function WelcomeGuideTrigger({ className }: { className?: string }) {
    const [showGuide, setShowGuide] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowGuide(true)}
                className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2',
                    'border border-white/10 bg-white/5 text-sm text-zinc-400',
                    'transition-colors hover:bg-white/10 hover:text-white',
                    className
                )}
            >
                <Sparkle className="h-4 w-4" />
                Show Welcome Guide
            </button>
            {showGuide && <WelcomeGuide forceShow onClose={() => setShowGuide(false)} />}
        </>
    );
}
