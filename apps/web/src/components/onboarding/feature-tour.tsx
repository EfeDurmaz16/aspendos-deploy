'use client';

import { ArrowRight, Brain, Command, Lightning, Sparkle, Users } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Feature {
    id: string;
    icon: typeof Command;
    title: string;
    description: string;
    color: string;
    shortcut?: string;
}

const features: Feature[] = [
    {
        id: 'omnibar',
        icon: Command,
        title: 'The Omnibar',
        description:
            'Your command center. Search, navigate, and execute actions with natural language.',
        color: '#a78bfa',
        shortcut: 'Cmd+K',
    },
    {
        id: 'memory',
        icon: Brain,
        title: 'Living Memory',
        description:
            'Yula remembers everything - people, projects, preferences. All connected in a visual graph.',
        color: '#ec4899',
    },
    {
        id: 'council',
        icon: Users,
        title: 'The Council',
        description:
            'Get multiple perspectives on important decisions. Three AI personas deliberate together.',
        color: '#3b82f6',
    },
    {
        id: 'pac',
        icon: Lightning,
        title: 'Proactive Assistance',
        description:
            'Yula anticipates your needs. The Future Stream shows upcoming nudges and reminders.',
        color: '#f59e0b',
    },
];

interface FeatureTourProps {
    currentStep: number;
    onNext: () => void;
    onSkip: () => void;
    totalSteps: number;
}

export function FeatureTour({ currentStep, onNext, onSkip, totalSteps }: FeatureTourProps) {
    const feature = features[currentStep];
    const Icon = feature.icon;
    const isLastStep = currentStep === totalSteps - 1;

    return (
        <motion.div
            key={feature.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex flex-col items-center text-center"
        >
            {/* Icon */}
            <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${feature.color}15` }}
            >
                <Icon className="h-10 w-10" color={feature.color} weight="fill" />
            </motion.div>

            {/* Title */}
            <h3 className="mb-2 text-xl font-semibold text-white">{feature.title}</h3>

            {/* Shortcut badge */}
            {feature.shortcut && (
                <div className="mb-3 flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
                    <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-zinc-300">
                        {feature.shortcut}
                    </kbd>
                </div>
            )}

            {/* Description */}
            <p className="mb-8 max-w-sm text-sm leading-relaxed text-zinc-400">
                {feature.description}
            </p>

            {/* Progress dots */}
            <div className="mb-6 flex items-center gap-2">
                {features.map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            'h-1.5 rounded-full transition-all duration-300',
                            i === currentStep
                                ? 'w-6 bg-white'
                                : i < currentStep
                                  ? 'w-1.5 bg-white/50'
                                  : 'w-1.5 bg-white/20'
                        )}
                    />
                ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onSkip}
                    className="px-4 py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                >
                    Skip tour
                </button>
                <button
                    onClick={onNext}
                    className={cn(
                        'flex items-center gap-2 rounded-lg px-5 py-2.5',
                        'bg-white text-zinc-900 font-medium text-sm',
                        'transition-all hover:bg-zinc-200'
                    )}
                >
                    {isLastStep ? (
                        <>
                            <Sparkle className="h-4 w-4" weight="fill" />
                            Get Started
                        </>
                    ) : (
                        <>
                            Next
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </button>
            </div>
        </motion.div>
    );
}

// Feature card for grid display
export function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
    const Icon = feature.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
                'rounded-xl border border-white/5 bg-white/[0.02] p-4',
                'transition-all duration-200 hover:border-white/10 hover:bg-white/[0.04]'
            )}
        >
            <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${feature.color}15` }}
            >
                <Icon className="h-5 w-5" color={feature.color} weight="fill" />
            </div>
            <h4 className="mb-1 font-medium text-white">{feature.title}</h4>
            <p className="text-xs leading-relaxed text-zinc-500">{feature.description}</p>
        </motion.div>
    );
}

export { features };
