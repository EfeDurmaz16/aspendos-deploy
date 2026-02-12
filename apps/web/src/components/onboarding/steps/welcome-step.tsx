'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Rocket, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeStepProps {
    onNext: () => void;
    onSkip: () => void;
}

export function WelcomeStep({ onNext, onSkip }: WelcomeStepProps) {
    return (
        <motion.div
            className="flex flex-col items-center text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            {/* Logo animation */}
            <motion.div
                className="mb-8 relative"
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
            >
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/20">
                    <Sparkles className="h-12 w-12 text-emerald-400" />
                </div>
                {/* Animated ring */}
                <motion.div
                    className="absolute inset-0 rounded-3xl border-2 border-emerald-500/30"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.3, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                />
            </motion.div>

            {/* Title */}
            <motion.h1
                className="mb-2 text-3xl font-bold text-white"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                Welcome to YULA
            </motion.h1>

            {/* Subtitle */}
            <motion.p
                className="mb-8 text-lg text-zinc-400"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                Your Universal Learning Assistant
            </motion.p>

            {/* Key differentiator */}
            <motion.div
                className="mb-8 max-w-md rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <p className="text-sm leading-relaxed text-zinc-300">
                    <span className="font-semibold text-white">
                        YULA isn't just another chatbot.
                    </span>{' '}
                    It's an AI operating system that remembers, anticipates, and grows with you.
                </p>
            </motion.div>

            {/* Feature highlights */}
            <motion.div
                className="mb-8 grid w-full max-w-md grid-cols-3 gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <FeatureHighlight
                    icon="📥"
                    label="Import"
                    description="Bring your history"
                    color="#2563EB"
                />
                <FeatureHighlight
                    icon="🔔"
                    label="PAC"
                    description="AI reaches out"
                    color="#D97706"
                />
                <FeatureHighlight
                    icon="👥"
                    label="Council"
                    description="4 AIs at once"
                    color="#7C3AED"
                />
            </motion.div>

            {/* Actions */}
            <motion.div
                className="flex w-full max-w-md flex-col gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
            >
                <button
                    onClick={onNext}
                    className={cn(
                        'flex w-full items-center justify-center gap-2 rounded-xl py-4',
                        'bg-emerald-500 text-white font-semibold',
                        'transition-all hover:bg-emerald-600 active:scale-[0.98]',
                        'shadow-lg shadow-emerald-500/25'
                    )}
                >
                    <Rocket className="h-5 w-5" />
                    Start the Tour
                    <ArrowRight className="h-4 w-4" />
                </button>
                <button
                    onClick={onSkip}
                    className="py-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                >
                    Skip and explore on my own
                </button>
            </motion.div>
        </motion.div>
    );
}

function FeatureHighlight({
    icon,
    label,
    description,
    color,
}: {
    icon: string;
    label: string;
    description: string;
    color: string;
}) {
    return (
        <div
            className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center transition-colors hover:bg-white/[0.04]"
            style={{ borderColor: `${color}20` }}
        >
            <div className="mb-1 text-2xl">{icon}</div>
            <div className="text-xs font-medium text-white">{label}</div>
            <div className="text-xs text-zinc-500">{description}</div>
        </div>
    );
}
