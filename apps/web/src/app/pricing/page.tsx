'use client';

import { ArrowLeft, ArrowRight, CheckCircle, TrendUp } from '@phosphor-icons/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ModeToggle } from '@/components/mode-toggle';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useUser } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

type BillingPeriod = 'weekly' | 'monthly' | 'annual';

const PRICING_DATA = {
    Personal: { weekly: 7, monthly: 25, annual: 240 },
    Pro: { weekly: 17, monthly: 60, annual: 576 },
    'Pro BYOK': { weekly: 9, monthly: 30, annual: 288 },
    Team: { weekly: 50, monthly: 180, annual: 1728 },
    'Team BYOK': { weekly: 28, monthly: 100, annual: 960 },
};

const PRICING_TIERS = [
    {
        name: 'Personal',
        description: 'For individuals getting started',
        features: [
            'All AI models (Claude, GPT, Gemini, Llama)',
            'Persistent memory via SuperMemory',
            'FIDES-signed audit trail',
            '/undo on any action',
            '/timeline to inspect history',
            'Web + 4 messaging surfaces',
            'Email support',
        ],
        limits: { chats: 500, voiceMinutes: 0, councilSessions: 0, models: 6 },
        cta: 'Get Started',
        slug: 'personal',
        popular: false,
    },
    {
        name: 'Pro',
        description: 'For power users who need agent capabilities',
        features: [
            'Everything in Personal',
            'E2B / Daytona sandboxed code execution',
            'Steel.dev browser automation',
            'Anthropic Computer Use (virtual desktop)',
            'All 8 messaging surfaces',
            'Priority model routing',
            'Chat + email support',
        ],
        limits: { chats: 2000, voiceMinutes: 60, councilSessions: 50, models: 10 },
        cta: 'Upgrade to Pro',
        slug: 'pro',
        popular: true,
    },
    {
        name: 'Pro BYOK',
        description: 'Pro features with your own API keys',
        features: [
            'Everything in Pro',
            'Bring your own LLM keys (OpenAI, Anthropic, etc.)',
            'AES-GCM encrypted key vault',
            'No per-token markup',
            'Full cost transparency',
        ],
        limits: { chats: 999999, voiceMinutes: 60, councilSessions: 50, models: 10 },
        cta: 'Go BYOK',
        slug: 'pro_byok',
        popular: false,
    },
    {
        name: 'Team',
        description: 'For teams that need shared governance',
        features: [
            'Everything in Pro',
            'Team workspaces with shared approvals',
            'Org-scoped audit trail',
            'SSO via WorkOS (SAML, OIDC)',
            'Admin controls + policy engine',
            'Priority support',
        ],
        limits: { chats: 5000, voiceMinutes: 180, councilSessions: 200, models: 10 },
        cta: 'Start Team',
        slug: 'team',
        popular: false,
    },
    {
        name: 'Team BYOK',
        description: 'Team features with your own API keys',
        features: [
            'Everything in Team',
            'Org-level BYOK key vault',
            'Shared keys across team members',
            'No per-token markup',
            'Dedicated support',
        ],
        limits: { chats: 999999, voiceMinutes: 180, councilSessions: 200, models: 10 },
        cta: 'Start Team BYOK',
        slug: 'team_byok',
        popular: false,
    },
];

// Usage data is fetched from the billing API when user is authenticated
const USAGE_UNAVAILABLE = false;

function _UsageBar({ current, limit, label }: { current: number; limit: number; label: string }) {
    const percentage = Math.min((current / limit) * 100, 100);
    const isWarning = percentage > 75;
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <span className="text-xs font-semibold text-foreground">
                    {current} / {limit}
                </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                    className={cn(
                        'h-full transition-all rounded-full',
                        isWarning ? 'bg-foreground' : 'bg-primary'
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

function PricingContent() {
    const searchParams = useSearchParams();
    const { isSignedIn } = useUser();
    const success = searchParams.get('success');
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

    const handleCheckout = async (slug: string) => {
        setCheckoutLoading(slug);
        try {
            const res = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug,
                    interval: billingPeriod,
                    seats: slug.startsWith('team') ? 1 : undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                console.error('Checkout error:', data.error);
                setCheckoutLoading(null);
                return;
            }
            window.location.href = data.url;
        } catch (error) {
            console.error('Checkout error:', error);
            setCheckoutLoading(null);
        }
    };

    const handlePortal = async () => {
        try {
            const res = await fetch('/api/billing/portal', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) {
                console.error('Portal error:', data.error);
                return;
            }
            window.location.href = data.url;
        } catch (error) {
            console.error('Portal error:', error);
        }
    };

    const getPrice = (tierName: string) =>
        PRICING_DATA[tierName as keyof typeof PRICING_DATA][billingPeriod];
    const getPeriodLabel = () =>
        billingPeriod === 'weekly' ? 'week' : billingPeriod === 'monthly' ? 'month' : 'year';
    const getAnnualSavings = (tierName: string) => {
        const tier = PRICING_DATA[tierName as keyof typeof PRICING_DATA];
        return tier.monthly * 12 - tier.annual;
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
                <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-semibold tracking-tight text-foreground">Yula</span>
                    </Link>
                    <nav className="flex gap-4 items-center">
                        <ModeToggle />
                        {isSignedIn ? (
                            <Button size="sm" asChild>
                                <Link href="/chat">Go to Chat</Link>
                            </Button>
                        ) : (
                            <Button size="sm" variant="secondary" asChild>
                                <a href="/login">Log in</a>
                            </Button>
                        )}
                    </nav>
                </div>
            </header>

            <div className="container max-w-6xl mx-auto py-12 px-6">
                {/* Success message */}
                {success && (
                    <Card className="mb-8 border-border bg-muted">
                        <CardContent className="p-4 flex items-center justify-center gap-2 text-foreground font-medium">
                            <CheckCircle className="w-5 h-5" weight="fill" />
                            Payment successful! Your subscription is now active.
                        </CardContent>
                    </Card>
                )}

                {/* Usage dashboard for signed-in users */}
                {isSignedIn && !USAGE_UNAVAILABLE && (
                    <Card className="mb-12 bg-muted/30">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <TrendUp className="w-5 h-5 text-primary" weight="fill" />
                                        Your Usage This Month
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Usage data unavailable
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Header */}
                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight">
                        Simple, transparent pricing
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        One unified subscription for all models, voice, memory, and autonomous
                        capabilities. Choose the plan that fits your workflow.
                    </p>
                </div>

                {/* Billing period toggle */}
                <div className="flex justify-center mb-12">
                    <div className="inline-flex p-1 rounded-lg border bg-muted">
                        {(['weekly', 'monthly', 'annual'] as const).map((period) => (
                            <button
                                type="button"
                                key={period}
                                onClick={() => setBillingPeriod(period)}
                                className={cn(
                                    'px-4 py-2 rounded-md text-sm font-medium transition-all',
                                    billingPeriod === period
                                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {period.charAt(0).toUpperCase() + period.slice(1)}
                                {period === 'annual' && (
                                    <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                                        -17%
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pricing cards */}
                <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                    {PRICING_TIERS.map((tier) => (
                        <Card
                            key={tier.name}
                            className={cn(
                                'flex flex-col relative',
                                tier.popular
                                    ? 'border-primary shadow-lg scale-105 z-10'
                                    : 'border-border shadow-sm hover:border-primary/50 transition-colors'
                            )}
                        >
                            {tier.popular && (
                                <div className="absolute -top-3 left-0 right-0 mx-auto w-fit">
                                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                                        MOST POPULAR
                                    </span>
                                </div>
                            )}

                            <CardHeader>
                                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                                <CardDescription>{tier.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-6">
                                <div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold">
                                            ${getPrice(tier.name)}
                                        </span>
                                        <span className="text-muted-foreground">
                                            /{getPeriodLabel()}
                                        </span>
                                    </div>
                                    {billingPeriod === 'annual' && (
                                        <p className="text-sm font-medium text-muted-foreground mt-2">
                                            Save ${getAnnualSavings(tier.name)}/year
                                        </p>
                                    )}
                                </div>

                                <ul className="space-y-3">
                                    {tier.features.map((feature) => (
                                        <li
                                            key={feature}
                                            className="flex items-start gap-3 text-sm"
                                        >
                                            <CheckCircle
                                                className="w-5 h-5 flex-shrink-0 text-primary"
                                                weight="fill"
                                            />
                                            <span className="text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                {tier.name === 'Free' || tier.name === 'Starter' ? (
                                    <Button
                                        variant={tier.popular ? 'default' : 'outline'}
                                        className="w-full"
                                        asChild
                                    >
                                        <a href={isSignedIn ? '/chat' : '/signup'}>{tier.cta}</a>
                                    </Button>
                                ) : isSignedIn ? (
                                    <Button
                                        variant={tier.popular ? 'default' : 'outline'}
                                        className="w-full"
                                        onClick={() => handleCheckout(tier.slug)}
                                        disabled={checkoutLoading === tier.slug}
                                    >
                                        {checkoutLoading === tier.slug ? 'Loading...' : tier.cta}
                                    </Button>
                                ) : (
                                    <Button
                                        variant={tier.popular ? 'default' : 'outline'}
                                        className="w-full"
                                        asChild
                                    >
                                        <a href={`/signup?redirect=pricing&tier=${tier.slug}`}>
                                            {tier.cta}
                                        </a>
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {/* Manage subscription link */}
                {isSignedIn && (
                    <div className="text-center mt-12">
                        <Button variant="outline" onClick={handlePortal} className="gap-2">
                            Manage your subscription
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                )}

                {/* Comparison table */}
                <div className="mt-20 space-y-8">
                    <h2 className="text-2xl font-semibold text-center">Detailed Plan Comparison</h2>
                    <div className="rounded-xl border overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Feature</th>
                                    {PRICING_TIERS.map((tier) => (
                                        <th
                                            key={tier.name}
                                            className="px-6 py-4 text-center font-semibold"
                                        >
                                            {tier.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                <tr>
                                    <td className="px-6 py-4 font-medium">Monthly Chats</td>
                                    {PRICING_TIERS.map((tier) => (
                                        <td
                                            key={tier.name}
                                            className="px-6 py-4 text-center text-muted-foreground"
                                        >
                                            {tier.limits.chats.toLocaleString()}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-medium">Voice Minutes/Day</td>
                                    {PRICING_TIERS.map((tier) => (
                                        <td
                                            key={tier.name}
                                            className="px-6 py-4 text-center text-muted-foreground"
                                        >
                                            {tier.limits.voiceMinutes}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-medium">AI Models</td>
                                    {PRICING_TIERS.map((tier) => (
                                        <td
                                            key={tier.name}
                                            className="px-6 py-4 text-center text-muted-foreground"
                                        >
                                            {tier.limits.models}+ models
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-medium">Memory & Search</td>
                                    <td className="px-6 py-4 text-center">
                                        <CheckCircle
                                            className="w-5 h-5 text-primary mx-auto"
                                            weight="fill"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <CheckCircle
                                            className="w-5 h-5 text-primary mx-auto"
                                            weight="fill"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <CheckCircle
                                            className="w-5 h-5 text-primary mx-auto"
                                            weight="fill"
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="mt-20 max-w-3xl mx-auto space-y-8">
                    <h2 className="text-2xl font-semibold text-center">
                        Frequently Asked Questions
                    </h2>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                What happens if I exceed my plan limits?
                            </AccordionTrigger>
                            <AccordionContent>
                                You'll receive notifications at 75%, 90%, and 100% of your monthly
                                limit. Once exceeded, you cannot create new chats until your usage
                                resets on the first of next month.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>Can I change plans anytime?</AccordionTrigger>
                            <AccordionContent>
                                Yes! You can upgrade or downgrade your plan at any time. Changes
                                take effect immediately.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>What is your refund policy?</AccordionTrigger>
                            <AccordionContent>
                                We do not offer refunds for subscriptions. However, you can cancel
                                anytime and will not be charged for the next billing period.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4">
                            <AccordionTrigger>Do you offer a free trial?</AccordionTrigger>
                            <AccordionContent>
                                Yes! Start with the Starter plan to explore Yula free for your first
                                100 chats. No credit card required.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </div>
        </div>
    );
}

export default function PricingPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">Loading...</div>
            }
        >
            <PricingContent />
        </Suspense>
    );
}
