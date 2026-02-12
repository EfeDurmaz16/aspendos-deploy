'use client';

import { Check, Play, Plus } from '@phosphor-icons/react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// DESIGN SYSTEM: YULA v3 (from Pencil MCP - QtTSw frame)
// Navy (#0A0E27), Terracotta (#D4714A), Cream (#F8F6F0)
// Playfair Display (serif headlines) + DM Sans (body)
// =============================================================================

const COLORS = {
    navy: '#0A0E27',
    navyLight: '#1A1E37',
    terracotta: '#D4714A',
    terracottaLight: '#E07B54',
    terracottaDark: '#C4623B',
    cream: '#F8F6F0',
    creamDark: '#E8E2D9',
    white: '#FFFFFF',
    textOnDark: '#E8DED0',
    textOnLight: '#0A0E27',
    textMuted: '#94A3B8',
};

// =============================================================================
// NAVIGATION
// =============================================================================

function Navigation() {
    return (
        <nav
            className="fixed top-0 left-0 right-0 z-50 px-8 py-4"
            style={{ backgroundColor: COLORS.navy }}
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <div
                        className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm"
                        style={{ backgroundColor: COLORS.terracotta, color: COLORS.navy }}
                    >
                        Y
                    </div>
                </Link>

                {/* Nav Links */}
                <div className="hidden md:flex items-center gap-8">
                    {['Features', 'Pricing', 'Reviews', 'FAQ'].map((item) => (
                        <Link
                            key={item}
                            href={`#${item.toLowerCase()}`}
                            className="text-sm transition-colors hover:opacity-80"
                            style={{ color: COLORS.textMuted, fontFamily: "'DM Sans', sans-serif" }}
                        >
                            {item}
                        </Link>
                    ))}
                </div>

                {/* CTA Button */}
                <Link
                    href="/chat"
                    className="px-4 py-2 text-sm font-medium rounded transition-all hover:opacity-90"
                    style={{
                        backgroundColor: COLORS.terracotta,
                        color: COLORS.navy,
                        fontFamily: "'DM Sans', sans-serif",
                    }}
                >
                    START FREE TRIAL
                </Link>
            </div>
        </nav>
    );
}

// =============================================================================
// HERO SECTION
// =============================================================================

function HeroSection() {
    return (
        <section className="min-h-screen pt-24 pb-16 px-8" style={{ backgroundColor: COLORS.navy }}>
            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
                {/* Left Content */}
                <div className="space-y-8">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex items-center gap-3"
                    >
                        <span style={{ color: COLORS.terracotta }}>✦</span>
                        <span
                            className="text-sm tracking-wide"
                            style={{ color: COLORS.textMuted, fontFamily: "'DM Sans', sans-serif" }}
                        >
                            AI Operating System
                        </span>
                        <div className="flex gap-1">
                            <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: COLORS.terracotta }}
                            />
                            <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: COLORS.textMuted }}
                            />
                            <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: COLORS.textMuted }}
                            />
                        </div>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="text-5xl md:text-6xl lg:text-7xl leading-[1.1]"
                        style={{
                            color: COLORS.cream,
                            fontFamily: "'Playfair Display', serif",
                            fontWeight: 400,
                        }}
                    >
                        Your AI,
                        <br />
                        Evolved.
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-lg max-w-md"
                        style={{
                            color: COLORS.textMuted,
                            fontFamily: "'DM Sans', sans-serif",
                            lineHeight: 1.7,
                        }}
                    >
                        YULA OS brings together the world's best AI models in one intelligent
                        platform. Import your history, get proactive reminders, and let multiple AIs
                        debate your toughest decisions.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex flex-wrap gap-4"
                    >
                        <Link
                            href="/chat"
                            className="px-6 py-3 text-sm font-medium rounded transition-all hover:opacity-90 flex items-center gap-2"
                            style={{
                                backgroundColor: COLORS.terracotta,
                                color: COLORS.navy,
                                fontFamily: "'DM Sans', sans-serif",
                            }}
                        >
                            START FREE TRIAL
                        </Link>
                        <button
                            className="px-6 py-3 text-sm font-medium rounded border transition-all hover:opacity-80 flex items-center gap-2"
                            style={{
                                borderColor: COLORS.textMuted,
                                color: COLORS.textOnDark,
                                fontFamily: "'DM Sans', sans-serif",
                            }}
                        >
                            WATCH DEMO
                            <Play size={16} weight="fill" />
                        </button>
                    </motion.div>
                </div>

                {/* Right Content - Feature Mockups */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="relative"
                >
                    <div
                        className="rounded-2xl p-8 space-y-6"
                        style={{ backgroundColor: COLORS.navyLight }}
                    >
                        {/* Import Card */}
                        <div className="flex items-center gap-4">
                            <div className="text-xs" style={{ color: COLORS.textMuted }}>
                                ✦ IMPORT
                            </div>
                            <div
                                className="flex-1 h-px"
                                style={{ backgroundColor: COLORS.textMuted, opacity: 0.3 }}
                            />
                        </div>
                        <div
                            className="rounded-lg p-4 border"
                            style={{ borderColor: `${COLORS.textMuted}30` }}
                        >
                            <div
                                className="w-24 h-3 rounded"
                                style={{ backgroundColor: `${COLORS.textMuted}30` }}
                            />
                        </div>

                        {/* PAC Card */}
                        <div className="flex items-center gap-4">
                            <div className="text-xs" style={{ color: COLORS.textMuted }}>
                                ✦ PAC
                            </div>
                            <div
                                className="flex-1 h-px"
                                style={{ backgroundColor: COLORS.textMuted, opacity: 0.3 }}
                            />
                        </div>
                        <div
                            className="rounded-lg p-4 border"
                            style={{ borderColor: `${COLORS.textMuted}30` }}
                        >
                            <div
                                className="w-32 h-3 rounded"
                                style={{ backgroundColor: `${COLORS.textMuted}30` }}
                            />
                        </div>

                        {/* Council Card */}
                        <div className="flex items-center gap-4">
                            <div className="text-xs" style={{ color: COLORS.textMuted }}>
                                ✦ COUNCIL
                            </div>
                            <div
                                className="flex-1 h-px"
                                style={{ backgroundColor: COLORS.textMuted, opacity: 0.3 }}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="aspect-square rounded-lg border"
                                    style={{ borderColor: `${COLORS.textMuted}30` }}
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

// =============================================================================
// ANIMATED SECTION WRAPPER
// =============================================================================

function AnimatedSection({
    children,
    className = '',
    style = {},
    id,
}: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    id?: string;
}) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <motion.section
            id={id}
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.8 }}
            className={className}
            style={style}
        >
            {children}
        </motion.section>
    );
}

// =============================================================================
// THE PROBLEM SECTION
// =============================================================================

function ProblemSection() {
    const problems = [
        {
            title: 'Scattered Conversations',
            description: 'Your insights are trapped across ChatGPT, Claude, and Gemini.',
            accent: true,
        },
        {
            title: 'No Follow-Through',
            description: 'AI never checks back on what you discussed.',
            accent: false,
        },
        {
            title: 'One Perspective',
            description: 'Single models have blind spots you never see.',
            accent: false,
        },
    ];

    return (
        <AnimatedSection className="py-24 px-8" style={{ backgroundColor: COLORS.navy }}>
            <div className="max-w-7xl mx-auto">
                {/* Badge */}
                <div className="flex items-center gap-3 mb-6">
                    <span style={{ color: COLORS.terracotta }}>✦</span>
                    <span
                        className="text-sm tracking-wide"
                        style={{ color: COLORS.textMuted, fontFamily: "'DM Sans', sans-serif" }}
                    >
                        The Problem
                    </span>
                </div>

                {/* Headline */}
                <h2
                    className="text-4xl md:text-5xl mb-12 max-w-2xl"
                    style={{
                        color: COLORS.cream,
                        fontFamily: "'Playfair Display', serif",
                        fontWeight: 400,
                        lineHeight: 1.2,
                    }}
                >
                    Tired of AI That
                    <br />
                    Forgets Everything?
                </h2>

                {/* Problem Cards */}
                <div className="grid md:grid-cols-3 gap-4">
                    {problems.map((problem, idx) => (
                        <div
                            key={idx}
                            className="p-6 rounded-lg"
                            style={{
                                backgroundColor: problem.accent ? COLORS.terracotta : COLORS.cream,
                                color: problem.accent ? COLORS.cream : COLORS.navy,
                            }}
                        >
                            <h3
                                className="text-lg font-medium mb-2"
                                style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                                {problem.title}
                            </h3>
                            <p
                                className="text-sm opacity-80"
                                style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                                {problem.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </AnimatedSection>
    );
}

// =============================================================================
// FEATURES SECTION
// =============================================================================

function FeaturesSection() {
    const features = [
        {
            number: '001',
            title: 'Import',
            subtitle: 'Bring Your AI History Home',
            description: 'Import your conversations from ChatGPT and Claude in seconds.',
            accent: false,
        },
        {
            number: '002',
            title: 'PAC',
            subtitle: 'AI That Actually Follows Up',
            description: 'Proactive reminders for commitments, deadlines, and follow-ups.',
            accent: true,
        },
        {
            number: '003',
            title: 'Council',
            subtitle: 'Let Four AIs Debate Your Decision',
            description: 'Multiple perspectives from GPT-4, Claude, Gemini & Llama.',
            accent: false,
        },
    ];

    return (
        <AnimatedSection
            id="features"
            className="py-20 px-8"
            style={{ backgroundColor: COLORS.cream }}
        >
            <div className="max-w-7xl mx-auto">
                {/* Badge */}
                <div className="flex items-center gap-3 mb-8">
                    <span style={{ color: COLORS.terracotta }}>✦</span>
                    <span
                        className="text-sm tracking-wide"
                        style={{ color: COLORS.textMuted, fontFamily: "'DM Sans', sans-serif" }}
                    >
                        Features
                    </span>
                </div>

                {/* Feature Columns */}
                <div
                    className="grid md:grid-cols-3 gap-0 border-t"
                    style={{ borderColor: COLORS.creamDark }}
                >
                    {features.map((feature, idx) => (
                        <div
                            key={idx}
                            className="p-8 border-b md:border-b-0 md:border-r last:border-r-0"
                            style={{
                                borderColor: COLORS.creamDark,
                                backgroundColor: feature.accent ? COLORS.terracotta : 'transparent',
                                color: feature.accent ? COLORS.cream : COLORS.navy,
                            }}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <h3
                                    className="text-2xl"
                                    style={{
                                        fontFamily: "'Playfair Display', serif",
                                        fontWeight: 400,
                                    }}
                                >
                                    {feature.title}
                                </h3>
                                <span
                                    className="text-xs"
                                    style={{
                                        color: feature.accent ? COLORS.cream : COLORS.textMuted,
                                        fontFamily: "'DM Sans', sans-serif",
                                    }}
                                >
                                    {feature.number}
                                </span>
                            </div>
                            <p
                                className="text-sm font-medium mb-2"
                                style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                                {feature.subtitle}
                            </p>
                            <p
                                className="text-sm opacity-70"
                                style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </AnimatedSection>
    );
}

// =============================================================================
// HOW IT WORKS SECTION
// =============================================================================

function HowItWorksSection() {
    const steps = [
        {
            number: '01',
            title: 'Import',
            description: 'Import your conversations from ChatGPT and Claude.',
        },
        {
            number: '02',
            title: 'Chat',
            description: 'Chat naturally - YULA learns your preferences.',
        },
        {
            number: '03',
            title: 'Remind',
            description: 'Get proactive reminders for commitments and goals.',
        },
        {
            number: '04',
            title: 'Council',
            description: 'Use Council for decisions that require multiple perspectives.',
        },
    ];

    return (
        <AnimatedSection className="py-24 px-8" style={{ backgroundColor: COLORS.navy }}>
            <div className="max-w-7xl mx-auto">
                {/* Badge */}
                <div className="flex items-center gap-3 mb-6">
                    <span style={{ color: COLORS.terracotta }}>✦</span>
                    <span
                        className="text-sm tracking-wide"
                        style={{ color: COLORS.textMuted, fontFamily: "'DM Sans', sans-serif" }}
                    >
                        How It Works
                    </span>
                </div>

                {/* Headline */}
                <h2
                    className="text-4xl md:text-5xl mb-16"
                    style={{
                        color: COLORS.cream,
                        fontFamily: "'Playfair Display', serif",
                        fontWeight: 400,
                        lineHeight: 1.2,
                    }}
                >
                    Four steps.
                    <br />
                    That's it.
                </h2>

                {/* Steps */}
                <div className="grid md:grid-cols-4 gap-8">
                    {steps.map((step, idx) => (
                        <div key={idx}>
                            <div
                                className="text-3xl mb-4"
                                style={{
                                    color: idx === 0 ? COLORS.terracotta : COLORS.textMuted,
                                    fontFamily: "'Playfair Display', serif",
                                }}
                            >
                                {step.number}
                            </div>
                            <h3
                                className="text-lg mb-2"
                                style={{
                                    color: COLORS.cream,
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontWeight: 500,
                                }}
                            >
                                {step.title}
                            </h3>
                            <p
                                className="text-sm"
                                style={{
                                    color: COLORS.textMuted,
                                    fontFamily: "'DM Sans', sans-serif",
                                }}
                            >
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </AnimatedSection>
    );
}

// =============================================================================
// PRICING SECTION
// =============================================================================

function PricingSection() {
    const plans = [
        {
            name: 'Free',
            price: '$0',
            period: '/month',
            features: ['50 messages/day', 'Import up to 100 conversations', 'Basic PAC reminders'],
            cta: 'Get Started',
            popular: false,
        },
        {
            name: 'Pro',
            price: '$20',
            period: '/month',
            features: [
                'Unlimited messages',
                'Unlimited imports',
                'Full PAC with smart detection',
                '50 Council consultations/mo',
                'Priority support',
            ],
            cta: 'Start Free Trial',
            popular: true,
        },
        {
            name: 'Ultra',
            price: '$50',
            period: '/month',
            features: [
                'Everything in Pro',
                'Unlimited Council sessions',
                'API Access',
                'Team collaboration (coming soon)',
                'Custom AI personas',
            ],
            cta: 'Start Free Trial',
            popular: false,
        },
    ];

    return (
        <AnimatedSection
            id="pricing"
            className="py-24 px-8"
            style={{ backgroundColor: COLORS.navy }}
        >
            <div className="max-w-7xl mx-auto">
                {/* Badge */}
                <div className="flex items-center gap-3 mb-6">
                    <span style={{ color: COLORS.terracotta }}>✦</span>
                    <span
                        className="text-sm tracking-wide"
                        style={{ color: COLORS.textMuted, fontFamily: "'DM Sans', sans-serif" }}
                    >
                        Pricing
                    </span>
                </div>

                {/* Headline */}
                <h2
                    className="text-4xl md:text-5xl mb-4"
                    style={{
                        color: COLORS.cream,
                        fontFamily: "'Playfair Display', serif",
                        fontWeight: 400,
                    }}
                >
                    Simple, Transparent
                    <br />
                    Pricing.
                </h2>

                <p
                    className="text-sm mb-12"
                    style={{
                        color: COLORS.textMuted,
                        fontFamily: "'DM Sans', sans-serif",
                    }}
                >
                    All plans include a 14-day free trial. No credit card required.
                </p>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-6">
                    {plans.map((plan, idx) => (
                        <div
                            key={idx}
                            className="rounded-lg p-6 relative"
                            style={{
                                backgroundColor: plan.popular
                                    ? COLORS.terracotta
                                    : COLORS.navyLight,
                                color: plan.popular ? COLORS.navy : COLORS.cream,
                                border: plan.popular ? 'none' : `1px solid ${COLORS.textMuted}30`,
                            }}
                        >
                            {plan.popular && (
                                <div
                                    className="absolute -top-3 left-6 px-3 py-1 text-xs font-medium rounded"
                                    style={{
                                        backgroundColor: COLORS.navy,
                                        color: COLORS.terracotta,
                                        fontFamily: "'DM Sans', sans-serif",
                                    }}
                                >
                                    MOST POPULAR
                                </div>
                            )}

                            <h3
                                className="text-lg mb-4"
                                style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                                {plan.name}
                            </h3>

                            <div className="flex items-baseline gap-1 mb-6">
                                <span
                                    className="text-4xl"
                                    style={{ fontFamily: "'Playfair Display', serif" }}
                                >
                                    {plan.price}
                                </span>
                                <span
                                    className="text-sm opacity-70"
                                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                                >
                                    {plan.period}
                                </span>
                            </div>

                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature, fidx) => (
                                    <li
                                        key={fidx}
                                        className="flex items-start gap-2 text-sm"
                                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                                    >
                                        <Check
                                            size={16}
                                            weight="bold"
                                            className="mt-0.5 flex-shrink-0"
                                        />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                className="w-full py-3 rounded text-sm font-medium transition-all hover:opacity-90"
                                style={{
                                    backgroundColor: plan.popular ? COLORS.navy : 'transparent',
                                    color: plan.popular ? COLORS.cream : COLORS.cream,
                                    border: plan.popular
                                        ? 'none'
                                        : `1px solid ${COLORS.textMuted}50`,
                                    fontFamily: "'DM Sans', sans-serif",
                                }}
                            >
                                {plan.cta}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </AnimatedSection>
    );
}

// =============================================================================
// FAQ SECTION
// =============================================================================

function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const faqs = [
        {
            q: 'Can I easily import my ChatGPT history?',
            a: 'Yes! YULA supports direct import from ChatGPT and Claude. Just export your data and upload it to YULA.',
        },
        {
            q: 'Which AI models does YULA use?',
            a: 'YULA uses GPT-4, Claude 3, Gemini Pro, and Llama 3. You can switch between them anytime.',
        },
        {
            q: "What's the Council feature?",
            a: 'Council lets you ask a question to multiple AI models simultaneously and see their different perspectives side by side.',
        },
        {
            q: 'How does PAC work?',
            a: 'PAC (Proactive AI Callbacks) analyzes your conversations and proactively reminds you about commitments, deadlines, and follow-ups.',
        },
        {
            q: 'Is my data secure?',
            a: 'Yes. Your data is encrypted at rest and in transit. We never train on your data or share it with third parties.',
        },
        {
            q: 'Can I use YULA offline?',
            a: 'YULA is a PWA and works offline for viewing your history. Active AI conversations require an internet connection.',
        },
    ];

    return (
        <AnimatedSection id="faq" className="py-24 px-8" style={{ backgroundColor: COLORS.cream }}>
            <div className="max-w-3xl mx-auto">
                {/* Badge */}
                <div className="flex items-center gap-3 mb-6">
                    <span style={{ color: COLORS.terracotta }}>✦</span>
                    <span
                        className="text-sm tracking-wide"
                        style={{ color: COLORS.textMuted, fontFamily: "'DM Sans', sans-serif" }}
                    >
                        FAQ
                    </span>
                </div>

                {/* Headline */}
                <h2
                    className="text-4xl md:text-5xl mb-12"
                    style={{
                        color: COLORS.navy,
                        fontFamily: "'Playfair Display', serif",
                        fontWeight: 400,
                    }}
                >
                    Questions we
                    <br />
                    get asked.
                </h2>

                {/* FAQ Items */}
                <div className="space-y-0">
                    {faqs.map((faq, idx) => (
                        <div
                            key={idx}
                            className="border-b py-4 cursor-pointer"
                            style={{ borderColor: COLORS.creamDark }}
                            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                        >
                            <div className="flex justify-between items-center">
                                <span
                                    className="text-sm"
                                    style={{
                                        color: COLORS.navy,
                                        fontFamily: "'DM Sans', sans-serif",
                                    }}
                                >
                                    {faq.q}
                                </span>
                                <Plus
                                    size={20}
                                    style={{ color: COLORS.textMuted }}
                                    className={cn(
                                        'transition-transform flex-shrink-0',
                                        openIndex === idx && 'rotate-45'
                                    )}
                                />
                            </div>
                            <AnimatePresence>
                                {openIndex === idx && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden"
                                    >
                                        <p
                                            className="text-sm pt-4"
                                            style={{
                                                color: COLORS.textMuted,
                                                fontFamily: "'DM Sans', sans-serif",
                                            }}
                                        >
                                            {faq.a}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </AnimatedSection>
    );
}

// =============================================================================
// CTA SECTION
// =============================================================================

function CTASection() {
    return (
        <AnimatedSection
            className="py-24 px-8 text-center"
            style={{ backgroundColor: COLORS.navy }}
        >
            <div className="max-w-2xl mx-auto">
                <h2
                    className="text-4xl md:text-5xl mb-6"
                    style={{
                        color: COLORS.cream,
                        fontFamily: "'Playfair Display', serif",
                        fontWeight: 400,
                    }}
                >
                    Your AI Journey
                    <br />
                    Starts Here.
                </h2>

                <p
                    className="text-sm mb-8 max-w-md mx-auto"
                    style={{
                        color: COLORS.textMuted,
                        fontFamily: "'DM Sans', sans-serif",
                    }}
                >
                    Join early adopters building a smarter AI workflow. Import your history, get
                    proactive reminders, and make better decisions with Council.
                </p>

                <Link
                    href="/chat"
                    className="inline-block px-8 py-4 text-sm font-medium rounded border transition-all hover:bg-white/5"
                    style={{
                        borderColor: COLORS.textMuted,
                        color: COLORS.cream,
                        fontFamily: "'DM Sans', sans-serif",
                    }}
                >
                    START YOUR FREE TRIAL
                </Link>

                <p
                    className="text-xs mt-6"
                    style={{
                        color: COLORS.textMuted,
                        fontFamily: "'DM Sans', sans-serif",
                    }}
                >
                    14-day free trial · No credit card required · Cancel anytime
                </p>
            </div>
        </AnimatedSection>
    );
}

// =============================================================================
// STATS SECTION
// =============================================================================

function StatsSection() {
    return (
        <AnimatedSection
            className="py-16 px-8 relative overflow-hidden"
            style={{ backgroundColor: COLORS.terracotta }}
        >
            <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 items-center">
                {/* Stats */}
                <div>
                    <div
                        className="text-sm mb-2"
                        style={{
                            color: COLORS.navy,
                            fontFamily: "'DM Sans', sans-serif",
                            opacity: 0.7,
                        }}
                    >
                        Active
                    </div>
                    <div
                        className="text-4xl"
                        style={{
                            color: COLORS.navy,
                            fontFamily: "'Playfair Display', serif",
                        }}
                    >
                        Early Access
                    </div>
                    <div
                        className="text-xs mt-1"
                        style={{
                            color: COLORS.navy,
                            fontFamily: "'DM Sans', sans-serif",
                            opacity: 0.7,
                        }}
                    >
                        join the beta
                    </div>
                </div>

                {/* Giant YULA text */}
                <div className="text-center">
                    <span
                        className="text-7xl md:text-9xl font-bold tracking-tight"
                        style={{
                            color: COLORS.terracottaDark,
                            fontFamily: "'Playfair Display', serif",
                        }}
                    >
                        YULA
                    </span>
                </div>

                {/* Description */}
                <div className="p-6 rounded-lg" style={{ backgroundColor: COLORS.navy }}>
                    <p
                        className="text-sm"
                        style={{
                            color: COLORS.textOnDark,
                            fontFamily: "'DM Sans', sans-serif",
                            lineHeight: 1.7,
                        }}
                    >
                        YULA OS is the AI operating system that remembers, reminds, and reasons.
                        Import your history, get proactive reminders, and make better decisions with
                        Council.
                    </p>
                </div>
            </div>

            {/* Diamond decoration */}
            <div
                className="absolute bottom-8 left-8 w-4 h-4 rotate-45 border"
                style={{ borderColor: COLORS.navy }}
            />
        </AnimatedSection>
    );
}

// =============================================================================
// FOOTER
// =============================================================================

function Footer() {
    return (
        <footer className="py-4 px-8" style={{ backgroundColor: COLORS.navy }}>
            <div
                className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4 text-xs"
                style={{ color: COLORS.textMuted, fontFamily: "'DM Sans', sans-serif" }}
            >
                <span>© YULA AI, 2024</span>
                <span>All rights reserved</span>
                <div className="flex gap-6">
                    <Link href="/terms" className="hover:opacity-80 transition-opacity">
                        Terms of Use
                    </Link>
                    <Link href="/privacy" className="hover:opacity-80 transition-opacity">
                        Privacy Policy
                    </Link>
                </div>
            </div>
        </footer>
    );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function LandingPage() {
    return (
        <div className="min-h-screen" style={{ backgroundColor: COLORS.navy }}>
            <Navigation />
            <HeroSection />
            <ProblemSection />
            <FeaturesSection />
            <HowItWorksSection />
            <PricingSection />
            <FAQSection />
            <CTASection />
            <StatsSection />
            <Footer />
        </div>
    );
}
