'use client';

import { ArrowLeft, ArrowRight, CheckCircle, X as XIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export interface CompetitorData {
    name: string;
    slug: string;
    tagline: string;
    description: string;
    logoColor: string;
    strengths: string[];
    yulaAdvantages: string[];
    featureComparison: {
        feature: string;
        competitor: boolean | string;
        yula: boolean | string;
    }[];
    pricingComparison: {
        tier: string;
        competitor: string;
        yula: string;
    }[];
    faqs: {
        question: string;
        answer: string;
    }[];
    ctaText: string;
}

interface ComparisonPageProps {
    competitor: CompetitorData;
}

function FeatureCheck({ value }: { value: boolean | string }) {
    if (typeof value === 'boolean') {
        return value ? (
            <CheckCircle className="w-5 h-5 text-emerald-500" weight="fill" />
        ) : (
            <XIcon className="w-5 h-5 text-muted-foreground" />
        );
    }
    return <span className="text-sm text-muted-foreground">{value}</span>;
}

export function ComparisonPage({ competitor }: ComparisonPageProps) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-semibold tracking-tight text-foreground">YULA</span>
                    </Link>
                    <nav className="flex gap-4 items-center">
                        <Link
                            href="/pricing"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Pricing
                        </Link>
                        <ModeToggle />
                        <Button size="sm" asChild>
                            <Link href="/signup">Get Started</Link>
                        </Button>
                    </nav>
                </div>
            </header>

            <main className="container max-w-5xl mx-auto py-12 px-6">
                {/* Breadcrumb */}
                <nav aria-label="Breadcrumb" className="mb-8">
                    <ol className="flex items-center gap-2 text-sm text-muted-foreground">
                        <li>
                            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
                        </li>
                        <li>/</li>
                        <li>
                            <Link href="/compare" className="hover:text-foreground transition-colors">Compare</Link>
                        </li>
                        <li>/</li>
                        <li className="text-foreground font-medium">{competitor.name}</li>
                    </ol>
                </nav>

                {/* Hero */}
                <header className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                        {competitor.name} Alternative with Memory
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        {competitor.tagline}
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 pt-4">
                        <Button size="lg" asChild>
                            <Link href="/signup">{competitor.ctaText}</Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild>
                            <Link href="/pricing">View Pricing</Link>
                        </Button>
                    </div>
                </header>

                {/* Quick Comparison */}
                <section className="mb-16" aria-labelledby="quick-comparison">
                    <h2 id="quick-comparison" className="text-2xl font-semibold mb-6">
                        Quick Comparison
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${competitor.logoColor}`} />
                                    {competitor.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{competitor.description}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-primary">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-primary" />
                                    YULA
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Unified AI platform with access to 12+ models including {competitor.name},
                                    persistent semantic memory, ChatGPT/Claude import, and proactive AI callbacks.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* What They Do Well */}
                <section className="mb-16" aria-labelledby="competitor-strengths">
                    <h2 id="competitor-strengths" className="text-2xl font-semibold mb-6">
                        What {competitor.name} Does Well
                    </h2>
                    <Card>
                        <CardContent className="pt-6">
                            <ul className="space-y-3">
                                {competitor.strengths.map((strength) => (
                                    <li key={strength} className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                        <span>{strength}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </section>

                {/* Where YULA Stands Out */}
                <section className="mb-16" aria-labelledby="yula-advantages">
                    <h2 id="yula-advantages" className="text-2xl font-semibold mb-6">
                        Where YULA Stands Out
                    </h2>
                    <Card className="border-primary/50 bg-primary/5">
                        <CardContent className="pt-6">
                            <ul className="space-y-3">
                                {competitor.yulaAdvantages.map((advantage) => (
                                    <li key={advantage} className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" weight="fill" />
                                        <span>{advantage}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </section>

                {/* Feature Comparison */}
                <section className="mb-16" aria-labelledby="feature-comparison">
                    <h2 id="feature-comparison" className="text-2xl font-semibold mb-6">
                        Feature Comparison
                    </h2>
                    <div className="rounded-xl border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-4 text-left font-semibold">Feature</th>
                                    <th className="px-6 py-4 text-center font-semibold">{competitor.name}</th>
                                    <th className="px-6 py-4 text-center font-semibold text-primary">YULA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {competitor.featureComparison.map((row) => (
                                    <tr key={row.feature}>
                                        <td className="px-6 py-4 font-medium">{row.feature}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center">
                                                <FeatureCheck value={row.competitor} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center">
                                                <FeatureCheck value={row.yula} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Pricing Comparison */}
                <section className="mb-16" aria-labelledby="pricing-comparison">
                    <h2 id="pricing-comparison" className="text-2xl font-semibold mb-6">
                        Pricing Comparison
                    </h2>
                    <div className="rounded-xl border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-4 text-left font-semibold">Tier</th>
                                    <th className="px-6 py-4 text-center font-semibold">{competitor.name}</th>
                                    <th className="px-6 py-4 text-center font-semibold text-primary">YULA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {competitor.pricingComparison.map((row) => (
                                    <tr key={row.tier}>
                                        <td className="px-6 py-4 font-medium">{row.tier}</td>
                                        <td className="px-6 py-4 text-center text-muted-foreground">{row.competitor}</td>
                                        <td className="px-6 py-4 text-center text-muted-foreground">{row.yula}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* FAQ */}
                <section className="mb-16" aria-labelledby="faq">
                    <h2 id="faq" className="text-2xl font-semibold mb-6">
                        Frequently Asked Questions
                    </h2>
                    <Accordion type="single" collapsible className="w-full">
                        {competitor.faqs.map((faq, index) => (
                            <AccordionItem key={index} value={`faq-${index}`}>
                                <AccordionTrigger>{faq.question}</AccordionTrigger>
                                <AccordionContent>{faq.answer}</AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </section>

                {/* CTA */}
                <section className="text-center py-12 px-6 rounded-2xl bg-primary/5 border border-primary/20">
                    <h2 className="text-2xl font-semibold mb-4">
                        Ready to try YULA?
                    </h2>
                    <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                        Import your {competitor.name} history and experience AI with persistent memory.
                    </p>
                    <Button size="lg" asChild>
                        <Link href="/signup" className="gap-2">
                            {competitor.ctaText}
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </Button>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-border mt-12">
                <div className="container max-w-5xl mx-auto py-8 px-6 text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} YULA. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
