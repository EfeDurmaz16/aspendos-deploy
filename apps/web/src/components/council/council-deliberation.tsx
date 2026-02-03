'use client';

import { motion } from 'framer-motion';
import { Sparkle, CircleNotch } from '@phosphor-icons/react';
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                'rounded-xl border border-white/10 bg-zinc-900/80 backdrop-blur-xl',
                'shadow-xl shadow-black/20 p-6'
            )}
        >
            {/* Header */}
            <div className="mb-6 flex items-center justify-center gap-2">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                >
                    <Sparkle className="h-5 w-5 text-violet-400" weight="fill" />
                </motion.div>
                <h3 className="text-lg font-semibold text-white">Council Deliberating</h3>
            </div>

            {/* Persona Status Grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {allPersonas.map((persona) => {
                    const definition = personaDefinitions[persona];
                    const isComplete = completedPersonas.includes(persona);
                    const isActive =
                        activePersonas.includes(persona) ||
                        (!isComplete && completedPersonas.length === allPersonas.indexOf(persona));

                    return (
                        <motion.div
                            key={persona}
                            initial={{ opacity: 0.5 }}
                            animate={{
                                opacity: isComplete || isActive ? 1 : 0.5,
                                scale: isActive ? 1.02 : 1,
                            }}
                            className={cn(
                                'flex flex-col items-center gap-2 rounded-lg p-4',
                                'border transition-all duration-300',
                                isComplete
                                    ? 'border-white/20 bg-white/5'
                                    : isActive
                                        ? 'border-white/10 bg-white/[0.02]'
                                        : 'border-white/5 bg-transparent'
                            )}
                        >
                            {/* Status indicator */}
                            <div className="relative">
                                <div
                                    className={cn(
                                        'flex h-12 w-12 items-center justify-center rounded-xl',
                                        isComplete ? '' : 'animate-pulse'
                                    )}
                                    style={{ backgroundColor: `${definition.color}20` }}
                                >
                                    {isActive && !isComplete ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{
                                                repeat: Infinity,
                                                duration: 1,
                                                ease: 'linear',
                                            }}
                                        >
                                            <CircleNotch
                                                className="h-6 w-6"
                                                color={definition.color}
                                            />
                                        </motion.div>
                                    ) : (
                                        <span
                                            className="text-lg font-bold"
                                            style={{ color: definition.color }}
                                        >
                                            {definition.name[0]}
                                        </span>
                                    )}
                                </div>

                                {/* Completion check */}
                                {isComplete && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500"
                                    >
                                        <span className="text-xs text-white">✓</span>
                                    </motion.div>
                                )}
                            </div>

                            {/* Label */}
                            <div className="text-center">
                                <p
                                    className="text-sm font-medium"
                                    style={{ color: isComplete || isActive ? definition.color : '#71717a' }}
                                >
                                    {definition.name}
                                </p>
                                <p className="text-xs text-zinc-500">
                                    {isComplete ? 'Complete' : isActive ? 'Thinking...' : 'Waiting'}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Progress bar */}
            <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                    <span>Deliberation Progress</span>
                    <span>{Math.round((completedPersonas.length / allPersonas.length) * 100)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{
                            width: `${(completedPersonas.length / allPersonas.length) * 100}%`,
                        }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-amber-500 via-emerald-500 to-red-500"
                    />
                </div>
            </div>
        </motion.div>
    );
}

// Simple thinking dots animation
export function ThinkingDots({ color = '#a78bfa' }: { color?: string }) {
    return (
        <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    animate={{
                        y: [0, -4, 0],
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 0.8,
                        delay: i * 0.15,
                    }}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                />
            ))}
        </div>
    );
}
