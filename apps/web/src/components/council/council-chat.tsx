'use client';

import { ArrowCounterClockwise, ArrowUp, Scales, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CouncilPersona } from '@/stores/yula-store';
import { CouncilDeliberation } from './council-deliberation';
import { CouncilPersonaCard } from './council-persona';
import { CouncilVerdictCard } from './council-verdict';
import { useCouncil } from './use-council';

interface CouncilChatProps {
    className?: string;
    onClose?: () => void;
}

export function CouncilChat({ className, onClose }: CouncilChatProps) {
    const [question, setQuestion] = useState('');
    const [submittedQuestion, setSubmittedQuestion] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const {
        isActive,
        isDeliberating,
        verdict,
        askCouncil,
        reset,
        hasPersonaResponded,
        getPersonaThought,
    } = useCouncil();

    const handleSubmit = useCallback(() => {
        if (!question.trim()) return;
        setSubmittedQuestion(question);
        askCouncil(question);
        setQuestion('');
    }, [question, askCouncil]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
            }
        },
        [handleSubmit]
    );

    const handleReset = useCallback(() => {
        reset();
        setSubmittedQuestion('');
        setQuestion('');
        inputRef.current?.focus();
    }, [reset]);

    const completedPersonas = (
        ['logic', 'creative', 'prudent', 'devils-advocate'] as CouncilPersona[]
    ).filter(hasPersonaResponded);

    // Auto-focus input
    useEffect(() => {
        if (!isActive) {
            inputRef.current?.focus();
        }
    }, [isActive]);

    return (
        <div
            className={cn(
                'flex h-full flex-col overflow-hidden rounded-lg',
                'border border-border bg-background',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-3">
                    <Scales size={18} className="text-foreground" weight="regular" />
                    <div>
                        <h2 className="text-[14px] font-semibold text-foreground">The Council</h2>
                        <p className="text-[11px] text-muted-foreground">
                            Multi-perspective deliberation
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {isActive && (
                        <Button variant="ghost" size="icon-sm" onClick={handleReset} title="Reset">
                            <ArrowCounterClockwise size={16} />
                        </Button>
                    )}
                    {onClose && (
                        <Button variant="ghost" size="icon-sm" onClick={onClose}>
                            <X size={16} />
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
                <AnimatePresence mode="wait">
                    {!isActive ? (
                        /* Welcome state - clean, typographic */
                        <motion.div
                            key="welcome"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex h-full flex-col items-center justify-center text-center"
                        >
                            <div className="mb-6 flex flex-wrap justify-center gap-2">
                                {(
                                    [
                                        'logic',
                                        'creative',
                                        'prudent',
                                        'devils-advocate',
                                    ] as CouncilPersona[]
                                ).map((persona, i) => (
                                    <motion.div
                                        key={persona}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.08 }}
                                    >
                                        <CouncilPersonaCard persona={persona} isCompact />
                                    </motion.div>
                                ))}
                            </div>
                            <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                                Summon The Council
                            </h3>
                            <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                                Present a question or decision, and four distinct perspectives will
                                deliberate before reaching a consensus.
                            </p>
                        </motion.div>
                    ) : verdict ? (
                        /* Verdict state */
                        <motion.div
                            key="verdict"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            {/* Original question */}
                            <div className="rounded-md border border-border bg-muted/50 px-4 py-3">
                                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                    Your Question
                                </p>
                                <p className="mt-1 text-[13px] text-foreground/80">
                                    {submittedQuestion}
                                </p>
                            </div>

                            {/* Verdict */}
                            <CouncilVerdictCard
                                verdict={verdict}
                                onAccept={handleReset}
                                onAskAgain={handleReset}
                            />
                        </motion.div>
                    ) : (
                        /* Deliberating state */
                        <motion.div
                            key="deliberating"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            {/* Original question */}
                            <div className="rounded-md border border-border bg-muted/50 px-4 py-3">
                                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                    Deliberating On
                                </p>
                                <p className="mt-1 text-[13px] text-foreground/80">
                                    {submittedQuestion}
                                </p>
                            </div>

                            {/* Deliberation progress */}
                            {isDeliberating && (
                                <CouncilDeliberation
                                    activePersonas={[]}
                                    completedPersonas={completedPersonas}
                                />
                            )}

                            {/* Persona cards */}
                            <div className="grid gap-3 md:grid-cols-2">
                                {(
                                    [
                                        'logic',
                                        'creative',
                                        'prudent',
                                        'devils-advocate',
                                    ] as CouncilPersona[]
                                ).map((persona) => (
                                    <CouncilPersonaCard
                                        key={persona}
                                        persona={persona}
                                        thought={getPersonaThought(persona)}
                                        isThinking={isDeliberating && !hasPersonaResponded(persona)}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Input Area */}
            {!isActive && (
                <div className="border-t border-border p-4">
                    <div className="relative">
                        <textarea
                            ref={inputRef}
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask the Council for guidance..."
                            rows={2}
                            className={cn(
                                'w-full resize-none rounded-lg border border-border bg-muted/50 px-4 py-3 pr-12',
                                'text-[13px] text-foreground placeholder:text-muted-foreground',
                                'focus:border-foreground/20 focus:outline-none focus:ring-1 focus:ring-foreground/10'
                            )}
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!question.trim()}
                            className={cn(
                                'absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-md',
                                'transition-all duration-150',
                                question.trim()
                                    ? 'bg-foreground text-background hover:bg-foreground/90'
                                    : 'bg-muted text-muted-foreground'
                            )}
                        >
                            <ArrowUp size={14} weight="bold" />
                        </button>
                    </div>
                    <p className="mt-1.5 text-center text-[11px] text-muted-foreground/60">
                        Press Enter to summon the Council
                    </p>
                </div>
            )}
        </div>
    );
}
