import { handleAuth } from '@workos-inc/authkit-nextjs';

function getConvexServiceSecret() {
    const secret = process.env.CONVEX_SERVICE_SECRET;
    if (!secret) {
        throw new Error('CONVEX_SERVICE_SECRET is not configured');
    }
    return secret;
}

export const GET = handleAuth({
    returnPathname: '/chat',
    async onSuccess({ user }) {
        if (!user || !process.env.NEXT_PUBLIC_CONVEX_URL) return;
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/mutation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: 'users:upsertFromWorkOS',
                    args: {
                        service_secret: getConvexServiceSecret(),
                        workos_id: user.id,
                        email: user.email,
                        name:
                            [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
                        avatar_url: user.profilePictureUrl || undefined,
                    },
                }),
            });
            if (!response.ok) {
                throw new Error(`Convex upsert failed with status ${response.status}`);
            }
        } catch (error) {
            console.error('[callback] Convex upsert failed:', error);
        }
    },
});
