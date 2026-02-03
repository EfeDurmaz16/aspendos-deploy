'use client';

import { motion } from 'framer-motion';
import { Brain, Lightbulb, ShieldCheck, Warning } from '@phosphor-icons/react';
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
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2',
                    'border border-white/5 bg-white/[0.02]'
                )}
            >
                <div
                    className="flex h-6 w-6 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${definition.color}20` }}
                >
                    <Icon className="h-3.5 w-3.5" color={definition.color} weight="fill" />
                </div>
                <span className="text-sm font-medium text-zinc-300">{definition.name}</span>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
                'relative overflow-hidden rounded-xl',
                'border border-white/10 bg-zinc-900/80 backdrop-blur-xl',
                'shadow-xl shadow-black/20'
            )}
        >
            {/* Header */}
            <div
                className="flex items-center gap-3 border-b border-white/5 p-4"
                style={{ backgroundColor: `${definition.color}10` }}
            >
                <motion.div
                    animate={isThinking ? { rotate: [0, 10, -10, 0] } : {}}
                    transition={{ repeat: isThinking ? Infinity : 0, duration: 2 }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${definition.color}20` }}
                >
                    <Icon className="h-5 w-5" color={definition.color} weight="fill" />
                </motion.div>
                <div>
                    <h3 className="font-semibold text-white">{definition.name}</h3>
                    <p className="text-xs text-zinc-400">{definition.role}</p>
                </div>
                {thought && (
                    <div className="ml-auto flex items-center gap-1">
                        <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: definition.color }}
                        />
                        <span className="text-xs text-zinc-500">
                            {Math.round(thought.confidence * 100)}% confident
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {isThinking && !thought ? (
                    <ThinkingAnimation color={definition.color} text={definition.thinkingStyle} />
                ) : thought ? (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm leading-relaxed text-zinc-300"
                    >
                        {thought.thought}
                    </motion.p>
                ) : (
                    <p className="text-sm text-zinc-500">{definition.description}</p>
                )}
            </div>
        </motion.div>
    );
}

// Thinking animation component
function ThinkingAnimation({ color, text }: { color: string; text: string }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                />
                <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                />
                <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                />
            </div>
            <p className="text-xs italic text-zinc-500">{text}</p>
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

    const sizeClasses = {
        sm: 'h-5 w-5',
        md: 'h-7 w-7',
        lg: 'h-9 w-9',
    };

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5',
    };

    return (
        <div
            className={cn('flex items-center justify-center rounded-lg', sizeClasses[size])}
            style={{ backgroundColor: `${definition.color}20` }}
            title={definition.name}
        >
            <Icon className={iconSizes[size]} color={definition.color} weight="fill" />
        </div>
    );
}
