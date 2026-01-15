"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Brain, CheckCircle, CloudArrowUp, ShieldCheck } from "@phosphor-icons/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 font-sans">

            {/* Progress Bar */}
            <div className="fixed top-0 left-0 w-full h-1 bg-zinc-200 dark:bg-zinc-900">
                <motion.div
                    className="h-full bg-zinc-900 dark:bg-zinc-50"
                    initial={{ width: "0%" }}
                    animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                />
            </div>

            <div className="w-full max-w-2xl">
                <div className="mb-12 text-center">
                    <span className="font-serif text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">ASPENDOS</span>
                </div>

                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={step}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
                        <Button variant="ghost" onClick={prevStep} className="text-zinc-500">
                            <ArrowLeft className="mr-2 w-4 h-4" /> Back
                        </Button>
                    ) : (
                        <div /> /* Spacer */
                    )}

                    {step < 5 && (
                        <Button onClick={nextStep} className="px-8 min-w-[140px]">
                            Continue <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    )}

                    {step === 5 && (
                        <Button className="px-8 min-w-[140px]" asChild>
                            <Link href="/chat">
                                Enter OS <ArrowRight className="ml-2 w-4 h-4" />
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
            <div className="inline-flex justify-center items-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 mb-4">
                <span className="text-xl">👋</span>
            </div>
            <div>
                <h2 className="font-serif text-3xl mb-2">Welcome to the OS.</h2>
                <p className="text-zinc-500">Let's set up your profile.</p>
            </div>

            <Card className="text-left border-zinc-200 dark:border-zinc-800 shadow-sm max-w-md mx-auto">
                <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input defaultValue="Efe Baran Durmaz" />
                    </div>
                    <div className="space-y-2">
                        <Label>Role</Label>
                        <select className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                            <option>Select a role...</option>
                            <option>Founder</option>
                            <option>Developer</option>
                            <option>Researcher</option>
                            <option>Creative</option>
                        </select>
                        <p className="text-xs text-muted-foreground">This helps us choose default models for you.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function Step2_Import() {
    return (
        <div className="space-y-6 text-center">
            <div className="inline-flex justify-center items-center w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 mb-4">
                <CloudArrowUp size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
                <h2 className="font-serif text-3xl mb-2">Don't start from zero.</h2>
                <p className="text-zinc-500 max-w-sm mx-auto">Import your history from ChatGPT or Claude to jumpstart your memory graph.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                <button className="flex flex-col items-center p-6 border rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 transition-all text-center space-y-3 group bg-white dark:bg-black">
                    <div className="w-10 h-10 rounded-full bg-[#74aa9c] flex items-center justify-center text-white font-bold">O</div>
                    <div className="font-medium">Import ChatGPT</div>
                    <p className="text-xs text-zinc-500">Upload .zip export</p>
                </button>
                <button className="flex flex-col items-center p-6 border rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 transition-all text-center space-y-3 group bg-white dark:bg-black">
                    <div className="w-10 h-10 rounded-full bg-[#d97757] flex items-center justify-center text-white font-serif italic">Cl</div>
                    <div className="font-medium">Import Claude</div>
                    <p className="text-xs text-zinc-500">Connect via API</p>
                </button>
            </div>
            <p className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600 underline underline-offset-4">Skip for now</p>
        </div>
    )
}

function Step3_Memory() {
    return (
        <div className="space-y-6 text-center">
            <div className="inline-flex justify-center items-center w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 mb-4">
                <Brain size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
                <h2 className="font-serif text-3xl mb-2">Seed your memory.</h2>
                <p className="text-zinc-500">Tell Aspendos 3 facts about you that it should never forget.</p>
            </div>

            <Card className="text-left border-zinc-200 dark:border-zinc-800 shadow-sm max-w-md mx-auto">
                <CardContent className="pt-6 space-y-4">
                    <Input placeholder="e.g. I code in Python and Rust" />
                    <Input placeholder="e.g. My startup creates AI tools" />
                    <Input placeholder="e.g. I prefer concise, technical answers" />

                    <div className="flex flex-wrap gap-2 pt-2">
                        <span className="text-[11px] uppercase font-medium text-zinc-400">Quick Add:</span>
                        <button className="px-2 py-1 rounded-md bg-zinc-100 text-xs text-zinc-600 hover:bg-zinc-200">I use Next.js</button>
                        <button className="px-2 py-1 rounded-md bg-zinc-100 text-xs text-zinc-600 hover:bg-zinc-200">Concise Mode</button>
                        <button className="px-2 py-1 rounded-md bg-zinc-100 text-xs text-zinc-600 hover:bg-zinc-200">No emojis</button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
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
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" weight="fill" />
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">We <strong>do not</strong> train our models on your data.</p>
                </div>
                <div className="flex gap-4">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" weight="fill" />
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">Your memory graph is encrypted and isolated.</p>
                </div>
                <div className="flex gap-4">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" weight="fill" />
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">You can export or delete your memories at any time.</p>
                </div>
            </div>
        </div>
    )
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
    )
}
