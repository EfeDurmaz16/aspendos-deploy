'use client';

import {
    ArrowRight,
    ArrowCounterClockwise,
    CaretDown,
    ChatCircleDots,
    Check,
    CloudArrowUp,
    Fingerprint,
    GitBranch,
    Lightning,
    ListChecks,
    Prohibit,
    Question,
    Seal,
    SealCheck,
    ShieldCheck,
    SignIn,
    Sparkle,
    GithubLogo,
} from '@phosphor-icons/react';
import { PlatformIcon, type PlatformName } from '@/components/platform-icon';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// CONSTANTS
// =============================================================================

const REVERSIBILITY_CLASSES = [
    {
        level: 'R0',
        label: 'Fully reversible',
        color: '#22c55e',
        bg: 'rgba(34,197,94,0.1)',
        border: 'rgba(34,197,94,0.25)',
        example: 'Draft an email',
        description: 'Action can be fully undone. No side effects leave the system.',
    },
    {
        level: 'R1',
        label: 'Soft-reversible',
        color: '#eab308',
        bg: 'rgba(234,179,8,0.1)',
        border: 'rgba(234,179,8,0.25)',
        example: 'Post a Slack message',
        description: 'Can be retracted, but recipients may have already seen it.',
    },
    {
        level: 'R2',
        label: 'Partially reversible',
        color: '#f97316',
        bg: 'rgba(249,115,22,0.1)',
        border: 'rgba(249,115,22,0.25)',
        example: 'Create a calendar event',
        description: 'Can be deleted, but attendees were already notified.',
    },
    {
        level: 'R3',
        label: 'Irreversible with cost',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.1)',
        border: 'rgba(239,68,68,0.25)',
        example: 'Send an email',
        description: 'Cannot be recalled. The action has permanent external effects.',
    },
    {
        level: 'R4',
        label: 'Irreversible',
        color: '#991b1b',
        bg: 'rgba(153,27,27,0.1)',
        border: 'rgba(153,27,27,0.25)',
        example: 'Execute a payment',
        description: 'Cannot be undone. Requires explicit human approval before execution.',
    },
] as const;

// =============================================================================
// ANIMATED SECTION WRAPPER
// =============================================================================

function AnimatedSection({
    children,
    className,
    id,
    delay = 0,
}: {
    children: React.ReactNode;
    className?: string;
    id?: string;
    delay?: number;
}) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-80px' });

    return (
        <motion.section
            id={id}
            ref={ref}
            initial={{ opacity: 0, y: 32 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
            transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
            className={className}
        >
            {children}
        </motion.section>
    );
}

// =============================================================================
// NAVIGATION
// =============================================================================

function Navigation() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav
            className={cn(
                'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
                scrolled
                    ? 'bg-background/80 backdrop-blur-xl border-b border-border/50'
                    : 'bg-transparent'
            )}
        >
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                        <span className="text-background text-xs font-bold tracking-tight">Y</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground tracking-tight">
                        Yula
                    </span>
                </Link>

                <div className="hidden md:flex items-center gap-8">
                    {[
                        { label: 'Features', href: '#features' },
                        { label: 'Reversibility', href: '#reversibility' },
                        { label: 'Pricing', href: '#pricing' },
                        { label: 'FAQ', href: '#faq' },
                    ].map((item) => (
                        <a
                            key={item.label}
                            href={item.href}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {item.label}
                        </a>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <a
                        href="/login"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
                    >
                        Sign in
                    </a>
                    <a
                        href="/signup"
                        className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                    >
                        Get started
                        <ArrowRight size={14} weight="bold" />
                    </a>
                </div>
            </div>
        </nav>
    );
}

// =============================================================================
// HERO SECTION
// =============================================================================

function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
            <div className="absolute inset-0 bg-background" />
            <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
                    backgroundSize: '64px 64px',
                }}
            />

            <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
                <div className="max-w-3xl mx-auto text-center space-y-8">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-card/50"
                    >
                        <ShieldCheck size={14} weight="fill" className="text-foreground/60" />
                        <span className="text-xs text-muted-foreground">
                            Deterministic AI agents
                        </span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                        className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.1] tracking-tight text-foreground"
                        style={{ textWrap: 'balance' as any }}
                    >
                        Prove what they did. <br />
                        <span className="text-muted-foreground">And why.</span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
                    >
                        A trustworthy AI agent for Slack and web. Every action signed, logged,
                        approval-aware, and reversible when supported.
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex flex-wrap items-center justify-center gap-3"
                    >
                        <a
                            href="/signup"
                            className="h-11 px-6 rounded-lg bg-foreground text-background text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                        >
                            Start free
                            <ArrowRight size={16} weight="bold" />
                        </a>
                        <Link
                            href="#reversibility"
                            className="h-11 px-6 rounded-lg border border-border text-foreground text-sm font-medium flex items-center gap-2 hover:bg-card transition-colors"
                        >
                            How it works
                        </Link>
                    </motion.div>

                    {/* Trust signals */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="flex items-center justify-center gap-6 pt-4 text-xs text-muted-foreground"
                    >
                        <span className="flex items-center gap-1.5">
                            <SealCheck size={14} weight="fill" className="text-foreground/40" />
                            FIDES-signed
                        </span>
                        <span className="flex items-center gap-1.5">
                            <ListChecks size={14} weight="bold" className="text-foreground/40" />
                            AGIT-logged
                        </span>
                        <span className="hidden sm:flex items-center gap-1.5">
                            <ArrowCounterClockwise
                                size={14}
                                weight="bold"
                                className="text-foreground/40"
                            />
                            Reversible
                        </span>
                    </motion.div>
                </div>

                {/* Hero Demo */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="mt-16 md:mt-20 max-w-4xl mx-auto"
                >
                    <AgentDemo />
                </motion.div>
            </div>
        </section>
    );
}

// =============================================================================
// AGENT DEMO — Shows agent executing a tool with reversibility badge
// =============================================================================

interface DemoStep {
    id: number;
    type: 'user' | 'thinking' | 'tool' | 'badge' | 'result';
    content: string;
    badge?: (typeof REVERSIBILITY_CLASSES)[number];
    tool?: string;
}

const DEMO_SEQUENCE: DemoStep[] = [
    { id: 1, type: 'user', content: "Send a summary of today's standup to #engineering on Slack" },
    { id: 2, type: 'thinking', content: 'Analyzing request... classifying reversibility...' },
    { id: 3, type: 'tool', content: 'slack.postMessage', tool: 'Slack API' },
    {
        id: 4,
        type: 'badge',
        content: 'Classified as R1 — Soft-reversible',
        badge: REVERSIBILITY_CLASSES[1],
    },
    {
        id: 5,
        type: 'result',
        content: 'Message posted to #engineering. You can /undo within 5 minutes to retract it.',
    },
];

function AgentDemo() {
    const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
    const [hasPlayed, setHasPlayed] = useState(false);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    useEffect(() => {
        if (!isInView || hasPlayed) return;
        setHasPlayed(true);

        const timers: ReturnType<typeof setTimeout>[] = [];
        DEMO_SEQUENCE.forEach((step, i) => {
            timers.push(
                setTimeout(
                    () => {
                        setVisibleSteps((prev) => [...prev, step.id]);
                    },
                    (i + 1) * 800
                )
            );
        });

        return () => timers.forEach(clearTimeout);
    }, [isInView, hasPlayed]);

    return (
        <div
            ref={ref}
            className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl"
        >
            {/* Window chrome */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/80">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-foreground/10 border border-foreground/15" />
                        <div className="w-3 h-3 rounded-full bg-foreground/10 border border-foreground/15" />
                        <div className="w-3 h-3 rounded-full bg-foreground/10 border border-foreground/15" />
                    </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                    <span>Agent Session</span>
                </div>
                <div className="w-16" />
            </div>

            {/* Demo content */}
            <div className="p-5 md:p-6 space-y-4 min-h-[300px]">
                <AnimatePresence mode="popLayout">
                    {DEMO_SEQUENCE.filter((s) => visibleSteps.includes(s.id)).map((step) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            {step.type === 'user' && (
                                <div className="flex justify-end">
                                    <div className="bg-muted rounded-2xl rounded-br-md px-4 py-3 max-w-[75%]">
                                        <p className="text-sm text-foreground">{step.content}</p>
                                    </div>
                                </div>
                            )}

                            {step.type === 'thinking' && (
                                <div className="flex gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-foreground/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Sparkle
                                            size={14}
                                            weight="fill"
                                            className="text-foreground/60"
                                        />
                                    </div>
                                    <p className="text-sm text-muted-foreground italic py-2">
                                        {step.content}
                                    </p>
                                </div>
                            )}

                            {step.type === 'tool' && (
                                <div className="flex gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-foreground/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <GitBranch size={14} className="text-foreground/60" />
                                    </div>
                                    <div className="flex items-center gap-2 py-2">
                                        <code className="text-xs px-2 py-1 rounded-md bg-muted border border-border/50 font-mono text-foreground/80">
                                            {step.content}
                                        </code>
                                        <span className="text-xs text-muted-foreground">
                                            via {step.tool}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {step.type === 'badge' && step.badge && (
                                <div className="flex gap-3">
                                    <div className="w-7 h-7" />
                                    <motion.div
                                        initial={{ scale: 0.9 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                                        style={{
                                            backgroundColor: step.badge.bg,
                                            border: `1px solid ${step.badge.border}`,
                                            color: step.badge.color,
                                        }}
                                    >
                                        <Seal size={14} weight="fill" />
                                        {step.badge.level} — {step.badge.label}
                                    </motion.div>
                                </div>
                            )}

                            {step.type === 'result' && (
                                <div className="flex gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-foreground/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Sparkle
                                            size={14}
                                            weight="fill"
                                            className="text-foreground/60"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-foreground/90 leading-relaxed">
                                            {step.content}
                                        </p>
                                        <div className="flex items-center gap-3 pt-1">
                                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <SealCheck size={13} weight="fill" />
                                                FIDES-signed
                                            </span>
                                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <ListChecks size={13} />
                                                AGIT trace #a7f2
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {visibleSteps.length === 0 && (
                    <div className="flex items-center justify-center h-[260px]">
                        <div className="text-center">
                            <div className="w-10 h-10 rounded-xl bg-foreground/5 border border-border/50 flex items-center justify-center mx-auto mb-3">
                                <ShieldCheck size={20} className="text-foreground/40" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Scroll down to see the agent in action
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// =============================================================================
// REVERSIBILITY MODEL SECTION
// =============================================================================

function ReversibilitySection() {
    const [activeClass, setActiveClass] = useState<number>(1);

    return (
        <AnimatedSection
            id="reversibility"
            className="py-24 md:py-32 px-6 border-t border-border/30"
        >
            <div className="max-w-6xl mx-auto">
                <div className="max-w-2xl mb-16">
                    <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
                        Reversibility Model
                    </span>
                    <h2
                        className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mt-3"
                        style={{ textWrap: 'balance' as any }}
                    >
                        Every action has a{' '}
                        <span className="text-muted-foreground">reversibility class</span>
                    </h2>
                    <p className="text-sm text-muted-foreground mt-4 leading-relaxed max-w-lg">
                        Before Yula executes any tool, it classifies the action into one of five
                        reversibility levels. Higher levels require explicit approval.
                    </p>
                </div>

                <div className="grid lg:grid-cols-[1fr,1.2fr] gap-8 items-start">
                    {/* Class list */}
                    <div className="space-y-2">
                        {REVERSIBILITY_CLASSES.map((cls, idx) => (
                            <motion.button
                                key={cls.level}
                                type="button"
                                onClick={() => setActiveClass(idx)}
                                whileHover={{ x: 4 }}
                                className={cn(
                                    'w-full text-left px-4 py-3 rounded-lg border transition-all duration-200',
                                    activeClass === idx
                                        ? 'bg-card/80 border-border shadow-sm'
                                        : 'border-transparent hover:bg-card/40'
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold font-mono flex-shrink-0"
                                        style={{
                                            backgroundColor: cls.bg,
                                            color: cls.color,
                                            border: `1px solid ${cls.border}`,
                                        }}
                                    >
                                        {cls.level}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-foreground">
                                            {cls.label}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            e.g. {cls.example}
                                        </div>
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    {/* Detail card */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeClass}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                            className="rounded-xl border border-border/60 bg-card/40 p-6 md:p-8"
                        >
                            {(() => {
                                const cls = REVERSIBILITY_CLASSES[activeClass];
                                return (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-12 h-12 rounded-lg flex items-center justify-center text-base font-bold font-mono"
                                                style={{
                                                    backgroundColor: cls.bg,
                                                    color: cls.color,
                                                    border: `1px solid ${cls.border}`,
                                                }}
                                            >
                                                {cls.level}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-foreground">
                                                    {cls.label}
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {cls.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="border-t border-border/40 pt-5 space-y-3">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-muted-foreground w-24 flex-shrink-0">
                                                    Example
                                                </span>
                                                <code className="text-xs px-2 py-1 rounded bg-muted font-mono">
                                                    {cls.example}
                                                </code>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-muted-foreground w-24 flex-shrink-0">
                                                    Approval
                                                </span>
                                                <span className="text-foreground/80">
                                                    {activeClass <= 1
                                                        ? 'Auto-approved'
                                                        : activeClass <= 2
                                                          ? 'Logged, approval optional'
                                                          : 'Requires explicit human approval'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-muted-foreground w-24 flex-shrink-0">
                                                    Undo
                                                </span>
                                                <span className="text-foreground/80">
                                                    {activeClass === 0
                                                        ? '/undo — instant, full rollback'
                                                        : activeClass === 1
                                                          ? '/undo — retract within time window'
                                                          : activeClass === 2
                                                            ? '/undo — partial, with side-effect warning'
                                                            : 'Not available — action is permanent'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </AnimatedSection>
    );
}

// =============================================================================
// FEATURES SECTION — FIDES / AGIT / Reversibility + Import / PAC / Council
// =============================================================================

function FeaturesSection() {
    const trustFeatures = [
        {
            icon: Fingerprint,
            title: 'FIDES — Signed',
            description:
                'Every agent action is cryptographically signed. You can verify who did what, when, and with which model. Tamper-evident by default.',
        },
        {
            icon: ListChecks,
            title: 'AGIT — Logged',
            description:
                'Full causal trace of every decision. See the chain of reasoning, tool calls, and approvals that led to any outcome. Inspect with /timeline.',
        },
        {
            icon: ArrowCounterClockwise,
            title: 'Reversibility — Classified',
            description:
                'Every tool call is classified R0-R4 before execution. Higher-risk actions require approval. Lower-risk actions can be undone with /undo.',
        },
    ];

    const productFeatures = [
        {
            icon: CloudArrowUp,
            title: 'Import Your History',
            description:
                'Bring your conversations from ChatGPT and Claude. Your context, preferences, and memories transfer with you.',
        },
        {
            icon: Lightning,
            title: 'PAC — AI Writes to You',
            description:
                'Proactive reminders that detect commitments, deadlines, and follow-ups from your conversations. Yula reaches out before you forget.',
        },
        {
            icon: ChatCircleDots,
            title: 'Council — Ask 4 AIs',
            description:
                'Query GPT-4, Claude, Gemini, and Llama simultaneously. Compare perspectives side-by-side for better decisions.',
        },
    ];

    return (
        <AnimatedSection id="features" className="py-24 md:py-32 px-6">
            <div className="max-w-6xl mx-auto">
                {/* Trust pillars */}
                <div className="max-w-2xl mb-12">
                    <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
                        Trust Infrastructure
                    </span>
                    <h2
                        className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mt-3"
                        style={{ textWrap: 'balance' as any }}
                    >
                        Built on provable trust,{' '}
                        <span className="text-muted-foreground">not promises</span>
                    </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-20">
                    {trustFeatures.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.6 }}
                            className="group rounded-xl border border-border/50 bg-card/30 p-6 hover:border-border hover:bg-card/60 transition-all duration-300"
                        >
                            <div className="w-10 h-10 rounded-lg bg-foreground/5 border border-border/50 flex items-center justify-center mb-5">
                                <feature.icon size={20} className="text-foreground/70" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Product features */}
                <div className="max-w-2xl mb-12">
                    <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
                        Features
                    </span>
                    <h2
                        className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mt-3"
                        style={{ textWrap: 'balance' as any }}
                    >
                        Three features that change{' '}
                        <span className="text-muted-foreground">how you use AI</span>
                    </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {productFeatures.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.6 }}
                            className="group rounded-xl border border-border/50 bg-card/30 p-6 hover:border-border hover:bg-card/60 transition-all duration-300"
                        >
                            <div className="w-10 h-10 rounded-lg bg-foreground/5 border border-border/50 flex items-center justify-center mb-5">
                                <feature.icon size={20} className="text-foreground/70" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </AnimatedSection>
    );
}

// =============================================================================
// SURFACES SECTION — "Works everywhere"
// =============================================================================

function SurfacesSection() {
    const surfaces: { name: string; key: PlatformName }[] = [
        { name: 'Slack', key: 'slack' },
        { name: 'Telegram', key: 'telegram' },
        { name: 'Discord', key: 'discord' },
        { name: 'WhatsApp', key: 'whatsapp' },
        { name: 'Teams', key: 'teams' },
        { name: 'Google Chat', key: 'googlechat' },
        { name: 'iMessage', key: 'imessage' },
        { name: 'Signal', key: 'signal' },
    ];

    return (
        <AnimatedSection className="py-24 md:py-32 px-6 border-t border-border/30">
            <div className="max-w-6xl mx-auto text-center">
                <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
                    Surfaces
                </span>
                <h2
                    className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mt-3 mb-4"
                    style={{ textWrap: 'balance' as any }}
                >
                    Works everywhere <span className="text-muted-foreground">you do</span>
                </h2>
                <p className="text-sm text-muted-foreground mb-12 max-w-md mx-auto">
                    One agent, one audit trail, across every platform. Same trust guarantees
                    regardless of surface.
                </p>

                <div className="grid grid-cols-4 md:grid-cols-8 gap-4 max-w-3xl mx-auto">
                    {surfaces.map((surface, i) => (
                        <motion.div
                            key={surface.name}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05, duration: 0.4 }}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-12 h-12 rounded-xl border border-border/50 bg-card/30 flex items-center justify-center group-hover:border-border group-hover:bg-card/60 transition-all">
                                <PlatformIcon
                                    name={surface.key}
                                    size={28}
                                    theme="dark"
                                    className="opacity-90 group-hover:opacity-100 transition-opacity"
                                />
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                                {surface.name}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </AnimatedSection>
    );
}

// =============================================================================
// HOW IT WORKS
// =============================================================================

function HowItWorksSection() {
    const steps = [
        {
            number: '01',
            title: 'Ask',
            description:
                'Give Yula a task in natural language — from Slack, web, or any connected surface.',
        },
        {
            number: '02',
            title: 'Agent acts',
            description:
                'Yula classifies the action, shows a reversibility badge, and executes. High-risk actions pause for your approval.',
        },
        {
            number: '03',
            title: 'Undo if needed',
            description:
                'Made a mistake? Run /undo. For R0-R2 actions, Yula rolls back automatically. Every action stays in your AGIT log.',
        },
    ];

    return (
        <AnimatedSection className="py-24 md:py-32 px-6 border-t border-border/30">
            <div className="max-w-6xl mx-auto">
                <div className="max-w-2xl mb-16">
                    <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
                        How it works
                    </span>
                    <h2
                        className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mt-3"
                        style={{ textWrap: 'balance' as any }}
                    >
                        Three steps. <span className="text-muted-foreground">That&apos;s it.</span>
                    </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8 md:gap-6">
                    {steps.map((step, i) => (
                        <motion.div
                            key={step.number}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className="relative"
                        >
                            {i < steps.length - 1 && (
                                <div className="hidden md:block absolute top-5 left-[calc(100%+4px)] w-[calc(100%-32px)] h-px bg-border/40" />
                            )}
                            <div className="text-2xl font-bold text-foreground/10 mb-3 font-mono">
                                {step.number}
                            </div>
                            <h3 className="text-base font-semibold text-foreground mb-2">
                                {step.title}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {step.description}
                            </p>
                        </motion.div>
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
            name: 'Personal',
            price: '$25',
            period: '/month',
            description: 'For individuals getting started',
            features: [
                'All AI models (Claude, GPT, Gemini, Llama)',
                'FIDES-signed audit trail',
                'Reversibility + /undo',
                'Persistent memory',
                'Web + 4 messaging surfaces',
            ],
            cta: 'Get started',
            href: '/signup?plan=personal',
            popular: false,
        },
        {
            name: 'Pro',
            price: '$60',
            period: '/month',
            description: 'For power users with agent needs',
            features: [
                'Everything in Personal',
                'Sandboxed code execution (E2B)',
                'Browser automation (Steel)',
                'All 8 messaging surfaces',
                'Priority model routing',
                '50 Council sessions/month',
            ],
            cta: 'Start free trial',
            href: '/signup?plan=pro',
            popular: true,
        },
        {
            name: 'Team',
            price: '$180',
            period: '/month',
            description: 'For teams with shared governance',
            features: [
                'Everything in Pro',
                'Team workspaces + shared approvals',
                'Org-scoped audit trail',
                'SSO (SAML, OIDC)',
                'Admin controls + policy engine',
                'Priority support',
            ],
            cta: 'Start team trial',
            href: '/signup?plan=team',
            popular: false,
        },
    ];

    return (
        <AnimatedSection id="pricing" className="py-24 md:py-32 px-6 border-t border-border/30">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
                        Pricing
                    </span>
                    <h2
                        className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mt-3"
                        style={{ textWrap: 'balance' as any }}
                    >
                        Simple, transparent pricing
                    </h2>
                    <p className="text-sm text-muted-foreground mt-3">
                        14-day free trial on all paid plans. No credit card required.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.6 }}
                            className={cn(
                                'rounded-xl border p-6 relative flex flex-col',
                                plan.popular
                                    ? 'border-foreground/20 bg-card/60 shadow-lg'
                                    : 'border-border/50 bg-card/20'
                            )}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-6 px-3 py-1 text-xs font-medium rounded-full bg-foreground text-background">
                                    Most popular
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-base font-semibold text-foreground">
                                    {plan.name}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {plan.description}
                                </p>
                            </div>

                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-bold text-foreground tracking-tight">
                                    {plan.price}
                                </span>
                                <span className="text-sm text-muted-foreground">{plan.period}</span>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map((feature) => (
                                    <li
                                        key={feature}
                                        className="flex items-start gap-2.5 text-sm text-foreground/80"
                                    >
                                        <Check
                                            size={16}
                                            weight="bold"
                                            className="text-foreground/40 flex-shrink-0 mt-0.5"
                                        />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={plan.href}
                                className={cn(
                                    'h-10 rounded-lg text-sm font-medium flex items-center justify-center transition-all',
                                    plan.popular
                                        ? 'bg-foreground text-background hover:opacity-90'
                                        : 'border border-border text-foreground hover:bg-card'
                                )}
                            >
                                {plan.cta}
                            </Link>
                        </motion.div>
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
            q: 'What makes Yula different from ChatGPT or Claude?',
            a: 'Yula is an agent, not a chatbot. It can take actions on your behalf — send Slack messages, create events, run code — and every action is signed (FIDES), logged (AGIT), and classified by reversibility. You always know what happened, why, and whether you can undo it.',
        },
        {
            q: 'What is the Reversibility Model?',
            a: 'Every tool call is classified R0 through R4 based on how reversible it is. R0 actions (like drafting text) are fully reversible. R4 actions (like sending a payment) require explicit human approval. You can /undo any R0-R2 action after execution.',
        },
        {
            q: 'What does FIDES-signed mean?',
            a: 'FIDES is our signing framework. Every agent action gets a cryptographic signature that includes the action type, timestamp, model used, and your user ID. This creates a tamper-evident audit trail you can inspect at any time.',
        },
        {
            q: 'Can I import my ChatGPT or Claude history?',
            a: 'Yes. Export your data from ChatGPT or Claude settings, then upload the file to Yula. We process and index your entire history, preserving full context and metadata.',
        },
        {
            q: 'Which platforms does Yula work on?',
            a: 'Yula works on web, Slack, Telegram, Discord, WhatsApp, Microsoft Teams, Google Chat, and more. The same trust guarantees — signing, logging, reversibility — apply across all surfaces.',
        },
        {
            q: 'Is my data private?',
            a: 'Yes. Your data is encrypted at rest and in transit. We never use your conversations for training. You can export or delete your data at any time. BYOK plans let you use your own API keys so tokens never touch our servers.',
        },
    ];

    return (
        <AnimatedSection id="faq" className="py-24 md:py-32 px-6 border-t border-border/30">
            <div className="max-w-2xl mx-auto">
                <div className="mb-12">
                    <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
                        FAQ
                    </span>
                    <h2
                        className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mt-3"
                        style={{ textWrap: 'balance' as any }}
                    >
                        Common questions
                    </h2>
                </div>

                <div className="space-y-0">
                    {faqs.map((faq, idx) => (
                        <div key={idx} className="border-b border-border/40">
                            <button
                                type="button"
                                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                                className="w-full flex items-center justify-between py-5 text-left group"
                            >
                                <span className="text-sm font-medium text-foreground pr-4 group-hover:text-foreground/80 transition-colors">
                                    {faq.q}
                                </span>
                                <CaretDown
                                    size={16}
                                    className={cn(
                                        'text-muted-foreground flex-shrink-0 transition-transform duration-200',
                                        openIndex === idx && 'rotate-180'
                                    )}
                                />
                            </button>
                            <AnimatePresence>
                                {openIndex === idx && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="overflow-hidden"
                                    >
                                        <p className="text-sm text-muted-foreground leading-relaxed pb-5">
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
        <AnimatedSection className="py-24 md:py-32 px-6 border-t border-border/30">
            <div className="max-w-2xl mx-auto text-center">
                <h2
                    className="text-3xl md:text-4xl font-bold tracking-tight text-foreground"
                    style={{ textWrap: 'balance' as any }}
                >
                    Ready for AI you can actually trust?
                </h2>
                <p className="text-sm text-muted-foreground mt-4 max-w-md mx-auto leading-relaxed">
                    Signed actions. Causal logs. Reversibility by default. Start free, upgrade when
                    you need more.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
                    <a
                        href="/signup"
                        className="h-11 px-6 rounded-lg bg-foreground text-background text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                    >
                        Get started
                        <ArrowRight size={16} weight="bold" />
                    </a>
                    <a
                        href="https://github.com/aspendos"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-11 px-6 rounded-lg border border-border text-foreground text-sm font-medium flex items-center gap-2 hover:bg-card transition-colors"
                    >
                        <GithubLogo size={16} />
                        View on GitHub
                    </a>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                    14-day free trial &middot; No credit card &middot; Cancel anytime
                </p>
            </div>
        </AnimatedSection>
    );
}

// =============================================================================
// FOOTER
// =============================================================================

function Footer() {
    return (
        <footer className="border-t border-border/30 py-8 px-6">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-foreground/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-foreground/60">Y</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            &copy; {new Date().getFullYear()} Yula
                        </span>
                    </div>
                    <span className="text-xs text-muted-foreground/60">Built on Aspendos</span>
                </div>
                <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <Link href="/terms" className="hover:text-foreground transition-colors">
                        Terms
                    </Link>
                    <Link href="/privacy" className="hover:text-foreground transition-colors">
                        Privacy
                    </Link>
                    <a
                        href="https://github.com/aspendos"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors"
                    >
                        GitHub
                    </a>
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
        <div className="min-h-screen bg-background text-foreground">
            <Navigation />
            <HeroSection />
            <FeaturesSection />
            <ReversibilitySection />
            <SurfacesSection />
            <HowItWorksSection />
            <PricingSection />
            <FAQSection />
            <CTASection />
            <Footer />
        </div>
    );
}
