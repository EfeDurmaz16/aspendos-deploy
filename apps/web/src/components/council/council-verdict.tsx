'use client';

import { motion } from 'framer-motion';
import { Scales, CheckCircle, Brain, Lightbulb, ShieldCheck, Warning } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { CouncilVerdict as CouncilVerdictType, CouncilPersona } from '@/stores/yula-store';
import { personaDefinitions } from './use-council';

interface CouncilVerdictProps {
    verdict: CouncilVerdictType;
    onAccept?: () => void;
    onAskAgain?: () => void;
}

const personaIcons: Record<CouncilPersona, typeof Brain> = {
    logic: Brain,
    creative: Lightbulb,
    prudent: ShieldCheck,
    'devils-advocate': Warning,
};

export function CouncilVerdictCard({ verdict, onAccept, onAskAgain }: CouncilVerdictProps) {
    const hasConfidence = verdict.confidence !== undefined && verdict.confidence !== null;
    const confidencePercent = hasConfidence ? Math.round((verdict.confidence as number) * 100) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
                'overflow-hidden rounded-2xl',
                'border border-white/10 bg-zinc-900/90 backdrop-blur-xl',
                'shadow-2xl shadow-black/30'
            )}
        >
            {/* Header with glow effect */}
            <div className="relative border-b border-white/5 bg-gradient-to-r from-blue-500/10 via-amber-500/10 via-emerald-500/10 to-red-500/10 p-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-amber-500/5 via-emerald-500/5 to-red-500/5 blur-xl" />
                <div className="relative flex items-center gap-4">
                    <motion.div
                        initial={{ rotate: -10 }}
                        animate={{ rotate: 0 }}
                        className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10"
                    >
                        <Scales className="h-7 w-7 text-violet-400" weight="fill" />
                    </motion.div>
                    <div>
                        <h2 className="text-xl font-semibold text-white">Council Verdict</h2>
                        {hasConfidence && (
                            <div className="mt-1 flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <div
                                        className={cn(
                                            'h-2 w-2 rounded-full',
                                            confidencePercent >= 80
                                                ? 'bg-emerald-400'
                                                : confidencePercent >= 60
                                                    ? 'bg-amber-400'
                                                    : 'bg-red-400'
                                        )}
                                    />
                                    <span className="text-sm text-zinc-400">
                                        {confidencePercent}% consensus confidence
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Recommendation */}
            <div className="border-b border-white/5 p-6">
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
                    Recommendation
                </h3>
                <p className="text-base leading-relaxed text-zinc-200">{verdict.recommendation}</p>
            </div>

            {/* Reasoning */}
            <div className="border-b border-white/5 p-6">
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
                    Reasoning
                </h3>
                <p className="text-sm leading-relaxed text-zinc-400">{verdict.reasoning}</p>
            </div>

            {/* Individual Contributions */}
            <div className="p-6">
                <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">
                    Council Contributions
                </h3>
                <div className="space-y-3">
                    {(Object.entries(verdict.contributions) as [CouncilPersona, string][]).map(
                        ([persona, contribution]) => {
                            const definition = personaDefinitions[persona];
                            const Icon = personaIcons[persona];

                            return (
                                <motion.div
                                    key={persona}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: (['logic', 'creative', 'prudent', 'devils-advocate'] as CouncilPersona[]).indexOf(persona) * 0.1 }}
                                    className="flex gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"
                                >
                                    <div
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                        style={{ backgroundColor: `${definition.color}20` }}
                                    >
                                        <Icon
                                            className="h-4 w-4"
                                            color={definition.color}
                                            weight="fill"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className="text-xs font-medium"
                                            style={{ color: definition.color }}
                                        >
                                            {definition.name}
                                        </p>
                                        <p className="mt-0.5 truncate text-sm text-zinc-400">
                                            {contribution}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        }
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 border-t border-white/5 bg-white/[0.02] px-6 py-4">
                <button
                    onClick={onAccept}
                    className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5',
                        'bg-emerald-500/10 text-emerald-400 transition-colors',
                        'hover:bg-emerald-500/20'
                    )}
                >
                    <CheckCircle className="h-4 w-4" weight="fill" />
                    <span className="text-sm font-medium">Accept Verdict</span>
                </button>
                <button
                    onClick={onAskAgain}
                    className={cn(
                        'flex items-center justify-center gap-2 rounded-lg px-4 py-2.5',
                        'border border-white/10 bg-white/5 text-zinc-400 transition-colors',
                        'hover:bg-white/10 hover:text-white'
                    )}
                >
                    <span className="text-sm font-medium">Ask Again</span>
                </button>
            </div>
        </motion.div>
    );
}
