'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useRef } from 'react';
import {
    ArrowRight,
    Brain,
    CheckCircle,
    CloudArrowUp,
    Lightning,
    Play,
    Sparkle,
    Users,
    Bell,
    ChatCircle,
    Clock,
    Export,
    GithubLogo,
    XLogo,
    LinkedinLogo,
    ArrowsClockwise,
    ShieldCheck,
    Microphone,
    Translate,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

// Feature accent colors from Design System v2.0
const FEATURE_COLORS = {
    import: {
        primary: '#2563EB',
        bg: 'bg-blue-500',
        bgLight: 'bg-blue-500/10',
        text: 'text-blue-500',
        border: 'border-blue-500/30',
        gradient: 'from-blue-500 to-blue-600',
    },
    pac: {
        primary: '#D97706',
        bg: 'bg-amber-600',
        bgLight: 'bg-amber-500/10',
        text: 'text-amber-500',
        border: 'border-amber-500/30',
        gradient: 'from-amber-500 to-amber-600',
    },
    council: {
        primary: '#7C3AED',
        bg: 'bg-violet-600',
        bgLight: 'bg-violet-500/10',
        text: 'text-violet-500',
        border: 'border-violet-500/30',
        gradient: 'from-violet-500 to-violet-600',
    },
};

// Animated gradient background
function GradientBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-violet-500/5 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-bl from-amber-500/5 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
    );
}

// Feature Card Component
function FeatureCard({
    icon: Icon,
    title,
    subtitle,
    description,
    color,
    features,
    cta,
    href,
    delay = 0,
}: {
    icon: React.ElementType;
    title: string;
    subtitle: string;
    description: string;
    color: typeof FEATURE_COLORS.import;
    features: string[];
    cta: string;
    href: string;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay }}
        >
            <Card className={cn(
                'h-full relative overflow-hidden group transition-all duration-300',
                'hover:shadow-xl hover:-translate-y-1',
                'border-zinc-200 dark:border-zinc-800',
                'bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm'
            )}>
                {/* Gradient accent */}
                <div className={cn(
                    'absolute top-0 left-0 right-0 h-1',
                    `bg-gradient-to-r ${color.gradient}`
                )} />

                <CardHeader className="pb-4">
                    <div className={cn(
                        'w-14 h-14 rounded-xl flex items-center justify-center mb-4',
                        color.bgLight
                    )}>
                        <Icon className={cn('w-7 h-7', color.text)} weight="duotone" />
                    </div>
                    <div className={cn('text-xs font-bold uppercase tracking-wider mb-1', color.text)}>
                        {subtitle}
                    </div>
                    <CardTitle className="text-2xl">{title}</CardTitle>
                    <CardDescription className="text-base mt-2">
                        {description}
                    </CardDescription>
                </CardHeader>

                <CardContent className="pb-6">
                    <ul className="space-y-3">
                        {features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm">
                                <CheckCircle className={cn('w-5 h-5 flex-shrink-0 mt-0.5', color.text)} weight="fill" />
                                <span className="text-zinc-600 dark:text-zinc-400">{feature}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>

                <CardFooter>
                    <Button
                        variant="outline"
                        className={cn(
                            'w-full group-hover:bg-gradient-to-r',
                            `group-hover:${color.gradient}`,
                            'group-hover:text-white group-hover:border-transparent',
                            'transition-all duration-300'
                        )}
                        asChild
                    >
                        <Link href={href}>
                            {cta}
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
}

// Stats component
function StatCard({ value, label }: { value: string; label: string }) {
    return (
        <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-foreground">{value}</div>
            <div className="text-sm text-muted-foreground mt-1">{label}</div>
        </div>
    );
}

// Comparison row
function ComparisonRow({
    feature,
    yula,
    others,
}: {
    feature: string;
    yula: boolean | string;
    others: boolean | string;
}) {
    return (
        <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <td className="py-4 px-4 text-sm font-medium">{feature}</td>
            <td className="py-4 px-4 text-center">
                {typeof yula === 'boolean' ? (
                    yula ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" weight="fill" />
                    ) : (
                        <span className="text-zinc-400">-</span>
                    )
                ) : (
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{yula}</span>
                )}
            </td>
            <td className="py-4 px-4 text-center">
                {typeof others === 'boolean' ? (
                    others ? (
                        <CheckCircle className="w-5 h-5 text-zinc-400 mx-auto" weight="fill" />
                    ) : (
                        <span className="text-zinc-400">-</span>
                    )
                ) : (
                    <span className="text-sm text-muted-foreground">{others}</span>
                )}
            </td>
        </tr>
    );
}

export default function LandingPage() {
    const heroRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ['start start', 'end start'],
    });

    const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
    const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden">
            {/* Navigation */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800">
                <div className="container max-w-7xl mx-auto px-4 md:px-6">
                    <nav className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                                <Sparkle className="w-5 h-5 text-white" weight="fill" />
                            </div>
                            <span className="font-bold text-xl tracking-tight">YULA</span>
                        </Link>

                        <div className="hidden md:flex items-center gap-8">
                            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Features
                            </Link>
                            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                How It Works
                            </Link>
                            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Pricing
                            </Link>
                            <Link href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                FAQ
                            </Link>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/login">Sign In</Link>
                            </Button>
                            <Button size="sm" className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600" asChild>
                                <Link href="/signup">Get Started Free</Link>
                            </Button>
                        </div>
                    </nav>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
                    <GradientBackground />

                    <motion.div
                        style={{ opacity: heroOpacity, y: heroY }}
                        className="container max-w-6xl mx-auto px-4 md:px-6 py-24 md:py-32 relative z-10"
                    >
                        <div className="text-center space-y-8">
                            {/* Badge */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20"
                            >
                                <Sparkle className="w-4 h-4 text-violet-500" weight="fill" />
                                <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
                                    Your Universal Learning Assistant
                                </span>
                            </motion.div>

                            {/* Headline */}
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="text-5xl md:text-7xl font-bold tracking-tight leading-tight"
                            >
                                AI that{' '}
                                <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-amber-500 bg-clip-text text-transparent">
                                    remembers
                                </span>
                                ,<br />
                                <span className="bg-gradient-to-r from-amber-500 via-violet-500 to-blue-500 bg-clip-text text-transparent">
                                    anticipates
                                </span>
                                , and{' '}
                                <span className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
                                    evolves
                                </span>
                            </motion.h1>

                            {/* Subheadline */}
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
                            >
                                Import your ChatGPT history. Get proactive reminders.
                                Ask 4 AI models at once. All in one beautiful interface.
                            </motion.p>

                            {/* CTAs */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="flex flex-col sm:flex-row items-center justify-center gap-4"
                            >
                                <Button
                                    size="lg"
                                    className="h-14 px-8 text-lg bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 shadow-lg shadow-violet-500/25"
                                    asChild
                                >
                                    <Link href="/signup">
                                        Start Free Trial
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Link>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="h-14 px-8 text-lg"
                                    asChild
                                >
                                    <Link href="#demo">
                                        <Play className="w-5 h-5 mr-2" weight="fill" />
                                        Watch Demo
                                    </Link>
                                </Button>
                            </motion.div>

                            {/* Social proof */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="pt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground"
                            >
                                <span className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" weight="fill" />
                                    No credit card required
                                </span>
                                <span className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" weight="fill" />
                                    Free forever tier
                                </span>
                                <span className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" weight="fill" />
                                    Cancel anytime
                                </span>
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Scroll indicator */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="absolute bottom-8 left-1/2 -translate-x-1/2"
                    >
                        <div className="w-6 h-10 rounded-full border-2 border-zinc-300 dark:border-zinc-700 flex items-start justify-center p-2">
                            <motion.div
                                animate={{ y: [0, 12, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="w-1.5 h-1.5 rounded-full bg-zinc-400"
                            />
                        </div>
                    </motion.div>
                </section>

                {/* Three Core Features Section */}
                <section id="features" className="py-24 md:py-32 bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="container max-w-7xl mx-auto px-4 md:px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center mb-16"
                        >
                            <h2 className="text-sm font-bold text-violet-500 uppercase tracking-wider mb-4">
                                Three Superpowers
                            </h2>
                            <h3 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                                What makes YULA different
                            </h3>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                Not just another chatbot. YULA brings three revolutionary features
                                that transform how you work with AI.
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <FeatureCard
                                icon={CloudArrowUp}
                                title="IMPORT"
                                subtitle="Bring Your History"
                                description="Don't lose your ChatGPT or Claude conversations. Import everything and keep your context alive."
                                color={FEATURE_COLORS.import}
                                features={[
                                    'One-click ChatGPT export import',
                                    'Claude conversation migration',
                                    'Automatic memory extraction',
                                    'Searchable conversation archive',
                                    'Export anytime, no lock-in',
                                ]}
                                cta="Import Now"
                                href="/import"
                                delay={0.1}
                            />

                            <FeatureCard
                                icon={Bell}
                                title="PAC"
                                subtitle="Proactive AI Callbacks"
                                description="AI that reaches out to you. Get intelligent reminders based on your conversations."
                                color={FEATURE_COLORS.pac}
                                features={[
                                    'Detects commitments automatically',
                                    'Smart reminder scheduling',
                                    'Push, email, and in-app alerts',
                                    'Snooze and customize timing',
                                    'Never forget a follow-up again',
                                ]}
                                cta="Enable PAC"
                                href="/signup"
                                delay={0.2}
                            />

                            <FeatureCard
                                icon={Users}
                                title="COUNCIL"
                                subtitle="Multi-Model Wisdom"
                                description="Ask 4 AI models simultaneously. Get diverse perspectives, make better decisions."
                                color={FEATURE_COLORS.council}
                                features={[
                                    '4 AI personas respond in parallel',
                                    'GPT-4, Claude, Gemini, and more',
                                    'Compare different perspectives',
                                    'AI-generated synthesis',
                                    'Pick the best answer',
                                ]}
                                cta="Try Council"
                                href="/signup"
                                delay={0.3}
                            />
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section id="how-it-works" className="py-24 md:py-32">
                    <div className="container max-w-6xl mx-auto px-4 md:px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center mb-16"
                        >
                            <h2 className="text-sm font-bold text-violet-500 uppercase tracking-wider mb-4">
                                Simple Setup
                            </h2>
                            <h3 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                                Up and running in minutes
                            </h3>
                        </motion.div>

                        <div className="grid md:grid-cols-4 gap-8">
                            {[
                                {
                                    step: '01',
                                    title: 'Sign Up',
                                    description: 'Create your free account in seconds. No credit card needed.',
                                    icon: Sparkle,
                                },
                                {
                                    step: '02',
                                    title: 'Import History',
                                    description: 'Upload your ChatGPT or Claude export files.',
                                    icon: CloudArrowUp,
                                },
                                {
                                    step: '03',
                                    title: 'Start Chatting',
                                    description: 'Continue your conversations with full context preserved.',
                                    icon: ChatCircle,
                                },
                                {
                                    step: '04',
                                    title: 'Let AI Help',
                                    description: 'Get proactive reminders and multi-model insights.',
                                    icon: Lightning,
                                },
                            ].map((item, i) => (
                                <motion.div
                                    key={item.step}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="relative"
                                >
                                    {i < 3 && (
                                        <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-zinc-200 to-transparent dark:from-zinc-800" />
                                    )}
                                    <div className="text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 flex items-center justify-center mx-auto mb-4">
                                            <item.icon className="w-8 h-8 text-violet-500" weight="duotone" />
                                        </div>
                                        <div className="text-xs font-bold text-violet-500 mb-2">{item.step}</div>
                                        <h4 className="text-lg font-semibold mb-2">{item.title}</h4>
                                        <p className="text-sm text-muted-foreground">{item.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Comparison Section */}
                <section className="py-24 md:py-32 bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="container max-w-4xl mx-auto px-4 md:px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center mb-16"
                        >
                            <h2 className="text-sm font-bold text-violet-500 uppercase tracking-wider mb-4">
                                Why Switch
                            </h2>
                            <h3 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                                YULA vs. The Rest
                            </h3>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900"
                        >
                            <table className="w-full">
                                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                    <tr>
                                        <th className="py-4 px-4 text-left text-sm font-semibold">Feature</th>
                                        <th className="py-4 px-4 text-center text-sm font-semibold">
                                            <span className="text-violet-500">YULA</span>
                                        </th>
                                        <th className="py-4 px-4 text-center text-sm font-semibold text-muted-foreground">Others</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <ComparisonRow feature="Import ChatGPT/Claude history" yula={true} others={false} />
                                    <ComparisonRow feature="Proactive AI reminders" yula={true} others={false} />
                                    <ComparisonRow feature="Multi-model parallel queries" yula="4 models" others="1 model" />
                                    <ComparisonRow feature="Persistent memory" yula={true} others="Limited" />
                                    <ComparisonRow feature="Export your data" yula={true} others="Varies" />
                                    <ComparisonRow feature="Voice conversations" yula={true} others={true} />
                                    <ComparisonRow feature="Model switching" yula="Instant" others="Per chat" />
                                </tbody>
                            </table>
                        </motion.div>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="py-24 md:py-32">
                    <div className="container max-w-6xl mx-auto px-4 md:px-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0 }}
                            >
                                <StatCard value="100+" label="AI Models Available" />
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                            >
                                <StatCard value="<100ms" label="Response Time" />
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                            >
                                <StatCard value="99.9%" label="Uptime" />
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 }}
                            >
                                <StatCard value="5" label="Languages" />
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Additional Features */}
                <section className="py-24 md:py-32 bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="container max-w-6xl mx-auto px-4 md:px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center mb-16"
                        >
                            <h2 className="text-sm font-bold text-violet-500 uppercase tracking-wider mb-4">
                                And More
                            </h2>
                            <h3 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                                Everything you need
                            </h3>
                        </motion.div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { icon: Brain, title: 'Persistent Memory', description: 'AI that remembers your preferences, projects, and context across all conversations.' },
                                { icon: Microphone, title: 'Voice Mode', description: 'Natural voice conversations with real-time transcription and synthesis.' },
                                { icon: ArrowsClockwise, title: 'Model Switching', description: 'Switch between GPT-4, Claude, Gemini instantly without losing context.' },
                                { icon: ShieldCheck, title: 'Privacy First', description: 'Your data is encrypted and never used to train AI models.' },
                                { icon: Export, title: 'Export Anytime', description: 'Your conversations are yours. Export everything at any time.' },
                                { icon: Translate, title: 'Multilingual', description: 'Full support for English, Turkish, Spanish, French, and German.' },
                            ].map((feature, i) => (
                                <motion.div
                                    key={feature.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.05 }}
                                    className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                                >
                                    <feature.icon className="w-8 h-8 text-violet-500 mb-4" weight="duotone" />
                                    <h4 className="font-semibold mb-2">{feature.title}</h4>
                                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-24 md:py-32">
                    <div className="container max-w-5xl mx-auto px-4 md:px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center mb-16"
                        >
                            <h2 className="text-sm font-bold text-violet-500 uppercase tracking-wider mb-4">
                                Simple Pricing
                            </h2>
                            <h3 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                                Start free, scale as you grow
                            </h3>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                Access premium AI models worth $200+/month for a fraction of the cost.
                            </p>
                        </motion.div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Starter */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 }}
                            >
                                <Card className="h-full">
                                    <CardHeader>
                                        <CardTitle>Starter</CardTitle>
                                        <CardDescription>For trying YULA</CardDescription>
                                        <div className="text-4xl font-bold mt-4">
                                            $0
                                            <span className="text-lg font-normal text-muted-foreground">/mo</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-3">
                                            {['100 chats/month', '1 AI model', 'Basic memory', 'Import up to 50 chats', 'Email support'].map((f) => (
                                                <li key={f} className="flex items-center gap-3 text-sm">
                                                    <CheckCircle className="w-5 h-5 text-emerald-500" weight="fill" />
                                                    <span className="text-muted-foreground">{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="outline" className="w-full" asChild>
                                            <Link href="/signup">Get Started</Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>

                            {/* Pro */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                            >
                                <Card className="h-full relative border-violet-500/50 shadow-xl scale-105">
                                    <div className="absolute -top-3 left-0 right-0 mx-auto w-fit">
                                        <span className="bg-gradient-to-r from-violet-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                            MOST POPULAR
                                        </span>
                                    </div>
                                    <CardHeader>
                                        <CardTitle>Pro</CardTitle>
                                        <CardDescription>Your daily AI companion</CardDescription>
                                        <div className="text-4xl font-bold mt-4">
                                            $20
                                            <span className="text-lg font-normal text-muted-foreground">/mo</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-3">
                                            {[
                                                '1,500 chats/month',
                                                'All AI models',
                                                'Advanced memory + search',
                                                'Unlimited import',
                                                'PAC reminders',
                                                'COUNCIL (2 models)',
                                                'Voice mode',
                                                'Priority support',
                                            ].map((f) => (
                                                <li key={f} className="flex items-center gap-3 text-sm">
                                                    <CheckCircle className="w-5 h-5 text-emerald-500" weight="fill" />
                                                    <span>{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600" asChild>
                                            <Link href="/signup?tier=pro">Upgrade to Pro</Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>

                            {/* Ultra */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 }}
                            >
                                <Card className="h-full">
                                    <CardHeader>
                                        <CardTitle>Ultra</CardTitle>
                                        <CardDescription>For power users</CardDescription>
                                        <div className="text-4xl font-bold mt-4">
                                            $50
                                            <span className="text-lg font-normal text-muted-foreground">/mo</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-3">
                                            {[
                                                '5,000+ chats/month',
                                                'All models + experimental',
                                                'Full Memory Inspector',
                                                'COUNCIL (4 models)',
                                                'API access',
                                                'Custom integrations',
                                                'Dedicated support',
                                            ].map((f) => (
                                                <li key={f} className="flex items-center gap-3 text-sm">
                                                    <CheckCircle className="w-5 h-5 text-emerald-500" weight="fill" />
                                                    <span className="text-muted-foreground">{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="outline" className="w-full" asChild>
                                            <Link href="/signup?tier=ultra">Go Ultra</Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section id="faq" className="py-24 md:py-32 bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="container max-w-3xl mx-auto px-4 md:px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center mb-16"
                        >
                            <h2 className="text-sm font-bold text-violet-500 uppercase tracking-wider mb-4">
                                FAQ
                            </h2>
                            <h3 className="text-4xl md:text-5xl font-bold tracking-tight">
                                Common questions
                            </h3>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="import">
                                    <AccordionTrigger>How do I import my ChatGPT history?</AccordionTrigger>
                                    <AccordionContent>
                                        Go to ChatGPT Settings → Data Controls → Export Data. Download the ZIP file,
                                        then upload it to YULA's Import page. We'll automatically parse your conversations
                                        and extract memories.
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="pac">
                                    <AccordionTrigger>What are PAC reminders?</AccordionTrigger>
                                    <AccordionContent>
                                        PAC (Proactive AI Callbacks) automatically detects commitments in your conversations
                                        like "I'll do this tomorrow" or "remind me to..." and creates smart reminders.
                                        You'll get notifications via push, email, or in-app.
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="council">
                                    <AccordionTrigger>How does COUNCIL work?</AccordionTrigger>
                                    <AccordionContent>
                                        COUNCIL lets you ask up to 4 AI models the same question simultaneously.
                                        Each responds with a different perspective: The Scholar (academic), The Visionary (creative),
                                        The Pragmatist (practical), and Devil's Advocate (critical). You can then choose
                                        the best response or get an AI-generated synthesis.
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="data">
                                    <AccordionTrigger>Is my data safe?</AccordionTrigger>
                                    <AccordionContent>
                                        Yes. All data is encrypted at rest and in transit. Your conversations are never
                                        used to train AI models. You can export or delete your data at any time.
                                        We're GDPR compliant.
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="cancel">
                                    <AccordionTrigger>Can I cancel anytime?</AccordionTrigger>
                                    <AccordionContent>
                                        Yes! You can cancel your subscription at any time. You'll keep access until
                                        the end of your billing period. No questions asked.
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </motion.div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-24 md:py-32">
                    <div className="container max-w-4xl mx-auto px-4 md:px-6 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="space-y-8"
                        >
                            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                                Ready to transform your AI experience?
                            </h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                Join thousands of users who've upgraded from ChatGPT.
                                Start free, no credit card required.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Button
                                    size="lg"
                                    className="h-14 px-8 text-lg bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 shadow-lg shadow-violet-500/25"
                                    asChild
                                >
                                    <Link href="/signup">
                                        Get Started Free
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Link>
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="py-12 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="container max-w-7xl mx-auto px-4 md:px-6">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <Link href="/" className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                                    <Sparkle className="w-5 h-5 text-white" weight="fill" />
                                </div>
                                <span className="font-bold text-xl">YULA</span>
                            </Link>
                            <p className="text-sm text-muted-foreground">
                                Your Universal Learning Assistant.
                                AI that remembers, anticipates, and evolves.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Product</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
                                <li><Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                                <li><Link href="/import" className="hover:text-foreground transition-colors">Import</Link></li>
                                <li><Link href="/chat" className="hover:text-foreground transition-colors">Chat</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Company</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                                <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                                <li><Link href="/careers" className="hover:text-foreground transition-colors">Careers</Link></li>
                                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                                <li><Link href="/cookies" className="hover:text-foreground transition-colors">Cookie Policy</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-zinc-200 dark:border-zinc-800">
                        <p className="text-sm text-muted-foreground">
                            © 2026 YULA. All rights reserved.
                        </p>
                        <div className="flex items-center gap-4 mt-4 md:mt-0">
                            <Link href="https://github.com" className="text-muted-foreground hover:text-foreground transition-colors">
                                <GithubLogo size={20} />
                            </Link>
                            <Link href="https://x.com" className="text-muted-foreground hover:text-foreground transition-colors">
                                <XLogo size={20} />
                            </Link>
                            <Link href="https://linkedin.com" className="text-muted-foreground hover:text-foreground transition-colors">
                                <LinkedinLogo size={20} />
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
