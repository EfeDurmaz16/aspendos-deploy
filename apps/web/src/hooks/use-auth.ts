'use client';

import { useSession as useBetterAuthSession } from '@/lib/auth-client';

export function useAuth() {
    const session = useBetterAuthSession();
    return {
        isLoaded: true,
        isSignedIn: !!session.data?.user,
        userId: session.data?.user?.id ?? null,
        sessionId: session.data?.session?.id ?? null,
        getToken: async () => null,
    };
}

export function useUser() {
    const session = useBetterAuthSession();
    return {
        isLoaded: true,
        isSignedIn: !!session.data?.user,
        user: session.data?.user
            ? {
                  id: session.data.user.id,
                  firstName: session.data.user.name?.split(' ')[0] ?? null,
                  lastName: session.data.user.name?.split(' ').slice(1).join(' ') || null,
                  fullName: session.data.user.name ?? null,
                  emailAddresses: session.data.user.email
                      ? [{ emailAddress: session.data.user.email }]
                      : [],
                  primaryEmailAddress: session.data.user.email
                      ? { emailAddress: session.data.user.email }
                      : null,
                  imageUrl: session.data.user.image ?? null,
              }
            : null,
    };
}
