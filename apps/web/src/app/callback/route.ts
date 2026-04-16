import { handleAuth } from '@workos-inc/authkit-nextjs';

export const GET = handleAuth({
    returnPathname: '/chat',
    async onSuccess({ user }) {
        if (!user || !process.env.NEXT_PUBLIC_CONVEX_URL) return;

        try {
            // Use raw HTTP to upsert user — avoids convex _generated import path issues
            const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
            const response = await fetch(`${convexUrl}/api/mutation`, {
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

            if (!response.ok) {
                console.error(
                    '[callback] Convex upsert failed:',
                    response.status,
                    await response.text()
                );
            }
        } catch (error) {
            console.error('[callback] Failed to upsert user in Convex:', error);
        }
    },
});
