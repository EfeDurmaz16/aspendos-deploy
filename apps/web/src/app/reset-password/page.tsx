'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
    ChevronLeftIcon,
    Grid2x2PlusIcon,
    Loader2,
    KeyRound,
    Check,
    X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useMemo, Suspense } from 'react';
import { resetPassword } from '@/lib/auth-client';
import { Warning, CheckCircle, Lock } from '@phosphor-icons/react';

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Password strength validation
    const passwordChecks = useMemo(() => ({
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
    }), [password]);

    const passwordStrength = useMemo(() => {
        const passed = Object.values(passwordChecks).filter(Boolean).length;
        if (passed <= 1) return { label: 'Weak', color: 'text-rose-500', bg: 'bg-rose-500' };
        if (passed <= 2) return { label: 'Fair', color: 'text-amber-500', bg: 'bg-amber-500' };
        if (passed <= 3) return { label: 'Good', color: 'text-yellow-500', bg: 'bg-yellow-500' };
        return { label: 'Strong', color: 'text-emerald-500', bg: 'bg-emerald-500' };
    }, [passwordChecks]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        if (!token) {
            setError('Invalid or expired reset link');
            setIsLoading(false);
            return;
        }

        try {
            await resetPassword({
                newPassword: password,
                token,
            });
            setSuccess(true);
        } catch {
            setError('Failed to reset password. The link may have expired.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
            >
                <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                    <Warning className="h-8 w-8 text-rose-600 dark:text-rose-400" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                        Invalid Reset Link
                    </h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                        This password reset link is invalid or has expired.
                    </p>
                </div>

                <Button asChild className="w-full">
                    <Link href="/forgot-password">
                        Request a new link
                    </Link>
                </Button>
            </motion.div>
        );
    }

    return (
        <>
            {!success ? (
                <>
                    <div className="text-center space-y-2">
                        <h1 className="font-heading text-2xl font-bold tracking-wide text-zinc-900 dark:text-zinc-50">
                            Create new password
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                            Your new password must be different from previously used passwords.
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

                    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Reset password form">
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-muted-foreground text-start text-xs font-medium">
                                New Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    placeholder="••••••••"
                                    className="peer ps-9 bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                                <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                                    <Lock className="size-4" aria-hidden="true" />
                                </div>
                            </div>

                            {/* Password strength indicator */}
                            {password && (
                                <div className="space-y-2 mt-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                                            <div
                                                className={cn('h-full transition-all', passwordStrength.bg)}
                                                style={{
                                                    width: `${(Object.values(passwordChecks).filter(Boolean).length / 5) * 100}%`
                                                }}
                                            />
                                        </div>
                                        <span className={cn('text-xs font-medium', passwordStrength.color)}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 text-xs">
                                        <PasswordCheck passed={passwordChecks.length} label="8+ characters" />
                                        <PasswordCheck passed={passwordChecks.uppercase} label="Uppercase" />
                                        <PasswordCheck passed={passwordChecks.lowercase} label="Lowercase" />
                                        <PasswordCheck passed={passwordChecks.number} label="Number" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-muted-foreground text-start text-xs font-medium">
                                Confirm New Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    placeholder="••••••••"
                                    className="peer ps-9 bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                                <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                                    <Lock className="size-4" aria-hidden="true" />
                                </div>
                            </div>
                            {confirmPassword && password !== confirmPassword && (
                                <p className="text-xs text-rose-500">Passwords do not match</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-lg"
                            disabled={isLoading || password !== confirmPassword}
                        >
                            {isLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                'Reset Password'
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
                        <KeyRound className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                            Password reset successful
                        </h2>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                            Your password has been reset. You can now sign in with your new password.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900">
                        <CheckCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span>Your account is now secure.</span>
                    </div>

                    <Button asChild className="w-full">
                        <Link href="/login">
                            Continue to Sign In
                        </Link>
                    </Button>
                </motion.div>
            )}
        </>
    );
}

function PasswordCheck({ passed, label }: { passed: boolean; label: string }) {
    return (
        <div className={cn(
            'flex items-center gap-1',
            passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-600'
        )}>
            {passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            <span>{label}</span>
        </div>
    );
}

export default function ResetPasswordPage() {
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

                <Suspense fallback={<div className="text-center">Loading...</div>}>
                    <ResetPasswordContent />
                </Suspense>
            </motion.div>
        </main>
    );
}
