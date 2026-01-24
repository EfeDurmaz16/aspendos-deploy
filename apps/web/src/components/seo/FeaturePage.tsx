'use client';

import { ArrowLeft, ArrowRight, CheckCircle } from '@phosphor-icons/react';
import Link from 'next/link';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export interface FeatureData {
    name: string;
    slug: string;
    tagline: string;
    description: string;
    heroIcon: React.ReactNode;
    benefits: {
        title: string;
        description: string;
    }[];
    howItWorks: {
        step: number;
        title: string;
        description: string;
    }[];
    useCases: {
        title: string;
        description: string;
    }[];
    faqs: {
        question: string;
        answer: string;
    }[];
    ctaText: string;
    relatedFeatures: {
        name: string;
        slug: string;
        description: string;
    }[];
}

interface FeaturePageProps {
    feature: FeatureData;
}

export function FeaturePage({ feature }: FeaturePageProps) {
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
                            href="/features"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Features
                        </Link>
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
                            <Link href="/features" className="hover:text-foreground transition-colors">Features</Link>
                        </li>
                        <li>/</li>
                        <li className="text-foreground font-medium">{feature.name}</li>
                    </ol>
                </nav>

                {/* Hero */}
                <header className="text-center mb-16 space-y-6">
                    <div className="flex justify-center mb-4">
                        {feature.heroIcon}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                        {feature.name}
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        {feature.tagline}
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 pt-4">
                        <Button size="lg" asChild>
                            <Link href="/signup">{feature.ctaText}</Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild>
                            <Link href="/pricing">View Pricing</Link>
                        </Button>
                    </div>
                </header>

                {/* Description */}
                <section className="mb-16 prose prose-lg dark:prose-invert max-w-none">
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        {feature.description}
                    </p>
                </section>

                {/* Benefits */}
                <section className="mb-16" aria-labelledby="benefits">
                    <h2 id="benefits" className="text-2xl font-semibold mb-6">
                        Key Benefits
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {feature.benefits.map((benefit) => (
                            <Card key={benefit.title}>
                                <CardHeader>
                                    <CardTitle className="flex items-start gap-3">
                                        <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" weight="fill" />
                                        {benefit.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{benefit.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* How It Works */}
                <section className="mb-16" aria-labelledby="how-it-works">
                    <h2 id="how-it-works" className="text-2xl font-semibold mb-6">
                        How It Works
                    </h2>
                    <div className="space-y-6">
                        {feature.howItWorks.map((step) => (
                            <div key={step.step} className="flex gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                                    {step.step}
                                </div>
                                <div className="flex-grow pt-1">
                                    <h3 className="text-lg font-medium mb-1">{step.title}</h3>
                                    <p className="text-muted-foreground">{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Use Cases */}
                <section className="mb-16" aria-labelledby="use-cases">
                    <h2 id="use-cases" className="text-2xl font-semibold mb-6">
                        Use Cases
                    </h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        {feature.useCases.map((useCase) => (
                            <Card key={useCase.title} className="bg-muted/30">
                                <CardContent className="pt-6">
                                    <h3 className="font-medium mb-2">{useCase.title}</h3>
                                    <p className="text-sm text-muted-foreground">{useCase.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* FAQ */}
                <section className="mb-16" aria-labelledby="faq">
                    <h2 id="faq" className="text-2xl font-semibold mb-6">
                        Frequently Asked Questions
                    </h2>
                    <Accordion type="single" collapsible className="w-full">
                        {feature.faqs.map((faq, index) => (
                            <AccordionItem key={index} value={`faq-${index}`}>
                                <AccordionTrigger>{faq.question}</AccordionTrigger>
                                <AccordionContent>{faq.answer}</AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </section>

                {/* Related Features */}
                <section className="mb-16" aria-labelledby="related">
                    <h2 id="related" className="text-2xl font-semibold mb-6">
                        Related Features
                    </h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        {feature.relatedFeatures.map((related) => (
                            <Card key={related.slug} className="group hover:border-primary/50 transition-colors">
                                <CardContent className="pt-6">
                                    <h3 className="font-medium mb-2">{related.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-4">{related.description}</p>
                                    <Link
                                        href={`/features/${related.slug}`}
                                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                        Learn more
                                        <ArrowRight className="w-3 h-3" />
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* CTA */}
                <section className="text-center py-12 px-6 rounded-2xl bg-primary/5 border border-primary/20">
                    <h2 className="text-2xl font-semibold mb-4">
                        Ready to try {feature.name}?
                    </h2>
                    <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                        Start using YULA today and experience AI with {feature.name.toLowerCase()}.
                    </p>
                    <Button size="lg" asChild>
                        <Link href="/signup" className="gap-2">
                            {feature.ctaText}
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
