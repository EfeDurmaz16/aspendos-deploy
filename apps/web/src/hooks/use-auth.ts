'use client';

import { useEffect, useState } from 'react';

interface AuthState {
    user: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        profilePictureUrl: string | null;
    } | null;
    loading: boolean;
}

let cachedAuth: AuthState | null = null;

export function useAuth() {
    const [state, setState] = useState<AuthState>(cachedAuth ?? { user: null, loading: true });

    useEffect(() => {
        if (cachedAuth) return;

        (async () => {
            try {
                const { useAuth: workosUseAuth } = await import('@workos-inc/authkit-nextjs');
                const { user, loading } = workosUseAuth();
                const authState = { user, loading };
                cachedAuth = authState;
                setState(authState);
            } catch {
                setState({ user: null, loading: false });
            }
        })();
    }, []);

    return {
        isLoaded: !state.loading,
        isSignedIn: !!state.user,
        userId: state.user?.id ?? null,
        sessionId: state.user?.id ?? null,
        getToken: async () => null,
        signOut: async () => {
            try {
                const { signOut } = await import('@workos-inc/authkit-nextjs');
                await signOut();
            } catch {
                window.location.href = '/';
            }
        },
    };
}

export function useUser() {
    const { isLoaded, isSignedIn, userId } = useAuth();
    const [state] = useState<AuthState>(cachedAuth ?? { user: null, loading: !isLoaded });

    return {
        isLoaded,
        isSignedIn,
        user: state.user
            ? {
                  id: state.user.id,
                  firstName: state.user.firstName,
                  lastName: state.user.lastName,
                  fullName:
                      [state.user.firstName, state.user.lastName].filter(Boolean).join(' ') || null,
                  emailAddresses: state.user.email ? [{ emailAddress: state.user.email }] : [],
                  primaryEmailAddress: state.user.email ? { emailAddress: state.user.email } : null,
                  imageUrl: state.user.profilePictureUrl,
              }
            : null,
    };
}
