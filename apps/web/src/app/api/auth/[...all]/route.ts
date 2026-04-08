export const dynamic = 'force-dynamic';

// TODO(phase-a-day-4): replaced by WorkOS AuthKit — see @workos-inc/authkit-nextjs.
// This catch-all previously mounted Better Auth's toNextJsHandler(authInstance).
// During the Phase A Day 1 purge we return 503 so nothing silently succeeds;
// Day 4 will replace this with the WorkOS callback/session handler.

function purged() {
    return Response.json(
        {
            error: 'Auth temporarily unavailable',
            code: 'AUTH_MIGRATING',
            message: 'Better Auth removed. WorkOS AuthKit lands in Phase A Day 4.',
        },
        { status: 503 }
    );
}

export async function GET(_req: Request) {
    return purged();
}

export async function POST(_req: Request) {
    return purged();
}
