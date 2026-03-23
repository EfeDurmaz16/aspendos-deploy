'use client';

import { Brain, Lightbulb, Scales, ShieldCheck, Warning } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CouncilPersona, CouncilVerdict as CouncilVerdictType } from '@/stores/yula-store';
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn('overflow-hidden rounded-lg', 'border border-border bg-card')}
        >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <Scales size={20} className="text-foreground" weight="regular" />
                <div className="flex-1">
                    <h2 className="text-[15px] font-semibold text-foreground">Council Verdict</h2>
                    {hasConfidence && (
                        <div className="mt-1 flex items-center gap-2">
                            <div className="h-1 w-16 overflow-hidden rounded-full bg-border">
                                <div
                                    className="h-full rounded-full bg-foreground/40"
                                    style={{ width: `${confidencePercent}%` }}
                                />
                            </div>
                            <span className="text-[11px] tabular-nums text-muted-foreground">
                                {confidencePercent}% consensus
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Recommendation */}
            <div className="border-b border-border px-5 py-4">
                <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Recommendation
                </h3>
                <p className="text-[14px] leading-relaxed text-foreground/90">
                    {verdict.recommendation}
                </p>
            </div>

            {/* Reasoning */}
            <div className="border-b border-border px-5 py-4">
                <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Reasoning
                </h3>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {verdict.reasoning}
                </p>
            </div>

            {/* Individual Contributions */}
            <div className="px-5 py-4">
                <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Council Contributions
                </h3>
                <div className="space-y-2">
                    {(Object.entries(verdict.contributions) as [CouncilPersona, string][]).map(
                        ([persona, contribution], index) => {
                            const definition = personaDefinitions[persona];
                            const Icon = personaIcons[persona];

                            return (
                                <motion.div
                                    key={persona}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.08 }}
                                    className="flex gap-3 rounded-md border border-border bg-muted/30 p-3"
                                    style={{
                                        borderLeftWidth: '2px',
                                        borderLeftColor: definition.cssVar,
                                    }}
                                >
                                    <Icon
                                        size={16}
                                        className="mt-0.5 shrink-0 text-muted-foreground"
                                        weight="regular"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-medium text-foreground/70">
                                            {definition.name}
                                        </p>
                                        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
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
            <div className="flex items-center gap-2 border-t border-border px-5 py-3">
                <Button variant="primary" size="sm" onClick={onAccept} className="flex-1">
                    Accept Verdict
                </Button>
                <Button variant="secondary" size="sm" onClick={onAskAgain}>
                    Ask Again
                </Button>
            </div>
        </motion.div>
    );
}
