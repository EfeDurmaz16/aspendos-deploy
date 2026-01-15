import { Hono } from 'hono';

const app = new Hono();

// GET /api/chat - List all chats for user
app.get('/', async (c) => {
    // TODO: Implement with Prisma
    return c.json({ chats: [] });
});

// POST /api/chat - Create a new chat
app.post('/', async (c) => {
    const body = await c.req.json();
    // TODO: Implement with Prisma
    return c.json({ id: 'new-chat-id', title: body.title || 'New Chat' }, 201);
});

// GET /api/chat/:id - Get chat by ID with messages
app.get('/:id', async (c) => {
    const chatId = c.req.param('id');
    // TODO: Implement with Prisma
    return c.json({ id: chatId, messages: [] });
});

// POST /api/chat/:id/message - Send a message (streaming)
app.post('/:id/message', async (c) => {
    const chatId = c.req.param('id');
    const body = await c.req.json();

    // TODO: Implement with Model Router and streaming
    return c.json({
        id: 'new-message-id',
        chatId,
        role: 'assistant',
        content: 'Hello! This is a placeholder response.',
    });
});

export default app;
