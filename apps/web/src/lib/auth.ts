import { cookies, headers } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Session {
    userId: string;
    user: { id: string; email: string; name: string | null; image: string | null };
    session: { id: string; expiresAt: Date };
}

export async function auth(): Promise<Session | null> {
    try {
        const cookieStore = await cookies();
        const headerStore = await headers();
        const cookieHeader = cookieStore
            .getAll()
            .map((c) => `${c.name}=${c.value}`)
            .join('; ');

        const response = await fetch(`${API_URL}/api/auth/get-session`, {
            method: 'GET',
            headers: { Cookie: cookieHeader, 'User-Agent': headerStore.get('user-agent') || '' },
            cache: 'no-store',
        });

        if (!response.ok) return null;
        const data = await response.json();
        if (!data.user) return null;

        return {
            userId: data.user.id,
            user: {
                id: data.user.id,
                email: data.user.email,
                name: data.user.name,
                image: data.user.image,
            },
            session: { id: data.session.id, expiresAt: new Date(data.session.expiresAt) },
        };
    } catch (error) {
        console.error('[Auth] Session check failed:', error);
        return null;
    }
}

export async function getAuth(): Promise<{ userId: string | null }> {
    const session = await auth();
    return { userId: session?.userId ?? null };
}
