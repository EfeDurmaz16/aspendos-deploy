'use client';

import {
    ArrowRight,
    Brain,
    CaretDown,
    ChatCircleDots,
    Check,
    Clock,
    CloudArrowUp,
    Lightning,
    Sparkle,
    Users,
} from '@phosphor-icons/react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// CONSTANTS
// =============================================================================

const FEATURE_COLORS = {
    import: { accent: 'var(--feature-import)', label: 'Import' },
    pac: { accent: 'var(--feature-pac)', label: 'PAC' },
    council: { accent: 'var(--feature-council)', label: 'Council' },
} as const;

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
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                        <span className="text-background text-xs font-bold tracking-tight">Y</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground tracking-tight">
                        Yula
                    </span>
                </Link>

                {/* Nav Links */}
                <div className="hidden md:flex items-center gap-8">
                    {[
                        { label: 'Features', href: '#features' },
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

                {/* CTA */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/login"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
                    >
                        Sign in
                    </Link>
                    <Link
                        href="/signup"
                        className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                    >
                        Get started
                        <ArrowRight size={14} weight="bold" />
                    </Link>
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
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-background" />
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `radial-gradient(circle at 30% 40%, var(--feature-import) 0%, transparent 50%),
                                      radial-gradient(circle at 70% 60%, var(--feature-council) 0%, transparent 50%)`,
                }}
            />
            {/* Grid pattern */}
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
                        <Sparkle size={14} weight="fill" className="text-pac" />
                        <span className="text-xs text-muted-foreground">
                            Your AI, reimagined
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
                        One AI.{' '}
                        <span className="text-muted-foreground">Every model.</span>
                        <br />
                        <span className="text-muted-foreground">All your</span>{' '}
                        history.
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
                    >
                        Import your ChatGPT & Claude history. Get proactive reminders.
                        Let multiple AIs debate your toughest decisions. All in one place.
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex flex-wrap items-center justify-center gap-3"
                    >
                        <Link
                            href="/signup"
                            className="h-11 px-6 rounded-lg bg-foreground text-background text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                        >
                            Start free
                            <ArrowRight size={16} weight="bold" />
                        </Link>
                        <Link
                            href="#features"
                            className="h-11 px-6 rounded-lg border border-border text-foreground text-sm font-medium flex items-center gap-2 hover:bg-card transition-colors"
                        >
                            See features
                        </Link>
                    </motion.div>

                    {/* Social proof */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="flex items-center justify-center gap-6 pt-4 text-xs text-muted-foreground"
                    >
                        <span className="flex items-center gap-1.5">
                            <Check size={14} weight="bold" className="text-personas" />
                            Free tier available
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Check size={14} weight="bold" className="text-personas" />
                            No credit card required
                        </span>
                        <span className="hidden sm:flex items-center gap-1.5">
                            <Check size={14} weight="bold" className="text-personas" />
                            Cancel anytime
                        </span>
                    </motion.div>
                </div>

                {/* Hero Product Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="mt-16 md:mt-20 max-w-4xl mx-auto"
                >
                    <HeroPreview />
                </motion.div>
            </div>
        </section>
    );
}

// =============================================================================
// LIVE DEMO - Interactive working chat (Linear-style)
// =============================================================================

interface DemoMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    memoryCount?: number;
}

const DEMO_RESPONSES: Record<string, { text: string; memoryCount: number }> = {
    default: {
        text: "I'd be happy to help! Yula remembers your preferences across conversations. Unlike other AI tools, I can pull context from your entire chat history - including imports from ChatGPT and Claude. What would you like to explore?",
        memoryCount: 3,
    },
    launch: {
        text: "Here's a tailored launch strategy:\n\n**Phase 1 - Pre-launch (2 weeks)**\n- Build waitlist with content marketing\n- Reach out to 50 beta users personally\n\n**Phase 2 - Launch day**\n- Product Hunt submission\n- Social media blitz across X and LinkedIn\n\n**Phase 3 - Post-launch (4 weeks)**\n- Outbound to waitlist signups\n- Gather testimonials from beta users\n\nI noticed from your previous conversations that you're building a SaaS product. Want me to tailor this further?",
        memoryCount: 12,
    },
    code: {
        text: "Here's a clean React component:\n\n```tsx\nfunction Button({ children, variant = 'primary' }) {\n  return (\n    <button className={styles[variant]}>\n      {children}\n    </button>\n  );\n}\n```\n\nI used the patterns from your earlier conversation about design systems. Should I add more variants?",
        memoryCount: 5,
    },
    write: {
        text: "Here's a draft based on your writing style:\n\n> We built Yula because we were tired of starting over. Every time you switch AI tools, you lose context. Your preferences, your projects, your history - gone.\n>\n> Yula fixes that. Import everything. Remember everything. One AI that actually knows you.\n\nI matched the concise, direct tone you've used before. Want me to adjust?",
        memoryCount: 8,
    },
};

function matchDemoResponse(input: string): { text: string; memoryCount: number } {
    const lower = input.toLowerCase();
    if (lower.includes('launch') || lower.includes('strategy') || lower.includes('plan')) {
        return DEMO_RESPONSES.launch;
    }
    if (lower.includes('code') || lower.includes('component') || lower.includes('react') || lower.includes('debug')) {
        return DEMO_RESPONSES.code;
    }
    if (lower.includes('write') || lower.includes('email') || lower.includes('draft') || lower.includes('essay')) {
        return DEMO_RESPONSES.write;
    }
    return DEMO_RESPONSES.default;
}

function HeroPreview() {
    const [messages, setMessages] = useState<DemoMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamedText, setStreamedText] = useState('');
    const [showSignup, setShowSignup] = useState(false);
    const [selectedMode, setSelectedMode] = useState('Auto');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const messageCountRef = useRef(0);

    // No auto-scroll - let user control their own scroll position

    const simulateStream = async (text: string, memoryCount: number) => {
        setIsStreaming(true);
        setStreamedText('');

        // Simulate "thinking" delay
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));

        // Stream character by character
        for (let i = 0; i <= text.length; i++) {
            setStreamedText(text.slice(0, i));
            // Variable speed: faster for spaces, slower for punctuation
            const char = text[i];
            const delay = char === ' ' ? 8 : char === '\n' ? 30 : char === '.' || char === ',' ? 40 : 15;
            await new Promise((r) => setTimeout(r, delay));
        }

        // Finalize
        setMessages((prev) => [
            ...prev,
            { id: `a-${Date.now()}`, role: 'assistant', content: text, memoryCount },
        ]);
        setStreamedText('');
        setIsStreaming(false);
    };

    const handleSend = async () => {
        const text = inputValue.trim();
        if (!text || isStreaming) return;

        messageCountRef.current++;

        // After 3 exchanges, show signup prompt
        if (messageCountRef.current > 3) {
            setShowSignup(true);
            return;
        }

        setInputValue('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        // Add user message
        setMessages((prev) => [
            ...prev,
            { id: `u-${Date.now()}`, role: 'user', content: text },
        ]);

        // Get matching response and stream it
        const response = matchDemoResponse(text);
        await simulateStream(response.text, response.memoryCount);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSuggestion = async (text: string) => {
        if (isStreaming) return;
        messageCountRef.current++;
        setMessages((prev) => [
            ...prev,
            { id: `u-${Date.now()}`, role: 'user', content: text },
        ]);
        const response = matchDemoResponse(text);
        await simulateStream(response.text, response.memoryCount);
    };

    return (
        <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl relative">
            {/* Signup overlay */}
            <AnimatePresence>
                {showSignup && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-center px-8"
                        >
                            <div className="w-12 h-12 rounded-xl bg-foreground flex items-center justify-center mx-auto mb-4">
                                <span className="text-background text-lg font-bold">Y</span>
                            </div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">
                                Like what you see?
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                                Sign up free to unlock unlimited conversations, memory, and all AI models.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                <Link
                                    href="/signup"
                                    className="h-10 px-6 rounded-lg bg-foreground text-background text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                                >
                                    Start free
                                    <ArrowRight size={14} weight="bold" />
                                </Link>
                                <button
                                    onClick={() => {
                                        setShowSignup(false);
                                        messageCountRef.current = 0;
                                    }}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Continue demo
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Window chrome */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/80">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
                    </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Live Demo</span>
                </div>
                <div className="w-16" />
            </div>

            {/* Chat content */}
            <div className="flex flex-col h-[420px]">
                {/* Messages area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {messages.length === 0 && !isStreaming && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-foreground/5 to-foreground/10 border border-border/50 flex items-center justify-center mb-4">
                                <span className="text-lg font-bold text-foreground/70">Y</span>
                            </div>
                            <p className="text-sm font-medium text-foreground mb-1">
                                Try Yula right now
                            </p>
                            <p className="text-xs text-muted-foreground mb-6">
                                Type anything or pick a suggestion below
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center max-w-md">
                                {[
                                    'Help me plan a product launch',
                                    'Write a short intro email',
                                    'Debug a React component',
                                ].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => handleSuggestion(suggestion)}
                                        className="text-xs px-3 py-1.5 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50 transition-all"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id}>
                            {msg.role === 'user' ? (
                                <div className="flex justify-end">
                                    <div className="bg-muted rounded-2xl rounded-br-md px-4 py-3 max-w-[75%]">
                                        <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-foreground/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Sparkle size={14} weight="fill" className="text-foreground/60" />
                                    </div>
                                    <div className="flex-1 max-w-[85%] space-y-2">
                                        <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                            {msg.content}
                                        </div>
                                        {msg.memoryCount && (
                                            <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                                                <Brain size={13} className="text-memory" />
                                                <span className="text-xs text-muted-foreground">
                                                    Using context from {msg.memoryCount} memories
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Streaming message */}
                    {isStreaming && (
                        <div className="flex gap-3">
                            <div className="w-7 h-7 rounded-lg bg-foreground/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Sparkle size={14} weight="fill" className="text-foreground/60" />
                            </div>
                            <div className="flex-1 max-w-[85%]">
                                {streamedText ? (
                                    <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                        {streamedText}
                                        <span className="inline-block w-0.5 h-4 bg-foreground/60 ml-0.5 animate-pulse" />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 py-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div />
                </div>

                {/* Input area */}
                <div className="border-t border-border/40 p-3 bg-card/30">
                    <div className="flex items-end gap-2 bg-background rounded-xl border border-border/60 focus-within:border-border focus-within:ring-1 focus-within:ring-ring/30 transition-all px-3 py-2">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask anything..."
                            className="flex-1 min-h-[36px] max-h-[100px] bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground py-1.5"
                            rows={1}
                            disabled={isStreaming}
                        />
                        <div className="flex items-center gap-1.5 pb-1">
                            <button
                                onClick={() => {
                                    const modes = ['Auto', 'Smart', 'Fast', 'Creative'];
                                    const idx = modes.indexOf(selectedMode);
                                    setSelectedMode(modes[(idx + 1) % modes.length]);
                                }}
                                className="text-xs px-2 py-1 rounded-md bg-muted/80 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                            >
                                <Sparkle size={10} weight="fill" />
                                {selectedMode}
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isStreaming}
                                className={cn(
                                    'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                                    inputValue.trim() && !isStreaming
                                        ? 'bg-foreground text-background hover:opacity-90'
                                        : 'bg-muted text-muted-foreground'
                                )}
                            >
                                <ArrowRight size={14} weight="bold" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// FEATURES SECTION
// =============================================================================

function FeaturesSection() {
    const features = [
        {
            key: 'import' as const,
            icon: CloudArrowUp,
            title: 'Import Your History',
            description:
                'Bring your conversations from ChatGPT and Claude. Your context, your memories, all in one place. Never start from zero again.',
            details: ['ChatGPT export support', 'Claude export support', 'Preserves full context', 'Automatic categorization'],
        },
        {
            key: 'pac' as const,
            icon: Lightning,
            title: 'Proactive Reminders',
            description:
                'Yula reads between the lines. It detects commitments, deadlines, and follow-ups from your conversations and reminds you before you forget.',
            details: ['Smart commitment detection', 'Configurable schedules', 'Context-aware nudges', 'Never miss a follow-up'],
        },
        {
            key: 'council' as const,
            icon: ChatCircleDots,
            title: 'AI Council',
            description:
                'Ask GPT-4, Claude, Gemini, and Llama the same question simultaneously. Compare perspectives. Make better decisions with multiple viewpoints.',
            details: ['4 models in parallel', 'Side-by-side comparison', 'Consensus synthesis', 'Best answer selection'],
        },
    ];

    return (
        <AnimatedSection id="features" className="py-24 md:py-32 px-6">
            <div className="max-w-6xl mx-auto">
                {/* Section header */}
                <div className="max-w-2xl mb-16">
                    <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
                        Features
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mt-3" style={{ textWrap: 'balance' as any }}>
                        Three features that change{' '}
                        <span className="text-muted-foreground">how you use AI</span>
                    </h2>
                </div>

                {/* Feature cards */}
                <div className="grid md:grid-cols-3 gap-6">
                    {features.map((feature, i) => {
                        const color = FEATURE_COLORS[feature.key];
                        return (
                            <motion.div
                                key={feature.key}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1, duration: 0.6 }}
                                className="group rounded-xl border border-border/50 bg-card/30 p-6 hover:border-border hover:bg-card/60 transition-all duration-300"
                            >
                                {/* Icon */}
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-5"
                                    style={{
                                        backgroundColor: `color-mix(in srgb, ${color.accent} 12%, transparent)`,
                                    }}
                                >
                                    <feature.icon
                                        size={20}
                                        weight="duotone"
                                        style={{ color: color.accent }}
                                    />
                                </div>

                                {/* Content */}
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                                    {feature.description}
                                </p>

                                {/* Details */}
                                <ul className="space-y-2">
                                    {feature.details.map((detail) => (
                                        <li
                                            key={detail}
                                            className="flex items-center gap-2 text-xs text-muted-foreground"
                                        >
                                            <Check
                                                size={14}
                                                weight="bold"
                                                style={{ color: color.accent }}
                                                className="flex-shrink-0"
                                            />
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        );
                    })}
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
            title: 'Import',
            description: 'Upload your ChatGPT or Claude export. Yula processes and indexes your entire conversation history.',
        },
        {
            number: '02',
            title: 'Chat',
            description: 'Talk naturally. Yula uses your history as context, so every response is personalized.',
        },
        {
            number: '03',
            title: 'Get reminded',
            description: 'PAC detects your commitments and sends proactive reminders before you forget.',
        },
        {
            number: '04',
            title: 'Consult the Council',
            description: 'For big decisions, ask multiple AI models at once and compare their perspectives.',
        },
    ];

    return (
        <AnimatedSection className="py-24 md:py-32 px-6 border-t border-border/30">
            <div className="max-w-6xl mx-auto">
                {/* Section header */}
                <div className="max-w-2xl mb-16">
                    <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
                        How it works
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mt-3" style={{ textWrap: 'balance' as any }}>
                        Four steps.{' '}
                        <span className="text-muted-foreground">That&apos;s it.</span>
                    </h2>
                </div>

                {/* Steps */}
                <div className="grid md:grid-cols-4 gap-8 md:gap-6">
                    {steps.map((step, i) => (
                        <motion.div
                            key={step.number}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className="relative"
                        >
                            {/* Connector line */}
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
            name: 'Free',
            price: '$0',
            period: '/month',
            description: 'For trying out Yula',
            features: [
                '50 messages per day',
                'Import up to 100 conversations',
                'Basic PAC reminders',
                'GPT-4o mini access',
            ],
            cta: 'Get started',
            href: '/signup',
            popular: false,
        },
        {
            name: 'Pro',
            price: '$20',
            period: '/month',
            description: 'For power users',
            features: [
                'Unlimited messages',
                'Unlimited imports',
                'Full PAC with smart detection',
                '50 Council sessions/month',
                'All AI models',
                'Priority support',
            ],
            cta: 'Start free trial',
            href: '/signup?plan=pro',
            popular: true,
        },
        {
            name: 'Ultra',
            price: '$50',
            period: '/month',
            description: 'For teams & pros',
            features: [
                'Everything in Pro',
                'Unlimited Council sessions',
                'API access',
                'Custom AI personas',
                'Advanced analytics',
                'Early access to new features',
            ],
            cta: 'Start free trial',
            href: '/signup?plan=ultra',
            popular: false,
        },
    ];

    return (
        <AnimatedSection id="pricing" className="py-24 md:py-32 px-6 border-t border-border/30">
            <div className="max-w-6xl mx-auto">
                {/* Section header */}
                <div className="text-center mb-16">
                    <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
                        Pricing
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mt-3" style={{ textWrap: 'balance' as any }}>
                        Simple, transparent pricing
                    </h2>
                    <p className="text-sm text-muted-foreground mt-3">
                        14-day free trial on all paid plans. No credit card required.
                    </p>
                </div>

                {/* Pricing cards */}
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
                                <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                                <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
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
                                            className="text-personas flex-shrink-0 mt-0.5"
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
            q: 'Can I import my ChatGPT conversations?',
            a: 'Yes. Export your data from ChatGPT settings, then upload the JSON file to Yula. We process and index your entire history, preserving all context and metadata.',
        },
        {
            q: 'Which AI models does Yula support?',
            a: 'Yula supports GPT-4o, Claude 3.5 Sonnet, Gemini Pro, and Llama 3. You can switch between models anytime, or use Council to query all of them simultaneously.',
        },
        {
            q: 'What is the Council feature?',
            a: 'Council lets you ask a question to multiple AI models at the same time. You see each model\'s response side-by-side, helping you get diverse perspectives on complex decisions.',
        },
        {
            q: 'How does PAC (Proactive AI Callbacks) work?',
            a: 'PAC analyzes your conversations for commitments, deadlines, and follow-ups. It automatically creates reminders and proactively reaches out to you before important dates.',
        },
        {
            q: 'Is my data private and secure?',
            a: 'Absolutely. Your data is encrypted at rest and in transit. We never use your conversations for training. You can export or delete your data at any time.',
        },
        {
            q: 'Does Yula work offline?',
            a: 'Yula is a PWA and works offline for browsing your conversation history. Active AI conversations require an internet connection.',
        },
    ];

    return (
        <AnimatedSection id="faq" className="py-24 md:py-32 px-6 border-t border-border/30">
            <div className="max-w-2xl mx-auto">
                {/* Section header */}
                <div className="mb-12">
                    <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
                        FAQ
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mt-3" style={{ textWrap: 'balance' as any }}>
                        Common questions
                    </h2>
                </div>

                {/* FAQ items */}
                <div className="space-y-0">
                    {faqs.map((faq, idx) => (
                        <div
                            key={idx}
                            className="border-b border-border/40"
                        >
                            <button
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
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground" style={{ textWrap: 'balance' as any }}>
                    Ready to try a smarter AI?
                </h2>
                <p className="text-sm text-muted-foreground mt-4 max-w-md mx-auto leading-relaxed">
                    Import your history. Get proactive reminders. Make better decisions with Council.
                    Start free today.
                </p>
                <div className="flex items-center justify-center gap-3 mt-8">
                    <Link
                        href="/signup"
                        className="h-11 px-6 rounded-lg bg-foreground text-background text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                    >
                        Start free
                        <ArrowRight size={16} weight="bold" />
                    </Link>
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
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-foreground/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-foreground/60">Y</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        &copy; {new Date().getFullYear()} Yula AI. All rights reserved.
                    </span>
                </div>
                <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <Link href="/terms" className="hover:text-foreground transition-colors">
                        Terms
                    </Link>
                    <Link href="/privacy" className="hover:text-foreground transition-colors">
                        Privacy
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
        <div className="min-h-screen bg-background text-foreground">
            <Navigation />
            <HeroSection />
            <FeaturesSection />
            <HowItWorksSection />
            <PricingSection />
            <FAQSection />
            <CTASection />
            <Footer />
        </div>
    );
}
