'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import { Check, Plus, Play } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/* =============================================================================
   YULA LANDING PAGE - Exact Pencil MCP Design (Node: QtTSw)

   Colors:
   - Navy: #0A0E27 (dark background)
   - Terracotta: #D4714A (accent)
   - Cream: #F8F6F0 (light sections)

   Typography:
   - Headlines: Playfair Display (serif)
   - Body: DM Sans (sans-serif)
   ============================================================================= */

export default function LandingPage() {
    return (
        <main className="min-h-screen bg-[#0A0E27]">
            <Navbar />
            <HeroSection />
            <ProblemSection />
            <FeaturesSection />
            <StepsSection />
            <PricingSection />
            <FAQSection />
            <CTASection />
            <StatsSection />
            <Footer />
        </main>
    );
}

/* -----------------------------------------------------------------------------
   NAVBAR
   ----------------------------------------------------------------------------- */

function Navbar() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0E27]/95 backdrop-blur-sm">
            <nav className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center">
                    <div className="w-8 h-8 bg-[#D4714A] rounded-sm flex items-center justify-center">
                        <span className="text-[#0A0E27] font-bold text-sm font-[family-name:var(--font-dm-sans)]">Y</span>
                    </div>
                </Link>

                {/* Nav Links */}
                <div className="hidden md:flex items-center gap-8">
                    {['Features', 'Pricing', 'Reviews', 'FAQ'].map((item) => (
                        <Link
                            key={item}
                            href={`#${item.toLowerCase()}`}
                            className="text-[#94A3B8] text-sm font-[family-name:var(--font-dm-sans)] hover:text-white transition-colors"
                        >
                            {item}
                        </Link>
                    ))}
                </div>

                {/* CTA */}
                <Link
                    href="/chat"
                    className="bg-[#D4714A] text-[#0A0E27] px-4 py-2 text-sm font-medium rounded font-[family-name:var(--font-dm-sans)] hover:bg-[#E07B54] transition-colors"
                >
                    START FREE TRIAL
                </Link>
            </nav>
        </header>
    );
}

/* -----------------------------------------------------------------------------
   HERO SECTION
   ----------------------------------------------------------------------------- */

function HeroSection() {
    return (
        <section className="min-h-screen pt-16 bg-[#0A0E27]">
            <div className="max-w-[1280px] mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
                {/* Left Content */}
                <div className="space-y-8">
                    {/* Badge */}
                    <div className="flex items-center gap-3">
                        <span className="text-[#D4714A]">✦</span>
                        <span className="text-[#94A3B8] text-sm font-[family-name:var(--font-dm-sans)]">
                            AI Operating System
                        </span>
                        <div className="flex gap-1.5 ml-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D4714A]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]/50" />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]/50" />
                        </div>
                    </div>

                    {/* Headline */}
                    <h1 className="text-[#F8F6F0] text-6xl lg:text-7xl leading-[1.1] font-[family-name:var(--font-playfair)]">
                        Your AI,<br />Evolved.
                    </h1>

                    {/* Subtitle */}
                    <p className="text-[#94A3B8] text-lg max-w-md leading-relaxed font-[family-name:var(--font-dm-sans)]">
                        YULA OS brings together the world's best AI models in one intelligent
                        platform. Import your history, get proactive reminders, and let multiple
                        AIs debate your toughest decisions.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-wrap gap-4">
                        <Link
                            href="/chat"
                            className="bg-[#D4714A] text-[#0A0E27] px-6 py-3 text-sm font-medium rounded font-[family-name:var(--font-dm-sans)] hover:bg-[#E07B54] transition-colors"
                        >
                            START FREE TRIAL
                        </Link>
                        <button className="border border-[#94A3B8]/50 text-[#F8F6F0] px-6 py-3 text-sm font-medium rounded font-[family-name:var(--font-dm-sans)] hover:bg-white/5 transition-colors flex items-center gap-2">
                            WATCH DEMO
                            <Play size={14} weight="fill" />
                        </button>
                    </div>
                </div>

                {/* Right - Mockup */}
                <div className="bg-[#111827] rounded-2xl p-8 space-y-6">
                    {/* Import */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="text-[#94A3B8] text-xs font-[family-name:var(--font-dm-sans)]">✦ IMPORT</span>
                            <div className="flex-1 h-px bg-[#1E293B]" />
                        </div>
                        <div className="border border-[#1E293B] rounded-lg p-4">
                            <div className="w-20 h-2.5 bg-[#1E293B] rounded" />
                        </div>
                    </div>

                    {/* PAC */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="text-[#94A3B8] text-xs font-[family-name:var(--font-dm-sans)]">✦ PAC</span>
                            <div className="flex-1 h-px bg-[#1E293B]" />
                        </div>
                        <div className="border border-[#1E293B] rounded-lg p-4">
                            <div className="w-28 h-2.5 bg-[#1E293B] rounded" />
                        </div>
                    </div>

                    {/* Council */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="text-[#94A3B8] text-xs font-[family-name:var(--font-dm-sans)]">✦ COUNCIL</span>
                            <div className="flex-1 h-px bg-[#1E293B]" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="aspect-square border border-[#1E293B] rounded-lg" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* -----------------------------------------------------------------------------
   PROBLEM SECTION
   ----------------------------------------------------------------------------- */

function ProblemSection() {
    return (
        <section className="bg-[#0A0E27] py-24">
            <div className="max-w-[1280px] mx-auto px-6">
                {/* Badge */}
                <div className="flex items-center gap-3 mb-6">
                    <span className="text-[#D4714A]">✦</span>
                    <span className="text-[#94A3B8] text-sm font-[family-name:var(--font-dm-sans)]">The Problem</span>
                </div>

                {/* Headline */}
                <h2 className="text-[#F8F6F0] text-4xl lg:text-5xl leading-tight mb-12 font-[family-name:var(--font-playfair)]">
                    Tired of AI That<br />Forgets Everything?
                </h2>

                {/* Cards */}
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-[#D4714A] rounded-lg p-6">
                        <h3 className="text-[#F8F6F0] text-lg font-medium mb-2 font-[family-name:var(--font-dm-sans)]">
                            Scattered Conversations
                        </h3>
                        <p className="text-[#F8F6F0]/80 text-sm font-[family-name:var(--font-dm-sans)]">
                            Your insights are trapped across ChatGPT, Claude, and Gemini.
                        </p>
                    </div>
                    <div className="bg-[#F8F6F0] rounded-lg p-6">
                        <h3 className="text-[#0A0E27] text-lg font-medium mb-2 font-[family-name:var(--font-dm-sans)]">
                            No Follow-Through
                        </h3>
                        <p className="text-[#0A0E27]/70 text-sm font-[family-name:var(--font-dm-sans)]">
                            AI never checks back on what you discussed.
                        </p>
                    </div>
                    <div className="bg-[#F8F6F0] rounded-lg p-6">
                        <h3 className="text-[#0A0E27] text-lg font-medium mb-2 font-[family-name:var(--font-dm-sans)]">
                            One Perspective
                        </h3>
                        <p className="text-[#0A0E27]/70 text-sm font-[family-name:var(--font-dm-sans)]">
                            Single models have blind spots you never see.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* -----------------------------------------------------------------------------
   FEATURES SECTION
   ----------------------------------------------------------------------------- */

function FeaturesSection() {
    return (
        <section id="features" className="bg-[#F8F6F0] py-20">
            <div className="max-w-[1280px] mx-auto px-6">
                {/* Badge */}
                <div className="flex items-center gap-3 mb-8">
                    <span className="text-[#D4714A]">✦</span>
                    <span className="text-[#64748B] text-sm font-[family-name:var(--font-dm-sans)]">Features</span>
                </div>

                {/* Feature Grid */}
                <div className="grid md:grid-cols-3 border-t border-[#E5E5E5]">
                    {/* Import */}
                    <div className="p-8 border-r border-[#E5E5E5]">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-[#0A0E27] text-2xl font-[family-name:var(--font-playfair)]">Import</h3>
                            <span className="text-[#94A3B8] text-xs font-[family-name:var(--font-dm-sans)]">001</span>
                        </div>
                        <p className="text-[#0A0E27] text-sm font-medium mb-2 font-[family-name:var(--font-dm-sans)]">
                            Bring Your AI History Home
                        </p>
                        <p className="text-[#64748B] text-sm font-[family-name:var(--font-dm-sans)]">
                            Import your conversations from ChatGPT and Claude in seconds.
                        </p>
                    </div>

                    {/* PAC - Accent */}
                    <div className="p-8 bg-[#D4714A]">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-[#F8F6F0] text-2xl font-[family-name:var(--font-playfair)]">PAC</h3>
                            <span className="text-[#F8F6F0]/70 text-xs font-[family-name:var(--font-dm-sans)]">002</span>
                        </div>
                        <p className="text-[#F8F6F0] text-sm font-medium mb-2 font-[family-name:var(--font-dm-sans)]">
                            AI That Actually Follows Up
                        </p>
                        <p className="text-[#F8F6F0]/80 text-sm font-[family-name:var(--font-dm-sans)]">
                            Proactive reminders for commitments, deadlines, and follow-ups.
                        </p>
                    </div>

                    {/* Council */}
                    <div className="p-8 border-l border-[#E5E5E5]">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-[#0A0E27] text-2xl font-[family-name:var(--font-playfair)]">Council</h3>
                            <span className="text-[#94A3B8] text-xs font-[family-name:var(--font-dm-sans)]">003</span>
                        </div>
                        <p className="text-[#0A0E27] text-sm font-medium mb-2 font-[family-name:var(--font-dm-sans)]">
                            Let Four AIs Debate Your Decision
                        </p>
                        <p className="text-[#64748B] text-sm font-[family-name:var(--font-dm-sans)]">
                            Multiple perspectives from GPT-4, Claude, Gemini & Llama.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* -----------------------------------------------------------------------------
   STEPS SECTION
   ----------------------------------------------------------------------------- */

function StepsSection() {
    const steps = [
        { num: '01', title: 'Import', desc: 'Import your conversations from ChatGPT and Claude.' },
        { num: '02', title: 'Chat', desc: 'Chat naturally - YULA learns your preferences.' },
        { num: '03', title: 'Remind', desc: 'Get proactive reminders for commitments and goals.' },
        { num: '04', title: 'Council', desc: 'Use Council for decisions that require multiple perspectives.' },
    ];

    return (
        <section className="bg-[#0A0E27] py-24">
            <div className="max-w-[1280px] mx-auto px-6">
                {/* Badge */}
                <div className="flex items-center gap-3 mb-6">
                    <span className="text-[#D4714A]">✦</span>
                    <span className="text-[#94A3B8] text-sm font-[family-name:var(--font-dm-sans)]">How It Works</span>
                </div>

                {/* Headline */}
                <h2 className="text-[#F8F6F0] text-4xl lg:text-5xl leading-tight mb-16 font-[family-name:var(--font-playfair)]">
                    Four steps.<br />That's it.
                </h2>

                {/* Steps Grid */}
                <div className="grid md:grid-cols-4 gap-8">
                    {steps.map((step, i) => (
                        <div key={i}>
                            <div className={cn(
                                "text-3xl mb-4 font-[family-name:var(--font-playfair)]",
                                i === 0 ? "text-[#D4714A]" : "text-[#94A3B8]/50"
                            )}>
                                {step.num}
                            </div>
                            <h3 className="text-[#F8F6F0] text-lg font-medium mb-2 font-[family-name:var(--font-dm-sans)]">
                                {step.title}
                            </h3>
                            <p className="text-[#94A3B8] text-sm font-[family-name:var(--font-dm-sans)]">
                                {step.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* -----------------------------------------------------------------------------
   PRICING SECTION
   ----------------------------------------------------------------------------- */

function PricingSection() {
    const plans = [
        {
            name: 'Free',
            price: '$0',
            features: ['100 messages/month', 'Basic models (GPT-4o-mini, Gemini)', 'Basic memory', 'No Council sessions'],
            cta: 'Get Started',
            popular: false,
        },
        {
            name: 'Starter',
            price: '$20',
            features: ['300 chats/month', '10 Council sessions/month', 'Basic models + Claude Haiku', '10 min voice/day', 'Email support'],
            cta: 'Start Free Trial',
            popular: false,
        },
        {
            name: 'Pro',
            price: '$49',
            features: ['1,500 chats/month', '50 Council sessions/month', 'All models (GPT-4o, Claude, Gemini)', '60 min voice/day', 'Priority support'],
            cta: 'Start Free Trial',
            popular: true,
        },
        {
            name: 'Ultra',
            price: '$99',
            features: ['5,000 chats/month', '200 Council sessions/month', 'All models + experimental', '180 min voice/day', 'Priority performance'],
            cta: 'Start Free Trial',
            popular: false,
        },
    ];

    return (
        <section id="pricing" className="bg-[#0A0E27] py-24">
            <div className="max-w-[1280px] mx-auto px-6">
                {/* Badge */}
                <div className="flex items-center gap-3 mb-6">
                    <span className="text-[#D4714A]">✦</span>
                    <span className="text-[#94A3B8] text-sm font-[family-name:var(--font-dm-sans)]">Pricing</span>
                </div>

                {/* Headline */}
                <h2 className="text-[#F8F6F0] text-4xl lg:text-5xl leading-tight mb-4 font-[family-name:var(--font-playfair)]">
                    Simple, Transparent<br />Pricing.
                </h2>
                <p className="text-[#94A3B8] text-sm mb-12 font-[family-name:var(--font-dm-sans)]">
                    All plans include a 14-day free trial. No credit card required.
                </p>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-4 gap-6">
                    {plans.map((plan, i) => (
                        <div
                            key={i}
                            className={cn(
                                "rounded-lg p-6 relative",
                                plan.popular
                                    ? "bg-[#D4714A]"
                                    : "bg-[#111827] border border-[#1E293B]"
                            )}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-6 bg-[#0A0E27] text-[#D4714A] px-3 py-1 text-xs font-medium rounded font-[family-name:var(--font-dm-sans)]">
                                    MOST POPULAR
                                </div>
                            )}

                            <h3 className={cn(
                                "text-lg mb-4 font-[family-name:var(--font-dm-sans)]",
                                plan.popular ? "text-[#0A0E27]" : "text-[#F8F6F0]"
                            )}>
                                {plan.name}
                            </h3>

                            <div className="flex items-baseline gap-1 mb-6">
                                <span className={cn(
                                    "text-4xl font-[family-name:var(--font-playfair)]",
                                    plan.popular ? "text-[#0A0E27]" : "text-[#F8F6F0]"
                                )}>
                                    {plan.price}
                                </span>
                                <span className={cn(
                                    "text-sm font-[family-name:var(--font-dm-sans)]",
                                    plan.popular ? "text-[#0A0E27]/70" : "text-[#94A3B8]"
                                )}>
                                    /month
                                </span>
                            </div>

                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature, j) => (
                                    <li key={j} className={cn(
                                        "flex items-start gap-2 text-sm font-[family-name:var(--font-dm-sans)]",
                                        plan.popular ? "text-[#0A0E27]" : "text-[#F8F6F0]"
                                    )}>
                                        <Check size={16} weight="bold" className="mt-0.5 flex-shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button className={cn(
                                "w-full py-3 rounded text-sm font-medium transition-colors font-[family-name:var(--font-dm-sans)]",
                                plan.popular
                                    ? "bg-[#0A0E27] text-[#F8F6F0] hover:bg-[#1E293B]"
                                    : "border border-[#94A3B8]/50 text-[#F8F6F0] hover:bg-white/5"
                            )}>
                                {plan.cta}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* -----------------------------------------------------------------------------
   FAQ SECTION
   ----------------------------------------------------------------------------- */

function FAQSection() {
    const [open, setOpen] = useState<number | null>(null);

    const faqs = [
        { q: 'Can I easily import my ChatGPT history?', a: 'Yes! YULA supports direct import from ChatGPT and Claude. Just export your data and upload it to YULA.' },
        { q: 'Which AI models does YULA use?', a: 'YULA uses GPT-4, Claude 3, Gemini Pro, and Llama 3. You can switch between them anytime.' },
        { q: "What's the Council feature?", a: 'Council lets you ask a question to multiple AI models simultaneously and see their different perspectives side by side.' },
        { q: 'How does PAC work?', a: 'PAC (Proactive AI Callbacks) analyzes your conversations and proactively reminds you about commitments, deadlines, and follow-ups.' },
        { q: 'Is my data secure?', a: 'Yes. Your data is encrypted at rest and in transit. We never train on your data or share it with third parties.' },
        { q: 'Can I use YULA offline?', a: 'YULA is a PWA and works offline for viewing your history. Active AI conversations require an internet connection.' },
    ];

    return (
        <section id="faq" className="bg-[#F8F6F0] py-24">
            <div className="max-w-3xl mx-auto px-6">
                {/* Badge */}
                <div className="flex items-center gap-3 mb-6">
                    <span className="text-[#D4714A]">✦</span>
                    <span className="text-[#64748B] text-sm font-[family-name:var(--font-dm-sans)]">FAQ</span>
                </div>

                {/* Headline */}
                <h2 className="text-[#0A0E27] text-4xl lg:text-5xl leading-tight mb-12 font-[family-name:var(--font-playfair)]">
                    Questions we<br />get asked.
                </h2>

                {/* FAQ Items */}
                <div>
                    {faqs.map((faq, i) => (
                        <div
                            key={i}
                            className="border-b border-[#E5E5E5] py-4 cursor-pointer"
                            onClick={() => setOpen(open === i ? null : i)}
                        >
                            <div className="flex justify-between items-center">
                                <span className="text-[#0A0E27] text-sm font-[family-name:var(--font-dm-sans)]">
                                    {faq.q}
                                </span>
                                <Plus
                                    size={20}
                                    className={cn(
                                        "text-[#94A3B8] transition-transform flex-shrink-0",
                                        open === i && "rotate-45"
                                    )}
                                />
                            </div>
                            <AnimatePresence>
                                {open === i && (
                                    <motion.p
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="text-[#64748B] text-sm pt-4 overflow-hidden font-[family-name:var(--font-dm-sans)]"
                                    >
                                        {faq.a}
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* -----------------------------------------------------------------------------
   CTA SECTION
   ----------------------------------------------------------------------------- */

function CTASection() {
    return (
        <section className="bg-[#0A0E27] py-24 text-center">
            <div className="max-w-2xl mx-auto px-6">
                <h2 className="text-[#F8F6F0] text-4xl lg:text-5xl leading-tight mb-6 font-[family-name:var(--font-playfair)]">
                    Your AI Journey<br />Starts Here.
                </h2>
                <p className="text-[#94A3B8] text-sm mb-8 font-[family-name:var(--font-dm-sans)]">
                    Join thousands of professionals who've upgraded their AI experience.
                    Import your history, get proactive reminders, and make better decisions with Council.
                </p>
                <Link
                    href="/chat"
                    className="inline-block border border-[#94A3B8]/50 text-[#F8F6F0] px-8 py-4 text-sm font-medium rounded font-[family-name:var(--font-dm-sans)] hover:bg-white/5 transition-colors"
                >
                    START YOUR FREE TRIAL
                </Link>
                <p className="text-[#94A3B8] text-xs mt-6 font-[family-name:var(--font-dm-sans)]">
                    14-day free trial · No credit card required · Cancel anytime
                </p>
            </div>
        </section>
    );
}

/* -----------------------------------------------------------------------------
   STATS SECTION
   ----------------------------------------------------------------------------- */

function StatsSection() {
    return (
        <section className="bg-[#D4714A] py-16 relative overflow-hidden">
            <div className="max-w-[1280px] mx-auto px-6 grid md:grid-cols-3 gap-8 items-center">
                {/* Stats */}
                <div>
                    <p className="text-[#0A0E27]/70 text-sm mb-1 font-[family-name:var(--font-dm-sans)]">Active</p>
                    <p className="text-[#0A0E27] text-4xl font-[family-name:var(--font-playfair)]">10,000+</p>
                    <p className="text-[#0A0E27]/70 text-xs mt-1 font-[family-name:var(--font-dm-sans)]">happy users</p>
                </div>

                {/* YULA Text */}
                <div className="text-center">
                    <span className="text-7xl md:text-9xl font-bold text-[#C4623B] font-[family-name:var(--font-playfair)]">
                        YULA
                    </span>
                </div>

                {/* Description */}
                <div className="bg-[#0A0E27] rounded-lg p-6">
                    <p className="text-[#F8F6F0] text-sm leading-relaxed font-[family-name:var(--font-dm-sans)]">
                        YULA OS is the AI operating system that remembers, reminds, and reasons.
                        Import your history, get proactive reminders, and make better decisions with Council.
                    </p>
                </div>
            </div>

            {/* Diamond */}
            <div className="absolute bottom-8 left-8 w-4 h-4 rotate-45 border border-[#0A0E27]" />
        </section>
    );
}

/* -----------------------------------------------------------------------------
   FOOTER
   ----------------------------------------------------------------------------- */

function Footer() {
    return (
        <footer className="bg-[#0A0E27] py-4">
            <div className="max-w-[1280px] mx-auto px-6 flex flex-wrap justify-between items-center gap-4 text-[#94A3B8] text-xs font-[family-name:var(--font-dm-sans)]">
                <span>© YULA AI, 2024</span>
                <span>All rights reserved</span>
                <div className="flex gap-6">
                    <Link href="/terms" className="hover:text-white transition-colors">Terms of Use</Link>
                    <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                </div>
            </div>
        </footer>
    );
}
