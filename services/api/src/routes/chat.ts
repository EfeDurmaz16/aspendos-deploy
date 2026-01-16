/**
 * Chat API Routes
 * Handles chat CRUD and message streaming via Agent Service.
 */
import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { requireAuth } from '../middleware/auth';

const app = new Hono();

// Agent service URL
const AGENTS_URL = process.env.AGENTS_URL || 'http://localhost:8082';

// Apply auth middleware to all routes
app.use('*', requireAuth);

// GET /api/chat - List all chats for user
app.get('/', async (c) => {
    const userId = c.get('userId');

    // TODO: Implement with Prisma
    return c.json({
        chats: [],
        userId,
    });
});

// POST /api/chat - Create a new chat
app.post('/', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json();

    // TODO: Implement with Prisma
    const chatId = `chat_${Date.now()}`;

    return c.json({
        id: chatId,
        title: body.title || 'New Chat',
        userId,
    }, 201);
});

// GET /api/chat/:id - Get chat by ID with messages
app.get('/:id', async (c) => {
    const userId = c.get('userId');
    const chatId = c.req.param('id');

    // TODO: Implement with Prisma
    return c.json({
        id: chatId,
        userId,
        messages: []
    });
});

// POST /api/chat/:id/message - Send a message (streaming)
app.post('/:id/message', async (c) => {
    const userId = c.get('userId');
    const chatId = c.req.param('id');
    const body = await c.req.json();

    const { content, model_id, routing_mode, enable_thinking, stream: shouldStream } = body;

    // Build request to agent service
    const agentRequest = {
        messages: [
            ...body.history || [],
            { role: 'user', content }
        ],
        model_id: model_id || 'openai/gpt-5.2',
        user_id: userId,
        chat_id: chatId,
        include_mcp_tools: true,
        stream: shouldStream !== false,
        routing_mode: routing_mode || 'manual',
        enable_thinking: enable_thinking || false,
        temperature: 0.7,
    };

    // Stream response from agent service
    if (shouldStream !== false) {
        return stream(c, async (streamWriter) => {
            try {
                const response = await fetch(`${AGENTS_URL}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(agentRequest),
                });

                if (!response.ok) {
                    throw new Error(`Agent service error: ${response.status}`);
                }

                const reader = response.body?.getReader();
                if (!reader) throw new Error('No response body');

                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    await streamWriter.write(chunk);
                }
            } catch (error) {
                console.error('Streaming error:', error);
                await streamWriter.write(`data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`);
            }
        }, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',
            }
        });
    }

    // Non-streaming response
    try {
        const response = await fetch(`${AGENTS_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...agentRequest, stream: false }),
        });

        if (!response.ok) {
            throw new Error(`Agent service error: ${response.status}`);
        }

        const result = await response.json();

        return c.json({
            id: `msg_${Date.now()}`,
            chatId,
            role: 'assistant',
            content: result.content,
            model_used: result.model_used,
            routing: result.routing,
        });
    } catch (error) {
        console.error('Chat error:', error);
        return c.json({ error: 'Failed to get response from agent' }, 500);
    }
});

// POST /api/chat/:id/multi - Multi-model comparison (ULTRA only)
app.post('/:id/multi', async (c) => {
    const userId = c.get('userId');
    const chatId = c.req.param('id');
    const body = await c.req.json();

    // TODO: Check user tier is ULTRA

    const { content, models, history } = body;

    const agentRequest = {
        messages: [
            ...history || [],
            { role: 'user', content }
        ],
        models: models || ['openai/gpt-5.2', 'anthropic/claude-sonnet-4.5', 'google/gemini-3-flash-preview'],
        user_id: userId,
        chat_id: chatId,
    };

    try {
        const response = await fetch(`${AGENTS_URL}/chat/multi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agentRequest),
        });

        if (!response.ok) {
            throw new Error(`Agent service error: ${response.status}`);
        }

        const result = await response.json();
        return c.json(result);

    } catch (error) {
        console.error('Multi-model error:', error);
        return c.json({ error: 'Failed to get multi-model response' }, 500);
    }
});

export default app;
