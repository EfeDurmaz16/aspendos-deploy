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
    ShareNetwork,
    Aperture,
    ShieldCheck,
    Microphone,
    Code,
    Images as ImageIcon,
} from '@phosphor-icons/react';
import { Home, Zap, CreditCard, LayoutDashboard } from 'lucide-react';
import { NavBar } from "@/components/ui/tubelight-navbar";
import ResponsiveHeroBanner from "@/components/ui/responsive-hero-banner";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { GoogleGeminiEffect } from '@/components/ui/google-gemini-effect';
import { Gallery6 } from "@/components/blocks/gallery6";
import MultiOrbitSemiCircle from "@/components/ui/multi-orbit-semi-circle";
import { useScroll, useTransform } from 'framer-motion';
import React, { useRef } from 'react';

const galleryItems = [
    {
        id: "item-1",
        title: "Live React Preview",
        summary: "Code generation that comes alive. See and interact with React components as they are built.",
        url: "#",
        image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=2670&auto=format&fit=crop"
    },
    {
        id: "item-2",
        title: "Real-time Voice",
        summary: "Fluid conversation with speech-to-text and text-to-speech. Talk to your AI like a teammate.",
        url: "#",
        image: "https://images.unsplash.com/photo-1589254065878-42c9da997008?q=80&w=2670&auto=format&fit=crop"
    },
    {
        id: "item-3",
        title: "Visual Generation",
        summary: "Integrated video and image models. Create assets without leaving the conversation.",
        url: "#",
        image: "https://images.unsplash.com/photo-1620641788427-b9f4dbf3b385?q=80&w=2663&auto=format&fit=crop"
    },
    {
        id: "item-4",
        title: "Advanced Editing",
        summary: "Photo editing tools built-in. Enhance, crop, and modify images instantly.",
        url: "#",
        image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2565&auto=format&fit=crop"
    }
];

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
        <div className="flex flex-col min-h-screen font-sans bg-background text-foreground overflow-x-hidden">
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
                <AuroraBackground className="bg-zinc-50 dark:bg-zinc-950">
                    <div className="w-full h-full">
                        <ResponsiveHeroBanner
                            title="One Platform. Infinite Possibilities."
                            titleLine2=""
                            description="Hundreds of models and shared memory in a single interface. Use the best AI for every task, without losing context."
                            primaryButtonText="Join the Revolution"
                            primaryButtonHref="/signup"
                            secondaryButtonText="Watch the usage"
                            secondaryButtonHref="#demo"
                            badgeLabel="Mission"
                            badgeText="Unifying AGI"
                            ctaButtonText="Login"
                            ctaButtonHref="/login"
                            backgroundImageUrl=""
                            navLinks={[]}
                        />
                    </div>
                </AuroraBackground>

                {/* Google Gemini Effect Section */}
                <section className="w-full relative pt-20 overflow-hidden">
                    <div
                        className="h-[300vh] bg-background w-full dark:border dark:border-white/[0.1] rounded-md relative overflow-clip"
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
                            title="AI today is fragmented."
                            description="Hundreds of models, zero continuity. Aspendos unifies them through shared memory and orchestration."
                        />
                    </div>
                </section>

                {/* Why We Built This Story Section */}
                <section className="py-24 px-4 bg-zinc-50 dark:bg-zinc-900/50 border-y border-zinc-200 dark:border-zinc-800">
                    <div className="container max-w-4xl mx-auto space-y-12">
                        <div className="space-y-6 text-center">
                            <h2 className="text-sm font-semibold text-blue-500 uppercase tracking-wider">Our Story</h2>
                            <h3 className="text-3xl md:text-4xl font-serif text-foreground">Why We Built This</h3>
                        </div>

                        <div className="prose dark:prose-invert prose-lg mx-auto text-zinc-600 dark:text-zinc-400 font-serif leading-relaxed">
                            <p>
                                The idea for Aspendos was born from my own frustration as a developer constantly switching between different AI tools and losing context every time. Every day, I found myself jumping between ChatGPT, Claude, and Gemini, realizing that none of these conversations or ideas lived in a shared memory.
                            </p>
                            <p>
                                Today, AI is evolving into a true collaborator, yet the way we work with it is still fragmented and disconnected. That's why we built Aspendos: a unified AI workspace that connects all your tools, documents, and conversations through a continuous shared memory layer, helping teams and individuals work seamlessly with AI.
                            </p>
                            <p>
                                Our vision for the next decade is to help create a world where AI becomes part of humanity's collective memory, empowering people to think, build, and create together more effectively than ever before.
                            </p>
                            <p className="font-medium text-foreground">
                                Aspendos exists to make that future possible.
                            </p>
                        </div>

                        <div className="flex items-center gap-4 pt-8 border-t border-zinc-200 dark:border-zinc-800 max-w-lg mx-auto">
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl">
                                E
                            </div>
                            <div>
                                <div className="font-semibold text-foreground">Efe Baran Durmaz</div>
                                <div className="text-sm text-muted-foreground">AI & Backend Engineer @ Nokia</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="px-4 md:px-6 py-24 bg-muted/20">
                    <div className="container max-w-6xl mx-auto">
                        <div className="mb-16 max-w-2xl">
                            <h2 className="text-3xl font-semibold tracking-tight mb-4">
                                Unified Intelligence.
                            </h2>
                            <p className="text-lg text-muted-foreground">
                                Four pillars that redefine how you interact with Artificial Intelligence.
                            </p>
                        </div>

                        <BentoGrid>
                            <BentoCard
                                name="Persistent Shared Memory"
                                className="col-span-3 lg:col-span-1"
                                background={<div className="absolute inset-0 bg-blue-500/5" />}
                                Icon={Brain}
                                description="Unified memory across all AI interactions. Aspendos remembers everything."
                                href="/signup"
                                cta="Learn more"
                            />
                            <BentoCard
                                name="Cross-Model Integration"
                                className="col-span-3 lg:col-span-1"
                                background={<div className="absolute inset-0 bg-amber-500/5" />}
                                Icon={ShareNetwork}
                                description="Seamlessly route tasks to the best AI for the job. GPT-4, Claude, Gemini - together."
                                href="/signup"
                                cta="Explore"
                            />
                            <BentoCard
                                name="Multimodal"
                                className="col-span-3 lg:col-span-1"
                                background={<div className="absolute inset-0 bg-emerald-500/5" />}
                                Icon={Aperture}
                                description="Text, vision, audio, and code in one platform. A complete sensory experience."
                                href="/signup"
                                cta="Try Voice"
                            />
                            <BentoCard
                                name="Privacy-First Architecture"
                                className="col-span-3"
                                background={<div className="absolute inset-0 bg-zinc-900/5 dark:bg-zinc-100/5" />}
                                Icon={ShieldCheck}
                                description="Your data, your control, always encrypted. We prioritize your security."
                                href="/signup"
                                cta="Start Securely"
                            />
                        </BentoGrid>
                    </div>
                </section>

                {/* The Vision Grid Section */}
                <section className="px-4 md:px-6 py-24 bg-background border-t border-zinc-200 dark:border-zinc-800">
                    <div className="container max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-semibold tracking-tight mb-4">Building the future of unified AI</h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">Our roadmap to a more connected intelligence.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <h3 className="font-semibold mb-3 text-red-500">The Problem</h3>
                                <p className="text-sm text-muted-foreground">AI landscape consists of 300+ fragmented models with no memory continuity, leading to complex integrations and costly context management.</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <h3 className="font-semibold mb-3 text-emerald-500">The Solution</h3>
                                <p className="text-sm text-muted-foreground">A unified platform with shared memory, intelligent routing, and seamless multi-model coordination.</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <h3 className="font-semibold mb-3 text-amber-500">Opportunity</h3>
                                <p className="text-sm text-muted-foreground">$190B AI market by 2025. $50B TAM in enterprise AI integration and memory management solutions.</p>
                            </div>
                            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <h3 className="font-semibold mb-3 text-amber-400">Tech Stack</h3>
                                <p className="text-sm text-muted-foreground">Vector databases, distributed memory systems, AI routing algorithms, and enterprise-grade security.</p>
                            </div>
                        </div>

                        {/* Roadmap */}
                        <div className="mt-12 p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                            <h3 className="text-xl font-semibold mb-6 text-center">Roadmap</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 relative">
                                {/* Connector Line (Desktop) */}
                                <div className="absolute top-4 left-0 w-full h-0.5 bg-zinc-200 dark:bg-zinc-800 hidden md:block opacity-50"></div>

                                <div className="relative z-10 text-center">
                                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold mx-auto mb-4 ring-4 ring-background">1</div>
                                    <div className="font-semibold">Q1: Beta</div>
                                    <div className="text-sm text-muted-foreground">Public Beta Launch</div>
                                </div>
                                <div className="relative z-10 text-center">
                                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-muted-foreground flex items-center justify-center font-bold mx-auto mb-4 ring-4 ring-background">2</div>
                                    <div className="font-semibold">Q2: Pilots</div>
                                    <div className="text-sm text-muted-foreground">Enterprise Pilots</div>
                                </div>
                                <div className="relative z-10 text-center">
                                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-muted-foreground flex items-center justify-center font-bold mx-auto mb-4 ring-4 ring-background">3</div>
                                    <div className="font-semibold">Q3: Release</div>
                                    <div className="text-sm text-muted-foreground">Public Release</div>
                                </div>
                                <div className="relative z-10 text-center">
                                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-muted-foreground flex items-center justify-center font-bold mx-auto mb-4 ring-4 ring-background">4</div>
                                    <div className="font-semibold">Q4: Scale</div>
                                    <div className="text-sm text-muted-foreground">10,000+ Users</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Gallery Section */}
                <div className="bg-background">
                    <Gallery6
                        heading="Capabilities in Action"
                        items={galleryItems}
                        demoUrl="/signup"
                    />
                </div>

                {/* Integrations Section */}
                <div className="bg-muted/10">
                    <MultiOrbitSemiCircle />
                </div>

                {/* Pricing Section */}
                <section id="pricing" className="px-4 md:px-6 py-24 container max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-semibold tracking-tight mb-4">
                            Universal Access.
                        </h2>
                        <p className="text-lg text-muted-foreground mb-6">
                            Eliminate the complexity and financial burden of managing multiple subscriptions.
                            Access premium AI models that usually cost over $200/month, unified here.
                        </p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                            <CheckCircle weight="fill" /> Free Tier Available
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {/* Starter Plan */}
                        <Card className="bg-background/60 backdrop-blur-sm border-zinc-200 dark:border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-xl">Starter</CardTitle>
                                <CardDescription>For trying Aspendos and exploring AI.</CardDescription>
                                <div className="text-4xl font-bold mt-4">$20<span className="text-lg text-muted-foreground font-normal">/mo</span></div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-4">
                                    {[
                                        '~300 chats/month (~10/day)',
                                        'GPT-5 Nano + 1 main model',
                                        '10 min voice/day',
                                        'Basic memory across chats',
                                        'Email support'
                                    ].map((item) => (
                                        <li key={item} className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                            <CheckCircle className="w-5 h-5 text-emerald-500" weight="fill" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" className="w-full h-11" asChild>
                                    <Link href="/signup?tier=starter">Get Started</Link>
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Pro Plan */}
                        <Card className="border-emerald-500/30 bg-zinc-900/5 dark:bg-emerald-950/10 relative overflow-hidden backdrop-blur-md shadow-2xl scale-105 z-10">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
                            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                POPULAR
                            </div>
                            <CardHeader className="relative">
                                <CardTitle className="text-xl">Pro</CardTitle>
                                <CardDescription>Your daily AI operating system.</CardDescription>
                                <div className="text-4xl font-bold mt-4">$50<span className="text-lg text-muted-foreground font-normal">/mo</span></div>
                            </CardHeader>
                            <CardContent className="relative">
                                <ul className="space-y-4">
                                    {[
                                        '~1,500 chats/month',
                                        'All models: GPT-5, Claude, Gemini',
                                        '60 min voice/day',
                                        'Advanced memory + search',
                                        'Multi-model comparison',
                                        'Priority routing',
                                        'Email + chat support'
                                    ].map((item) => (
                                        <li key={item} className="flex items-center gap-3 text-sm font-medium">
                                            <CheckCircle className="w-5 h-5 text-emerald-500" weight="fill" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter className="relative">
                                <Button className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 shadow-lg transition-all hover:scale-[1.02]" asChild>
                                    <Link href="/signup?tier=pro">Upgrade to Pro</Link>
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Ultra Plan */}
                        <Card className="bg-background/60 backdrop-blur-sm border-zinc-200 dark:border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-xl">Ultra</CardTitle>
                                <CardDescription>For power users and teams.</CardDescription>
                                <div className="text-4xl font-bold mt-4">$100<span className="text-lg text-muted-foreground font-normal">/mo</span></div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-4">
                                    {[
                                        '5,000+ chats/month',
                                        'All models + experimental',
                                        '180 min voice/day',
                                        'Full Memory Inspector',
                                        'Multi-model parallel (4x)',
                                        'Highest priority performance',
                                        'Priority support'
                                    ].map((item) => (
                                        <li key={item} className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                            <CheckCircle className="w-5 h-5 text-emerald-500" weight="fill" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" className="w-full h-11" asChild>
                                    <Link href="/signup?tier=ultra">Go Ultra</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </section>

                {/* FAQ Section */}
                <div className="px-4 md:px-6 py-24 container max-w-3xl mx-auto space-y-8">
                    <h2 className="text-2xl font-semibold text-center">
                        Frequently Asked Questions
                    </h2>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>What happens if I exceed my plan limits?</AccordionTrigger>
                            <AccordionContent>
                                You'll receive notifications at 75%, 90%, and 100% of your monthly limit. Once exceeded, you cannot create new chats until your usage resets on the first of next month.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>Can I change plans anytime?</AccordionTrigger>
                            <AccordionContent>
                                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>What is your refund policy?</AccordionTrigger>
                            <AccordionContent>
                                We do not offer refunds for subscriptions. However, you can cancel anytime and will not be charged for the next billing period.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4">
                            <AccordionTrigger>Do you offer a free trial?</AccordionTrigger>
                            <AccordionContent>
                                Yes! Start with the Starter plan to explore Aspendos free for your first 100 chats. No credit card required.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </main>

            <footer className="py-12 border-t bg-muted/30">
                <div className="container max-w-7xl mx-auto px-4 md:px-6 flex flex-col items-center gap-6 text-center">
                    <div className="flex items-center gap-6 text-muted-foreground">
                        <Link href="#" className="hover:text-foreground transition-colors"><GithubLogo size={24} /></Link>
                        <Link href="#" className="hover:text-foreground transition-colors"><XLogo size={24} /></Link>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        © 2026 Aspendos Inc. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
