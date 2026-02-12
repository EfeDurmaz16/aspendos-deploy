import { ArrowLeft, ArrowRight } from '@phosphor-icons/react/dist/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
    'Compare AI Platforms | YULA vs ChatGPT, Claude, Gemini',
    'Compare YULA with ChatGPT, Claude, Gemini, Perplexity, and Poe. See why YULA is the best unified AI platform with persistent memory and multi-model access.',
    '/compare',
    {
        keywords: [
            'AI comparison',
            'ChatGPT alternative',
            'Claude alternative',
            'compare AI platforms',
            'best AI chat platform',
            'multi-model AI comparison',
        ],
    }
);

const competitors = [
    {
        name: 'ChatGPT',
        slug: 'chatgpt',
        description: 'Compare YULA with OpenAI ChatGPT - import history, multi-model access',
        color: 'bg-emerald-500',
        searches: '74K monthly searches',
    },
    {
        name: 'Claude',
        slug: 'claude',
        description: 'Compare YULA with Anthropic Claude - persistent memory across models',
        color: 'bg-orange-500',
        searches: '22K monthly searches',
    },
    {
        name: 'Gemini',
        slug: 'gemini',
        description: 'Compare YULA with Google Gemini - not locked into one ecosystem',
        color: 'bg-blue-500',
        searches: '18K monthly searches',
    },
    {
        name: 'Perplexity',
        slug: 'perplexity',
        description: 'Compare YULA with Perplexity - deep conversations vs quick search',
        color: 'bg-teal-500',
        searches: '12K monthly searches',
    },
    {
        name: 'Poe',
        slug: 'poe',
        description: 'Compare YULA with Quora Poe - memory and proactive features',
        color: 'bg-purple-500',
        searches: '8K monthly searches',
    },
];

export default function ComparePage() {
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
                        <Button size="sm" asChild>
                            <Link href="/signup">Get Started</Link>
                        </Button>
                    </nav>
                </div>
            </header>

            <main className="container max-w-5xl mx-auto py-12 px-6">
                {/* Hero */}
                <header className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                        Compare YULA with AI Alternatives
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        See how YULA stacks up against ChatGPT, Claude, Gemini, and more. Discover
                        why YULA is the best unified AI platform with persistent memory.
                    </p>
                </header>

                {/* Comparison Cards */}
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
                                        <span
                                            className={`w-3 h-3 rounded-full ${competitor.color}`}
                                        />
                                        <CardTitle className="text-xl">
                                            YULA vs {competitor.name}
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
                                            <Link
                                                href={`/compare/${competitor.slug}`}
                                                className="gap-1"
                                            >
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

                {/* Summary Section */}
                <section className="mt-16 text-center py-12 px-6 rounded-2xl bg-primary/5 border border-primary/20">
                    <h2 className="text-2xl font-semibold mb-4">Why YULA is Different</h2>
                    <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                        YULA is the only AI platform that combines multi-model access with
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

            {/* Footer */}
            <footer className="border-t border-border mt-12">
                <div className="container max-w-5xl mx-auto py-8 px-6 text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} YULA. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
