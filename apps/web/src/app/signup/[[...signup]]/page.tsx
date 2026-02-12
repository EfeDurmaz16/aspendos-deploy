'use client';

import { CheckCircle, Lock, Warning } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { AtSignIcon, ChevronLeftIcon, Grid2x2PlusIcon, Loader2, UserIcon, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn, signUp } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export default function SignupPage() {
    const router = useRouter();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        try {
            await signUp.email({
                email,
                password,
                name: `${firstName} ${lastName}`.trim(),
                image: image ? await convertImageToBase64(image) : '',
                callbackURL: '/chat',
                fetchOptions: {
                    onResponse: () => setIsLoading(false),
                    onRequest: () => setIsLoading(true),
                    onError: (ctx) => {
                        toast.error(ctx.error.message);
                        setError(ctx.error.message);
                    },
                    onSuccess: () => {
                        setSuccess(true);
                        router.push('/chat');
                    },
                },
            });
        } catch {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialSignIn = async (provider: 'google' | 'github' | 'facebook' | 'apple') => {
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
                    <Grid2x2PlusIcon className="size-6 text-zinc-900 dark:text-zinc-100" />
                    <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                        Aspendos
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
                        <Grid2x2PlusIcon className="size-6 text-zinc-900 dark:text-zinc-100" />
                        <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                            Aspendos
                        </p>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <h1 className="font-heading text-2xl font-bold tracking-wide text-zinc-900 dark:text-zinc-50">
                            Create your account
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 text-base">
                            Start your journey with Aspendos.
                        </p>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            id="signup-error"
                            className="mb-4 flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg border border-rose-200 dark:border-rose-900"
                        >
                            <Warning className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div
                            role="status"
                            aria-live="polite"
                            className="mb-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900"
                        >
                            <CheckCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                            <span>Account created! Redirecting...</span>
                        </div>
                    )}

                    {/* Social Sign In Buttons */}
                    <div
                        className={cn(
                            'w-full gap-2 flex items-center',
                            'justify-between flex-wrap'
                        )}
                        role="group"
                        aria-label="Social sign up options"
                    >
                        <Button
                            variant="outline"
                            className="flex-grow"
                            disabled={isLoading}
                            onClick={() => handleSocialSignIn('google')}
                            aria-label="Sign up with Google"
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
                            <span className="sr-only">Sign up with Google</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-grow"
                            disabled={isLoading}
                            onClick={() => handleSocialSignIn('github')}
                            aria-label="Sign up with GitHub"
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
                            <span className="sr-only">Sign up with GitHub</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-grow"
                            disabled={isLoading}
                            onClick={() => handleSocialSignIn('facebook')}
                            aria-label="Sign up with Facebook"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="1em"
                                height="1em"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    d="M20 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h8.615v-6.96h-2.338v-2.725h2.338v-2c0-2.325 1.42-3.592 3.5-3.592c.699-.002 1.399.034 2.095.107v2.42h-1.435c-1.128 0-1.348.538-1.348 1.325v1.735h2.697l-.35 2.725h-2.348V21H20a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1z"
                                    fill="#1877F2"
                                ></path>
                            </svg>
                            <span className="sr-only">Sign up with Facebook</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-grow"
                            disabled={isLoading}
                            onClick={() => handleSocialSignIn('apple')}
                            aria-label="Sign up with Apple"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="1em"
                                height="1em"
                                viewBox="0 0 512 512"
                                aria-hidden="true"
                            >
                                <path
                                    fill="currentColor"
                                    d="M462.595 399.003c-7.743 17.888-16.908 34.353-27.527 49.492c-14.474 20.637-26.326 34.923-35.459 42.855c-14.159 13.021-29.329 19.69-45.573 20.068c-11.662 0-25.726-3.318-42.096-10.05c-16.425-6.7-31.519-10.019-45.32-10.019c-14.475 0-29.999 3.318-46.603 10.019c-16.63 6.731-30.027 10.24-40.27 10.587c-15.578.664-31.105-6.195-46.603-20.606c-9.892-8.628-22.265-23.418-37.088-44.372c-15.903-22.375-28.977-48.322-39.221-77.904c-10.969-31.952-16.469-62.892-16.469-92.846c0-34.313 7.414-63.906 22.265-88.706c11.672-19.92 27.199-35.633 46.631-47.169s40.431-17.414 63.043-17.79c12.373 0 28.599 3.827 48.762 11.349c20.107 7.547 33.017 11.375 38.677 11.375c4.232 0 18.574-4.475 42.887-13.397c22.992-8.274 42.397-11.7 58.293-10.35c43.076 3.477 75.438 20.457 96.961 51.05c-38.525 23.343-57.582 56.037-57.203 97.979c.348 32.669 12.199 59.855 35.491 81.44c10.555 10.019 22.344 17.762 35.459 23.26c-2.844 8.248-5.846 16.149-9.038 23.735zM363.801 10.242c0 25.606-9.355 49.514-28.001 71.643c-22.502 26.307-49.719 41.508-79.234 39.11a80 80 0 0 1-.594-9.703c0-24.582 10.701-50.889 29.704-72.398c9.488-10.89 21.554-19.946 36.187-27.17C336.464 4.608 350.275.672 363.264-.001c.379 3.423.538 6.846.538 10.242z"
                                />
                            </svg>
                            <span className="sr-only">Sign up with Apple</span>
                        </Button>
                    </div>

                    <AuthSeparator />

                    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Sign up form">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="firstName"
                                        className="text-muted-foreground text-start text-xs font-medium"
                                    >
                                        First Name
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="firstName"
                                            placeholder="Max"
                                            className="peer ps-9 bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500/20 focus:border-emerald-500"
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            required
                                            disabled={isLoading || success}
                                            autoComplete="given-name"
                                        />
                                        <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                                            <UserIcon className="size-4" aria-hidden="true" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="lastName"
                                        className="text-muted-foreground text-start text-xs font-medium"
                                    >
                                        Last Name
                                    </Label>
                                    <Input
                                        id="lastName"
                                        placeholder="Robinson"
                                        className="bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                        disabled={isLoading || success}
                                        autoComplete="family-name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="signupEmail"
                                    className="text-muted-foreground text-start text-xs font-medium"
                                >
                                    Email
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="signupEmail"
                                        placeholder="your.email@example.com"
                                        className="peer ps-9 bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isLoading || success}
                                        aria-invalid={!!error}
                                        aria-describedby={error ? 'signup-error' : undefined}
                                        autoComplete="email"
                                    />
                                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                                        <AtSignIcon className="size-4" aria-hidden="true" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="signupPassword"
                                    className="text-muted-foreground text-start text-xs font-medium"
                                >
                                    Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="signupPassword"
                                        placeholder="••••••••"
                                        className="peer ps-9 bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isLoading || success}
                                        minLength={8}
                                        autoComplete="new-password"
                                        aria-describedby="password-requirements"
                                    />
                                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                                        <Lock className="size-4" aria-hidden="true" />
                                    </div>
                                </div>
                                <p
                                    id="password-requirements"
                                    className="text-xs text-muted-foreground sr-only"
                                >
                                    Password must be at least 8 characters long
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="confirmPassword"
                                    className="text-muted-foreground text-start text-xs font-medium"
                                >
                                    Confirm Password
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
                                        disabled={isLoading || success}
                                        minLength={8}
                                        autoComplete="new-password"
                                    />
                                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                                        <Lock className="size-4" aria-hidden="true" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="image"
                                    className="text-muted-foreground text-xs font-medium"
                                >
                                    Profile Image (optional)
                                </Label>
                                <div className="flex items-end gap-4">
                                    {imagePreview && (
                                        <div className="relative w-16 h-16 rounded-sm overflow-hidden">
                                            <Image
                                                src={imagePreview}
                                                alt="Profile preview"
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 w-full">
                                        <Input
                                            id="image"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="w-full"
                                        />
                                        {imagePreview && (
                                            <X
                                                className="cursor-pointer"
                                                onClick={() => {
                                                    setImage(null);
                                                    setImagePreview(null);
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-lg"
                            disabled={isLoading || success}
                        >
                            {isLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                'Create your account'
                            )}
                        </Button>
                    </form>

                    <p className="text-zinc-500 dark:text-zinc-400 mt-8 text-sm text-center">
                        Already have an account?{' '}
                        <Link
                            href="/login"
                            className="font-medium text-zinc-900 dark:text-zinc-50 hover:underline underline-offset-4 decoration-emerald-500/50"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}

async function convertImageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
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
