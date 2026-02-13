/**
 * API Key Management Routes
 * Handles CRUD operations for user API keys.
 */
import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

type Variables = { userId: string };
const app = new Hono<{ Variables: Variables }>();

/**
 * Hash API key for secure storage
 */
async function hashApiKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a new API key
 */
function generateApiKey(): string {
    return `yula_${crypto.randomUUID().replace(/-/g, '')}`;
}

// ============================================
// AUTHENTICATED ROUTES
// ============================================

// GET /api/api-keys - List user's API keys (masked)
app.get('/', requireAuth, async (c) => {
    const userId = c.get('userId');
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const apiKeys = await prisma.apiKey.findMany({
        where: { userId },
        select: {
            id: true,
            name: true,
            keyPrefix: true,
            permissions: true,
            lastUsedAt: true,
            expiresAt: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    return c.json({
        keys: apiKeys.map((key) => ({
            id: key.id,
            name: key.name,
            key: `${key.keyPrefix}...${key.keyPrefix.slice(-4)}`, // Show prefix and last 4 chars
            permissions: key.permissions,
            lastUsedAt: key.lastUsedAt,
            expiresAt: key.expiresAt,
            createdAt: key.createdAt,
        })),
    });
});

// POST /api/api-keys - Create a new API key
app.post('/', requireAuth, async (c) => {
    const userId = c.get('userId');
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const body = await c.req.json();
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const permissions: string[] = Array.isArray(body.permissions)
            ? body.permissions.filter((p: unknown): p is string => typeof p === 'string')
            : [];
        const expiresInDays = typeof body.expiresInDays === 'number' ? body.expiresInDays : null;

        // Validate name
        if (!name || name.length < 1 || name.length > 100) {
            return c.json({ error: 'Name must be between 1 and 100 characters' }, 400);
        }

        // Validate permissions
        const validPermissions = [
            'chat:read',
            'chat:write',
            'memory:read',
            'memory:write',
            'council:read',
            'council:write',
            'pac:read',
            'pac:write',
        ];
        const invalidPermissions = permissions.filter((p) => !validPermissions.includes(p));
        if (invalidPermissions.length > 0) {
            return c.json({ error: `Invalid permissions: ${invalidPermissions.join(', ')}` }, 400);
        }

        // Check if user has reached the limit (10 keys per user)
        const existingCount = await prisma.apiKey.count({ where: { userId } });
        if (existingCount >= 10) {
            return c.json(
                { error: 'Maximum of 10 API keys allowed per user. Please delete unused keys.' },
                400
            );
        }

        // Generate raw API key
        const rawKey = generateApiKey();
        const keyHash = await hashApiKey(rawKey);
        const keyPrefix = rawKey.slice(0, 12); // "yula_abc1234"

        // Calculate expiration date
        let expiresAt: Date | null = null;
        if (expiresInDays && expiresInDays > 0) {
            expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
        }

        // Create API key in database
        const apiKey = await prisma.apiKey.create({
            data: {
                userId,
                name,
                keyHash,
                keyPrefix,
                permissions,
                expiresAt,
            },
        });

        // Return the raw key ONCE (never shown again)
        return c.json(
            {
                id: apiKey.id,
                name: apiKey.name,
                key: rawKey, // Only shown once
                keyPrefix: apiKey.keyPrefix,
                permissions: apiKey.permissions,
                expiresAt: apiKey.expiresAt,
                createdAt: apiKey.createdAt,
                warning: 'Save this key now. You will not be able to see it again.',
            },
            201
        );
    } catch (error) {
        console.error('[API Keys] Creation failed:', error);
        return c.json({ error: 'Failed to create API key' }, 500);
    }
});

// DELETE /api/api-keys/:id - Revoke/delete an API key
app.delete('/:id', requireAuth, async (c) => {
    const userId = c.get('userId');
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const keyId = c.req.param('id');

    try {
        // Verify the key belongs to the user before deleting
        const apiKey = await prisma.apiKey.findUnique({
            where: { id: keyId },
            select: { userId: true },
        });

        if (!apiKey) {
            return c.json({ error: 'API key not found' }, 404);
        }

        if (apiKey.userId !== userId) {
            return c.json({ error: 'Forbidden' }, 403);
        }

        // Delete the API key
        await prisma.apiKey.delete({
            where: { id: keyId },
        });

        return c.json({ success: true, message: 'API key revoked successfully' });
    } catch (error) {
        console.error('[API Keys] Deletion failed:', error);
        return c.json({ error: 'Failed to delete API key' }, 500);
    }
});

export default app;
