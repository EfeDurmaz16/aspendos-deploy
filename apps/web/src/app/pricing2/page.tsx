'use client';

import {
    ArrowRight,
    Brain,
    Check,
    Clock,
    Command,
    Eye,
    Lightning,
    Shield,
    Sparkle,
    X,
} from '@phosphor-icons/react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// Cinematic section wrapper
function CinematicSection({
    children,
    className,
    delay = 0,
}: {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <motion.section
            ref={ref}
            initial={{ opacity: 0, y: 60 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
            transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
            className={className}
        >
            {children}
        </motion.section>
    );
}

// Pricing tier card
function PricingTier({
    name,
    description,
    price,
    period,
    features,
    limitations,
    highlighted = false,
    cta,
    index,
}: {
    name: string;
    description: string;
    price: string;
    period: string;
    features: string[];
    limitations?: string[];
    highlighted?: boolean;
    cta: string;
    index: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
                'relative p-8 lg:p-10 border transition-all duration-500 flex flex-col',
                highlighted
                    ? 'border-cyan-500 bg-gradient-to-b from-cyan-500/10 to-transparent scale-105 z-10'
                    : 'border-zinc-800 bg-zinc-950/30 hover:border-zinc-700'
            )}
        >
            {highlighted && (
                <>
                    <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-cyan-500 text-black text-xs font-mono tracking-widest">
                        MOST POPULAR
                    </div>
                </>
            )}

            <div className="mb-6">
                <div className="font-mono text-xs text-zinc-500 tracking-widest uppercase mb-2">
                    {name}
                </div>
                <p className="text-zinc-400 text-sm">{description}</p>
            </div>

            <div className="mb-8">
                <span className="text-5xl font-serif text-white">{price}</span>
                <span className="text-zinc-500 text-lg ml-1">{period}</span>
            </div>

            <div className="flex-1">
                <ul className="space-y-4 mb-8">
                    {features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                            <Check
                                className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0"
                                weight="bold"
                            />
                            {feature}
                        </li>
                    ))}
                    {limitations?.map((limitation, i) => (
                        <li
                            key={`limit-${i}`}
                            className="flex items-start gap-3 text-sm text-zinc-600"
                        >
                            <X
                                className="w-5 h-5 text-zinc-700 mt-0.5 flex-shrink-0"
                                weight="bold"
                            />
                            {limitation}
                        </li>
                    ))}
                </ul>
            </div>

            <Link
                href={`/signup?plan=${name.toLowerCase()}`}
                className={cn(
                    'block w-full py-4 text-center font-medium transition-all duration-300',
                    highlighted
                        ? 'bg-cyan-500 text-black hover:bg-cyan-400'
                        : 'border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'
                )}
            >
                {cta}
            </Link>
        </motion.div>
    );
}

// Feature comparison row
function ComparisonRow({
    feature,
    starter,
    pro,
    ultra,
    index,
}: {
    feature: string;
    starter: string | boolean;
    pro: string | boolean;
    ultra: string | boolean;
    index: number;
}) {
    const renderValue = (val: string | boolean) => {
        if (typeof val === 'boolean') {
            return val ? (
                <Check className="w-5 h-5 text-cyan-400 mx-auto" weight="bold" />
            ) : (
                <X className="w-5 h-5 text-zinc-700 mx-auto" weight="bold" />
            );
        }
        return <span className="text-zinc-300">{val}</span>;
    };

    return (
        <motion.tr
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="border-b border-zinc-800/50"
        >
            <td className="py-4 text-sm text-zinc-400 text-left">{feature}</td>
            <td className="py-4 text-sm text-center">{renderValue(starter)}</td>
            <td className="py-4 text-sm text-center bg-cyan-500/5">{renderValue(pro)}</td>
            <td className="py-4 text-sm text-center">{renderValue(ultra)}</td>
        </motion.tr>
    );
}

// FAQ Item with accordion
function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="border-b border-zinc-800"
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-6 flex items-center justify-between text-left group"
            >
                <h4 className="text-white font-medium group-hover:text-cyan-400 transition-colors">
                    {question}
                </h4>
                <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    className="text-zinc-500 text-2xl"
                >
                    +
                </motion.span>
            </button>
            <motion.div
                initial={false}
                animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                className="overflow-hidden"
            >
                <p className="text-zinc-400 text-sm leading-relaxed pb-6">{answer}</p>
            </motion.div>
        </motion.div>
    );
}

export default function Pricing2Page() {
    const tiers = [
        {
            name: 'Starter',
            description: 'Perfect for individuals exploring AI assistants',
            price: '$20',
            period: '/mo',
            features: [
                '~300 conversations/month',
                'GPT-4 + 1 additional model',
                '10 minutes voice/day',
                'Basic memory (30 days)',
                'Email support',
                'Web app access',
            ],
            limitations: ['No API access', 'Limited model selection'],
            cta: 'Start Free Trial',
        },
        {
            name: 'Pro',
            description: 'For professionals who need powerful AI daily',
            price: '$50',
            period: '/mo',
            features: [
                '~1,500 conversations/month',
                'All models: GPT-4, Claude, Gemini',
                '60 minutes voice/day',
                'Advanced memory + semantic search',
                'Priority model routing',
                'API access (100k tokens/day)',
                'Priority support',
                'Desktop & mobile apps',
            ],
            highlighted: true,
            cta: 'Get Pro',
        },
        {
            name: 'Ultra',
            description: 'Maximum power for demanding workflows',
            price: '$100',
            period: '/mo',
            features: [
                '5,000+ conversations/month',
                'All models + experimental access',
                '180 minutes voice/day',
                'Full Memory Inspector & export',
                'Dedicated routing queue',
                'Unlimited API access',
                '24/7 dedicated support',
                'Custom integrations',
            ],
            cta: 'Go Ultra',
        },
    ];

    const comparisonFeatures = [
        { feature: 'Monthly conversations', starter: '~300', pro: '~1,500', ultra: '5,000+' },
        {
            feature: 'AI Models',
            starter: '2 models',
            pro: 'All models',
            ultra: 'All + experimental',
        },
        { feature: 'Voice input', starter: '10 min/day', pro: '60 min/day', ultra: '180 min/day' },
        { feature: 'Memory retention', starter: '30 days', pro: 'Unlimited', ultra: 'Unlimited' },
        { feature: 'Semantic search', starter: false, pro: true, ultra: true },
        { feature: 'Priority routing', starter: false, pro: true, ultra: true },
        { feature: 'API access', starter: false, pro: '100k/day', ultra: 'Unlimited' },
        { feature: 'Custom integrations', starter: false, pro: false, ultra: true },
        { feature: 'Memory export', starter: false, pro: false, ultra: true },
        { feature: 'Dedicated support', starter: false, pro: false, ultra: true },
    ];

    const faqs = [
        {
            question: 'What happens when I reach my conversation limit?',
            answer: "You'll receive notifications at 75%, 90%, and 100% of your monthly limit. After reaching 100%, you can either upgrade your plan, purchase additional conversation credits, or wait for your limit to reset at the start of the next billing cycle. We never cut you off mid-conversation.",
        },
        {
            question: 'Can I switch between plans at any time?',
            answer: "Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference immediately and gain access to new features right away. When downgrading, the change takes effect at your next billing cycle.",
        },
        {
            question: 'How does the memory system work across models?',
            answer: 'YULA maintains a unified memory layer that works across all AI models. When you have a conversation with GPT-4 and then switch to Claude, your context, preferences, and conversation history seamlessly transfer. The memory uses semantic search to surface relevant context automatically.',
        },
        {
            question: 'Is my data secure?',
            answer: 'Absolutely. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We never train AI models on your data, and you can export or delete your memory at any time. Enterprise plans include additional compliance certifications like SOC 2 Type II.',
        },
        {
            question: 'Can I use my own API keys?',
            answer: 'Pro and Ultra plans support bringing your own API keys for direct provider access. This gives you more control over rate limits and can reduce costs if you have existing provider relationships. You can mix YULA credits with your own keys as needed.',
        },
        {
            question: 'Do you offer team or enterprise plans?',
            answer: 'Yes! For teams of 5 or more, we offer volume discounts and shared memory workspaces. Enterprise plans include SSO, audit logs, custom data retention policies, dedicated infrastructure, and SLA guarantees. Contact our sales team for custom pricing.',
        },
    ];

    return (
        <div className="min-h-screen bg-black text-white overflow-x-hidden">
            {/* Noise texture overlay */}
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.03] z-50"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Subtle gradient orbs */}
            <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px] pointer-events-none" />
            <div className="fixed bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-[96px] pointer-events-none" />

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-40 px-6 py-6 bg-black/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/v2" className="font-serif text-2xl tracking-tight">
                        YULA
                    </Link>
                    <div className="flex items-center gap-8">
                        <Link
                            href="/v2#features"
                            className="text-sm text-zinc-400 hover:text-white transition-colors font-mono tracking-wide"
                        >
                            Features
                        </Link>
                        <Link
                            href="/v2#models"
                            className="text-sm text-zinc-400 hover:text-white transition-colors font-mono tracking-wide"
                        >
                            Models
                        </Link>
                        <Link
                            href="/pricing2"
                            className="text-sm text-white transition-colors font-mono tracking-wide"
                        >
                            Pricing
                        </Link>
                        <Link
                            href="/signup"
                            className="px-4 py-2 text-sm bg-white text-black hover:bg-zinc-200 transition-colors font-mono tracking-wide"
                        >
                            Start Free
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-40 pb-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="mb-6"
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-800 text-zinc-500 font-mono text-xs tracking-widest">
                            <Sparkle className="w-3 h-3 text-cyan-400" weight="fill" />
                            TRANSPARENT PRICING
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="text-5xl md:text-7xl font-serif leading-[0.95] tracking-tight mb-6"
                    >
                        Simple pricing.
                        <br />
                        <span className="text-zinc-500">No surprises.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed"
                    >
                        Access GPT-4, Claude, and Gemini for less than what you&apos;d pay for
                        individual subscriptions. All with unified memory and intelligent routing.
                    </motion.p>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="py-16 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-1 md:gap-0 items-stretch">
                        {tiers.map((tier, index) => (
                            <PricingTier key={tier.name} {...tier} index={index} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Value Proposition */}
            <CinematicSection className="py-24 px-6">
                <div className="max-w-5xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-serif text-white mb-12">
                        Why YULA is worth it
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0 }}
                            className="p-6"
                        >
                            <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                                <Brain className="w-6 h-6 text-cyan-400" weight="thin" />
                            </div>
                            <h3 className="text-white font-medium mb-2">$200+ value</h3>
                            <p className="text-zinc-500 text-sm">
                                Individual AI subscriptions cost $20-60 each. Get all of them
                                unified for less.
                            </p>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="p-6"
                        >
                            <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                                <Lightning className="w-6 h-6 text-cyan-400" weight="thin" />
                            </div>
                            <h3 className="text-white font-medium mb-2">Hours saved weekly</h3>
                            <p className="text-zinc-500 text-sm">
                                No more re-explaining context. Your memory follows you across models
                                and sessions.
                            </p>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="p-6"
                        >
                            <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                                <Shield className="w-6 h-6 text-cyan-400" weight="thin" />
                            </div>
                            <h3 className="text-white font-medium mb-2">Your data, your rules</h3>
                            <p className="text-zinc-500 text-sm">
                                We never train on your data. Export or delete your memory anytime.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </CinematicSection>

            {/* Feature Comparison Table */}
            <section className="py-24 px-6 bg-zinc-950/50">
                <div className="max-w-5xl mx-auto">
                    <CinematicSection className="mb-12 text-center">
                        <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase mb-4 block">
                            Compare Plans
                        </span>
                        <h2 className="text-4xl font-serif text-white">Every feature, compared.</h2>
                    </CinematicSection>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-zinc-800">
                                    <th className="py-4 text-left text-sm font-mono text-zinc-500 tracking-wide">
                                        Features
                                    </th>
                                    <th className="py-4 text-center text-sm font-mono text-zinc-500 tracking-wide w-32">
                                        Starter
                                    </th>
                                    <th className="py-4 text-center text-sm font-mono text-cyan-400 tracking-wide w-32 bg-cyan-500/5">
                                        Pro
                                    </th>
                                    <th className="py-4 text-center text-sm font-mono text-zinc-500 tracking-wide w-32">
                                        Ultra
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonFeatures.map((row, index) => (
                                    <ComparisonRow key={row.feature} {...row} index={index} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 px-6">
                <div className="max-w-3xl mx-auto">
                    <CinematicSection className="mb-12 text-center">
                        <span className="font-mono text-xs text-cyan-400 tracking-widest uppercase mb-4 block">
                            FAQ
                        </span>
                        <h2 className="text-4xl font-serif text-white">Common questions.</h2>
                    </CinematicSection>

                    <div>
                        {faqs.map((faq, index) => (
                            <FAQItem key={faq.question} {...faq} index={index} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <CinematicSection className="py-32 px-6 border-t border-zinc-800">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-serif text-white mb-6 leading-tight">
                        Ready to unify your AI?
                    </h2>
                    <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
                        Start with a 7-day free trial. No credit card required.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/signup"
                            className="group flex items-center gap-3 px-10 py-5 bg-white text-black text-lg font-medium hover:bg-cyan-400 transition-colors duration-300"
                        >
                            <Command className="w-6 h-6" />
                            Start Free Trial
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href="/contact"
                            className="flex items-center gap-2 px-10 py-5 border border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white transition-all duration-300 font-mono text-sm tracking-wide"
                        >
                            Contact Sales
                        </Link>
                    </div>
                </div>
            </CinematicSection>

            {/* Minimal Footer */}
            <footer className="py-12 px-6 border-t border-zinc-900">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="font-serif text-xl text-zinc-600">YULA</div>
                    <div className="flex items-center gap-8 text-sm text-zinc-600">
                        <Link href="/privacy" className="hover:text-zinc-400 transition-colors">
                            Privacy
                        </Link>
                        <Link href="/terms" className="hover:text-zinc-400 transition-colors">
                            Terms
                        </Link>
                        <a
                            href="https://github.com"
                            className="hover:text-zinc-400 transition-colors"
                        >
                            GitHub
                        </a>
                        <a
                            href="https://twitter.com"
                            className="hover:text-zinc-400 transition-colors"
                        >
                            X
                        </a>
                    </div>
                    <div className="text-sm text-zinc-700 font-mono">2026 YULA</div>
                </div>
            </footer>
        </div>
    );
}
