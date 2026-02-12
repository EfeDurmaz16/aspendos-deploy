'use client';

import { ArrowRight, Brain, Check, NotionLogo, SlackLogo } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function OnboardingPage() {
    const [step, setStep] = useState(0);
    const router = useRouter();

    const handleNext = () => {
        if (step < 2) {
            setStep(step + 1);
        } else {
            router.push('/chat');
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-zinc-200/20 dark:bg-zinc-800/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-zinc-200/20 dark:bg-zinc-800/10 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-xl w-full relative z-10">
                <AnimatePresence mode="wait">
                    {step === 0 && (
                        <motion.div
                            key="step0"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="text-center space-y-6"
                        >
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-foreground text-background mb-4 shadow-2xl">
                                <Brain weight="duotone" className="w-10 h-10" />
                            </div>
                            <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-foreground">
                                Free your memory.
                            </h1>
                            <p className="text-xl text-muted-foreground leading-relaxed max-w-md mx-auto">
                                Aspendos allows you to offload your thoughts, specialized knowledge,
                                and tasks to a cognitive engine that never forgets.
                            </p>
                            <div className="pt-8">
                                <Button
                                    size="lg"
                                    onClick={handleNext}
                                    className="h-12 px-8 text-base rounded-full shadow-lg hover:shadow-xl transition-all"
                                >
                                    Get Started <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-serif font-medium">
                                    Connect your brain context
                                </h2>
                                <p className="text-muted-foreground">
                                    Import your existing knowledge base to jumpstart your memory.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <IntegrationCard
                                    icon={<NotionLogo className="w-8 h-8" />}
                                    title="Notion"
                                    desc="Sync pages & databases"
                                />
                                <IntegrationCard
                                    icon={<SlackLogo className="w-8 h-8" />}
                                    title="Slack"
                                    desc="Import team conversations"
                                />
                                <IntegrationCard
                                    icon={
                                        <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white font-bold">
                                            G
                                        </div>
                                    }
                                    title="Google Drive"
                                    desc="Index documents & sheets"
                                />
                                <IntegrationCard
                                    icon={
                                        <div className="w-8 h-8 rounded bg-zinc-800 dark:bg-zinc-200" />
                                    }
                                    title="Local Files"
                                    desc="Upload PDFs and MDs"
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button
                                    variant="ghost"
                                    onClick={handleNext}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    Skip for now
                                </Button>
                                <Button onClick={handleNext} className="ml-2 rounded-full px-6">
                                    Continue
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="text-center space-y-8"
                        >
                            <div className="space-y-4">
                                <h2 className="text-3xl font-serif font-medium">You're all set.</h2>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    Your personal cognitive engine is ready. Start by asking a
                                    question or importing your first document.
                                </p>
                            </div>

                            <div className="glass-card p-1 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 border border-border/50 shadow-inner">
                                <div className="bg-background rounded-xl p-8 space-y-4">
                                    <div className="flex items-start gap-4 text-left">
                                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-none">
                                            <Brain className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">Aspendos</p>
                                            <p className="text-sm text-muted-foreground">
                                                Example: "Review the quarterly report I uploaded and
                                                summarize the key risks."
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button
                                    size="lg"
                                    onClick={handleNext}
                                    className="h-12 px-10 text-base rounded-full shadow-lg bg-foreground text-background hover:bg-foreground/90"
                                >
                                    Enter Aspendos
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Progress Dots */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className={cn(
                            'w-2 h-2 rounded-full transition-all duration-300',
                            step === i ? 'bg-foreground w-6' : 'bg-border'
                        )}
                    />
                ))}
            </div>
        </div>
    );
}

function IntegrationCard({
    icon,
    title,
    desc,
}: {
    icon: React.ReactNode;
    title: string;
    desc: string;
}) {
    const [selected, setSelected] = useState(false);
    return (
        <Card
            className={cn(
                'p-4 cursor-pointer transition-all border-border/60 hover:border-foreground/20 hover:shadow-md',
                selected && 'ring-2 ring-primary border-transparent bg-primary/5'
            )}
            onClick={() => setSelected(!selected)}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    {icon}
                    <div className="text-left">
                        <h3 className="font-medium text-sm">{title}</h3>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                </div>
                {selected && (
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check size={12} weight="bold" />
                    </div>
                )}
            </div>
        </Card>
    );
}
