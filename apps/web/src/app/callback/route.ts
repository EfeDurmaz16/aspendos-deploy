import { handleAuth } from '@workos-inc/authkit-nextjs';

export const GET = handleAuth({
    returnPathname: '/chat',
    async onSuccess({ user }) {
        if (!user || !process.env.NEXT_PUBLIC_CONVEX_URL) return;
        try {
            await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/mutation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: 'users:upsertFromWorkOS',
                    args: {
                        workos_id: user.id,
                        email: user.email,
                        name:
                            [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
                        avatar_url: user.profilePictureUrl || undefined,
                    },
                }),
            });
        } catch (error) {
            console.error('[callback] Convex upsert failed:', error);
        }
    },
});
