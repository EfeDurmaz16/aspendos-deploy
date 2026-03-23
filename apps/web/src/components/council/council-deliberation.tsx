'use client';

import { Check } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CouncilPersona } from '@/stores/yula-store';
import { personaDefinitions } from './use-council';

interface CouncilDeliberationProps {
    activePersonas: CouncilPersona[];
    completedPersonas: CouncilPersona[];
}

export function CouncilDeliberation({
    activePersonas,
    completedPersonas,
}: CouncilDeliberationProps) {
    const allPersonas: CouncilPersona[] = ['logic', 'creative', 'prudent', 'devils-advocate'];
    const progress = (completedPersonas.length / allPersonas.length) * 100;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('rounded-lg border border-border bg-card p-5')}
        >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
                <h3 className="text-[13px] font-medium tracking-wide text-foreground">
                    Council Deliberating
                </h3>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                    {completedPersonas.length}/{allPersonas.length}
                </span>
            </div>

            {/* Persona Status Row */}
            <div className="flex items-center gap-6">
                {allPersonas.map((persona) => {
                    const definition = personaDefinitions[persona];
                    const isComplete = completedPersonas.includes(persona);
                    const isActive =
                        activePersonas.includes(persona) ||
                        (!isComplete && completedPersonas.length === allPersonas.indexOf(persona));

                    return (
                        <motion.div
                            key={persona}
                            initial={{ opacity: 0.4 }}
                            animate={{
                                opacity: isComplete || isActive ? 1 : 0.4,
                            }}
                            className="flex flex-col items-center gap-2"
                        >
                            {/* Circular indicator */}
                            <div className="relative">
                                <div
                                    className={cn(
                                        'flex h-8 w-8 items-center justify-center rounded-full border transition-colors duration-300',
                                        isComplete
                                            ? 'border-foreground/20 bg-foreground/5'
                                            : isActive
                                              ? 'border-border bg-transparent'
                                              : 'border-border/50 bg-transparent'
                                    )}
                                >
                                    {isComplete ? (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 500,
                                                damping: 30,
                                            }}
                                        >
                                            <Check
                                                size={14}
                                                className="text-foreground"
                                                weight="bold"
                                            />
                                        </motion.div>
                                    ) : isActive ? (
                                        <ThinkingDots />
                                    ) : (
                                        <span className="text-[11px] font-medium text-muted-foreground">
                                            {definition.name[0]}
                                        </span>
                                    )}
                                </div>

                                {/* Subtle persona tint ring when active */}
                                {isActive && (
                                    <motion.div
                                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 2,
                                            ease: 'easeInOut',
                                        }}
                                        className="absolute inset-0 rounded-full"
                                        style={{
                                            boxShadow: `0 0 0 1px ${definition.cssVar}`,
                                            opacity: 0.3,
                                        }}
                                    />
                                )}
                            </div>

                            {/* Label */}
                            <span
                                className={cn(
                                    'text-[11px] transition-colors duration-300',
                                    isComplete || isActive
                                        ? 'text-foreground/70'
                                        : 'text-muted-foreground/50'
                                )}
                            >
                                {definition.name}
                            </span>
                        </motion.div>
                    );
                })}
            </div>

            {/* Progress bar - clean horizontal, monochrome */}
            <div className="mt-5">
                <div className="h-px w-full bg-border">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="h-full bg-foreground/30"
                    />
                </div>
            </div>
        </motion.div>
    );
}

// Simple thinking dots animation - monochrome
export function ThinkingDots() {
    return (
        <div className="flex items-center gap-0.5">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    animate={{
                        y: [0, -2, 0],
                        opacity: [0.3, 0.8, 0.3],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 0.8,
                        delay: i * 0.15,
                        ease: 'easeInOut',
                    }}
                    className="h-1 w-1 rounded-full bg-muted-foreground"
                />
            ))}
        </div>
    );
}
