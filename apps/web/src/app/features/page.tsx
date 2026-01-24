import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Brain, UsersThree, BellRinging, UploadSimple } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata(
    'Features | YULA AI Platform',
    'Explore YULA features: Semantic Memory, Council Mode, PAC (Proactive AI), and History Import. The most advanced unified AI platform.',
    '/features',
    {
        keywords: [
            'YULA features',
            'AI features',
            'semantic memory',
            'council mode',
            'proactive AI',
            'AI history import',
        ],
    }
);

const features = [
    {
        name: 'Semantic Memory',
        slug: 'memory',
        description: 'Persistent memory across all AI models. Your AI remembers every conversation and can search your entire history.',
        icon: Brain,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
    },
    {
        name: 'Council Mode',
        slug: 'council',
        description: 'Query up to 4 AI models simultaneously. Compare GPT-5, Claude, Gemini, and Llama responses side-by-side.',
        icon: UsersThree,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
    },
    {
        name: 'PAC - Proactive AI',
        slug: 'pac',
        description: 'The first AI that messages YOU first. Schedule reminders, follow-ups, and let YULA reach out when it matters.',
        icon: BellRinging,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
    },
    {
        name: 'History Import',
        slug: 'import',
        description: 'Import your ChatGPT and Claude conversations. Bring your AI memory with you and never start from scratch.',
        icon: UploadSimple,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
    },
];

export default function FeaturesPage() {
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
                {/* Hero */}
                <header className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                        YULA Features
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Discover the features that make YULA the most advanced unified AI platform.
                        Memory, multi-model access, proactive AI, and more.
                    </p>
                </header>

                {/* Feature Cards */}
                <section aria-labelledby="features">
                    <h2 id="features" className="sr-only">All Features</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {features.map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <Card key={feature.slug} className="group hover:border-primary/50 transition-colors">
                                    <CardHeader>
                                        <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4`}>
                                            <Icon className={`w-6 h-6 ${feature.color}`} weight="duotone" />
                                        </div>
                                        <CardTitle className="text-xl">{feature.name}</CardTitle>
                                        <CardDescription className="text-base">{feature.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button variant="ghost" size="sm" asChild className="group-hover:text-primary -ml-2">
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

                {/* Summary Section */}
                <section className="mt-16 text-center py-12 px-6 rounded-2xl bg-primary/5 border border-primary/20">
                    <h2 className="text-2xl font-semibold mb-4">
                        Ready to Experience YULA?
                    </h2>
                    <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                        Join thousands of users who have upgraded from ChatGPT, Claude, and other AI assistants
                        to YULA's unified platform with persistent memory.
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

            {/* Footer */}
            <footer className="border-t border-border mt-12">
                <div className="container max-w-5xl mx-auto py-8 px-6 text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} YULA. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
