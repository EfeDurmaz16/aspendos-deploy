"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function CookieConsent() {
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent-accepted');
        if (!consent) {
            setShowBanner(true);
        }
    }, []);

    const acceptCookies = () => {
        localStorage.setItem('cookie-consent-accepted', 'true');
        setShowBanner(false);
    };

    if (!showBanner) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t p-4 shadow-lg">
            <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                    We use cookies to improve your experience. By continuing, you agree to our{" "}
                    <Link href="/privacy" className="underline hover:text-primary">
                        Privacy Policy
                    </Link>
                    .
                </p>
                <Button onClick={acceptCookies} size="sm" className="shrink-0">
                    Accept
                </Button>
            </div>
        </div>
    );
}
