'use client';

import { Brain, Lightbulb, ShieldCheck, Warning } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CouncilPersona, CouncilThought } from '@/stores/yula-store';
import { personaDefinitions } from './use-council';

interface CouncilPersonaCardProps {
    persona: CouncilPersona;
    thought?: CouncilThought;
    isThinking?: boolean;
    isCompact?: boolean;
}

const personaIcons: Record<CouncilPersona, typeof Brain> = {
    logic: Brain,
    creative: Lightbulb,
    prudent: ShieldCheck,
    'devils-advocate': Warning,
};

export function CouncilPersonaCard({
    persona,
    thought,
    isThinking = false,
    isCompact = false,
}: CouncilPersonaCardProps) {
    const definition = personaDefinitions[persona];
    const Icon = personaIcons[persona];

    if (isCompact) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-1.5',
                    'border border-border bg-muted/50'
                )}
            >
                <Icon size={14} className="text-muted-foreground" weight="regular" />
                <span className="text-[13px] font-medium text-foreground/80">
                    {definition.name}
                </span>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn('relative overflow-hidden rounded-lg', 'border border-border bg-card')}
            style={{ borderLeftWidth: '2px', borderLeftColor: definition.cssVar }}
        >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3">
                <motion.div
                    animate={isThinking ? { opacity: [0.5, 1, 0.5] } : {}}
                    transition={{
                        repeat: isThinking ? Infinity : 0,
                        duration: 2,
                        ease: 'easeInOut',
                    }}
                >
                    <Icon size={18} className="text-muted-foreground" weight="regular" />
                </motion.div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-[13px] font-semibold text-foreground">{definition.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{definition.role}</p>
                </div>
                {thought && (
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                        {Math.round(thought.confidence * 100)}%
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="px-4 pb-4">
                {isThinking && !thought ? (
                    <ThinkingAnimation text={definition.thinkingStyle} />
                ) : thought ? (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[13px] leading-relaxed text-foreground/80"
                    >
                        {thought.thought}
                    </motion.p>
                ) : (
                    <p className="text-[13px] text-muted-foreground">{definition.description}</p>
                )}
            </div>
        </motion.div>
    );
}

// Thinking animation component - monochrome pulsing dots
function ThinkingAnimation({ text }: { text: string }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        animate={{ opacity: [0.2, 0.6, 0.2] }}
                        transition={{
                            repeat: Infinity,
                            duration: 1.2,
                            delay: i * 0.2,
                            ease: 'easeInOut',
                        }}
                        className="h-1 w-1 rounded-full bg-muted-foreground"
                    />
                ))}
            </div>
            <p className="text-[11px] italic text-muted-foreground">{text}</p>
        </div>
    );
}

// Mini persona indicator
export function PersonaIndicator({
    persona,
    size = 'md',
}: {
    persona: CouncilPersona;
    size?: 'sm' | 'md' | 'lg';
}) {
    const definition = personaDefinitions[persona];
    const Icon = personaIcons[persona];

    const sizeMap = {
        sm: { container: 'h-5 w-5', icon: 12 },
        md: { container: 'h-7 w-7', icon: 16 },
        lg: { container: 'h-9 w-9', icon: 20 },
    };

    const s = sizeMap[size];

    return (
        <div
            className={cn('flex items-center justify-center rounded-md bg-muted', s.container)}
            style={{
                borderLeft: `2px solid ${definition.cssVar}`,
            }}
            title={definition.name}
        >
            <Icon size={s.icon} className="text-muted-foreground" weight="regular" />
        </div>
    );
}
