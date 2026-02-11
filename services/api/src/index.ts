import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getModelsForTier, SUPPORTED_MODELS } from './lib/ai-providers';
import { auth } from './lib/auth';
import { validateEnv } from './lib/env';
import {
    closeMCPClients,
    getConnectedMCPServers,
    getMCPStatus,
    initializeMCPClients,
} from './lib/mcp-clients';
import { initSentry, Sentry } from './lib/sentry';
import { getRateLimitStatus, rateLimit } from './middleware/rate-limit';
import analyticsRoutes from './routes/analytics';
import billingRoutes from './routes/billing';
// Routes
import chatRoutes from './routes/chat';
import councilRoutes from './routes/council';
import gamificationRoutes from './routes/gamification';
import importRoutes from './routes/import';
import memoryRoutes from './routes/memory';
import notificationsRoutes from './routes/notifications';
import pacRoutes from './routes/pac';
import schedulerRoutes from './routes/scheduler';
import voiceRoutes from './routes/voice';

// Validate environment variables on startup
validateEnv();

// Initialize Sentry
initSentry();

type Variables = {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
};

const app = new Hono<{ Variables: Variables }>();

// Middleware
app.use('*', logger());

// Security Headers (Helmet-style)
app.use('*', async (c, next) => {
    await next();

    // Helmet-equivalent security headers
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // HSTS for production
    if (process.env.NODE_ENV === 'production') {
        c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Content-Security-Policy (basic policy)
    c.header(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    );
});

// Validate CORS origins - only allow valid URLs
const extraOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => {
        if (!o) return false;
        try {
            const url = new URL(o);
            return ['http:', 'https:'].includes(url.protocol);
        } catch {
            console.warn(`Invalid CORS origin ignored: ${o}`);
            return false;
        }
    });

app.use(
    '*',
    cors({
        origin: [
            'http://localhost:3000',
            'https://aspendos.net',
            'https://yula.dev',
            'https://www.yula.dev',
            ...extraOrigins,
        ],
        credentials: true,
    })
);

// Sentry error handling middleware
app.use('*', async (c, next) => {
    try {
        await next();
    } catch (err) {
        // Capture error in Sentry
        // Sanitize headers before sending to Sentry (never log auth tokens)
        const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-cron-secret', 'x-polar-signature', 'polar-signature'];
        const safeHeaders = Object.fromEntries(
            [...c.req.raw.headers.entries()].filter(
                ([key]) => !SENSITIVE_HEADERS.includes(key.toLowerCase())
            )
        );
        Sentry.captureException(err, {
            extra: {
                path: c.req.path,
                method: c.req.method,
                headers: safeHeaders,
            },
        });
        // Re-throw to let Hono handle the error response
        throw err;
    }
});

// Better Auth session middleware
app.use('*', async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
        c.set('user', null);
        c.set('session', null);
        c.set('userId', null);
        await next();
        return;
    }

    c.set('user', session.user);
    c.set('session', session.session);
    c.set('userId', session.user.id);
    await next();
});

// CSRF protection: verify Origin header on state-changing requests
const ALLOWED_ORIGINS = new Set([
    'http://localhost:3000',
    'https://aspendos.net',
    'https://yula.dev',
    'https://www.yula.dev',
    ...extraOrigins,
]);

app.use('*', async (c, next) => {
    const method = c.req.method;
    // Only check state-changing methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        return next();
    }

    // Skip CSRF check for webhook endpoints (they use signature verification)
    const path = c.req.path;
    if (path.startsWith('/api/auth/') || path.includes('/webhook') || path === '/health') {
        return next();
    }

    // Skip for CRON endpoints (they use secret header)
    if (path.startsWith('/api/scheduler')) {
        return next();
    }

    const origin = c.req.header('origin');
    const referer = c.req.header('referer');

    // Require Origin or Referer on authenticated state-changing requests
    // (prevents CSRF by rejecting requests with no origin info)
    if (!origin && !referer) {
        return c.json({ error: 'Forbidden' }, 403);
    }

    // Validate Origin if present
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
        return c.json({ error: 'Forbidden' }, 403);
    }

    // Validate Referer if Origin not present
    if (!origin && referer) {
        try {
            const refererOrigin = new URL(referer).origin;
            if (!ALLOWED_ORIGINS.has(refererOrigin)) {
                return c.json({ error: 'Forbidden' }, 403);
            }
        } catch {
            return c.json({ error: 'Forbidden' }, 403);
        }
    }

    return next();
});

// Body size limit: reject payloads over 10MB (except import which has its own limit)
app.use('*', async (c, next) => {
    const contentLength = c.req.header('content-length');
    if (contentLength) {
        const size = parseInt(contentLength, 10);
        const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB
        if (size > MAX_BODY_SIZE) {
            return c.json({ error: 'Request body too large. Maximum 10MB.' }, 413);
        }
    }
    return next();
});

// Apply rate limiting
app.use('*', rateLimit());

// Global error handler
app.onError((err, c) => {
    Sentry.captureException(err);
    console.error('Unhandled error:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
});

// Health check with database connectivity
app.get('/health', async (c) => {
    try {
        const { prisma } = await import('./lib/prisma');
        await prisma.$queryRawUnsafe('SELECT 1');
        return c.json({
            status: 'ok',
            service: 'api',
            version: '0.3.0',
            timestamp: new Date().toISOString(),
        });
    } catch {
        return c.json({ status: 'degraded', service: 'api', timestamp: new Date().toISOString() }, 503);
    }
});

// Models endpoint - now uses local configuration
app.get('/api/models', (c) => {
    return c.json({
        models: SUPPORTED_MODELS.map((m) => ({
            id: m.id,
            name: m.name,
            provider: m.provider,
            tier: m.tier,
        })),
    });
});

// Models for specific tier
app.get('/api/models/tier/:tier', (c) => {
    const tier = c.req.param('tier').toUpperCase() as 'FREE' | 'STARTER' | 'PRO' | 'ULTRA';
    const models = getModelsForTier(tier);
    return c.json({
        tier,
        models: models.map((m) => ({
            id: m.id,
            name: m.name,
            provider: m.provider,
        })),
    });
});

// Rate limit status
app.get('/api/rate-limit', (c) => {
    const userId = c.get('userId');
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = c.get('user');
    const tier =
        ((user as Record<string, unknown>)?.tier as 'FREE' | 'STARTER' | 'PRO' | 'ULTRA') || 'FREE';

    return c.json(getRateLimitStatus(userId, tier));
});

// Pinned/recommended models
app.get('/api/models/pinned', (c) => {
    const pinnedModels = [
        SUPPORTED_MODELS.find((m) => m.id === 'openai/gpt-4o-mini'),
        SUPPORTED_MODELS.find((m) => m.id === 'anthropic/claude-3-5-haiku-20241022'),
        SUPPORTED_MODELS.find((m) => m.id === 'google/gemini-2.0-flash'),
    ].filter(Boolean);

    return c.json({
        pinned: pinnedModels.map((m) => ({
            id: m!.id,
            name: m!.name,
            provider: m!.provider,
        })),
    });
});

// Better Auth routes
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
    return auth.handler(c.req.raw);
});

// Public: Get shared chat by token (no auth required, rate limited by IP)
const sharedChatLimiter = new Map<string, { count: number; resetAt: number }>();
app.get('/api/chat/shared/:token', async (c) => {
    // Simple IP-based rate limit: 30 requests per minute
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const now = Date.now();
    const entry = sharedChatLimiter.get(ip);
    if (entry && entry.resetAt > now) {
        if (entry.count >= 30) {
            return c.json({ error: 'Too many requests' }, 429);
        }
        entry.count++;
    } else {
        sharedChatLimiter.set(ip, { count: 1, resetAt: now + 60_000 });
    }

    const { getSharedChat } = await import('./services/chat.service');
    const token = c.req.param('token');

    const sharedChat = await getSharedChat(token);

    if (!sharedChat) {
        return c.json({ error: 'Shared chat not found or expired' }, 404);
    }

    return c.json(sharedChat);
});

// ============================================
// GDPR ENDPOINTS (Art. 17 - Right to Erasure, Art. 20 - Data Portability)
// ============================================

// DELETE /api/account - Delete user account and all associated data
app.delete('/api/account', async (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    try {
        const { prisma } = await import('./lib/prisma');
        const openMemory = await import('./services/openmemory.service');

        // Delete all user data in dependency order
        await prisma.$transaction(async (tx) => {
            // Delete PAC data
            const reminders = await tx.pACReminder.findMany({ where: { userId }, select: { id: true } });
            for (const r of reminders) {
                await tx.pACEscalation.deleteMany({ where: { reminderId: r.id } });
            }
            await tx.pACReminder.deleteMany({ where: { userId } });
            await tx.pACSettings.deleteMany({ where: { userId } });

            // Delete council data
            const sessions = await tx.councilSession.findMany({ where: { userId }, select: { id: true } });
            for (const s of sessions) {
                await tx.councilResponse.deleteMany({ where: { sessionId: s.id } });
            }
            await tx.councilSession.deleteMany({ where: { userId } });

            // Delete chat data
            await tx.message.deleteMany({ where: { userId } });
            await tx.chat.deleteMany({ where: { userId } });

            // Delete import data
            const jobs = await tx.importJob.findMany({ where: { userId }, select: { id: true } });
            for (const j of jobs) {
                await tx.importEntity.deleteMany({ where: { jobId: j.id } });
            }
            await tx.importJob.deleteMany({ where: { userId } });

            // Delete scheduled tasks
            await tx.scheduledTask.deleteMany({ where: { userId } });

            // Delete billing
            const account = await tx.billingAccount.findUnique({ where: { userId } });
            if (account) {
                await tx.creditLog.deleteMany({ where: { billingAccountId: account.id } });
                await tx.billingAccount.delete({ where: { userId } });
            }

            // Delete gamification
            await tx.achievement.deleteMany({ where: { userId } });
            await tx.xPEvent.deleteMany({ where: { userId } });

            // Delete notifications
            await tx.notification.deleteMany({ where: { userId } });

            // Delete user sessions and accounts (Better Auth)
            await tx.session.deleteMany({ where: { userId } });
            await tx.account.deleteMany({ where: { userId } });

            // Delete user
            await tx.user.delete({ where: { id: userId } });
        });

        // Delete memories from OpenMemory (outside transaction - different store)
        try {
            const memories = await openMemory.listMemories(userId, { limit: 10000 });
            for (const m of memories) {
                await openMemory.deleteMemory(m.id);
            }
        } catch {
            // Best-effort memory deletion
        }

        return c.json({ success: true, message: 'Account and all data deleted permanently.' });
    } catch (error) {
        console.error('[Account] Deletion failed:', error);
        return c.json({ error: 'Account deletion failed. Please contact support.' }, 500);
    }
});

// Rate limit export to prevent abuse (1 export per 5 minutes per user)
const exportLimiter = new Map<string, number>();
app.get('/api/export', async (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const lastExport = exportLimiter.get(userId) || 0;
    if (Date.now() - lastExport < 5 * 60 * 1000) {
        return c.json({ error: 'Export rate limited. Please wait 5 minutes between exports.' }, 429);
    }
    exportLimiter.set(userId, Date.now());

    try {
        const { prisma } = await import('./lib/prisma');
        const openMemory = await import('./services/openmemory.service');

        // Pagination: prevent OOM on large accounts
        const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
        const chatLimit = 50; // 50 chats per page
        const chatSkip = (page - 1) * chatLimit;

        // Fetch all user data in parallel (chats paginated)
        const [user, chats, chatCount, memories, pacReminders, pacSettings, billingAccount, councilSessions, importJobs] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true, email: true, createdAt: true, tier: true },
            }),
            prisma.chat.findMany({
                where: { userId },
                include: { messages: { select: { role: true, content: true, createdAt: true, modelUsed: true } } },
                orderBy: { createdAt: 'desc' },
                take: chatLimit,
                skip: chatSkip,
            }),
            prisma.chat.count({ where: { userId } }),
            openMemory.listMemories(userId, { limit: 1000 }),
            prisma.pACReminder.findMany({
                where: { userId },
                select: { id: true, content: true, type: true, status: true, triggerAt: true, createdAt: true },
            }),
            prisma.pACSettings.findUnique({ where: { userId } }),
            prisma.billingAccount.findUnique({
                where: { userId },
                select: { plan: true, creditUsed: true, monthlyCredit: true, chatsRemaining: true, createdAt: true },
            }),
            prisma.councilSession.findMany({
                where: { userId },
                include: { responses: { select: { persona: true, content: true, status: true } } },
                take: 100,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.importJob.findMany({
                where: { userId },
                select: { id: true, source: true, status: true, totalItems: true, importedItems: true, createdAt: true },
            }),
        ]);

        return c.json({
            exportedAt: new Date().toISOString(),
            format: 'YULA_EXPORT_V1',
            pagination: {
                page,
                chatLimit,
                totalChats: chatCount,
                totalPages: Math.ceil(chatCount / chatLimit),
            },
            user,
            chats: chats.map(chat => ({
                id: chat.id,
                title: chat.title,
                createdAt: chat.createdAt,
                messages: chat.messages,
            })),
            memories: memories.map(m => ({
                id: m.id,
                content: m.content,
                sector: m.sector,
                createdAt: m.createdAt,
            })),
            reminders: pacReminders,
            pacSettings: pacSettings ? {
                enabled: pacSettings.enabled,
                explicitEnabled: pacSettings.explicitEnabled,
                implicitEnabled: pacSettings.implicitEnabled,
                quietHoursStart: pacSettings.quietHoursStart,
                quietHoursEnd: pacSettings.quietHoursEnd,
            } : null,
            billing: billingAccount,
            councilSessions: councilSessions.map(s => ({
                id: s.id,
                query: s.query,
                status: s.status,
                selectedPersona: s.selectedPersona,
                synthesis: s.synthesis,
                createdAt: s.createdAt,
                responses: s.responses,
            })),
            importHistory: importJobs,
        });
    } catch (error) {
        console.error('[Export] Data export failed:', error);
        return c.json({ error: 'Export failed' }, 500);
    }
});

// API Routes
app.route('/api/chat', chatRoutes);
app.route('/api/council', councilRoutes);
app.route('/api/import', importRoutes);
app.route('/api/memory', memoryRoutes);
app.route('/api/pac', pacRoutes);
app.route('/api/billing', billingRoutes);
app.route('/api/voice', voiceRoutes);
app.route('/api/scheduler', schedulerRoutes);
app.route('/api/notifications', notificationsRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/gamification', gamificationRoutes);

// Start server with MCP initialization
const port = parseInt(process.env.PORT || '8080', 10);

async function startServer() {
    console.log('🚀 Aspendos API Server starting...');

    // Initialize MCP clients (optional, non-blocking)
    try {
        await initializeMCPClients();
    } catch (error) {
        console.warn('[MCP] Failed to initialize MCP clients:', error);
        // Continue without MCP - it's optional
    }

    const server = serve({
        fetch: app.fetch,
        port,
    });

    console.log(`✅ Aspendos API Server running on port ${port}`);

    // Graceful shutdown
    const shutdown = async () => {
        console.log('\n🛑 Shutting down gracefully...');
        try {
            await closeMCPClients();
            console.log('✅ MCP clients closed');
        } catch (error) {
            console.error('Error closing MCP clients:', error);
        }
        try {
            const { prisma } = await import('./lib/prisma');
            await prisma.$disconnect();
            console.log('✅ Database connection closed');
        } catch (error) {
            console.error('Error disconnecting database:', error);
        }
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    return server;
}

startServer().catch(console.error);

export default app;
