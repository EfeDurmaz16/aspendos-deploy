'use client';

import {
    CheckCircle,
    Bell,
    Brain,
    Database,
    Cpu,
    Headphones,
    GithubLogo,
    XLogo,
} from '@phosphor-icons/react';
import { Home, Zap, CreditCard, LayoutDashboard } from 'lucide-react';
import { NavBar } from "@/components/ui/tubelight-navbar";
import ResponsiveHeroBanner from "@/components/ui/responsive-hero-banner";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import Link from 'next/link';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { GoogleGeminiEffect } from '@/components/ui/google-gemini-effect';
import { useScroll, useTransform } from 'framer-motion';
import React, { useRef } from 'react';
import { motion } from 'framer-motion';

export default function LandingPage() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start start', 'end start'],
    });

    const pathLengthFirst = useTransform(scrollYProgress, [0, 0.8], [0.2, 1.2]);
    const pathLengthSecond = useTransform(scrollYProgress, [0, 0.8], [0.15, 1.2]);
    const pathLengthThird = useTransform(scrollYProgress, [0, 0.8], [0.1, 1.2]);
    const pathLengthFourth = useTransform(scrollYProgress, [0, 0.8], [0.05, 1.2]);
    const pathLengthFifth = useTransform(scrollYProgress, [0, 0.8], [0, 1.2]);

    return (
        <div className="flex flex-col min-h-screen font-sans bg-background text-foreground">
            {/* Navigation */}
            {/* Navigation */}
            <NavBar
                items={[
                    { name: 'Home', url: '/', icon: Home },
                    { name: 'Features', url: '#features', icon: Zap },
                    { name: 'Pricing', url: '#pricing', icon: CreditCard },
                    { name: 'Dashboard', url: '/memory', icon: LayoutDashboard }
                ]}
            />

            <main className="flex-1">
                {/* Hero Section with Aurora Background */}
                <AuroraBackground>
                    <div className="w-full h-full">
                        <ResponsiveHeroBanner
                            title="Meet your autonomous AI assistant"
                            titleLine2=""
                            description="Aspendos doesn't just respond—it anticipates. Proactive notifications, autonomous scheduling, and persistent memory across every conversation."
                            primaryButtonText="Start using Aspendos"
                            primaryButtonHref="/signup"
                            secondaryButtonText="Watch the demo"
                            secondaryButtonHref="#demo"
                            badgeLabel="New"
                            badgeText="Voice & Proactive Scheduling"
                            ctaButtonText="Login"
                            ctaButtonHref="/login"
                            backgroundImageUrl=""
                            navLinks={[]} // We use the main NavBar
                        />
                    </div>
                </AuroraBackground>

                {/* Content Removed - integrated into new flow */}

                {/* Google Gemini Effect Section */}
                <section className="w-full relative pt-20 overflow-hidden">
                    <div
                        className="h-[400vh] bg-background w-full dark:border dark:border-white/[0.1] rounded-md relative overflow-clip"
                        ref={ref}
                    >
                        <GoogleGeminiEffect
                            pathLengths={[
                                pathLengthFirst,
                                pathLengthSecond,
                                pathLengthThird,
                                pathLengthFourth,
                                pathLengthFifth,
                            ]}
                            title="Built for the future"
                            description="Experience the next generation of AI interaction with fluid animations and seamless state management."
                        />
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="px-4 md:px-6 py-24 bg-muted/30">
                    <div className="container max-w-6xl mx-auto">
                        <div className="mb-16 max-w-2xl">
                            <h2 className="text-3xl font-semibold tracking-tight mb-4">
                                Built for autonomous work.
                            </h2>
                            <p className="text-lg text-muted-foreground">
                                Aspendos combines three essential capabilities into one unified
                                platform. Use the cards below to explore.
                            </p>
                        </div>

                        <BentoGrid>
                            <BentoCard
                                name="Proactive Agent"
                                className="col-span-3 lg:col-span-1"
                                background={<div className="absolute inset-0 bg-blue-500/5" />}
                                Icon={Bell}
                                description="Aspendos autonomously schedules tasks and takes action on your behalf."
                                href="/signup"
                                cta="Learn more"
                            />
                            <BentoCard
                                name="Memory"
                                className="col-span-3 lg:col-span-1"
                                background={<div className="absolute inset-0 bg-purple-500/5" />}
                                Icon={Database}
                                description="Persistent knowledge graph of your preferences and projects."
                                href="/signup"
                                cta="Explore"
                            />
                            <BentoCard
                                name="Voice I/O"
                                className="col-span-3 lg:col-span-1"
                                background={<div className="absolute inset-0 bg-emerald-500/5" />}
                                Icon={Headphones}
                                description="Whisper transcription and natural speech synthesis for real conversation."
                                href="/signup"
                                cta="Try Voice"
                            />
                            <BentoCard
                                name="Any Model. Any Time."
                                className="col-span-3"
                                background={<div className="absolute inset-0 bg-zinc-900/5 dark:bg-zinc-100/5" />}
                                Icon={Cpu}
                                description="Switch seamlessly between Claude, GPT-4o, and Gemini. Aspendos handles model selection."
                                href="/signup"
                                cta="Start Access"
                            />
                        </BentoGrid>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="px-4 md:px-6 py-24 container max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-semibold tracking-tight mb-4">
                            Universal Access.
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            One subscription for all models. No hidden fees.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Free Plan */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Free</CardTitle>
                                <CardDescription>For casual exploration.</CardDescription>
                                <div className="text-3xl font-bold mt-4">$0</div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {['50 messages/day', 'GPT-4o mini', 'Basic Memory'].map((item) => (
                                        <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <CheckCircle className="w-4 h-4 text-muted-foreground" weight="fill" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button variant="secondary" className="w-full" asChild>
                                    <Link href="/signup">Start Free</Link>
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Pro Plan */}
                        <Card className="border-emerald-500/50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                                POPULAR
                            </div>
                            <CardHeader>
                                <CardTitle>Pro</CardTitle>
                                <CardDescription>For the power user.</CardDescription>
                                <div className="text-3xl font-bold mt-4">$29</div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {[
                                        'Unlimited Messages',
                                        'All Frontier Models',
                                        'Full Memory Graph',
                                        'Priority Support',
                                    ].map((item) => (
                                        <li key={item} className="flex items-center gap-3 text-sm font-medium">
                                            <CheckCircle className="w-4 h-4 text-emerald-500" weight="fill" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                                    <Link href="/signup">Upgrade to Pro</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </section>
            </main>

            <footer className="py-8 border-t bg-muted/30">
                <div className="container max-w-7xl mx-auto px-4 md:px-6 flex flex-col items-center gap-4 text-center">
                    <div className="flex items-center gap-4 text-muted-foreground">
                        <GithubLogo size={20} />
                        <XLogo size={20} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        © 2026 Aspendos Inc. San Francisco.
                    </p>
                </div>
            </footer>
        </div>
    );
}
