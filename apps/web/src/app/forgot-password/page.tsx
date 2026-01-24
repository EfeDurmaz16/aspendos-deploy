'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
    AtSignIcon,
    ChevronLeftIcon,
    Grid2x2PlusIcon,
    Loader2,
    Mail,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useState } from 'react';
import { forgetPassword } from '@/lib/auth-client';
import { Warning, CheckCircle } from '@phosphor-icons/react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await forgetPassword({
                email,
                redirectTo: '/reset-password',
            });
            setSuccess(true);
        } catch {
            setError('Failed to send reset link. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen flex items-center justify-center p-4">
            <div
                aria-hidden
                className="absolute inset-0 isolate contain-strict -z-10 opacity-60"
            >
                <div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)] absolute top-0 right-0 h-320 w-140 -translate-y-87.5 rounded-full" />
                <div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 right-0 h-320 w-60 [translate:5%_-50%] rounded-full" />
            </div>

            <Button variant="ghost" className="absolute top-7 left-5 text-zinc-600 dark:text-zinc-400" asChild>
                <Link href="/login">
                    <ChevronLeftIcon className='size-4 me-2' />
                    Back to login
                </Link>
            </Button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-6"
            >
                <div className="flex items-center justify-center gap-2 mb-8">
                    <Grid2x2PlusIcon className="size-6 text-zinc-900 dark:text-zinc-100" />
                    <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">YULA</p>
                </div>

                {!success ? (
                    <>
                        <div className="text-center space-y-2">
                            <h1 className="font-heading text-2xl font-bold tracking-wide text-zinc-900 dark:text-zinc-50">
                                Reset your password
                            </h1>
                            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                                Enter your email address and we'll send you a link to reset your password.
                            </p>
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

                        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Forgot password form">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-muted-foreground text-start text-xs font-medium">
                                    Email
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="email"
                                        placeholder="your.email@example.com"
                                        className="peer ps-9 bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        autoComplete="email"
                                    />
                                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                                        <AtSignIcon className="size-4" aria-hidden="true" />
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-lg"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    'Send Reset Link'
                                )}
                            </Button>
                        </form>
                    </>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-4"
                    >
                        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Mail className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                                Check your email
                            </h2>
                            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                                We've sent a password reset link to{' '}
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900">
                            <CheckCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                            <span>If you don't see the email, check your spam folder.</span>
                        </div>

                        <div className="pt-4 space-y-3">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setSuccess(false)}
                            >
                                Try a different email
                            </Button>
                            <Button variant="ghost" asChild className="w-full">
                                <Link href="/login">
                                    Back to login
                                </Link>
                            </Button>
                        </div>
                    </motion.div>
                )}

                <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center">
                    Remember your password?{' '}
                    <Link
                        href="/login"
                        className="font-medium text-zinc-900 dark:text-zinc-50 hover:underline underline-offset-4 decoration-emerald-500/50"
                    >
                        Sign in
                    </Link>
                </p>
            </motion.div>
        </main>
    );
}
