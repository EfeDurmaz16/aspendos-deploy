import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { clerkAuth } from './middleware/auth';

// Routes
import chatRoutes from './routes/chat';
import memoryRoutes from './routes/memory';
import billingRoutes from './routes/billing';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
    origin: ['http://localhost:3000', 'https://aspendos.net'],
    credentials: true,
}));

// Apply Clerk auth to all routes (optional - doesn't block)
app.use('*', clerkAuth);

// Health check
app.get('/health', (c) => c.json({
    status: 'ok',
    service: 'api',
    version: '0.2.0',
    timestamp: new Date().toISOString()
}));

// Models endpoint (proxy to agent service)
app.get('/api/models', async (c) => {
    const agentsUrl = process.env.AGENTS_URL || 'http://localhost:8082';
    try {
        const response = await fetch(`${agentsUrl}/models`);
        const data = await response.json();
        return c.json(data);
    } catch (error) {
        return c.json({ error: 'Agent service unavailable' }, 503);
    }
});

app.get('/api/models/pinned', async (c) => {
    const agentsUrl = process.env.AGENTS_URL || 'http://localhost:8082';
    try {
        const response = await fetch(`${agentsUrl}/models/pinned`);
        const data = await response.json();
        return c.json(data);
    } catch (error) {
        return c.json({ error: 'Agent service unavailable' }, 503);
    }
});

// API Routes
app.route('/api/chat', chatRoutes);
app.route('/api/memory', memoryRoutes);
app.route('/api/billing', billingRoutes);

// Start server
const port = parseInt(process.env.PORT || '8080');
console.log(`🚀 Aspendos API Server starting on port ${port}`);

serve({
    fetch: app.fetch,
    port,
});

export default app;
