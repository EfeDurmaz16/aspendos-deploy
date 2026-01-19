'use client';

import {
    ArrowLeft,
    ArrowRight,
    Brain,
    CheckCircle,
    CloudArrowUp,
    ShieldCheck,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(1);

    const nextStep = () => {
        if (step < TOTAL_STEPS) {
            setDirection(1);
            setStep(step + 1);
        }
    };

    const prevStep = () => {
        if (step > 1) {
            setDirection(-1);
            setStep(step - 1);
        }
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 50 : -50,
            opacity: 0,
        }),
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-zinc-950 font-sans relative overflow-hidden">
            {/* Gradient mesh background */}
            <div className="absolute inset-0 pointer-events-none -z-10">
                <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-gradient-to-br from-purple-100/20 to-transparent dark:from-purple-900/15 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-1/3 w-[600px] h-[600px] bg-gradient-to-bl from-emerald-100/20 to-transparent dark:from-emerald-900/15 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-tr from-blue-100/15 to-transparent dark:from-blue-900/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            </div>

            {/* Progress Bar */}
            <div className="fixed top-0 left-0 w-full h-1.5 bg-zinc-200/60 dark:bg-zinc-900/60 backdrop-blur z-50">
                <motion.div
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-500/30"
                    initial={{ width: '0%' }}
                    animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
            </div>

            <div className="w-full max-w-2xl">
                <div className="mb-12 text-center">
                    <span className="font-serif text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        ASPENDOS
                    </span>
                </div>

                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={step}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="w-full"
                    >
                        {step === 1 && <Step1_Identity />}
                        {step === 2 && <Step2_Import />}
                        {step === 3 && <Step3_Memory />}
                        {step === 4 && <Step4_Safety />}
                        {step === 5 && <Step5_Ready />}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Footer */}
                <div className="mt-12 flex justify-between items-center px-4">
                    {step > 1 && step < 5 ? (
                        <Button
                            variant="ghost"
                            onClick={prevStep}
                            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                        >
                            <ArrowLeft className="mr-2 w-4 h-4" weight="bold" /> Back
                        </Button>
                    ) : (
                        <div /> /* Spacer */
                    )}

                    {step < 5 && (
                        <Button
                            onClick={nextStep}
                            className="px-8 min-w-[140px] bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                            Continue <ArrowRight className="ml-2 w-4 h-4" weight="bold" />
                        </Button>
                    )}

                    {step === 5 && (
                        <Button className="px-8 min-w-[140px] bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all" asChild>
                            <Link href="/chat">
                                Enter OS <ArrowRight className="ml-2 w-4 h-4" weight="bold" />
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

// -- STEPS --

function Step1_Identity() {
    return (
        <div className="space-y-6 text-center">
            <div className="inline-flex justify-center items-center w-16 h-16 rounded-2xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur border border-zinc-200 dark:border-zinc-800 shadow-lg mb-4">
                <span className="text-2xl">👋</span>
            </div>
            <div>
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                    Welcome to the OS.
                </h2>
                <p className="text-lg text-zinc-600 dark:text-zinc-400">Let's set up your profile.</p>
            </div>

            <Card className="text-left bg-white/60 dark:bg-zinc-900/60 backdrop-blur border-zinc-200 dark:border-zinc-800 shadow-lg max-w-md mx-auto">
                <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Full Name</Label>
                        <Input
                            defaultValue="Efe Baran Durmaz"
                            className="rounded-xl border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Role</Label>
                        <select className="flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all">
                            <option>Select a role...</option>
                            <option>Founder</option>
                            <option>Developer</option>
                            <option>Researcher</option>
                            <option>Creative</option>
                        </select>
                        <p className="text-xs text-zinc-500">
                            This helps us choose default models for you.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function Step2_Import() {
    return (
        <div className="space-y-6 text-center">
            <div className="inline-flex justify-center items-center w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 mb-4">
                <CloudArrowUp size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
                <h2 className="font-serif text-3xl mb-2">Don't start from zero.</h2>
                <p className="text-zinc-500 max-w-sm mx-auto">
                    Import your history from ChatGPT or Claude to jumpstart your memory graph.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                <button className="flex flex-col items-center p-6 border rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 transition-all text-center space-y-3 group bg-white dark:bg-black">
                    <div className="w-10 h-10 rounded-full bg-[#74aa9c] flex items-center justify-center text-white font-bold">
                        O
                    </div>
                    <div className="font-medium">Import ChatGPT</div>
                    <p className="text-xs text-zinc-500">Upload .zip export</p>
                </button>
                <button className="flex flex-col items-center p-6 border rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 transition-all text-center space-y-3 group bg-white dark:bg-black">
                    <div className="w-10 h-10 rounded-full bg-[#d97757] flex items-center justify-center text-white font-serif italic">
                        Cl
                    </div>
                    <div className="font-medium">Import Claude</div>
                    <p className="text-xs text-zinc-500">Connect via API</p>
                </button>
            </div>
            <p className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600 underline underline-offset-4">
                Skip for now
            </p>
        </div>
    );
}

function Step3_Memory() {
    return (
        <div className="space-y-6 text-center">
            <div className="inline-flex justify-center items-center w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 mb-4">
                <Brain size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
                <h2 className="font-serif text-3xl mb-2">Seed your memory.</h2>
                <p className="text-zinc-500">
                    Tell Aspendos 3 facts about you that it should never forget.
                </p>
            </div>

            <Card className="text-left border-zinc-200 dark:border-zinc-800 shadow-sm max-w-md mx-auto">
                <CardContent className="pt-6 space-y-4">
                    <Input placeholder="e.g. I code in Python and Rust" />
                    <Input placeholder="e.g. My startup creates AI tools" />
                    <Input placeholder="e.g. I prefer concise, technical answers" />

                    <div className="flex flex-wrap gap-2 pt-2">
                        <span className="text-[11px] uppercase font-medium text-zinc-400">
                            Quick Add:
                        </span>
                        <button className="px-2 py-1 rounded-md bg-zinc-100 text-xs text-zinc-600 hover:bg-zinc-200">
                            I use Next.js
                        </button>
                        <button className="px-2 py-1 rounded-md bg-zinc-100 text-xs text-zinc-600 hover:bg-zinc-200">
                            Concise Mode
                        </button>
                        <button className="px-2 py-1 rounded-md bg-zinc-100 text-xs text-zinc-600 hover:bg-zinc-200">
                            No emojis
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function Step4_Safety() {
    return (
        <div className="space-y-6 text-center">
            <div className="inline-flex justify-center items-center w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 mb-4">
                <ShieldCheck size={24} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
                <h2 className="font-serif text-3xl mb-2">Your Data Rights.</h2>
                <p className="text-zinc-500">Aspendos is a private OS. You own your memory.</p>
            </div>

            <div className="max-w-md mx-auto space-y-4 text-left bg-white dark:bg-zinc-900 border rounded-xl p-6 shadow-sm">
                <div className="flex gap-4">
                    <CheckCircle
                        className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5"
                        weight="fill"
                    />
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        We <strong>do not</strong> train our models on your data.
                    </p>
                </div>
                <div className="flex gap-4">
                    <CheckCircle
                        className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5"
                        weight="fill"
                    />
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        Your memory graph is encrypted and isolated.
                    </p>
                </div>
                <div className="flex gap-4">
                    <CheckCircle
                        className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5"
                        weight="fill"
                    />
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        You can export or delete your memories at any time.
                    </p>
                </div>
            </div>
        </div>
    );
}

function Step5_Ready() {
    return (
        <div className="space-y-6 text-center">
            <div className="mb-8">
                <h2 className="font-serif text-4xl mb-4">All Systems Go.</h2>
                <p className="text-zinc-500 text-lg">We've indexed 0 memories. Your OS is ready.</p>
            </div>

            {/* Abstract Visualization */}
            <div className="w-64 h-64 mx-auto mb-8 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-zinc-200 rounded-full animate-ping opacity-20 duration-1000"></div>
                <div className="w-48 h-48 bg-zinc-900 dark:bg-white rounded-full flex items-center justify-center shadow-2xl relative z-10">
                    <span className="font-serif text-4xl text-white dark:text-black">Ready</span>
                </div>
            </div>
        </div>
    );
}
