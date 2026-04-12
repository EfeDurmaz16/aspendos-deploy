export async function auth(): Promise<{
    userId: string | null;
    user: any;
    session: any;
} | null> {
    try {
        const { withAuth } = await import('@workos-inc/authkit-nextjs');
        const { user } = await withAuth();
        if (!user) return null;
        return {
            userId: user.id,
            user: {
                id: user.id,
                email: user.email,
                name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
                image: user.profilePictureUrl,
            },
            session: { id: user.id },
        };
    } catch {
        return null;
    }
}

export type Session = Awaited<ReturnType<typeof auth>>;
