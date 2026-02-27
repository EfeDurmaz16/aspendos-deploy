import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './lib/auth';
import { validateEnv } from './lib/env';
import { AppError } from './lib/errors';
import { jobQueue } from './lib/job-queue';
import { closeMCPClients, initializeMCPClients } from './lib/mcp-clients';
import { initSentry, Sentry, setSentryRequestContext, setSentryUserContext } from './lib/sentry';
import { apiVersion } from './middleware/api-version';
import { auditTrail } from './middleware/audit-trail';
import { botProtection } from './middleware/bot-protection';
import { cacheControl } from './middleware/cache';
import { compression } from './middleware/compression';
import { correlationIdMiddleware } from './middleware/correlation-id';
import { endpointRateLimit } from './middleware/endpoint-rate-limit';
import { featureHealthMiddleware } from './middleware/feature-health';
import { idempotency } from './middleware/idempotency';
import { metricsMiddleware } from './middleware/metrics';
import { rateLimit } from './middleware/rate-limit';
import { sanitizeBody } from './middleware/sanitize';
import { requestTimeout } from './middleware/timeout';
import { tracingMiddleware } from './middleware/tracing';
import accountRoutes from './routes/account';
import adminRoutes from './routes/admin';
import adminAuditRoutes from './routes/admin-audit';
import adminBackupsRoutes from './routes/admin-backups';
import analyticsRoutes from './routes/analytics';
import apiKeysRoutes from './routes/api-keys';
import billingRoutes from './routes/billing';
// Routes
import chatRoutes from './routes/chat';
import councilRoutes from './routes/council';
import cronRoutes from './routes/cron';
import docsRoutes from './routes/docs';
import experimentsRoutes from './routes/experiments';
import featuresRoutes from './routes/features';
import feedbackRoutes from './routes/feedback';
import gamificationRoutes from './routes/gamification';
import healthRoutes from './routes/health';
import importRoutes from './routes/import';
import memoryRoutes from './routes/memory';
import miscRoutes from './routes/misc';
import modelsRoutes from './routes/models';
import notificationsRoutes from './routes/notifications';
import pacRoutes from './routes/pac';
import promptTemplatesRoutes from './routes/prompt-templates';
import schedulerRoutes from './routes/scheduler';
import searchRoutes from './routes/search';
import securityRoutes from './routes/security';
import sessionRoutes from './routes/sessions';
import statusRoutes from './routes/status';
import systemRoutes from './routes/system';
import tracesRoutes from './routes/traces';
import usageRoutes from './routes/usage';
import complianceRoutes from './routes/user-compliance';
import voiceRoutes from './routes/voice';
import workspaceRoutes from './routes/workspace';

// Validate environment variables on startup
validateEnv();

// Initialize Sentry
initSentry();

type Variables = {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
    userId: string | null;
    requestId: string;
    traceId: string;
    spanId: string;
    rootSpan: unknown;
    trace: unknown;
    currentSpan: unknown;
    cspNonce: string;
};

const app = new Hono<{ Variables: Variables }>();

// Track shutdown state
let isShuttingDown = false;

// Middleware
app.use('*', logger());

// Tracing middleware (must be early to track all requests)
app.use('*', tracingMiddleware());

// Correlation ID middleware (right after tracing for trace propagation)
app.use('*', correlationIdMiddleware());

// Metrics middleware (must be early to track all requests)
app.use('*', metricsMiddleware());

// Reject requests during shutdown
app.use('*', async (c, next) => {
    if (isShuttingDown) {
        return c.json({ error: 'Server is shutting down', code: 'SERVICE_UNAVAILABLE' }, 503);
    }
    return next();
});

// Request timeout middleware (30 seconds, 5 minutes for import)
app.use('*', async (c, next) => {
    if (c.req.path.startsWith('/api/import')) {
        return requestTimeout(300000)(c, next); // 5 minutes for import
    }
    return requestTimeout(30000)(c, next);
});

// Security Headers (Helmet-style) + API Versioning + Request Timing
app.use('*', async (c, next) => {
    // Generate request ID for tracing
    const requestId = crypto.randomUUID();
    c.set('requestId', requestId);

    // Generate CSP nonce for inline scripts
    const nonce = crypto.randomUUID();
    c.set('cspNonce', nonce);

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
    c.header('X-Response-Time', `${duration}ms`);

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

    // Content-Security-Policy with nonce-based inline script protection
    c.header(
        'Content-Security-Policy',
        `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline';`
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
            'https://yula.dev',
            'https://www.yula.dev',
            ...extraOrigins,
        ],
        credentials: true,
    })
);

// Input sanitization middleware
app.use('*', sanitizeBody());

// Bot protection middleware (blocks automated abuse)
app.use('*', botProtection());

// API versioning middleware
app.use('/api/*', apiVersion());

// Compression middleware (gzip/brotli for responses > 1KB)
app.use('*', compression());

// Cache control middleware (Cache-Control headers, ETag support)
app.use('*', cacheControl());

// Feature health middleware (X-Degraded-Features header)
app.use('*', featureHealthMiddleware());

// Sentry error handling middleware
app.use('*', async (c, next) => {
    try {
        await next();
    } catch (err) {
        // Set request context in Sentry
        const requestId = c.get('requestId') || 'unknown';
        setSentryRequestContext(requestId, c.req.path, c.req.method);

        // Set user context if available
        const userId = c.get('userId');
        const user = c.get('user');
        if (userId) {
            const tier = ((user as Record<string, unknown>)?.tier as string) || undefined;
            setSentryUserContext(userId, tier);
        }

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
    if (path.startsWith('/api/scheduler') || path.startsWith('/api/cron')) {
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
    // Import routes handle their own size limit (100MB for large exports)
    if (c.req.path.startsWith('/api/import')) {
        return next();
    }
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

// Apply per-endpoint rate limiting (more specific limits per endpoint)
app.use('*', endpointRateLimit());

// Apply idempotency middleware for POST/PUT/PATCH requests
app.use('*', idempotency());

// Apply audit trail middleware (logs all state-changing requests)
app.use('*', auditTrail());

// Global error handler with structured error handling
app.onError((err, c) => {
    const requestId = c.get('requestId') || 'unknown';

    // Set request context in Sentry
    setSentryRequestContext(requestId, c.req.path, c.req.method);

    // Set user context if available
    const userId = c.get('userId');
    const user = c.get('user');
    if (userId) {
        const tier = ((user as Record<string, unknown>)?.tier as string) || undefined;
        setSentryUserContext(userId, tier);
    }

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
        const status = err.statusCode as ContentfulStatusCode;
        return c.json(
            {
                error: err.message,
                code: err.code,
            },
            status
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

// /.well-known/security.txt - Responsible disclosure
app.get('/.well-known/security.txt', (c) => {
    return c.text(`Contact: security@yula.dev
Expires: 2027-01-01T00:00:00.000Z
Preferred-Languages: en, tr
Canonical: https://api.yula.dev/.well-known/security.txt
Policy: https://yula.dev/security-policy
`);
});

// Prometheus metrics endpoint (bearer token protected)
app.get('/metrics', async (c) => {
    const metricsToken = process.env.METRICS_BEARER_TOKEN;
    if (metricsToken) {
        const authHeader = c.req.header('authorization');
        if (authHeader !== `Bearer ${metricsToken}`) {
            return c.json({ error: 'Unauthorized' }, 401);
        }
    }
    const { getMetricsText } = await import('./lib/metrics');
    return c.text(getMetricsText(), 200, {
        'Content-Type': 'text/plain; version=0.0.4',
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

// API Routes
app.route('/api/admin', adminRoutes);
app.route('/api/admin/backups', adminBackupsRoutes);
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
app.route('/api/api-keys', apiKeysRoutes);
app.route('/api/templates', promptTemplatesRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/sessions', sessionRoutes);
app.route('/api/workspace', workspaceRoutes);
app.route('/api/compliance', complianceRoutes);
app.route('/api/security', securityRoutes);
app.route('/api/status', statusRoutes);
app.route('/api/system', systemRoutes);
app.route('/api/usage', usageRoutes);
app.route('/api/account', accountRoutes);
app.route('/api/cron', cronRoutes);
app.route('/api/docs', docsRoutes);
app.route('/api/experiments', experimentsRoutes);
app.route('/api/features', featuresRoutes);
app.route('/api/feedback', feedbackRoutes);
app.route('/api/health', healthRoutes);
app.route('/api/misc', miscRoutes);
app.route('/api/models', modelsRoutes);
app.route('/api/traces', tracesRoutes);
app.route('/api/admin', adminAuditRoutes);

// Start server with MCP initialization
const port = parseInt(process.env.PORT || '8080', 10);

async function initialize() {
    console.log('🚀 Yula API Server starting...');

    // Initialize MCP clients (optional, non-blocking)
    try {
        await initializeMCPClients();
    } catch (error) {
        console.warn('[MCP] Failed to initialize MCP clients:', error);
        // Continue without MCP - it's optional
    }

    console.log(`✅ Yula API Server running on port ${port}`);

    // Graceful shutdown
    const shutdown = async () => {
        if (isShuttingDown) return; // Prevent double shutdown
        isShuttingDown = true;
        console.log('\n🛑 Shutting down gracefully...');

        try {
            await jobQueue.shutdown(10000);
            console.log('✅ Job queue drained');
        } catch (error) {
            console.error('Error draining job queue:', error);
        }
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
}

// Don't start server when running tests
if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
    initialize().catch(console.error);
}

// Bun auto-serves this via Bun.serve() when detecting export default with .fetch
export default {
    port,
    fetch: app.fetch,
};
