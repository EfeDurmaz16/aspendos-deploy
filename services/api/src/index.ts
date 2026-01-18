import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { clerkAuth } from './middleware/auth';
import { auth } from './lib/auth';
import { rateLimit, getRateLimitStatus } from './middleware/rate-limit';
import { initializeMCPClients, closeMCPClients, getConnectedMCPServers, getMCPStatus } from './lib/mcp-clients';
import { SUPPORTED_MODELS, getModelsForTier } from './lib/ai-providers';

// Routes
import chatRoutes from './routes/chat';
import memoryRoutes from './routes/memory';
import billingRoutes from './routes/billing';
import voiceRoutes from './routes/voice';

type Variables = {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
};

const app = new Hono<{ Variables: Variables }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
    origin: ['http://localhost:3000', 'https://aspendos.net'],
    credentials: true,
}));

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

// Apply Clerk auth to all routes (optional - doesn't block)
app.use('*', clerkAuth);

// Apply rate limiting
app.use('*', rateLimit());

// Health check
app.get('/health', (c) => c.json({
    status: 'ok',
    service: 'api',
    version: '0.3.0',
    timestamp: new Date().toISOString(),
    mcp: {
        initialized: getConnectedMCPServers().length > 0,
        servers: getConnectedMCPServers(),
        status: getMCPStatus(),
    },
}));

// Models endpoint - now uses local configuration
app.get('/api/models', (c) => {
    return c.json({
        models: SUPPORTED_MODELS.map(m => ({
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
        models: models.map(m => ({
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
    const tier = ((user as Record<string, unknown>)?.tier as 'STARTER' | 'PRO' | 'ULTRA') || 'STARTER';

    return c.json(getRateLimitStatus(userId, tier));
});

// Pinned/recommended models
app.get('/api/models/pinned', (c) => {
    const pinnedModels = [
        SUPPORTED_MODELS.find(m => m.id === 'openai/gpt-4o-mini'),
        SUPPORTED_MODELS.find(m => m.id === 'anthropic/claude-3-5-haiku-20241022'),
        SUPPORTED_MODELS.find(m => m.id === 'google/gemini-2.0-flash'),
    ].filter(Boolean);

    return c.json({
        pinned: pinnedModels.map(m => ({
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
app.route('/api/memory', memoryRoutes);
app.route('/api/billing', billingRoutes);
app.route('/api/voice', voiceRoutes);

// Start server with MCP initialization
const port = parseInt(process.env.PORT || '8080');

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
