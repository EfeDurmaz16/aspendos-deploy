'use client';

import { CheckCircle, Warning } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { Loader2, Mail, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { sendVerificationEmail, useSession } from '@/lib/auth-client';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const email = searchParams.get('email') || session?.user?.email || '';
    const verified = searchParams.get('verified') === 'true';

    // Cooldown timer for resend
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    // If already verified, show success
    useEffect(() => {
        if (verified) {
            setSuccess(true);
        }
    }, [verified]);

    const handleResend = useCallback(async () => {
        if (resendCooldown > 0 || !email) return;

        setIsLoading(true);
        setError(null);

        try {
            await sendVerificationEmail({
                email,
                callbackURL: '/verify-email?verified=true',
            });
            setResendCooldown(60);
        } catch {
            setError('Failed to send verification email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [email, resendCooldown]);

    if (success || verified) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
            >
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle
                        className="h-8 w-8 text-emerald-600 dark:text-emerald-400"
                        weight="fill"
                    />
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                        Email verified!
                    </h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                        Your email has been verified successfully. You can now enjoy all Yula
                        features.
                    </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span>Your account is now fully activated.</span>
                </div>

                <Button onClick={() => router.push('/chat')} className="w-full">
                    Continue to Yula
                </Button>
            </motion.div>
        );
    }

    return (
        <>
            <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>

                <div className="space-y-2">
                    <h1 className="font-heading text-2xl font-bold tracking-wide text-zinc-900 dark:text-zinc-50">
                        Verify your email
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                        We've sent a verification link to{' '}
                        {email && (
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                {email}
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {error && (
                <div
                    role="alert"
                    aria-live="assertive"
                    className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg border border-rose-200 dark:border-rose-900"
                >
                    <Warning className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                </div>
            )}

            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 space-y-3 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 text-xs font-medium text-blue-600 dark:text-blue-400">
                        1
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Check your email inbox for the verification link
                    </p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 text-xs font-medium text-blue-600 dark:text-blue-400">
                        2
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Click the link to verify your email address
                    </p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 text-xs font-medium text-blue-600 dark:text-blue-400">
                        3
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        If you don't see it, check your spam folder
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <Button
                    onClick={handleResend}
                    variant="outline"
                    className="w-full"
                    disabled={isLoading || resendCooldown > 0}
                >
                    {isLoading ? (
                        <Loader2 size={16} className="animate-spin mr-2" />
                    ) : (
                        <RefreshCw size={16} className="mr-2" />
                    )}
                    {resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : 'Resend verification email'}
                </Button>

                <Button variant="ghost" asChild className="w-full">
                    <Link href="/login">Back to login</Link>
                </Button>
            </div>

            <p className="text-zinc-400 dark:text-zinc-500 text-xs text-center">
                Having trouble? Contact us at{' '}
                <a
                    href="mailto:support@yula.dev"
                    className="text-zinc-600 dark:text-zinc-300 hover:underline"
                >
                    support@yula.dev
                </a>
            </p>
        </>
    );
}

export default function VerifyEmailPage() {
    return (
        <main className="relative min-h-screen flex items-center justify-center p-4">
            <div aria-hidden className="absolute inset-0 isolate contain-strict -z-10 opacity-60">
                <div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)] absolute top-0 right-0 h-320 w-140 -translate-y-87.5 rounded-full" />
                <div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 right-0 h-320 w-60 [translate:5%_-50%] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-6"
            >
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="size-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-white dark:text-zinc-900">Y</span>
                    </div>
                    <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Yula</p>
                </div>

                <Suspense fallback={<div className="text-center">Loading...</div>}>
                    <VerifyEmailContent />
                </Suspense>
            </motion.div>
        </main>
    );
}
