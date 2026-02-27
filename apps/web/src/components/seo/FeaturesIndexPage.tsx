'use client';

import {
    ArrowLeft,
    ArrowRight,
    BellRinging,
    Brain,
    UploadSimple,
    UsersThree,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type FeatureIndexIcon = 'brain' | 'users-three' | 'bell-ringing' | 'upload-simple';

export interface FeatureIndexData {
    name: string;
    slug: string;
    description: string;
    icon: FeatureIndexIcon;
    color: string;
    bgColor: string;
}

interface FeaturesIndexPageProps {
    features: FeatureIndexData[];
}

const featureIcons = {
    brain: Brain,
    'users-three': UsersThree,
    'bell-ringing': BellRinging,
    'upload-simple': UploadSimple,
} as const;

export function FeaturesIndexPage({ features }: FeaturesIndexPageProps) {
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
                            href="/compare"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Compare
                        </Link>
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
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Yula Features</h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Discover the features that make Yula the most advanced unified AI platform.
                        Memory, multi-model access, proactive AI, and more.
                    </p>
                </header>

                <section aria-labelledby="features">
                    <h2 id="features" className="sr-only">
                        All Features
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {features.map((feature) => {
                            const Icon = featureIcons[feature.icon];
                            return (
                                <Card
                                    key={feature.slug}
                                    className="group hover:border-primary/50 transition-colors"
                                >
                                    <CardHeader>
                                        <div
                                            className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4`}
                                        >
                                            <Icon
                                                className={`w-6 h-6 ${feature.color}`}
                                                weight="duotone"
                                            />
                                        </div>
                                        <CardTitle className="text-xl">{feature.name}</CardTitle>
                                        <CardDescription className="text-base">
                                            {feature.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            asChild
                                            className="group-hover:text-primary -ml-2"
                                        >
                                            <Link href={`/features/${feature.slug}`} className="gap-1">
                                                Learn more
                                                <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>

                <section className="mt-16 text-center py-12 px-6 rounded-2xl bg-primary/5 border border-primary/20">
                    <h2 className="text-2xl font-semibold mb-4">Ready to Experience Yula?</h2>
                    <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                        Join thousands of users who have upgraded from ChatGPT, Claude, and other AI
                        assistants to Yula&apos;s unified platform with persistent memory.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Button size="lg" asChild>
                            <Link href="/signup" className="gap-2">
                                Get Started Free
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild>
                            <Link href="/pricing">View Pricing</Link>
                        </Button>
                    </div>
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
