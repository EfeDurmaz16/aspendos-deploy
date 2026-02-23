'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Bot, Check, Download, FileJson, MessageSquare, Sparkles, Theater } from 'lucide-react';
import { cn } from '@/lib/utils';

// Feature accent color: Electric Blue
const ACCENT_COLOR = '#2563EB';

interface ImportDemoStepProps {
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
}

export function ImportDemoStep({ onNext, onPrev, onSkip }: ImportDemoStepProps) {
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
                className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${ACCENT_COLOR}20` }}
            >
                <Download className="h-8 w-8" style={{ color: ACCENT_COLOR }} />
            </div>

            <h2 className="mb-2 text-2xl font-bold text-foreground">Your History, Your Power</h2>
            <p className="mb-6 text-center text-sm text-muted-foreground max-w-sm">
                Every conversation you've had makes Yula smarter. Import your history
                and never start from zero again.
            </p>

            {/* Demo visualization */}
            <div className="mb-6 w-full max-w-md">
                <div className="rounded-xl border border-border bg-foreground/[0.02] p-4">
                    {/* Source icons */}
                    <div className="mb-4 flex items-center justify-center gap-4">
                        <SourceBadge name="ChatGPT" icon={<Bot className="h-5 w-5" />} />
                        <ArrowRight className="h-4 w-4 text-muted-foreground/70" />
                        <SourceBadge name="Yula" icon={<Sparkles className="h-5 w-5" />} highlighted />
                        <ArrowRight className="h-4 w-4 text-muted-foreground/70" />
                        <SourceBadge name="Claude" icon={<Theater className="h-5 w-5" />} />
                    </div>

                    {/* Animated import preview */}
                    <div className="space-y-2">
                        <ImportItem
                            icon={<MessageSquare className="h-4 w-4" />}
                            title="Travel Planning Chat"
                            count={47}
                            delay={0.1}
                        />
                        <ImportItem
                            icon={<FileJson className="h-4 w-4" />}
                            title="Code Review Session"
                            count={128}
                            delay={0.2}
                        />
                        <ImportItem
                            icon={<MessageSquare className="h-4 w-4" />}
                            title="Recipe Brainstorm"
                            count={23}
                            delay={0.3}
                        />
                    </div>
                </div>
            </div>

            {/* Investment Value */}
            <div className="mb-6 w-full max-w-md rounded-lg border border-border bg-foreground/[0.02] p-3">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3.5 w-3.5" style={{ color: ACCENT_COLOR }} />
                    <span className="text-xs font-medium text-foreground">What you gain</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Benefit icon={<Check className="h-3 w-3" />} text="AI knows your style" />
                    <Benefit icon={<Check className="h-3 w-3" />} text="Search all history" />
                    <Benefit icon={<Check className="h-3 w-3" />} text="Context from day one" />
                    <Benefit icon={<Check className="h-3 w-3" />} text="Your data, always yours" />
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

function SourceBadge({
    name,
    icon,
    highlighted = false,
}: {
    name: string;
    icon: React.ReactNode;
    highlighted?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex flex-col items-center gap-1 rounded-lg px-3 py-2',
                highlighted
                    ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30'
                    : 'bg-foreground/5'
            )}
        >
            <span className="text-muted-foreground">{icon}</span>
            <span className="text-xs text-muted-foreground">{name}</span>
        </div>
    );
}

function ImportItem({
    icon,
    title,
    count,
    delay,
}: {
    icon: React.ReactNode;
    title: string;
    count: number;
    delay: number;
}) {
    return (
        <motion.div
            className="flex items-center gap-3 rounded-lg bg-foreground/5 px-3 py-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.3 }}
        >
            <div className="text-muted-foreground">{icon}</div>
            <div className="flex-1">
                <div className="text-sm text-foreground">{title}</div>
                <div className="text-xs text-muted-foreground">{count} messages</div>
            </div>
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: delay + 0.3, type: 'spring' }}
            >
                <Check className="h-4 w-4" style={{ color: ACCENT_COLOR }} />
            </motion.div>
        </motion.div>
    );
}

function Benefit({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div style={{ color: ACCENT_COLOR }}>{icon}</div>
            <span>{text}</span>
        </div>
    );
}
