import { handleAuth } from '@workos-inc/authkit-nextjs';
import { ConvexHttpClient } from 'convex/browser';

export const GET = handleAuth({
    returnPathname: '/chat',
    async onSuccess({ user }) {
        if (user && process.env.NEXT_PUBLIC_CONVEX_URL) {
            try {
                const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
                const { api } = await import('../../../../convex/_generated/api');

                await convex.mutation(api.users.upsertFromWorkOS, {
                    workos_id: user.id,
                    email: user.email,
                    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
                    avatar_url: user.profilePictureUrl || undefined,
                });
            } catch (error) {
                console.error('[callback] Failed to upsert user in Convex:', error);
            }
        }
    },
});
