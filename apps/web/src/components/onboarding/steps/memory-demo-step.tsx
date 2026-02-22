'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Brain, Database, FolderOpen, Layers, MessageCircle, Target, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Feature accent color: Pink/Rose
const ACCENT_COLOR = '#EC4899';

interface MemoryDemoStepProps {
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
}

const MODELS = [
    { name: 'Auto', icon: <Zap className="h-3.5 w-3.5" />, color: '#10B981' },
    { name: 'Smart', icon: <Brain className="h-3.5 w-3.5" />, color: '#7C3AED' },
    { name: 'Fast', icon: <Zap className="h-3.5 w-3.5" />, color: '#2563EB' },
    { name: 'Creative', icon: <Layers className="h-3.5 w-3.5" />, color: '#D97706' },
];

const MEMORY_CARDS = [
    {
        label: 'Preference',
        text: 'Prefers TypeScript with strict mode',
        icon: <Target className="h-5 w-5" style={{ color: ACCENT_COLOR }} />,
    },
    {
        label: 'Context',
        text: 'Working on a Next.js 15 project',
        icon: <FolderOpen className="h-5 w-5" style={{ color: ACCENT_COLOR }} />,
    },
    {
        label: 'History',
        text: 'Discussed auth patterns last week',
        icon: <MessageCircle className="h-5 w-5" style={{ color: ACCENT_COLOR }} />,
    },
];

export function MemoryDemoStep({ onNext, onPrev, onSkip }: MemoryDemoStepProps) {
    const [activeModel, setActiveModel] = useState(0);

    // Cycle through models
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveModel((prev) => (prev + 1) % MODELS.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header with accent */}
            <div
                className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl relative"
                style={{ backgroundColor: `${ACCENT_COLOR}20` }}
            >
                <Database className="h-8 w-8" style={{ color: ACCENT_COLOR }} />
                {/* Pulse ring */}
                <motion.div
                    className="absolute inset-0 rounded-2xl border-2"
                    style={{ borderColor: `${ACCENT_COLOR}40` }}
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.3, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                />
            </div>

            <h2 className="mb-2 text-2xl font-bold text-foreground">Memory That Follows You</h2>
            <p className="mb-6 text-center text-sm text-muted-foreground max-w-sm">
                Your conversations, preferences, and context work across all AI models.
                Switch freely — Yula remembers everything.
            </p>

            {/* Model switcher demo */}
            <div className="mb-4 w-full max-w-md">
                <div className="rounded-xl border border-border bg-foreground/[0.02] overflow-hidden">
                    {/* Model tabs */}
                    <div
                        className="flex items-center gap-1 px-3 py-2"
                        style={{ backgroundColor: `${ACCENT_COLOR}08` }}
                    >
                        <span className="text-xs text-muted-foreground mr-2">Model:</span>
                        {MODELS.map((model, i) => (
                            <motion.div
                                key={model.name}
                                className={cn(
                                    'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                                    i === activeModel
                                        ? 'text-foreground'
                                        : 'text-muted-foreground'
                                )}
                                style={
                                    i === activeModel
                                        ? { backgroundColor: `${model.color}30`, color: model.color }
                                        : undefined
                                }
                                animate={i === activeModel ? { scale: [1, 1.05, 1] } : {}}
                                transition={{ duration: 0.3 }}
                            >
                                {model.icon}
                                {model.name}
                            </motion.div>
                        ))}
                    </div>

                    {/* Memory cards — persist across model switch */}
                    <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <div
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: ACCENT_COLOR }}
                            />
                            <span className="text-xs text-muted-foreground">
                                Memory active across{' '}
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={activeModel}
                                        className="font-medium"
                                        style={{ color: MODELS[activeModel].color }}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        {MODELS[activeModel].name}
                                    </motion.span>
                                </AnimatePresence>
                            </span>
                        </div>

                        {MEMORY_CARDS.map((card, i) => (
                            <motion.div
                                key={card.label}
                                className="flex items-center gap-3 rounded-lg bg-foreground/5 px-3 py-2.5"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * i }}
                            >
                                <span>{card.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                        {card.label}
                                    </div>
                                    <div className="text-xs text-muted-foreground">{card.text}</div>
                                </div>
                                {/* Persistent indicator */}
                                <div
                                    className="flex h-5 w-5 items-center justify-center rounded-full"
                                    style={{ backgroundColor: `${ACCENT_COLOR}20` }}
                                >
                                    <div
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: ACCENT_COLOR }}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* How it works */}
            <div className="mb-6 w-full max-w-md">
                <div className="flex items-start gap-3">
                    <StepIndicator number={1} color={ACCENT_COLOR} />
                    <div>
                        <div className="text-sm font-medium text-foreground">Chat with any model</div>
                        <div className="text-xs text-muted-foreground">
                            Switch between Auto, Smart, Fast, Creative
                        </div>
                    </div>
                </div>
                <div className="ml-4 h-6 border-l border-dashed border-border" />
                <div className="flex items-start gap-3">
                    <StepIndicator number={2} color={ACCENT_COLOR} />
                    <div>
                        <div className="text-sm font-medium text-foreground">Yula remembers everything</div>
                        <div className="text-xs text-muted-foreground">
                            Preferences, context, and history persist
                        </div>
                    </div>
                </div>
                <div className="ml-4 h-6 border-l border-dashed border-border" />
                <div className="flex items-start gap-3">
                    <StepIndicator number={3} color={ACCENT_COLOR} />
                    <div>
                        <div className="text-sm font-medium text-foreground">Every model knows you</div>
                        <div className="text-xs text-muted-foreground">
                            No re-explaining when you switch models
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex w-full max-w-md items-center justify-between">
                <button
                    onClick={onSkip}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    Skip tour
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={onPrev}
                        className={cn(
                            'rounded-lg px-4 py-2 text-sm font-medium',
                            'border border-border text-foreground',
                            'transition-colors hover:bg-accent'
                        )}
                    >
                        Back
                    </button>
                    <button
                        onClick={onNext}
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
                            'text-white transition-colors hover:opacity-90'
                        )}
                        style={{ backgroundColor: ACCENT_COLOR }}
                    >
                        Next
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function StepIndicator({ number, color }: { number: number; color: string }) {
    return (
        <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: color }}
        >
            {number}
        </div>
    );
}
