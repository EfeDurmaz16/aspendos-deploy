'use client';

import { useEffect } from 'react';

let posthog: any = null;

function getPostHog() {
    if (posthog) return posthog;
    if (typeof window === 'undefined') return null;
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;

    try {
        const ph = require('posthog-js');
        ph.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
            api_host: 'https://us.i.posthog.com',
            capture_pageview: false,
            capture_pageleave: true,
        });
        posthog = ph;
        return ph;
    } catch {
        return null;
    }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const ph = getPostHog();
        if (ph) {
            ph.capture('$pageview');
        }
    }, []);

    return <>{children}</>;
}

export function trackEvent(name: string, properties?: Record<string, any>) {
    const ph = getPostHog();
    if (ph) ph.capture(name, properties);
}

export function identifyUser(userId: string, traits?: Record<string, any>) {
    const ph = getPostHog();
    if (ph) ph.identify(userId, traits);
}
