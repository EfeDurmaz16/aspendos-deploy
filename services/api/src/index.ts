import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getModelsForTier, SUPPORTED_MODELS } from './lib/ai-providers';
import { auditLog } from './lib/audit-log';
import { auth } from './lib/auth';
import { getChangelog, getLatestVersion } from './lib/changelog';
import { breakers } from './lib/circuit-breaker';
import { enforceRetentionPolicies, getRetentionPolicies } from './lib/data-retention';
import { validateEnv } from './lib/env';
import { getErrorCatalog } from './lib/error-codes';
import { AppError } from './lib/errors';
import { getAllFlags, getUserFeatures } from './lib/feature-flags';
import { checkReadiness } from './lib/health-checks';
import { jobQueue } from './lib/job-queue';
import { getPrivacyPolicy, getTermsOfService } from './lib/legal';
import { closeMCPClients, initializeMCPClients } from './lib/mcp-clients';
import { initSentry, Sentry, setSentryRequestContext, setSentryUserContext } from './lib/sentry';
import { getWebhookCategories, getWebhookEventsCatalog } from './lib/webhook-events';
import { apiVersion } from './middleware/api-version';
import { cacheControl } from './middleware/cache';
import { compression } from './middleware/compression';
import { endpointRateLimit } from './middleware/endpoint-rate-limit';
import { idempotency } from './middleware/idempotency';
import { metricsMiddleware } from './middleware/metrics';
import { getRateLimitStatus, rateLimit } from './middleware/rate-limit';
import { botProtection } from './middleware/bot-protection';
import { correlationIdMiddleware } from './middleware/correlation-id';
import { featureHealthMiddleware } from './middleware/feature-health';
import { payloadLimits } from './middleware/payload-limits';
import { sanitizeBody } from './middleware/sanitize';
import { requestTimeout } from './middleware/timeout';
import {
    exportTracesOTLP,
    getTrace,
    getTraceStats,
    getTraces,
    tracingMiddleware,
} from './middleware/tracing';
import adminRoutes from './routes/admin';
import analyticsRoutes from './routes/analytics';
import apiKeysRoutes from './routes/api-keys';
import billingRoutes from './routes/billing';
// Routes
import chatRoutes from './routes/chat';
import councilRoutes from './routes/council';
import gamificationRoutes from './routes/gamification';
import importRoutes from './routes/import';
import memoryRoutes from './routes/memory';
import notificationsRoutes from './routes/notifications';
import pacRoutes from './routes/pac';
import promptTemplatesRoutes from './routes/prompt-templates';
import schedulerRoutes from './routes/scheduler';
import searchRoutes from './routes/search';
import voiceRoutes from './routes/voice';
import workspaceRoutes from './routes/workspace';
import adminBackupsRoutes from './routes/admin-backups';
import complianceRoutes from './routes/user-compliance';
import securityRoutes from './routes/security';
import systemRoutes from './routes/system';
import { getOpenAPISpec } from './lib/openapi-spec';

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

    // Check Qdrant (via circuit breaker) with actual ping
    let qdrantStatus: 'up' | 'down' = 'down';
    try {
        const qdrantStart = Date.now();
        await breakers.qdrant.execute(async () => {
            const { searchMemories } = await import('./services/openmemory.service');
            // Lightweight probe: search with empty query, limit 1
            await searchMemories('health-check-probe', 'system', { limit: 1 });
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

// /.well-known/security.txt - Responsible disclosure
app.get('/.well-known/security.txt', (c) => {
    return c.text(`Contact: security@yula.dev
Expires: 2027-01-01T00:00:00.000Z
Preferred-Languages: en, tr
Canonical: https://api.yula.dev/.well-known/security.txt
Policy: https://yula.dev/security-policy
`);
});

// /status - Service status for status page
app.get('/status', async (c) => {
    const startTime = Date.now();
    const services: Record<string, { status: string; latencyMs?: number }> = {};

    // Check database
    try {
        const { prisma } = await import('./lib/prisma');
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        services.database = { status: 'operational', latencyMs: Date.now() - dbStart };
    } catch {
        services.database = { status: 'outage' };
    }

    // Overall status
    const allOperational = Object.values(services).every((s) => s.status === 'operational');

    return c.json({
        status: allOperational ? 'operational' : 'degraded',
        version: '1.0.0',
        services,
        uptime: process.uptime(),
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
    });
});

// Kubernetes-style readiness probe
app.get('/ready', async (c) => {
    const result = await checkReadiness();
    const status = result.status === 'unhealthy' ? 503 : 200;
    return c.json(result, status);
});

// Deep health check with all dependencies
app.get('/health/deep', async (c) => {
    const result = await checkReadiness();
    return c.json(result);
});

// Prometheus metrics endpoint
app.get('/metrics', async (c) => {
    const { getMetricsText } = await import('./lib/metrics');
    return c.text(getMetricsText(), 200, {
        'Content-Type': 'text/plain; version=0.0.4',
    });
});

// ─── Tracing Endpoints ────────────────────────────────────────────────────────

// GET /api/traces - List recent traces (paginated, filterable)
app.get('/api/traces', (c) => {
    const status = c.req.query('status') as 'ok' | 'error' | undefined;
    const path = c.req.query('path');
    const minDuration = c.req.query('minDuration')
        ? parseInt(c.req.query('minDuration')!, 10)
        : undefined;
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 100;
    const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!, 10) : 0;

    const traces = getTraces({
        status,
        path,
        minDuration,
        limit: Math.min(limit, 500), // Cap at 500
        offset,
    });

    const stats = getTraceStats();

    return c.json({
        traces: traces.map((t) => ({
            traceId: t.traceId,
            startTime: t.startTime,
            endTime: t.endTime,
            duration: t.duration,
            status: t.status,
            method: t.method,
            path: t.path,
            statusCode: t.statusCode,
            userId: t.userId,
            requestId: t.requestId,
            spanCount: t.spans.length,
        })),
        pagination: {
            limit,
            offset,
            total: stats.total,
        },
        stats,
    });
});

// GET /api/traces/:traceId - Get full trace detail with spans
app.get('/api/traces/:traceId', (c) => {
    const traceId = c.req.param('traceId');
    const trace = getTrace(traceId);

    if (!trace) {
        return c.json({ error: 'Trace not found' }, 404);
    }

    return c.json(trace);
});

// GET /api/traces/export/otlp - Export traces in OpenTelemetry format
app.get('/api/traces/export/otlp', (c) => {
    const traceIds = c.req.query('traceIds')?.split(',');
    const otlp = exportTracesOTLP(traceIds);

    return c.json(otlp, 200, {
        'Content-Type': 'application/json',
    });
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
app.get('/api/rate-limit', async (c) => {
    const userId = c.get('userId');
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = c.get('user');
    const tier =
        ((user as Record<string, unknown>)?.tier as 'FREE' | 'STARTER' | 'PRO' | 'ULTRA') || 'FREE';

    return c.json(await getRateLimitStatus(userId, tier));
});

// Rate limit analytics dashboard
app.get('/api/analytics/rate-limits', async (c) => {
    const userId = c.get('userId');
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const { getRateLimitDashboard, getUserRateLimitHistory, getNearLimitEvents } = await import(
            './lib/rate-limit-analytics'
        );

        // Check if requesting user history or full dashboard
        const scope = c.req.query('scope') || 'user';

        if (scope === 'user') {
            // Return user's own rate limit history
            const limit = Math.min(parseInt(c.req.query('limit') || '100', 10) || 100, 500);
            const history = getUserRateLimitHistory(userId, limit);

            return c.json({
                scope: 'user',
                userId,
                history,
            });
        } else if (scope === 'dashboard') {
            // Return full dashboard (could be admin-only in production)
            const dashboard = getRateLimitDashboard();
            const nearLimits = getNearLimitEvents();

            return c.json({
                scope: 'dashboard',
                ...dashboard,
                nearLimitEvents: nearLimits,
            });
        } else {
            return c.json({ error: 'Invalid scope. Use "user" or "dashboard"' }, 400);
        }
    } catch (error) {
        console.error('[RateLimitAnalytics] Error fetching analytics:', error);
        return c.json({ error: 'Failed to fetch rate limit analytics' }, 500);
    }
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

// OpenAPI JSON spec endpoint
app.get('/api/docs/openapi.json', (c) => {
    return c.json(getOpenAPISpec());
});

// Swagger UI endpoint
app.get('/api/docs/ui', (c) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YULA OS API Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@latest/swagger-ui.css" />
    <style>
        body { margin: 0; padding: 0; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 20px 0; }
        @media (prefers-color-scheme: dark) {
            body { background: #1a1a1a; }
            .swagger-ui { filter: invert(88%) hue-rotate(180deg); }
            .swagger-ui img { filter: invert(100%) hue-rotate(180deg); }
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@latest/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@latest/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            SwaggerUIBundle({
                url: '/api/docs/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: 'StandaloneLayout',
                tryItOutEnabled: true,
                persistAuthorization: true,
                displayRequestDuration: true,
                filter: true,
                syntaxHighlight: {
                    activate: true,
                    theme: 'monokai'
                }
            });
        };
    </script>
</body>
</html>`;
    return c.html(html);
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
            achievements,
            xpEvents,
            notifications,
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
            prisma.achievement.findMany({
                where: { userId },
                select: { id: true, type: true, unlockedAt: true, metadata: true },
            }),
            prisma.xPEvent.findMany({
                where: { userId },
                select: { id: true, amount: true, reason: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                take: 500,
            }),
            prisma.notification.findMany({
                where: { userId },
                select: {
                    id: true,
                    type: true,
                    title: true,
                    body: true,
                    read: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 200,
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
            gamification: {
                achievements,
                xpEvents,
            },
            notifications,
            retentionPolicy: {
                description:
                    'YULA retains your data as long as your account is active. Memories older than 365 days without reinforcement may be flagged for cleanup. You can export or delete your data at any time.',
                memoryRetentionDays: 365,
                chatRetentionDays: null, // Retained indefinitely while account is active
                exportAvailable: true,
                deletionAvailable: true,
            },
        });
    } catch (error) {
        console.error('[Export] Data export failed:', error);
        return c.json({ error: 'Export failed' }, 500);
    }
});

// ============================================
// AUDIT LOG ENDPOINT (GDPR Art. 15 - Right of Access)
// ============================================

// GET /api/audit-log - View own audit trail
app.get('/api/audit-log', async (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10) || 50, 200);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10) || 0, 0);

    try {
        const { prisma } = await import('./lib/prisma');
        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    action: true,
                    resource: true,
                    resourceId: true,
                    createdAt: true,
                    // Exclude IP and metadata for user-facing view (security)
                },
            }),
            prisma.auditLog.count({ where: { userId } }),
        ]);

        return c.json({
            logs,
            pagination: { total, limit, offset, hasMore: offset + limit < total },
        });
    } catch (error) {
        console.error('[AuditLog] Query failed:', error);
        return c.json({ error: 'Failed to fetch audit log' }, 500);
    }
});

// ============================================
// CONSENT TRACKING (GDPR Art. 7 - Conditions for Consent)
// ============================================

// GET /api/consent - Get user's consent status
app.get('/api/consent', async (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    try {
        const { prisma } = await import('./lib/prisma');
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { createdAt: true, updatedAt: true },
        });

        // Consent is implicit at signup for core functionality (legitimate interest)
        // Additional consent tracked for optional features
        return c.json({
            coreProcessing: {
                granted: true,
                basis: 'legitimate_interest',
                description: 'Core chat and AI processing required for service delivery',
                grantedAt: user?.createdAt,
            },
            memoryProcessing: {
                granted: true,
                basis: 'consent',
                description: 'Storing and retrieving memories to personalize AI responses',
                withdrawable: true,
            },
            analyticsProcessing: {
                granted: true,
                basis: 'legitimate_interest',
                description: 'Usage analytics for service improvement',
            },
            marketingCommunications: {
                granted: false,
                basis: 'consent',
                description: 'Product updates and promotional emails',
                withdrawable: true,
            },
            dataPortability: {
                available: true,
                endpoint: '/api/export',
            },
            rightToErasure: {
                available: true,
                endpoint: '/api/account',
                method: 'DELETE',
            },
        });
    } catch (error) {
        console.error('[Consent] Query failed:', error);
        return c.json({ error: 'Failed to fetch consent status' }, 500);
    }
});

// ============================================
// NPS / CSAT FEEDBACK (PMF Measurement)
// ============================================

// POST /api/feedback/nps - Submit NPS score
app.post('/api/feedback/nps', async (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    try {
        const body = await c.req.json();
        const score = Number(body.score);
        const comment = typeof body.comment === 'string' ? body.comment.slice(0, 1000) : '';

        if (!Number.isInteger(score) || score < 0 || score > 10) {
            return c.json({ error: 'Score must be an integer between 0 and 10' }, 400);
        }

        const { prisma } = await import('./lib/prisma');

        // Rate limit: 1 NPS per user per day
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const existing = await prisma.notification.findFirst({
            where: { userId, type: 'NPS_RESPONSE', createdAt: { gte: startOfDay } },
        });
        if (existing) {
            return c.json({ error: 'Already submitted NPS today' }, 429);
        }

        // Store as notification record (reusing existing table)
        await prisma.notification.create({
            data: {
                userId,
                type: 'NPS_RESPONSE',
                title: `NPS: ${score}`,
                body: comment || `Score: ${score}/10`,
                read: true, // Not a user-facing notification
                metadata: { score, comment, submittedAt: new Date().toISOString() },
            },
        });

        await auditLog({ userId, action: 'NPS_SUBMIT', resource: 'feedback', metadata: { score } });

        return c.json({ success: true, score });
    } catch (error) {
        console.error('[NPS] Submission failed:', error);
        return c.json({ error: 'Failed to submit feedback' }, 500);
    }
});

// GET /api/feedback/nps/summary - Aggregate NPS score
app.get('/api/feedback/nps/summary', async (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    try {
        const { prisma } = await import('./lib/prisma');

        // Get all NPS responses (admin could see all, users see own)
        const responses = await prisma.notification.findMany({
            where: { type: 'NPS_RESPONSE' },
            select: { metadata: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1000,
        });

        let promoters = 0;
        let passives = 0;
        let detractors = 0;
        const scores: number[] = [];

        for (const r of responses) {
            const meta = r.metadata as { score?: number } | null;
            const score = meta?.score;
            if (typeof score !== 'number') continue;
            scores.push(score);
            if (score >= 9) promoters++;
            else if (score >= 7) passives++;
            else detractors++;
        }

        const total = promoters + passives + detractors;
        const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

        return c.json({
            npsScore,
            totalResponses: total,
            distribution: { promoters, passives, detractors },
            avgScore:
                scores.length > 0
                    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
                    : 0,
        });
    } catch (error) {
        console.error('[NPS] Summary failed:', error);
        return c.json({ error: 'Failed to fetch NPS summary' }, 500);
    }
});

// ============================================
// CHURN RE-ENGAGEMENT (Scheduler endpoint)
// ============================================

// POST /api/scheduler/reengage - Trigger re-engagement for churning users (cron job)
app.post('/api/scheduler/reengage', async (c) => {
    // Verify cron secret
    const cronSecret = c.req.header('x-cron-secret');
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const { prisma } = await import('./lib/prisma');

        // Find users who haven't sent a message in 7+ days but were active before
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Get users with recent activity (30d) but no activity in last 7d
        const activeUsers = await prisma.message.groupBy({
            by: ['userId'],
            where: {
                role: 'user',
                createdAt: { gte: thirtyDaysAgo },
            },
            having: { userId: { _count: { gte: 5 } } },
        });

        let reengaged = 0;
        for (const user of activeUsers) {
            // Check if they have recent activity
            const recentMessage = await prisma.message.findFirst({
                where: { userId: user.userId, role: 'user', createdAt: { gte: sevenDaysAgo } },
            });

            if (recentMessage) continue; // Still active, skip

            // Check if we already sent a re-engagement this week
            const existingNotification = await prisma.notification.findFirst({
                where: {
                    userId: user.userId,
                    type: 'REENGAGEMENT',
                    createdAt: { gte: sevenDaysAgo },
                },
            });

            if (existingNotification) continue; // Already notified

            // Create re-engagement notification
            await prisma.notification.create({
                data: {
                    userId: user.userId,
                    type: 'REENGAGEMENT',
                    title: 'We miss you!',
                    body: "It's been a while since we chatted. I've been thinking about some topics from our last conversation...",
                    read: false,
                },
            });
            reengaged++;
        }

        return c.json({ success: true, reengagedUsers: reengaged });
    } catch (error) {
        console.error('[Reengage] Failed:', error);
        return c.json({ error: 'Re-engagement failed' }, 500);
    }
});

// ─── CRON: Data Retention Policy Enforcement ─────────────────────────────────
app.post('/api/cron/retention', async (c) => {
    const secret = c.req.header('x-cron-secret');
    if (secret !== process.env.CRON_SECRET) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const results = await enforceRetentionPolicies();
        const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);
        const errors = results.filter((r) => r.error);

        console.info(
            JSON.stringify({
                event: 'retention_enforced',
                timestamp: new Date().toISOString(),
                totalDeleted,
                results,
            })
        );

        return c.json({ success: true, totalDeleted, results, errors: errors.length });
    } catch (error) {
        console.error('[Retention] Failed:', error);
        return c.json({ error: 'Retention enforcement failed' }, 500);
    }
});

// ─── CRON: Get Retention Policies ────────────────────────────────────────────
app.get('/api/cron/retention/policies', (c) => {
    return c.json({ policies: getRetentionPolicies() });
});

// ─── GDPR Article 20: Data Portability ───────────────────────────────────────
app.get('/api/account/export', async (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    try {
        const { prisma } = await import('./lib/prisma');

        const [
            user,
            chats,
            memories,
            billingAccount,
            pacReminders,
            pacSettings,
            councilSessions,
            gamificationProfile,
            notificationPreferences,
        ] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, name: true, tier: true, createdAt: true },
            }),
            prisma.chat.findMany({
                where: { userId },
                include: {
                    messages: {
                        select: {
                            role: true,
                            content: true,
                            modelUsed: true,
                            tokensIn: true,
                            tokensOut: true,
                            costUsd: true,
                            createdAt: true,
                        },
                    },
                },
            }),
            prisma.memory.findMany({
                where: { userId },
                select: {
                    content: true,
                    summary: true,
                    type: true,
                    sector: true,
                    importance: true,
                    tags: true,
                    createdAt: true,
                },
            }),
            prisma.billingAccount.findUnique({
                where: { userId },
                include: {
                    creditHistory: { select: { amount: true, reason: true, createdAt: true } },
                },
            }),
            prisma.pACReminder.findMany({
                where: { userId },
                select: { message: true, status: true, scheduledFor: true, createdAt: true },
            }),
            prisma.pACSettings.findUnique({ where: { userId } }),
            prisma.councilSession.findMany({
                where: { userId },
                include: {
                    responses: { select: { modelId: true, content: true, createdAt: true } },
                },
            }),
            prisma.gamificationProfile.findUnique({
                where: { userId },
                include: { achievements: true, xpLogs: true },
            }),
            prisma.notificationPreferences.findUnique({ where: { userId } }),
        ]);

        const exportData = {
            exportedAt: new Date().toISOString(),
            gdprArticle: '20',
            user,
            chats: chats.map((chat) => ({
                title: chat.title,
                model: chat.modelPreference,
                createdAt: chat.createdAt,
                messages: chat.messages,
            })),
            memories,
            billing: billingAccount,
            pacReminders,
            pacSettings,
            councilSessions: councilSessions.map((s) => ({
                query: s.query,
                responses: s.responses,
                createdAt: s.createdAt,
            })),
            gamification: gamificationProfile,
            notificationPreferences,
        };

        return c.json(exportData, 200, {
            'Content-Disposition': `attachment; filename="yula-export-${userId}.json"`,
        });
    } catch (error) {
        console.error('[GDPR Export] Failed:', error);
        return c.json({ error: 'Export failed' }, 500);
    }
});

// ─── Error Catalog & Docs ────────────────────────────────────────────────────
app.get('/api/errors', (c) => {
    return c.json({ errors: getErrorCatalog() });
});

// ─── Webhook Events Catalog ──────────────────────────────────────────────────
app.get('/api/webhooks/events', (c) => {
    const category = c.req.query('category');
    return c.json({
        events: getWebhookEventsCatalog(category),
        categories: getWebhookCategories(),
    });
});

// ─── Feature Flags ───────────────────────────────────────────────────────────
app.get('/api/features', (c) => {
    const userId = c.get('userId');
    const user = c.get('user');
    const tier = ((user as unknown as Record<string, unknown>)?.tier as string) || 'FREE';
    return c.json({
        features: getUserFeatures(userId, tier as 'FREE' | 'STARTER' | 'PRO' | 'ULTRA'),
    });
});

app.get('/api/features/all', (c) => {
    return c.json({ flags: getAllFlags() });
});

// ─── Changelog ───────────────────────────────────────────────────────────────
app.get('/api/changelog', (c) => {
    const type = c.req.query('type');
    const limit = parseInt(c.req.query('limit') || '20', 10);
    return c.json({ changelog: getChangelog(type, limit), latest: getLatestVersion() });
});

// ─── Legal Documents ─────────────────────────────────────────────────────────
app.get('/api/legal/terms', (c) => c.json(getTermsOfService()));
app.get('/api/legal/privacy', (c) => c.json(getPrivacyPolicy()));

// ─── Job Queue Status ────────────────────────────────────────────────────────
app.get('/api/jobs/stats', (c) => {
    const queue = c.req.query('queue');
    return c.json({
        stats: jobQueue.getStats(queue || undefined),
        deadLetterQueue: jobQueue.getDeadLetterQueue().length,
    });
});

app.get('/api/jobs/dead-letter', (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    return c.json({ jobs: jobQueue.getDeadLetterQueue().slice(0, 100) });
});

app.post('/api/jobs/retry/:jobId', (c) => {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const jobId = c.req.param('jobId');
    const success = jobQueue.retryDead(jobId);
    return c.json({ success });
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
app.route('/api/workspace', workspaceRoutes);
app.route('/api/compliance', complianceRoutes);
app.route('/api/security', securityRoutes);
app.route('/api/system', systemRoutes);

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
        await new Promise((resolve) => setTimeout(resolve, 30000));

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

    return server;
}

// Don't start server when running tests
if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
    startServer().catch(console.error);
}

export default app;
