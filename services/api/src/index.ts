import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

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

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

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
