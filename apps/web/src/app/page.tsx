'use client';

import {
    ArrowRight,
    Bell,
    Brain,
    CheckCircle,
    Clock,
    Cpu,
    Database,
    GithubLogo,
    Headphones,
    Shapes,
    Sparkle,
    XLogo,
} from '@phosphor-icons/react';
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

export default function LandingPage() {
    return (
        <div className="flex flex-col min-h-screen font-sans bg-background text-foreground">
            {/* Navigation */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 max-w-7xl mx-auto items-center justify-between px-4 md:px-6">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold tracking-tight">ASPENDOS</span>
                    </div>
                    <nav className="hidden md:flex gap-6 items-center text-sm font-medium text-muted-foreground">
                        <Link
                            href="#features"
                            className="hover:text-foreground transition-colors"
                        >
                            Method
                        </Link>
                        <Link
                            href="#pricing"
                            className="hover:text-foreground transition-colors"
                        >
                            Pricing
                        </Link>
                        <Link
                            href="/login"
                            className="hover:text-foreground transition-colors"
                        >
                            Log in
                        </Link>
                    </nav>
                    <div className="flex items-center gap-3">
                        <ModeToggle />
                        <Button
                            size="sm"
                            asChild
                        >
                            <Link href="/signup">Get Started</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="px-4 md:px-6 py-24 md:py-32 bg-background flex flex-col items-center text-center">
                    <Badge variant="outline" className="mb-6 px-3 py-1 text-sm bg-muted/50">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                        Now with voice & proactive scheduling
                    </Badge>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tighter text-foreground mb-6 max-w-4xl">
                        Meet your <br className="hidden md:block" />
                        <span className="text-muted-foreground">autonomous AI assistant</span>
                    </h1>

                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
                        Aspendos doesn't just respond—it anticipates. Proactive notifications,
                        autonomous scheduling, and persistent memory across every conversation.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button
                            size="lg"
                            className="h-12 px-8 text-base"
                            asChild
                        >
                            <Link href="/signup">
                                Start using Aspendos
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-12 px-8 text-base"
                            asChild
                        >
                            <Link href="#demo">Watch the demo</Link>
                        </Button>
                    </div>
                </section>

                {/* Hero Feature Card */}
                <section className="px-4 md:px-6 pb-24 container max-w-6xl mx-auto">
                    <Card className="overflow-hidden bg-card/50">
                        <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[400px]">
                            {/* Left Content */}
                            <div className="p-8 lg:p-12 lg:col-span-2 flex flex-col justify-center border-b lg:border-b-0 lg:border-r">
                                <h3 className="text-2xl font-semibold mb-4">
                                    AI that acts before you ask
                                </h3>
                                <p className="text-muted-foreground mb-8 text-lg">
                                    Autonomous scheduling, predictive notifications, and
                                    proactive assistance. Your AI doesn't wait in the chat
                                    box—it works ahead of your needs.
                                </p>

                                <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Bell className="w-6 h-6 text-blue-500" weight="bold" />
                                        <div>
                                            <p className="font-medium text-sm">Proactive</p>
                                            <p className="text-xs text-muted-foreground">Anticipates needs</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Clock className="w-6 h-6 text-emerald-500" weight="bold" />
                                        <div>
                                            <p className="font-medium text-sm">Scheduled</p>
                                            <p className="text-xs text-muted-foreground">Acts on time</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Brain className="w-6 h-6 text-purple-500" weight="bold" />
                                        <div>
                                            <p className="font-medium text-sm">Remembers</p>
                                            <p className="text-xs text-muted-foreground">Learns context</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Visual */}
                            <div className="p-8 lg:p-12 flex items-center justify-center bg-muted/30">
                                <div className="relative w-32 h-32 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-pulse" />
                                    <div className="absolute inset-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                        <Sparkle className="w-10 h-10 text-emerald-500" weight="fill" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
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
                                platform. Proactivity, memory, and voice—everything you need for
                                truly autonomous AI.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Feature 1 */}
                            <Card className="lg:col-span-2">
                                <CardHeader>
                                    <div className="mb-4 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <Bell className="w-5 h-5 text-blue-500" weight="bold" />
                                    </div>
                                    <CardTitle>Proactive Agent</CardTitle>
                                    <CardDescription>
                                        Aspendos autonomously schedules tasks and takes action on your behalf.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <CheckCircle className="w-4 h-4 text-emerald-500" weight="fill" />
                                        Predictive notifications
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <CheckCircle className="w-4 h-4 text-emerald-500" weight="fill" />
                                        Autonomous task scheduling
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <CheckCircle className="w-4 h-4 text-emerald-500" weight="fill" />
                                        Context-aware decisions
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Feature 2 */}
                            <Card className="lg:col-span-1">
                                <CardHeader>
                                    <div className="mb-4 w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                        <Database className="w-5 h-5 text-purple-500" weight="bold" />
                                    </div>
                                    <CardTitle>Memory</CardTitle>
                                    <CardDescription>
                                        Persistent knowledge graph of your preferences and projects.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="bg-muted px-3 py-2 rounded-md text-xs font-mono text-muted-foreground">
                                        <span className="text-emerald-500 mr-2">→</span>
                                        Cross-conversation
                                    </div>
                                    <div className="bg-muted px-3 py-2 rounded-md text-xs font-mono text-muted-foreground">
                                        <span className="text-emerald-500 mr-2">→</span>
                                        Vector recall
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Feature 3 */}
                            <Card className="lg:col-span-1">
                                <CardHeader>
                                    <div className="mb-4 w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                        <Headphones className="w-5 h-5 text-emerald-500" weight="bold" />
                                    </div>
                                    <CardTitle>Voice I/O</CardTitle>
                                    <CardDescription>
                                        Whisper transcription and natural speech synthesis.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="bg-muted px-3 py-2 rounded-md text-xs font-mono text-muted-foreground">
                                        <span className="text-emerald-500 mr-2">→</span>
                                        Whisper v3
                                    </div>
                                    <div className="bg-muted px-3 py-2 rounded-md text-xs font-mono text-muted-foreground">
                                        <span className="text-emerald-500 mr-2">→</span>
                                        Natural TTS
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Feature 4 */}
                            <Card className="lg:col-span-2 bg-foreground text-background">
                                <CardHeader>
                                    <div className="mb-4 w-10 h-10 rounded-lg bg-background/20 flex items-center justify-center">
                                        <Cpu className="w-5 h-5 text-background" weight="bold" />
                                    </div>
                                    <CardTitle className="text-background">Any Model. Any Time.</CardTitle>
                                    <CardDescription className="text-background/70">
                                        Switch seamlessly between Claude, GPT-4o, and Gemini.
                                        Aspendos handles model selection and cost optimization.
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
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
