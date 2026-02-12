'use client';

import { ArrowLeft } from '@phosphor-icons/react';
import Link from 'next/link';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
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
                        <span className="font-semibold tracking-tight text-foreground">YULA</span>
                    </Link>
                    <nav className="flex gap-4 items-center">
                        <ModeToggle />
                        <Button size="sm" variant="secondary" asChild>
                            <Link href="/login">Log in</Link>
                        </Button>
                    </nav>
                </div>
            </header>

            <div className="container max-w-4xl mx-auto py-12 px-6">
                <h1 className="text-4xl font-bold tracking-tight mb-4">Terms of Service</h1>
                <p className="text-muted-foreground mb-8">Last updated: February 11, 2026</p>

                <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
                        <p className="text-muted-foreground">
                            By accessing or using YULA ("Service"), you agree to be bound by these
                            Terms of Service ("Terms"). If you do not agree to these Terms, you may
                            not use the Service. We reserve the right to modify these Terms at any
                            time, and your continued use constitutes acceptance of any changes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
                        <p className="text-muted-foreground mb-3">
                            YULA is an AI chat platform that provides:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                Access to multiple AI language models (GPT-4o, Claude, Gemini,
                                Llama)
                            </li>
                            <li>Persistent memory across conversations using semantic search</li>
                            <li>Voice chat capabilities</li>
                            <li>Chat history import from other platforms</li>
                            <li>Proactive AI Callbacks (PAC notifications)</li>
                            <li>Multi-model comparison and parallel querying</li>
                        </ul>
                        <p className="text-muted-foreground mt-3">
                            The Service is provided "as is" and may be modified or discontinued at
                            any time without notice.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
                        <p className="text-muted-foreground mb-3">To use YULA, you must:</p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>Be at least 16 years old</li>
                            <li>Provide accurate and complete registration information</li>
                            <li>Maintain the security of your account credentials</li>
                            <li>Notify us immediately of any unauthorized access</li>
                        </ul>
                        <p className="text-muted-foreground mt-3">
                            You are responsible for all activities that occur under your account. We
                            reserve the right to suspend or terminate accounts that violate these
                            Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use Policy</h2>
                        <p className="text-muted-foreground mb-3">
                            You agree NOT to use the Service to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>Generate illegal, harmful, or malicious content</li>
                            <li>Harass, threaten, or impersonate others</li>
                            <li>Violate intellectual property rights</li>
                            <li>Distribute spam, malware, or phishing attempts</li>
                            <li>Attempt to bypass rate limits or abuse the API</li>
                            <li>Reverse engineer or scrape the Service</li>
                            <li>
                                Generate content that violates AI provider usage policies (OpenAI,
                                Anthropic, Google, Groq)
                            </li>
                            <li>
                                Use the Service for automated bulk operations without permission
                            </li>
                        </ul>
                        <p className="text-muted-foreground mt-3">
                            Violation of this policy may result in immediate account termination
                            without refund.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">5. Subscription & Billing</h2>
                        <h3 className="text-xl font-medium mb-3">Pricing Tiers</h3>
                        <p className="text-muted-foreground mb-3">
                            YULA offers Starter, Pro, and Ultra subscription plans with different
                            usage limits. Current pricing is available at{' '}
                            <Link href="/pricing" className="text-primary hover:underline">
                                yula.dev/pricing
                            </Link>
                            .
                        </p>

                        <h3 className="text-xl font-medium mb-3 mt-4">Payment Terms</h3>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                Subscriptions are billed weekly, monthly, or annually in advance
                            </li>
                            <li>Payment processing is handled by Polar, our payment provider</li>
                            <li>
                                You authorize us to charge your payment method for recurring
                                subscriptions
                            </li>
                            <li>
                                Prices may change with 30 days' notice; changes do not affect
                                current billing cycles
                            </li>
                        </ul>

                        <h3 className="text-xl font-medium mb-3 mt-4">Cancellation & Refunds</h3>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                You may cancel your subscription at any time via Settings or the
                                customer portal
                            </li>
                            <li>
                                Cancellations take effect at the end of the current billing period
                            </li>
                            <li>
                                <strong>
                                    No refunds are provided for partial months or unused credits
                                </strong>
                            </li>
                            <li>
                                You retain access to paid features until the end of your billing
                                cycle
                            </li>
                        </ul>

                        <h3 className="text-xl font-medium mb-3 mt-4">Usage Limits</h3>
                        <p className="text-muted-foreground">
                            Each plan has monthly chat limits and daily voice minute limits.
                            Exceeding limits results in restricted access until the next billing
                            cycle. We will notify you at 75%, 90%, and 100% of your limit.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
                        <h3 className="text-xl font-medium mb-3">Your Content</h3>
                        <p className="text-muted-foreground mb-3">
                            You retain all rights to your chat messages, imported history, and other
                            content you submit. By using YULA, you grant us a limited license to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                Process your content to provide the Service (including sending to AI
                                providers)
                            </li>
                            <li>Store memory embeddings for context retrieval</li>
                            <li>Generate anonymized analytics (with your consent)</li>
                        </ul>
                        <p className="text-muted-foreground mt-3">
                            <strong>We do not use your content to train AI models.</strong> See our{' '}
                            <Link href="/privacy" className="text-primary hover:underline">
                                Privacy Policy
                            </Link>{' '}
                            for details.
                        </p>

                        <h3 className="text-xl font-medium mb-3 mt-4">Our Content</h3>
                        <p className="text-muted-foreground">
                            YULA's interface, branding, code, and design are protected by copyright
                            and trademark laws. You may not copy, modify, or distribute our content
                            without written permission.
                        </p>

                        <h3 className="text-xl font-medium mb-3 mt-4">AI-Generated Content</h3>
                        <p className="text-muted-foreground">
                            AI responses generated through YULA are provided as-is. We make no
                            claims of ownership over AI-generated content, but you are responsible
                            for verifying accuracy before using AI outputs.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">
                            7. Data Processing & Privacy
                        </h2>
                        <p className="text-muted-foreground mb-3">
                            Your use of YULA involves data processing by third-party AI providers:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                Your messages are sent to OpenAI, Anthropic, Google, and/or Groq to
                                generate responses
                            </li>
                            <li>We have data processing agreements (DPAs) with all AI providers</li>
                            <li>AI providers are prohibited from training on your data</li>
                            <li>Memory embeddings are stored in our Qdrant vector database</li>
                        </ul>
                        <p className="text-muted-foreground mt-3">
                            For full details, see our{' '}
                            <Link href="/privacy" className="text-primary hover:underline">
                                Privacy Policy
                            </Link>
                            .
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
                        <p className="text-muted-foreground mb-3">
                            <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</strong>
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>YULA is provided "AS IS" without warranties of any kind</li>
                            <li>
                                We are not liable for AI-generated content accuracy, completeness,
                                or suitability
                            </li>
                            <li>
                                We are not responsible for decisions you make based on AI responses
                            </li>
                            <li>
                                Our total liability is limited to the amount you paid in the past 12
                                months
                            </li>
                            <li>
                                We are not liable for indirect, incidental, or consequential damages
                            </li>
                            <li>We are not liable for third-party AI provider outages or errors</li>
                        </ul>
                        <p className="text-muted-foreground mt-3">
                            <strong>
                                AI outputs may contain errors or biases. Always verify critical
                                information.
                            </strong>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">9. Indemnification</h2>
                        <p className="text-muted-foreground">
                            You agree to indemnify and hold harmless YULA, its affiliates, and
                            service providers from any claims, damages, or expenses arising from:
                            (a) your use of the Service, (b) your violation of these Terms, or (c)
                            your violation of any third-party rights.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
                        <p className="text-muted-foreground mb-3">
                            We may terminate or suspend your account immediately if:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>You violate these Terms or the Acceptable Use Policy</li>
                            <li>Your payment method fails repeatedly</li>
                            <li>We are required to do so by law</li>
                            <li>We discontinue the Service (with 30 days' notice)</li>
                        </ul>
                        <p className="text-muted-foreground mt-3">
                            Upon termination, your data will be deleted within 30 days unless you
                            request an export. You may delete your account at any time via Settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">
                            11. Governing Law & Disputes
                        </h2>
                        <p className="text-muted-foreground mb-3">
                            These Terms are governed by the laws of [Jurisdiction to be specified],
                            without regard to conflict of law principles. Any disputes will be
                            resolved through:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>Informal negotiation (30-day period)</li>
                            <li>Binding arbitration (if negotiation fails)</li>
                            <li>Small claims court (for claims under jurisdictional limit)</li>
                        </ul>
                        <p className="text-muted-foreground mt-3">
                            You waive the right to participate in class action lawsuits against
                            YULA.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">
                            12. Modifications to Service
                        </h2>
                        <p className="text-muted-foreground">
                            We reserve the right to modify, suspend, or discontinue any part of the
                            Service at any time. We will provide reasonable notice for material
                            changes, but are not liable for any modifications or interruptions.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">13. Miscellaneous</h2>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                <strong>Entire Agreement:</strong> These Terms constitute the entire
                                agreement between you and YULA
                            </li>
                            <li>
                                <strong>Severability:</strong> If any provision is invalid, the
                                remaining provisions remain in effect
                            </li>
                            <li>
                                <strong>No Waiver:</strong> Our failure to enforce a right does not
                                waive that right
                            </li>
                            <li>
                                <strong>Assignment:</strong> You may not assign these Terms; we may
                                assign them with notice
                            </li>
                            <li>
                                <strong>Force Majeure:</strong> We are not liable for failures due
                                to events beyond our control
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
                        <p className="text-muted-foreground mb-2">
                            For questions about these Terms:
                        </p>
                        <ul className="list-none space-y-2 text-muted-foreground">
                            <li>
                                <strong>Email:</strong> legal@yula.dev
                            </li>
                            <li>
                                <strong>Support:</strong> support@yula.dev
                            </li>
                            <li>
                                <strong>Website:</strong>{' '}
                                <Link href="/" className="text-primary hover:underline">
                                    yula.dev
                                </Link>
                            </li>
                        </ul>
                    </section>

                    <section className="mt-8 p-4 bg-muted/50 rounded-lg border border-border">
                        <p className="text-sm text-muted-foreground">
                            <strong>Important Notice:</strong> By using YULA, you acknowledge that
                            AI-generated content may be inaccurate, biased, or incomplete. YULA is a
                            tool to assist you, not a substitute for professional advice. Always
                            verify critical information and use your own judgment.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
