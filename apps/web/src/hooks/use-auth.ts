'use client';

import { useEffect, useState } from 'react';

interface AuthState {
    user: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        imageUrl: string | null;
    } | null;
    loading: boolean;
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({ user: null, loading: true });

    useEffect(() => {
        fetch('/api/user')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => setState({ user: data?.user ?? null, loading: false }))
            .catch(() => setState({ user: null, loading: false }));
    }, []);

    return {
        isLoaded: !state.loading,
        isSignedIn: !!state.user,
        userId: state.user?.id ?? null,
        sessionId: state.user?.id ?? null,
        getToken: async () => null,
        signOut: async () => {
            window.location.href = '/login';
        },
    };
}

export function useUser() {
    const [state, setState] = useState<AuthState>({ user: null, loading: true });

    useEffect(() => {
        fetch('/api/user')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => setState({ user: data?.user ?? null, loading: false }))
            .catch(() => setState({ user: null, loading: false }));
    }, []);

    return {
        isLoaded: !state.loading,
        isSignedIn: !!state.user,
        user: state.user
            ? {
                  id: state.user.id,
                  firstName: state.user.firstName,
                  lastName: state.user.lastName,
                  fullName:
                      [state.user.firstName, state.user.lastName].filter(Boolean).join(' ') || null,
                  emailAddresses: state.user.email ? [{ emailAddress: state.user.email }] : [],
                  primaryEmailAddress: state.user.email ? { emailAddress: state.user.email } : null,
                  imageUrl: state.user.imageUrl,
              }
            : null,
    };
}
