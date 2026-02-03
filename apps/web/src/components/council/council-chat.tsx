'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperPlaneRight, Users, X, ArrowCounterClockwise } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useCouncil, personaDefinitions } from './use-council';
import { CouncilPersonaCard } from './council-persona';
import { CouncilDeliberation } from './council-deliberation';
import { CouncilVerdictCard } from './council-verdict';
import type { CouncilPersona } from '@/stores/yula-store';

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
        thoughts,
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

    const completedPersonas = (['logic', 'creative', 'prudent', 'devils-advocate'] as CouncilPersona[]).filter(
        hasPersonaResponded
    );

    // Auto-focus input
    useEffect(() => {
        if (!isActive) {
            inputRef.current?.focus();
        }
    }, [isActive]);

    return (
        <div
            className={cn(
                'flex h-full flex-col overflow-hidden rounded-2xl',
                'border border-white/10 bg-zinc-900/95 backdrop-blur-xl',
                'shadow-2xl shadow-black/30',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                        <Users className="h-5 w-5 text-violet-400" weight="fill" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-white">The Council</h2>
                        <p className="text-xs text-zinc-500">Multi-perspective decision making</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isActive && (
                        <button
                            onClick={handleReset}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                            title="Reset"
                        >
                            <ArrowCounterClockwise className="h-4 w-4" />
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <AnimatePresence mode="wait">
                    {!isActive ? (
                        // Welcome state
                        <motion.div
                            key="welcome"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex h-full flex-col items-center justify-center text-center"
                        >
                            <div className="mb-8 flex flex-wrap justify-center gap-3">
                                {(['logic', 'creative', 'prudent', 'devils-advocate'] as CouncilPersona[]).map(
                                    (persona, i) => (
                                        <motion.div
                                            key={persona}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                        >
                                            <CouncilPersonaCard persona={persona} isCompact />
                                        </motion.div>
                                    )
                                )}
                            </div>
                            <h3 className="mb-2 text-xl font-semibold text-white">
                                Summon The Council
                            </h3>
                            <p className="max-w-md text-sm text-zinc-400">
                                Present a question or decision, and four distinct perspectives will
                                deliberate before reaching a consensus.
                            </p>
                        </motion.div>
                    ) : verdict ? (
                        // Verdict state
                        <motion.div
                            key="verdict"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6"
                        >
                            {/* Original question */}
                            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                                    Your Question
                                </p>
                                <p className="mt-1 text-sm text-zinc-300">{submittedQuestion}</p>
                            </div>

                            {/* Verdict */}
                            <CouncilVerdictCard
                                verdict={verdict}
                                onAccept={handleReset}
                                onAskAgain={handleReset}
                            />
                        </motion.div>
                    ) : (
                        // Deliberating state
                        <motion.div
                            key="deliberating"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6"
                        >
                            {/* Original question */}
                            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                                    Deliberating On
                                </p>
                                <p className="mt-1 text-sm text-zinc-300">{submittedQuestion}</p>
                            </div>

                            {/* Deliberation progress */}
                            {isDeliberating && (
                                <CouncilDeliberation
                                    activePersonas={[]}
                                    completedPersonas={completedPersonas}
                                />
                            )}

                            {/* Persona cards */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                {(['logic', 'creative', 'prudent', 'devils-advocate'] as CouncilPersona[]).map(
                                    (persona) => (
                                        <CouncilPersonaCard
                                            key={persona}
                                            persona={persona}
                                            thought={getPersonaThought(persona)}
                                            isThinking={
                                                isDeliberating && !hasPersonaResponded(persona)
                                            }
                                        />
                                    )
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Input Area */}
            {!isActive && (
                <div className="border-t border-white/5 p-4">
                    <div className="relative">
                        <textarea
                            ref={inputRef}
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask the Council for guidance on a decision..."
                            rows={2}
                            className={cn(
                                'w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12',
                                'text-sm text-white placeholder:text-zinc-500',
                                'focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20'
                            )}
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!question.trim()}
                            className={cn(
                                'absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg',
                                'transition-all duration-200',
                                question.trim()
                                    ? 'bg-violet-500 text-white hover:bg-violet-600'
                                    : 'bg-white/5 text-zinc-500'
                            )}
                        >
                            <PaperPlaneRight className="h-4 w-4" weight="fill" />
                        </button>
                    </div>
                    <p className="mt-2 text-center text-xs text-zinc-600">
                        Press Enter to summon the Council
                    </p>
                </div>
            )}
        </div>
    );
}
