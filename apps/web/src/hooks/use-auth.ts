'use client';

import { useAccessToken, useAuth as useWorkOSAuth } from '@workos-inc/authkit-nextjs/components';

export function useAuth() {
    const { loading, sessionId, signOut, user } = useWorkOSAuth();
    const { getAccessToken } = useAccessToken();

    return {
        isLoaded: !loading,
        isSignedIn: !!user,
        userId: user?.id ?? null,
        sessionId: sessionId ?? null,
        getToken: getAccessToken,
        signOut,
    };
}

export function useUser() {
    const { loading, user } = useWorkOSAuth();

    return {
        isLoaded: !loading,
        isSignedIn: !!user,
        user: user
            ? {
                  id: user.id,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
                  emailAddresses: user.email ? [{ emailAddress: user.email }] : [],
                  primaryEmailAddress: user.email ? { emailAddress: user.email } : null,
                  imageUrl: user.profilePictureUrl,
              }
            : null,
    };
}
