'use client';

// TODO(phase-a-day-4): WorkOS useAuth() replaces this. The Better Auth client
// hooks (useSession / signOut) were removed in the Phase A Day 1 purge — this
// module preserves the public shape that apps/web consumes (useAuth / useUser
// with Clerk-like fields) so components keep compiling. Day 4 will wire these
// to @workos-inc/authkit-nextjs.
import { signOut as authClientSignOut, useSession } from '@/lib/auth-client';

export function useAuth() {
    // TODO(phase-a-day-4): WorkOS useAuth() replaces this
    const session = useSession();
    return {
        isLoaded: !session.isPending,
        isSignedIn: !!(session.data as any)?.user,
        userId: (session.data as any)?.user?.id ?? null,
        sessionId: (session.data as any)?.session?.id ?? null,
        getToken: async () => null,
        signOut: async () => {
            await authClientSignOut();
        },
    };
}

export function useUser() {
    // TODO(phase-a-day-4): WorkOS useUser() (or equivalent) replaces this
    const session = useSession();
    const data = session.data as any;
    return {
        isLoaded: true,
        isSignedIn: !!data?.user,
        user: data?.user
            ? {
                  id: data.user.id,
                  firstName: data.user.name?.split(' ')[0] ?? null,
                  lastName: data.user.name?.split(' ').slice(1).join(' ') || null,
                  fullName: data.user.name ?? null,
                  emailAddresses: data.user.email ? [{ emailAddress: data.user.email }] : [],
                  primaryEmailAddress: data.user.email ? { emailAddress: data.user.email } : null,
                  imageUrl: data.user.image ?? null,
              }
            : null,
    };
}
