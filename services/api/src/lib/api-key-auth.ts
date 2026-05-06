import { prisma } from '@aspendos/db';

export interface AuthenticatedApiKey {
    id: string;
    userId: string;
    permissions: string[];
}

export function extractApiKey(headers: {
    get(name: string): string | null | undefined;
}): string | null {
    const explicit = headers.get('x-api-key')?.trim();
    if (explicit) return explicit;

    const authorization = headers.get('authorization')?.trim();
    if (!authorization?.startsWith('Bearer ')) return null;

    const token = authorization.slice('Bearer '.length).trim();
    return token.startsWith('yula_') ? token : null;
}

export async function hashApiKey(key: string): Promise<string> {
    const bytes = new TextEncoder().encode(key);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

export async function authenticateApiKey(rawKey: string): Promise<AuthenticatedApiKey | null> {
    if (!rawKey.startsWith('yula_')) return null;

    const keyHash = await hashApiKey(rawKey);
    const apiKey = await prisma.apiKey.findUnique({
        where: { keyHash },
        select: {
            id: true,
            userId: true,
            permissions: true,
            expiresAt: true,
        },
    });

    if (!apiKey) return null;
    if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now()) return null;

    await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
    });

    return {
        id: apiKey.id,
        userId: apiKey.userId,
        permissions: apiKey.permissions,
    };
}
