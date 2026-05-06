'use client';

import {
    AuthKitProvider,
    useAccessToken,
    useAuth as useWorkOSAuth,
} from '@workos-inc/authkit-nextjs/components';
import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react';
import type { ReactNode } from 'react';

const convex = process.env.NEXT_PUBLIC_CONVEX_URL
    ? new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL)
    : null;

function useConvexWorkOSAuth() {
    const { loading, user } = useWorkOSAuth();
    const { getAccessToken, refresh } = useAccessToken();

    return {
        isLoading: loading,
        isAuthenticated: !!user,
        fetchAccessToken: async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
            const token = forceRefreshToken ? await refresh() : await getAccessToken();
            return token ?? null;
        },
    };
}

function ConvexAuthBridge({ children }: { children: ReactNode }) {
    if (!convex) return <>{children}</>;
    return (
        <ConvexProviderWithAuth client={convex} useAuth={useConvexWorkOSAuth}>
            {children}
        </ConvexProviderWithAuth>
    );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
    return (
        <AuthKitProvider>
            <ConvexAuthBridge>{children}</ConvexAuthBridge>
        </AuthKitProvider>
    );
}
