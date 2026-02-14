'use client';

import { ArrowLeft } from '@phosphor-icons/react';
import Link from 'next/link';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
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
                        <Button size="sm" variant="secondary" asChild>
                            <Link href="/login">Log in</Link>
                        </Button>
                    </nav>
                </div>
            </header>

            <div className="container max-w-4xl mx-auto py-12 px-6">
                <h1 className="text-4xl font-bold tracking-tight mb-4">Privacy Policy</h1>
                <p className="text-muted-foreground mb-8">Last updated: February 11, 2026</p>

                <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
                        <p className="text-muted-foreground">
                            Yula ("we", "our", or "us") is committed to protecting your privacy.
                            This Privacy Policy explains how we collect, use, disclose, and
                            safeguard your information when you use our AI chat platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
                        <h3 className="text-xl font-medium mb-3">Personal Information</h3>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>Email address and name (provided during account creation)</li>
                            <li>Profile image (optional)</li>
                            <li>Billing information (processed by our payment provider, Polar)</li>
                        </ul>

                        <h3 className="text-xl font-medium mb-3 mt-4">Usage Data</h3>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>Conversation history and chat messages</li>
                            <li>Imported chat history from other AI platforms (ChatGPT, Claude)</li>
                            <li>
                                Memory data and semantic embeddings stored for context retrieval
                            </li>
                            <li>Voice recordings (when using voice chat features)</li>
                            <li>Scheduled reminders and PAC notification preferences</li>
                            <li>Usage analytics (number of chats, models used, feature usage)</li>
                        </ul>

                        <h3 className="text-xl font-medium mb-3 mt-4">Technical Data</h3>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>IP address and browser information</li>
                            <li>Device type and operating system</li>
                            <li>Cookies and local storage data</li>
                            <li>Error logs and crash reports</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
                        <p className="text-muted-foreground mb-3">We process your data to:</p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                Provide AI chat services by sending your messages to AI providers
                                (OpenAI, Anthropic, Google, Groq)
                            </li>
                            <li>
                                Maintain conversation context using memory embeddings in our Qdrant
                                vector database
                            </li>
                            <li>
                                Send proactive AI callbacks (PAC notifications) based on your
                                scheduled reminders
                            </li>
                            <li>Process billing and subscription management through Polar</li>
                            <li>Improve service quality through anonymized usage analytics</li>
                            <li>Provide customer support and respond to inquiries</li>
                            <li>Detect and prevent fraud or abuse</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">Third-Party Processors</h2>
                        <p className="text-muted-foreground mb-3">
                            We share data with the following service providers:
                        </p>

                        <h3 className="text-xl font-medium mb-3 mt-4">AI Model Providers</h3>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                <strong>OpenAI</strong> - GPT-4o and GPT-4o Mini models
                            </li>
                            <li>
                                <strong>Anthropic</strong> - Claude 3.5 Sonnet and Claude 3 Opus
                                models
                            </li>
                            <li>
                                <strong>Google</strong> - Gemini 2.0 Flash model
                            </li>
                            <li>
                                <strong>Groq</strong> - Llama 3.3 70B model for fast routing
                            </li>
                        </ul>
                        <p className="text-sm text-muted-foreground mt-2 italic">
                            Your messages are sent to these providers to generate AI responses. We
                            do not allow these providers to train on your data.
                        </p>

                        <h3 className="text-xl font-medium mb-3 mt-4">Infrastructure Providers</h3>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                <strong>Vercel</strong> - Web hosting and deployment
                            </li>
                            <li>
                                <strong>Railway</strong> - API server hosting
                            </li>
                            <li>
                                <strong>Qdrant</strong> - Vector database for memory storage
                            </li>
                            <li>
                                <strong>Supabase</strong> - PostgreSQL database
                            </li>
                        </ul>

                        <h3 className="text-xl font-medium mb-3 mt-4">Payment & Analytics</h3>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                <strong>Polar</strong> - Subscription billing and payment processing
                            </li>
                            <li>
                                <strong>Sentry</strong> - Error tracking and monitoring
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">
                            We Do NOT Train on Your Data
                        </h2>
                        <p className="text-muted-foreground">
                            <strong>Important:</strong> Yula does not use your conversations,
                            imported history, or memory data to train AI models. While we send your
                            messages to third-party AI providers (OpenAI, Anthropic, Google, Groq)
                            to generate responses, we have contractual agreements with these
                            providers that prohibit training on user data.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                <strong>Chat History:</strong> Retained while your account is
                                active, or until you manually delete conversations
                            </li>
                            <li>
                                <strong>Memory Embeddings:</strong> Stored indefinitely to provide
                                context across conversations, unless deleted via settings
                            </li>
                            <li>
                                <strong>Billing Records:</strong> Retained for 7 years for tax
                                compliance
                            </li>
                            <li>
                                <strong>Account Data:</strong> Deleted within 30 days of account
                                deletion request
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">Your Rights (GDPR)</h2>
                        <p className="text-muted-foreground mb-3">
                            Under GDPR, you have the right to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                <strong>Access:</strong> Request a copy of your data (available in
                                Settings &gt; Data Export)
                            </li>
                            <li>
                                <strong>Rectification:</strong> Update your profile and settings at
                                any time
                            </li>
                            <li>
                                <strong>Erasure (Right to be Forgotten):</strong> Delete your
                                account and all associated data (Settings &gt; Data &gt; Delete
                                Account)
                            </li>
                            <li>
                                <strong>Data Portability:</strong> Export your chat history and
                                memory data in JSON format
                            </li>
                            <li>
                                <strong>Restriction:</strong> Disable memory storage or specific
                                features via settings
                            </li>
                            <li>
                                <strong>Objection:</strong> Opt out of analytics sharing in Privacy
                                settings
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">Cookies & Local Storage</h2>
                        <p className="text-muted-foreground mb-3">
                            We use cookies and browser local storage for:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>
                                <strong>Essential:</strong> Authentication tokens and session
                                management (required)
                            </li>
                            <li>
                                <strong>Preferences:</strong> Theme settings, language, and UI
                                preferences
                            </li>
                            <li>
                                <strong>Analytics:</strong> Anonymous usage tracking (can be
                                disabled in settings)
                            </li>
                        </ul>
                        <p className="text-sm text-muted-foreground mt-2">
                            We do not use third-party advertising cookies.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">Security</h2>
                        <p className="text-muted-foreground">
                            We implement industry-standard security measures including encryption in
                            transit (TLS 1.3), encryption at rest for database storage, role-based
                            access control, and regular security audits. However, no method of
                            transmission over the Internet is 100% secure.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">International Transfers</h2>
                        <p className="text-muted-foreground">
                            Your data may be processed in the United States and other countries
                            where our service providers operate. We ensure appropriate safeguards
                            are in place through Standard Contractual Clauses (SCCs) and
                            GDPR-compliant data processing agreements.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
                        <p className="text-muted-foreground">
                            Yula is not intended for users under 16 years of age. We do not
                            knowingly collect personal information from children. If you believe we
                            have inadvertently collected data from a child, please contact us
                            immediately.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
                        <p className="text-muted-foreground">
                            We may update this Privacy Policy from time to time. We will notify you
                            of significant changes via email or in-app notification. Continued use
                            of Yula after changes constitutes acceptance of the updated policy.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
                        <p className="text-muted-foreground mb-2">
                            For privacy-related questions, data requests, or to exercise your GDPR
                            rights:
                        </p>
                        <ul className="list-none space-y-2 text-muted-foreground">
                            <li>
                                <strong>Email:</strong> privacy@yula.dev
                            </li>
                            <li>
                                <strong>Data Protection Officer:</strong> dpo@yula.dev
                            </li>
                            <li>
                                <strong>Mailing Address:</strong> Yula OS, Inc., [Address to be
                                provided]
                            </li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}
