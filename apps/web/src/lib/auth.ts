// TODO(phase-a-day-4): Better Auth fully removed — replaced by WorkOS AuthKit.
// See @workos-inc/authkit-nextjs. This file is a stub that keeps type-level
// compatibility with existing call sites until Day 4 rewires everything to
// `withAuth()` from WorkOS.
//
// All previously exported symbols are preserved as `any` stubs so that
// TypeScript keeps compiling. Do NOT add new call sites to these stubs.

// TODO(phase-a-day-4): replaced by WorkOS AuthKit — the actual Better Auth
// instance (email/password, social, passkey, Polar plugin) lived here. Its
// behavior will be reimplemented against WorkOS in Day 4.
export const authInstance: any = new Proxy(
    {},
    {
        get() {
            throw new Error(
                '[auth] Better Auth removed. WorkOS AuthKit wiring lands in Phase A Day 4.'
            );
        },
    }
);

/**
 * TODO(phase-a-day-4): WorkOS withAuth() replaces this.
 *
 * Returns the shape `{ userId, user, session }` that existing server
 * components / API routes destructure. For now every call returns null so
 * that auth-gated routes no-op gracefully during the purge window.
 */
export async function auth(): Promise<{
    userId: string | null;
    user: any;
    session: any;
} | null> {
    // TODO(phase-a-day-4): WorkOS withAuth() replaces this
    return null;
}

export type Session = Awaited<ReturnType<typeof auth>>;
