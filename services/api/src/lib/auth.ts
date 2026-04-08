// TODO(phase-a-day-4): Better Auth fully removed — replaced by WorkOS AuthKit.
// See @workos-inc/authkit-nextjs. This file is a stub that keeps type-level
// compatibility with existing Hono middleware / index.ts until Day 4 rewires
// session verification to WorkOS.

type StubSession = {
    user: {
        id: string;
        email: string;
        name?: string | null;
        image?: string | null;
        tier?: string;
    };
    session: {
        id: string;
        expiresAt: Date | string;
    };
};

// TODO(phase-a-day-4): WorkOS withAuth() replaces auth.api.getSession(). The
// real export used to be the `betterAuth(...)` return value, which is both a
// request handler (`auth.handler(req)`) and a container for `auth.api.*`
// methods plus a `$Infer` type helper. We stub the same surface with `any`.
export const auth: any = {
    // TODO(phase-a-day-4): WorkOS route handler replaces this
    handler: async (_req: Request): Promise<Response> =>
        new Response(
            JSON.stringify({
                error: 'Auth temporarily unavailable',
                code: 'AUTH_MIGRATING',
                message: 'Better Auth removed. WorkOS AuthKit lands in Phase A Day 4.',
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        ),
    api: {
        // TODO(phase-a-day-4): WorkOS withAuth() replaces this
        getSession: async (_opts: { headers: Headers }): Promise<StubSession | null> => null,
    },
    // $Infer is a type-level helper in Better Auth used by Hono's Variables.
    // We expose it as `any` so `typeof auth.$Infer.Session.user` still type-checks.
    $Infer: {} as {
        Session: {
            user: StubSession['user'];
            session: StubSession['session'];
        };
    },
};
