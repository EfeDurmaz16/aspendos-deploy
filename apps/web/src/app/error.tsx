'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error to console for debugging
        console.error('Error boundary caught:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Error Icon */}
                <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                        <svg
                            className="w-8 h-8 text-destructive"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                </div>

                {/* Error Message */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold font-[var(--font-playfair)] text-foreground">
                        Something went wrong
                    </h1>
                    <p className="text-muted-foreground">
                        An unexpected error occurred. Please try again or return to the home page.
                    </p>
                    {error.digest && (
                        <p className="text-xs text-muted-foreground font-mono">
                            Error ID: {error.digest}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={reset} variant="primary" size="default">
                        Try Again
                    </Button>
                    <Button asChild variant="secondary" size="default">
                        <Link href="/">Go Home</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
