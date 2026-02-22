'use client';

import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { ArrowRight, MessageSquare, PartyPopper, Sparkles, Trophy } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CompleteStepProps {
    onComplete: () => void;
    onRestart: () => void;
}

export function CompleteStep({ onComplete, onRestart }: CompleteStepProps) {
    // Trigger confetti on mount
    useEffect(() => {
        const duration = 2000;
        const end = Date.now() + duration;

        const colors = ['#10B981', '#2563EB', '#D97706', '#7C3AED'];

        (function frame() {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors,
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors,
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        })();
    }, []);

    return (
        <motion.div
            className="flex flex-col items-center text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
        >
            {/* Celebration icon */}
            <motion.div
                className="mb-8 relative"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.2 }}
            >
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500/20 via-violet-500/10 to-amber-500/20 border border-border">
                    <PartyPopper className="h-12 w-12 text-emerald-400" />
                </div>
                {/* Sparkle effects */}
                <motion.div
                    className="absolute -top-2 -right-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <Sparkles className="h-6 w-6 text-amber-400" />
                </motion.div>
                <motion.div
                    className="absolute -bottom-1 -left-1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <Sparkles className="h-4 w-4 text-violet-400" />
                </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h1
                className="mb-2 text-3xl font-bold text-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                You're All Set!
            </motion.h1>

            {/* Subtitle */}
            <motion.p
                className="mb-8 text-lg text-muted-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                Welcome to the Yula family
            </motion.p>

            {/* Achievement unlocked */}
            <motion.div
                className="mb-8 w-full max-w-md rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
                        <Trophy className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-semibold text-emerald-400">
                            Achievement Unlocked!
                        </div>
                        <div className="text-xs text-muted-foreground">Tour Complete • +50 XP</div>
                    </div>
                </div>
            </motion.div>

            {/* Quick tips */}
            <motion.div
                className="mb-8 w-full max-w-md space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
            >
                <QuickTip
                    icon={<MessageSquare className="h-4 w-4" />}
                    text="Start a chat to experience Yula's memory"
                    color="#2563EB"
                />
                <QuickTip
                    icon={<Sparkles className="h-4 w-4" />}
                    text="Try Council mode for multi-perspective answers"
                    color="#7C3AED"
                />
            </motion.div>

            {/* Actions */}
            <motion.div
                className="flex w-full max-w-md flex-col gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
            >
                <button
                    onClick={onComplete}
                    className={cn(
                        'flex w-full items-center justify-center gap-2 rounded-xl py-4',
                        'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold',
                        'transition-all hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98]',
                        'shadow-lg shadow-emerald-500/25'
                    )}
                >
                    <MessageSquare className="h-5 w-5" />
                    Start Chatting
                    <ArrowRight className="h-4 w-4" />
                </button>
                <button
                    onClick={onRestart}
                    className="py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    Take the tour again
                </button>
            </motion.div>
        </motion.div>
    );
}

function QuickTip({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) {
    return (
        <div className="flex items-center gap-3 rounded-lg bg-foreground/5 px-4 py-3">
            <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: `${color}20`, color }}
            >
                {icon}
            </div>
            <span className="text-sm text-muted-foreground">{text}</span>
        </div>
    );
}
