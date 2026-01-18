import { polarClient } from '@polar-sh/better-auth';
import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth Client for Aspendos
 * Connects to the Better Auth API running on the backend.
 * Includes Polar plugin for checkout and subscription management.
 */
export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    plugins: [polarClient()],
});

export const {
    signIn,
    signUp,
    signOut,
    useSession,
    getSession,
    // Polar checkout functions
    checkout,
    customerPortal,
} = authClient;

export type Session = typeof authClient.$Infer.Session;
export type User = Session['user'];
