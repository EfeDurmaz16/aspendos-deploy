import { auth as clerkAuth, currentUser } from '@clerk/nextjs/server';

export async function auth(): Promise<{
    userId: string | null;
    user: any;
    session: any;
} | null> {
    try {
        const { userId } = await clerkAuth();
        if (!userId) return null;

        const user = await currentUser();
        if (!user) return null;

        return {
            userId: user.id,
            user: {
                id: user.id,
                email: user.emailAddresses[0]?.emailAddress,
                name: [user.firstName, user.lastName].filter(Boolean).join(' '),
                image: user.imageUrl,
            },
            session: { id: userId },
        };
    } catch {
        return null;
    }
}

export type Session = Awaited<ReturnType<typeof auth>>;
