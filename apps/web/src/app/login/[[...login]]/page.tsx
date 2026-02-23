'use client';

import { Lock, Warning } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { AtSignIcon, ChevronLeftIcon, Key, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await signIn.email({
                email,
                password,
                rememberMe,
                fetchOptions: {
                    onRequest: () => setIsLoading(true),
                    onResponse: () => setIsLoading(false),
                },
            });
            if (result.error) {
                const status = (result.error as { status?: number }).status ?? 0;
                if (status >= 500) {
                    setError('Service temporarily unavailable. Please try again in a moment.');
                } else {
                    setError(result.error.message || 'Invalid email or password');
                }
                return;
            }
            router.push('/chat');
        } catch {
            setError('Unable to connect. Please check your internet and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasskeySignIn = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await signIn.passkey({
                fetchOptions: {
                    onRequest: () => setIsLoading(true),
                    onResponse: () => setIsLoading(false),
                },
            });
            router.push('/chat');
        } catch {
            setError('Passkey authentication failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialSignIn = async (provider: 'google' | 'github') => {
        setIsLoading(true);
        setError(null);
        try {
            await signIn.social({
                provider,
                callbackURL: '/chat',
                fetchOptions: {
                    onRequest: () => setIsLoading(true),
                    onResponse: () => setIsLoading(false),
                },
            });
        } catch {
            setError(`${provider} sign-in failed.`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
            <div className="bg-muted/60 relative hidden h-full flex-col border-r p-10 lg:flex">
                <div className="from-background absolute inset-0 z-10 bg-gradient-to-t to-transparent" />
                <div className="z-10 flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-white dark:text-zinc-900">Y</span>
                    </div>
                    <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                        Yula
                    </p>
                </div>
                <div className="z-10 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-xl text-zinc-800 dark:text-zinc-200">
                            &ldquo;This Platform has helped me to save time and serve my clients
                            faster than ever before.&rdquo;
                        </p>
                        <footer className="font-mono text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                            ~ Ali Hassan
                        </footer>
                    </blockquote>
                </div>
                <div className="absolute inset-0">
                    <FloatingPaths position={1} />
                    <FloatingPaths position={-1} />
                </div>
            </div>
            <div className="relative flex min-h-screen flex-col justify-center p-4">
                <div
                    aria-hidden
                    className="absolute inset-0 isolate contain-strict -z-10 opacity-60"
                >
                    <div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)] absolute top-0 right-0 h-320 w-140 -translate-y-87.5 rounded-full" />
                    <div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 right-0 h-320 w-60 [translate:5%_-50%] rounded-full" />
                    <div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 right-0 h-320 w-60 -translate-y-87.5 rounded-full" />
                </div>
                <Button
                    variant="ghost"
                    className="absolute top-7 left-5 text-zinc-600 dark:text-zinc-400"
                    asChild
                >
                    <Link href="/">
                        <ChevronLeftIcon className="size-4 me-2" />
                        Home
                    </Link>
                </Button>
                <div className="mx-auto space-y-4 sm:w-sm w-full max-w-md">
                    <div className="flex items-center gap-2 lg:hidden mb-8">
                        <div className="size-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                            <span className="text-sm font-bold text-white dark:text-zinc-900">Y</span>
                        </div>
                        <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                            Yula
                        </p>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <h1 className="font-heading text-2xl font-bold tracking-wide text-zinc-900 dark:text-zinc-50">
                            Welcome back
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 text-base">
                            Sign in to continue to Yula.
                        </p>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="mb-4 flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg border border-rose-200 dark:border-rose-900"
                        >
                            <Warning className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Social Sign In Buttons */}
                    <div
                        className={cn(
                            'w-full gap-2 flex items-center',
                            'justify-between flex-wrap'
                        )}
                        role="group"
                        aria-label="Social sign in options"
                    >
                        <Button
                            variant="outline"
                            className="flex-grow"
                            disabled={isLoading}
                            onClick={() => handleSocialSignIn('google')}
                            aria-label="Sign in with Google"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="1em"
                                height="1em"
                                viewBox="0 0 256 262"
                                aria-hidden="true"
                            >
                                <path
                                    fill="#4285F4"
                                    d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                                ></path>
                                <path
                                    fill="#34A853"
                                    d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                                ></path>
                                <path
                                    fill="#FBBC05"
                                    d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
                                ></path>
                                <path
                                    fill="#EB4335"
                                    d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                                ></path>
                            </svg>
                            <span className="sr-only">Sign in with Google</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-grow"
                            disabled={isLoading}
                            onClick={() => handleSocialSignIn('github')}
                            aria-label="Sign in with GitHub"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="1em"
                                height="1em"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    fill="currentColor"
                                    d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
                                ></path>
                            </svg>
                            <span className="sr-only">Sign in with GitHub</span>
                        </Button>
                    </div>

                    <AuthSeparator />

                    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Sign in form">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="email"
                                    className="text-muted-foreground text-start text-xs font-medium"
                                >
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
                                        aria-invalid={!!error}
                                        aria-describedby={error ? 'login-error' : undefined}
                                        autoComplete="email"
                                    />
                                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                                        <AtSignIcon className="size-4" aria-hidden="true" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label
                                        htmlFor="password"
                                        className="text-muted-foreground text-start text-xs font-medium"
                                    >
                                        Password
                                    </Label>
                                    <Link
                                        href="#"
                                        className="text-xs text-muted-foreground hover:underline"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
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
                                        aria-invalid={!!error}
                                        autoComplete="current-password"
                                    />
                                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                                        <Lock className="size-4" aria-hidden="true" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="remember"
                                checked={rememberMe}
                                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                            />
                            <Label htmlFor="remember" className="text-sm text-muted-foreground">
                                Remember me
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-lg"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
                        </Button>

                        <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            className="w-full gap-2"
                            disabled={isLoading}
                            onClick={handlePasskeySignIn}
                        >
                            <Key size={16} />
                            Sign in with Passkey
                        </Button>
                    </form>

                    <p className="text-zinc-500 dark:text-zinc-400 mt-8 text-sm text-center">
                        Don&apos;t have an account?{' '}
                        <Link
                            href="/signup"
                            className="font-medium text-zinc-900 dark:text-zinc-50 hover:underline underline-offset-4 decoration-emerald-500/50"
                        >
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}

function FloatingPaths({ position }: { position: number }) {
    const paths = Array.from({ length: 36 }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
            380 - i * 5 * position
        } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
            152 - i * 5 * position
        } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
            684 - i * 5 * position
        } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
        color: `rgba(15,23,42,${0.1 + i * 0.03})`,
        width: 0.5 + i * 0.03,
    }));

    return (
        <div className="pointer-events-none absolute inset-0">
            <svg
                className="h-full w-full text-zinc-900/10 dark:text-white/10"
                viewBox="0 0 696 316"
                fill="none"
            >
                <title>Background Paths</title>
                {paths.map((path) => (
                    <motion.path
                        key={path.id}
                        d={path.d}
                        stroke="currentColor"
                        strokeWidth={path.width}
                        strokeOpacity={0.1 + path.id * 0.03}
                        initial={{ pathLength: 0.3, opacity: 0.6 }}
                        animate={{
                            pathLength: 1,
                            opacity: [0.3, 0.6, 0.3],
                            pathOffset: [0, 1, 0],
                        }}
                        transition={{
                            duration: 20 + Math.random() * 10,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: 'linear',
                        }}
                    />
                ))}
            </svg>
        </div>
    );
}

const AuthSeparator = () => {
    return (
        <div className="flex w-full items-center justify-center">
            <div className="bg-border h-px w-full" />
            <span className="text-muted-foreground px-2 text-xs">OR</span>
            <div className="bg-border h-px w-full" />
        </div>
    );
};
