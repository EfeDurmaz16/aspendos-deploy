'use client';

import { useUser as useClerkUser, useAuth as useClerkAuth } from '@clerk/nextjs';

export function useAuth() {
    const { isLoaded, isSignedIn, userId, sessionId, signOut } = useClerkAuth();

    return {
        isLoaded,
        isSignedIn: !!isSignedIn,
        userId: userId ?? null,
        sessionId: sessionId ?? null,
        getToken: async () => null,
        signOut: async () => {
            await signOut();
        },
    };
}

export function useUser() {
    const { isLoaded, isSignedIn, user } = useClerkUser();

    return {
        isLoaded,
        isSignedIn: !!isSignedIn,
        user: user
            ? {
                  id: user.id,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  fullName: user.fullName,
                  emailAddresses: user.emailAddresses,
                  primaryEmailAddress: user.primaryEmailAddress,
                  imageUrl: user.imageUrl,
              }
            : null,
    };
}
