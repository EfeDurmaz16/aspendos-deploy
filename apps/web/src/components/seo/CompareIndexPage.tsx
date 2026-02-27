'use client';

import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface CompareIndexCompetitor {
    name: string;
    slug: string;
    description: string;
    color: string;
    searches: string;
}

interface CompareIndexPageProps {
    competitors: CompareIndexCompetitor[];
}

export function CompareIndexPage({ competitors }: CompareIndexPageProps) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-semibold tracking-tight text-foreground">Yula</span>
                    </Link>
                    <nav className="flex gap-4 items-center">
                        <Link
                            href="/pricing"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Pricing
                        </Link>
                        <Button size="sm" asChild>
                            <Link href="/signup">Get Started</Link>
                        </Button>
                    </nav>
                </div>
            </header>

            <main className="container max-w-5xl mx-auto py-12 px-6">
                <header className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                        Compare Yula with AI Alternatives
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        See how Yula stacks up against ChatGPT, Claude, Gemini, and more. Discover
                        why Yula is the best unified AI platform with persistent memory.
                    </p>
                </header>

                <section aria-labelledby="comparisons">
                    <h2 id="comparisons" className="sr-only">
                        Available Comparisons
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {competitors.map((competitor) => (
                            <Card
                                key={competitor.slug}
                                className="group hover:border-primary/50 transition-colors"
                            >
                                <CardHeader>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`w-3 h-3 rounded-full ${competitor.color}`} />
                                        <CardTitle className="text-xl">
                                            Yula vs {competitor.name}
                                        </CardTitle>
                                    </div>
                                    <CardDescription>{competitor.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            {competitor.searches}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            asChild
                                            className="group-hover:text-primary"
                                        >
                                            <Link href={`/compare/${competitor.slug}`} className="gap-1">
                                                Compare
                                                <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                <section className="mt-16 text-center py-12 px-6 rounded-2xl bg-primary/5 border border-primary/20">
                    <h2 className="text-2xl font-semibold mb-4">Why Yula is Different</h2>
                    <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                        Yula is the only AI platform that combines multi-model access with
                        persistent semantic memory, history import from ChatGPT/Claude, and
                        proactive AI callbacks.
                    </p>
                    <Button size="lg" asChild>
                        <Link href="/signup" className="gap-2">
                            Get Started Free
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </Button>
                </section>
            </main>

            <footer className="border-t border-border mt-12">
                <div className="container max-w-5xl mx-auto py-8 px-6 text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} Yula. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
