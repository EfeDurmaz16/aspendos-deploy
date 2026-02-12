import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getModelsForTier, SUPPORTED_MODELS } from './lib/ai-providers';
import { auditLog } from './lib/audit-log';
import { auth } from './lib/auth';
import { breakers } from './lib/circuit-breaker';
import { validateEnv } from './lib/env';
import { AppError } from './lib/errors';
import { closeMCPClients, initializeMCPClients } from './lib/mcp-clients';
import { initSentry, Sentry } from './lib/sentry';
import { getRateLimitStatus, rateLimit } from './middleware/rate-limit';
import { requestTimeout } from './middleware/timeout';
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

// Track shutdown state
let isShuttingDown = false;

// Middleware
app.use('*', logger());

// Reject requests during shutdown
app.use('*', async (c, next) => {
    if (isShuttingDown) {
        return c.json({ error: 'Server is shutting down', code: 'SERVICE_UNAVAILABLE' }, 503);
    }
    return next();
});

// Request timeout middleware (30 seconds)
app.use('*', requestTimeout(30000));

// Security Headers (Helmet-style) + API Versioning + Request Timing
app.use('*', async (c, next) => {
    // Generate request ID for tracing
    const requestId = crypto.randomUUID();
    c.set('requestId', requestId);

    // Add request timing
    const start = Date.now();
    await next();
    const duration = Date.now() - start;

    // Log slow requests (over 5 seconds)
    if (duration > 5000) {
        console.warn(
            `[${requestId}] Slow request: ${c.req.method} ${c.req.path} took ${duration}ms`
        );
    }

    // API Versioning Headers
    c.header('X-API-Version', '1.0.0');
    c.header('X-Request-Id', requestId);

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
        const SENSITIVE_HEADERS = [
            'authorization',
            'cookie',
            'x-cron-secret',
            'x-polar-signature',
            'polar-signature',
        ];
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

// Global error handler with structured error handling
app.onError((err, c) => {
    const requestId = c.get('requestId') || 'unknown';
    Sentry.captureException(err, {
        tags: { requestId },
    });
    console.error(`[${requestId}] Unhandled error:`, err);

    // Handle JSON parse errors
    if (err instanceof SyntaxError && 'body' in err) {
        return c.json({ error: 'Invalid JSON in request body', code: 'INVALID_JSON' }, 400);
    }

    // Handle AppError instances
    if (err instanceof AppError) {
        return c.json(
            {
                error: err.message,
                code: err.code,
            },
            err.statusCode
        );
    }

    // Default error response
    return c.json(
        {
            error: 'Internal Server Error',
            code: 'INTERNAL_ERROR',
        },
        500
    );
});

// Enhanced health check with database connectivity and circuit breaker states
app.get('/health', async (c) => {
    const _startTime = Date.now();
    const dependencies: Record<string, { status: 'up' | 'down'; latencyMs?: number }> = {};

    // Check database
    let dbStatus: 'up' | 'down' = 'down';
    let dbLatency = 0;
    try {
        const { prisma } = await import('./lib/prisma');
        const dbStart = Date.now();
        await prisma.$queryRawUnsafe('SELECT 1');
        dbLatency = Date.now() - dbStart;
        dbStatus = 'up';
    } catch (error) {
        console.error('[Health] Database check failed:', error);
    }
    dependencies.database = { status: dbStatus, latencyMs: dbLatency };

    // Check Qdrant (via circuit breaker)
    let qdrantStatus: 'up' | 'down' = 'down';
    try {
        const qdrantStart = Date.now();
        await breakers.qdrant.execute(async () => {
            const { getMemoryClient } = await import('./services/openmemory.service');
            const mem = getMemoryClient();
            // Just check if client is available, don't make actual call
            return mem;
        });
        const qdrantLatency = Date.now() - qdrantStart;
        qdrantStatus = 'up';
        dependencies.qdrant = { status: qdrantStatus, latencyMs: qdrantLatency };
    } catch {
        dependencies.qdrant = { status: qdrantStatus };
    }

    // Get circuit breaker states
    const circuitBreakers = {
        openai: breakers.openai.getState(),
        anthropic: breakers.anthropic.getState(),
        groq: breakers.groq.getState(),
        qdrant: breakers.qdrant.getState(),
        google: breakers.google.getState(),
    };

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (dbStatus === 'down') {
        overallStatus = 'unhealthy';
    } else if (
        qdrantStatus === 'down' ||
        Object.values(circuitBreakers).some((cb) => cb.state === 'OPEN')
    ) {
        overallStatus = 'degraded';
    }

    const response = {
        status: overallStatus,
        version: '0.3.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        dependencies,
        circuitBreakers,
    };

    const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
    return c.json(response, statusCode);
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

// API Documentation Endpoint
app.get('/api/docs', (c) => {
    return c.json({
        name: 'YULA OS API',
        version: '1.0.0',
        endpoints: [
            { method: 'GET', path: '/api/chat', description: 'List chats', auth: true },
            { method: 'POST', path: '/api/chat', description: 'Create chat', auth: true },
            { method: 'GET', path: '/api/chat/:id', description: 'Get chat details', auth: true },
            { method: 'PATCH', path: '/api/chat/:id', description: 'Update chat', auth: true },
            { method: 'DELETE', path: '/api/chat/:id', description: 'Delete chat', auth: true },
            {
                method: 'POST',
                path: '/api/chat/:id/message',
                description: 'Send message',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/chat/:id/multi',
                description: 'Multi-model comparison',
                auth: true,
            },
            { method: 'POST', path: '/api/chat/:id/fork', description: 'Fork chat', auth: true },
            {
                method: 'POST',
                path: '/api/chat/:id/share',
                description: 'Create share token',
                auth: true,
            },
            {
                method: 'DELETE',
                path: '/api/chat/:id/share',
                description: 'Revoke share token',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/chat/message/:messageId/feedback',
                description: 'Add message feedback',
                auth: true,
            },
            { method: 'GET', path: '/api/memory', description: 'Search memories', auth: true },
            { method: 'POST', path: '/api/memory', description: 'Add memory', auth: true },
            {
                method: 'POST',
                path: '/api/memory/search',
                description: 'Semantic search',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/memory/reinforce/:id',
                description: 'Reinforce memory',
                auth: true,
            },
            { method: 'DELETE', path: '/api/memory/:id', description: 'Delete memory', auth: true },
            {
                method: 'GET',
                path: '/api/memory/dashboard/stats',
                description: 'Memory statistics',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/memory/dashboard/list',
                description: 'List memories (paginated)',
                auth: true,
            },
            {
                method: 'PATCH',
                path: '/api/memory/dashboard/:id',
                description: 'Update memory',
                auth: true,
            },
            {
                method: 'DELETE',
                path: '/api/memory/dashboard/:id',
                description: 'Delete memory',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/memory/dashboard/bulk-delete',
                description: 'Bulk delete memories',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/memory/consolidate',
                description: 'Consolidate memories',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/council/sessions',
                description: 'Create council session',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/council/sessions',
                description: 'List council sessions',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/council/sessions/:id',
                description: 'Get session details',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/council/sessions/:id/stream',
                description: 'Stream council responses',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/council/sessions/:id/select',
                description: 'Select preferred response',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/council/sessions/:id/synthesize',
                description: 'Generate synthesis',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/council/personas',
                description: 'Get available personas',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/council/stats',
                description: 'Council statistics',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/pac/detect',
                description: 'Detect commitments',
                auth: true,
            },
            { method: 'GET', path: '/api/pac/reminders', description: 'Get reminders', auth: true },
            {
                method: 'PATCH',
                path: '/api/pac/reminders/:id/complete',
                description: 'Complete reminder',
                auth: true,
            },
            {
                method: 'PATCH',
                path: '/api/pac/reminders/:id/dismiss',
                description: 'Dismiss reminder',
                auth: true,
            },
            {
                method: 'PATCH',
                path: '/api/pac/reminders/:id/snooze',
                description: 'Snooze reminder',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/pac/settings',
                description: 'Get PAC settings',
                auth: true,
            },
            {
                method: 'PATCH',
                path: '/api/pac/settings',
                description: 'Update PAC settings',
                auth: true,
            },
            { method: 'GET', path: '/api/pac/stats', description: 'PAC statistics', auth: true },
            { method: 'GET', path: '/api/billing', description: 'Billing status', auth: true },
            {
                method: 'POST',
                path: '/api/billing/sync',
                description: 'Sync with Polar',
                auth: true,
            },
            { method: 'GET', path: '/api/billing/usage', description: 'Usage history', auth: true },
            {
                method: 'GET',
                path: '/api/billing/tiers',
                description: 'Tier comparison',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/billing/checkout',
                description: 'Create checkout',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/billing/cancel',
                description: 'Cancel subscription',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/billing/portal',
                description: 'Customer portal URL',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/billing/cost-ceiling',
                description: 'Cost ceiling status',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/billing/cost-summary',
                description: 'Cost summary',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/billing/webhook',
                description: 'Polar webhook',
                auth: false,
            },
            {
                method: 'POST',
                path: '/api/import/jobs',
                description: 'Create import job',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/import/jobs',
                description: 'List import jobs',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/import/jobs/:id',
                description: 'Get import job',
                auth: true,
            },
            {
                method: 'POST',
                path: '/api/import/jobs/:id/execute',
                description: 'Execute import',
                auth: true,
            },
            {
                method: 'GET',
                path: '/api/import/stats',
                description: 'Import statistics',
                auth: true,
            },
            { method: 'GET', path: '/health', description: 'Health check', auth: false },
            { method: 'GET', path: '/api/models', description: 'List models', auth: false },
            {
                method: 'GET',
                path: '/api/models/tier/:tier',
                description: 'Models for tier',
                auth: false,
            },
            { method: 'GET', path: '/api/docs', description: 'API documentation', auth: false },
            { method: 'DELETE', path: '/api/account', description: 'Delete account', auth: true },
            { method: 'GET', path: '/api/export', description: 'Export user data', auth: true },
        ],
    });
});

// Better Auth routes
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
    return auth.handler(c.req.raw);
});

// Public: Get shared chat by token (no auth required, rate limited by IP)
const sharedChatLimiter = new Map<string, { count: number; resetAt: number }>();
// Clean up expired entries every 60 seconds
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of sharedChatLimiter.entries()) {
        if (entry.resetAt <= now) sharedChatLimiter.delete(key);
    }
}, 60_000);
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
            const reminders = await tx.pACReminder.findMany({
                where: { userId },
                select: { id: true },
            });
            for (const r of reminders) {
                await tx.pACEscalation.deleteMany({ where: { reminderId: r.id } });
            }
            await tx.pACReminder.deleteMany({ where: { userId } });
            await tx.pACSettings.deleteMany({ where: { userId } });

            // Delete council data
            const sessions = await tx.councilSession.findMany({
                where: { userId },
                select: { id: true },
            });
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

        // Audit log the account deletion
        await auditLog({
            userId,
            action: 'ACCOUNT_DELETE',
            resource: 'user',
            ip: c.req.header('x-forwarded-for') || 'unknown',
        });

        return c.json({ success: true, message: 'Account and all data deleted permanently.' });
    } catch (error) {
        console.error('[Account] Deletion failed:', error);
        return c.json({ error: 'Account deletion failed. Please contact support.' }, 500);
    }
});

// Rate limit export to prevent abuse (1 export per 5 minutes per user)
const exportLimiter = new Map<string, number>();
// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, ts] of exportLimiter.entries()) {
        if (now - ts > 5 * 60 * 1000) exportLimiter.delete(key);
    }
}, 5 * 60_000);
app.get('/api/export', async (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const lastExport = exportLimiter.get(userId) || 0;
    if (Date.now() - lastExport < 5 * 60 * 1000) {
        return c.json(
            { error: 'Export rate limited. Please wait 5 minutes between exports.' },
            429
        );
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
        const [
            user,
            chats,
            chatCount,
            memories,
            pacReminders,
            pacSettings,
            billingAccount,
            councilSessions,
            importJobs,
        ] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true, email: true, createdAt: true, tier: true },
            }),
            prisma.chat.findMany({
                where: { userId },
                include: {
                    messages: {
                        select: { role: true, content: true, createdAt: true, modelUsed: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: chatLimit,
                skip: chatSkip,
            }),
            prisma.chat.count({ where: { userId } }),
            openMemory.listMemories(userId, { limit: 1000 }),
            prisma.pACReminder.findMany({
                where: { userId },
                select: {
                    id: true,
                    content: true,
                    type: true,
                    status: true,
                    triggerAt: true,
                    createdAt: true,
                },
            }),
            prisma.pACSettings.findUnique({ where: { userId } }),
            prisma.billingAccount.findUnique({
                where: { userId },
                select: {
                    plan: true,
                    creditUsed: true,
                    monthlyCredit: true,
                    chatsRemaining: true,
                    createdAt: true,
                },
            }),
            prisma.councilSession.findMany({
                where: { userId },
                include: { responses: { select: { persona: true, content: true, status: true } } },
                take: 100,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.importJob.findMany({
                where: { userId },
                select: {
                    id: true,
                    source: true,
                    status: true,
                    totalItems: true,
                    importedItems: true,
                    createdAt: true,
                },
            }),
        ]);

        // Audit log the data export
        await auditLog({
            userId,
            action: 'DATA_EXPORT',
            resource: 'user',
            ip: c.req.header('x-forwarded-for') || 'unknown',
        });

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
            chats: chats.map((chat) => ({
                id: chat.id,
                title: chat.title,
                createdAt: chat.createdAt,
                messages: chat.messages,
            })),
            memories: memories.map((m) => ({
                id: m.id,
                content: m.content,
                sector: m.sector,
                createdAt: m.createdAt,
            })),
            reminders: pacReminders,
            pacSettings: pacSettings
                ? {
                      enabled: pacSettings.enabled,
                      explicitEnabled: pacSettings.explicitEnabled,
                      implicitEnabled: pacSettings.implicitEnabled,
                      quietHoursStart: pacSettings.quietHoursStart,
                      quietHoursEnd: pacSettings.quietHoursEnd,
                  }
                : null,
            billing: billingAccount,
            councilSessions: councilSessions.map((s) => ({
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
        if (isShuttingDown) return; // Prevent double shutdown
        isShuttingDown = true;
        console.log('\n🛑 Shutting down gracefully...');

        // Stop accepting new connections
        server.close();

        // Give in-flight requests time to complete
        await new Promise((resolve) => setTimeout(resolve, 10000));

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
