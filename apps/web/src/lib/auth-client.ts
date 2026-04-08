// TODO(phase-a-day-4): Better Auth client fully removed — replaced by WorkOS
// AuthKit. See @workos-inc/authkit-nextjs. This file is a stub that keeps
// type-level compatibility with existing login/signup/passkey/forgot-password
// pages until Day 4 wires the real WorkOS client.

'use client';

const notImplemented = (name: string) => {
    throw new Error(
        `[auth-client] ${name} is not wired. Better Auth removed; WorkOS AuthKit lands in Phase A Day 4.`
    );
};

// TODO(phase-a-day-4): WorkOS useAuth() replaces this hook
export function useSession(): {
    data: null;
    isPending: boolean;
    error: null;
} {
    return { data: null, isPending: false, error: null };
}

// TODO(phase-a-day-4): WorkOS signOut equivalent replaces this
export async function signOut(_opts?: any): Promise<void> {
    notImplemented('signOut');
}

// TODO(phase-a-day-4): WorkOS sign-in equivalents replace these. Existing
// callers use `signIn.email({...})`, `signIn.passkey({...})`,
// `signIn.social({ provider, callbackURL })`.
export const signIn: any = new Proxy(
    {},
    {
        get(_t, prop: string) {
            return async (_args?: any) => {
                notImplemented(`signIn.${prop}`);
            };
        },
    }
);

// TODO(phase-a-day-4): WorkOS sign-up equivalent replaces this
export const signUp: any = new Proxy(
    {},
    {
        get(_t, prop: string) {
            return async (_args?: any) => {
                notImplemented(`signUp.${prop}`);
            };
        },
    }
);

// TODO(phase-a-day-4): WorkOS replaces Better Auth's passkey add/remove flows
export const passkey: any = new Proxy(
    {},
    {
        get(_t, prop: string) {
            return async (_args?: any) => {
                notImplemented(`passkey.${prop}`);
            };
        },
    }
);

// TODO(phase-a-day-4): WorkOS replaces Better Auth's forgot/reset password flow
export async function forgetPassword(_args?: any): Promise<any> {
    notImplemented('forgetPassword');
}

export async function resetPassword(_args?: any): Promise<any> {
    notImplemented('resetPassword');
}

export async function sendVerificationEmail(_args?: any): Promise<any> {
    notImplemented('sendVerificationEmail');
}

export async function verifyEmail(_args?: any): Promise<any> {
    notImplemented('verifyEmail');
}

// TODO(phase-a-day-4): Polar checkout flow — purger-polar will remove the
// @polar-sh/better-auth plugin that once backed this export. During the
// Phase A Day 1 purge window, the pricing page import resolves to this stub.
export async function checkout(_args?: any): Promise<any> {
    notImplemented('checkout');
}

// Default export mirrors the former createAuthClient() return value shape.
const authClient: any = new Proxy(
    {},
    {
        get(_t, prop: string) {
            if (prop === 'useSession') return useSession;
            if (prop === 'signIn') return signIn;
            if (prop === 'signUp') return signUp;
            if (prop === 'signOut') return signOut;
            if (prop === 'passkey') return passkey;
            return () => notImplemented(String(prop));
        },
    }
);

export default authClient;
