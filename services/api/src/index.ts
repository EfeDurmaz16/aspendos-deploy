import { serve } from '@hono/node-server';
import * as Sentry from '@sentry/node';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getModelsForTier, SUPPORTED_MODELS } from './lib/ai-providers';
import { auth } from './lib/auth';
import {
    closeMCPClients,
    getConnectedMCPServers,
    getMCPStatus,
    initializeMCPClients,
} from './lib/mcp-clients';
import { getRateLimitStatus, rateLimit } from './middleware/rate-limit';
import analyticsRoutes from './routes/analytics';
import billingRoutes from './routes/billing';
// Routes
import chatRoutes from './routes/chat';
import importRoutes from './routes/import';
import memoryRoutes from './routes/memory';
import notificationsRoutes from './routes/notifications';
import schedulerRoutes from './routes/scheduler';
import voiceRoutes from './routes/voice';

// Initialize Sentry
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        integrations: [
            Sentry.httpIntegration(),
            Sentry.captureConsoleIntegration({ levels: ['error'] }),
        ],
    });
    console.log('[Sentry] Initialized for API service');
} else {
    console.log('[Sentry] DSN not configured, error tracking disabled');
}

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

app.use(
    '*',
    cors({
        origin: ['http://localhost:3000', 'https://aspendos.net'],
        credentials: true,
    })
);

// Sentry error handling middleware
app.use('*', async (c, next) => {
    try {
        await next();
    } catch (err) {
        // Capture error in Sentry
        Sentry.captureException(err, {
            extra: {
                path: c.req.path,
                method: c.req.method,
                headers: Object.fromEntries(c.req.raw.headers.entries()),
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
        await next();
        return;
    }

    c.set('user', session.user);
    c.set('session', session.session);
    await next();
});

// Apply rate limiting
app.use('*', rateLimit());

// Health check
app.get('/health', (c) =>
    c.json({
        status: 'ok',
        service: 'api',
        version: '0.3.0',
        timestamp: new Date().toISOString(),
        mcp: {
            initialized: getConnectedMCPServers().length > 0,
            servers: getConnectedMCPServers(),
            status: getMCPStatus(),
        },
    })
);

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
    const tier = c.req.param('tier').toUpperCase() as 'STARTER' | 'PRO' | 'ULTRA';
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
        ((user as Record<string, unknown>)?.tier as 'STARTER' | 'PRO' | 'ULTRA') || 'STARTER';

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

// Public: Get shared chat by token (no auth required)
app.get('/api/chat/shared/:token', async (c) => {
    const { getSharedChat } = await import('./services/chat.service');
    const token = c.req.param('token');

    const sharedChat = await getSharedChat(token);

    if (!sharedChat) {
        return c.json({ error: 'Shared chat not found or expired' }, 404);
    }

    return c.json(sharedChat);
});

// API Routes
app.route('/api/chat', chatRoutes);
app.route('/api/import', importRoutes);
app.route('/api/memory', memoryRoutes);
app.route('/api/billing', billingRoutes);
app.route('/api/voice', voiceRoutes);
app.route('/api/scheduler', schedulerRoutes);
app.route('/api/notifications', notificationsRoutes);
app.route('/api/analytics', analyticsRoutes);

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
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    return server;
}

startServer().catch(console.error);

export default app;
