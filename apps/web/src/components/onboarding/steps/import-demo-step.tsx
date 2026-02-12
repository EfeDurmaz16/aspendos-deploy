'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Check, Download, FileJson, MessageSquare } from 'lucide-react';
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

            <h2 className="mb-2 text-2xl font-bold text-white">Import Your History</h2>
            <p className="mb-6 text-center text-sm text-zinc-400 max-w-sm">
                Bring your ChatGPT and Claude conversations to YULA. Your AI history, all in one
                place.
            </p>

            {/* Demo visualization */}
            <div className="mb-6 w-full max-w-md">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    {/* Source icons */}
                    <div className="mb-4 flex items-center justify-center gap-4">
                        <SourceBadge name="ChatGPT" icon="🤖" />
                        <ArrowRight className="h-4 w-4 text-zinc-600" />
                        <SourceBadge name="YULA" icon="✨" highlighted />
                        <ArrowRight className="h-4 w-4 text-zinc-600" />
                        <SourceBadge name="Claude" icon="🎭" />
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

            {/* Benefits */}
            <div className="mb-6 grid w-full max-w-md grid-cols-2 gap-3">
                <Benefit icon={<Check className="h-3 w-3" />} text="Preserve context" />
                <Benefit icon={<Check className="h-3 w-3" />} text="Search everything" />
                <Benefit icon={<Check className="h-3 w-3" />} text="No vendor lock-in" />
                <Benefit icon={<Check className="h-3 w-3" />} text="Export anytime" />
            </div>

            {/* Actions */}
            <div className="flex w-full max-w-md items-center justify-between">
                <button
                    onClick={onSkip}
                    className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                >
                    Skip tour
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={onPrev}
                        className={cn(
                            'rounded-lg px-4 py-2 text-sm font-medium',
                            'border border-white/10 text-white',
                            'transition-colors hover:bg-white/5'
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
    icon: string;
    highlighted?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex flex-col items-center gap-1 rounded-lg px-3 py-2',
                highlighted
                    ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30'
                    : 'bg-white/5'
            )}
        >
            <span className="text-lg">{icon}</span>
            <span className="text-xs text-zinc-400">{name}</span>
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
            className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.3 }}
        >
            <div className="text-zinc-500">{icon}</div>
            <div className="flex-1">
                <div className="text-sm text-white">{title}</div>
                <div className="text-xs text-zinc-500">{count} messages</div>
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
        <div className="flex items-center gap-2 text-sm text-zinc-400">
            <div style={{ color: ACCENT_COLOR }}>{icon}</div>
            <span>{text}</span>
        </div>
    );
}
