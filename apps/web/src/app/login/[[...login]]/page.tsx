'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('returnTo') || '/chat';

    useEffect(() => {
        // WorkOS AuthKit handles login — redirect to AuthKit sign-in
        window.location.href = `/api/auth?screen_hint=sign-in&returnPathname=${encodeURIComponent(returnTo)}`;
    }, [returnTo]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
                <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center mx-auto">
                    <span className="text-background text-sm font-bold">Y</span>
                </div>
                <p className="text-sm text-muted-foreground">Redirecting to sign in...</p>
            </div>
        </div>
    );
}
