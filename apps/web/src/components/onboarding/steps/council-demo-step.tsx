'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Brain, Palette, Shield, Users, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Feature accent color: Electric Violet
const ACCENT_COLOR = '#7C3AED';

interface CouncilDemoStepProps {
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
}

// AI personas for the council
const PERSONAS = [
    {
        id: 'logical',
        name: 'Logic',
        icon: <Brain className="h-5 w-5" />,
        model: 'Claude',
        color: '#3B82F6',
        trait: 'Analytical',
        response: 'Based on the data patterns, I recommend...',
    },
    {
        id: 'creative',
        name: 'Creative',
        icon: <Palette className="h-5 w-5" />,
        model: 'GPT-4',
        color: '#EC4899',
        trait: 'Innovative',
        response: 'What if we approached this differently...',
    },
    {
        id: 'prudent',
        name: 'Prudent',
        icon: <Shield className="h-5 w-5" />,
        model: 'Gemini',
        color: '#10B981',
        trait: 'Cautious',
        response: 'We should consider the risks of...',
    },
    {
        id: 'swift',
        name: 'Swift',
        icon: <Zap className="h-5 w-5" />,
        model: 'Groq',
        color: '#F59E0B',
        trait: 'Fast',
        response: 'The quick answer is...',
    },
];

export function CouncilDemoStep({ onNext, onPrev, onSkip }: CouncilDemoStepProps) {
    const [activePersonas, setActivePersonas] = useState<string[]>([]);
    const [selectedPersona, setSelectedPersona] = useState<string | null>(null);

    // Animate personas appearing one by one
    useEffect(() => {
        const delays = [300, 600, 900, 1200];
        const timers = PERSONAS.map((persona, i) =>
            setTimeout(() => {
                setActivePersonas((prev) => [...prev, persona.id]);
            }, delays[i])
        );

        // Auto-select one after all appear
        const selectTimer = setTimeout(() => {
            setSelectedPersona('logical');
        }, 2000);

        return () => {
            timers.forEach(clearTimeout);
            clearTimeout(selectTimer);
        };
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
                className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${ACCENT_COLOR}20` }}
            >
                <Users className="h-8 w-8" style={{ color: ACCENT_COLOR }} />
            </div>

            <h2 className="mb-2 text-2xl font-bold text-foreground">The AI Council</h2>
            <p className="mb-6 text-center text-sm text-muted-foreground max-w-sm">
                Why trust one AI when you can hear from four? Every question sparks
                a unique debate — you'll never get the same answer twice.
            </p>

            {/* Demo visualization */}
            <div className="mb-6 w-full max-w-md">
                <div className="rounded-xl border border-border bg-foreground/[0.02] p-4">
                    {/* Question */}
                    <div className="mb-4 rounded-lg bg-foreground/5 px-4 py-3">
                        <div className="text-xs text-muted-foreground mb-1">Your question</div>
                        <div className="text-sm text-foreground">
                            "Should I take this job offer or negotiate?"
                        </div>
                    </div>

                    {/* Personas grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {PERSONAS.map((persona) => (
                            <PersonaCard
                                key={persona.id}
                                persona={persona}
                                isActive={activePersonas.includes(persona.id)}
                                isSelected={selectedPersona === persona.id}
                                onClick={() => setSelectedPersona(persona.id)}
                            />
                        ))}
                    </div>

                    {/* Selected response preview */}
                    {selectedPersona && (
                        <motion.div
                            className="mt-4 rounded-lg border border-border bg-foreground/5 p-3"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div
                                    className="h-5 w-5 rounded-full flex items-center justify-center text-white"
                                    style={{
                                        backgroundColor: PERSONAS.find(
                                            (p) => p.id === selectedPersona
                                        )?.color,
                                    }}
                                >
                                    {PERSONAS.find((p) => p.id === selectedPersona)?.icon}
                                </div>
                                <span className="text-xs font-medium text-foreground">
                                    {PERSONAS.find((p) => p.id === selectedPersona)?.name}'s
                                    Response
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {PERSONAS.find((p) => p.id === selectedPersona)?.response}
                            </p>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Variable reward stats */}
            <div className="mb-6 w-full max-w-md flex items-center justify-center gap-6 text-center">
                <div>
                    <div className="text-2xl font-bold" style={{ color: ACCENT_COLOR }}>4</div>
                    <div className="text-xs text-muted-foreground">Minds</div>
                </div>
                <div className="h-8 w-px bg-foreground/10" />
                <div>
                    <div className="text-2xl font-bold" style={{ color: ACCENT_COLOR }}>1</div>
                    <div className="text-xs text-muted-foreground">Question</div>
                </div>
                <div className="h-8 w-px bg-foreground/10" />
                <div>
                    <div className="text-2xl font-bold" style={{ color: ACCENT_COLOR }}>&#x221e;</div>
                    <div className="text-xs text-muted-foreground">Surprises</div>
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

function PersonaCard({
    persona,
    isActive,
    isSelected,
    onClick,
}: {
    persona: (typeof PERSONAS)[number];
    isActive: boolean;
    isSelected: boolean;
    onClick: () => void;
}) {
    return (
        <motion.button
            className={cn(
                'relative rounded-lg border p-3 text-left transition-all',
                isSelected
                    ? 'border-border bg-foreground/10'
                    : 'border-border bg-foreground/[0.02] hover:bg-foreground/5'
            )}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            onClick={onClick}
            disabled={!isActive}
        >
            {/* Loading indicator before active */}
            {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/60" />
                </div>
            )}

            <div className={cn('transition-opacity', !isActive && 'opacity-0')}>
                <div className="flex items-center gap-2 mb-1">
                    <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: persona.color }}
                    >
                        {persona.icon}
                    </div>
                    <span className="text-sm font-medium text-foreground">{persona.name}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{persona.trait}</span>
                    <span className="text-xs text-muted-foreground/70">{persona.model}</span>
                </div>
            </div>

            {/* Streaming indicator when active */}
            {isActive && !isSelected && (
                <motion.div
                    className="absolute bottom-2 right-2 flex gap-0.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="h-1 w-1 rounded-full bg-foreground/40"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                    ))}
                </motion.div>
            )}
        </motion.button>
    );
}
