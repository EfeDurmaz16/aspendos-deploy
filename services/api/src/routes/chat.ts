/**
 * Chat API Routes
 * Handles chat CRUD and message streaming via Agent Service.
 * Uses OpenMemory for cognitive memory retrieval.
 */
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { requireAuth } from '../middleware/auth';
import * as chatService from '../services/chat.service';
import * as openMemory from '../services/openmemory.service';

const app = new Hono();

// Agent service URL
const AGENTS_URL = process.env.AGENTS_URL || 'http://localhost:8082';

// Apply auth middleware to all routes
app.use('*', requireAuth);

// GET /api/chat - List all chats for user
app.get('/', async (c) => {
    const userId = c.get('userId')!;
    const user = c.get('user')!;

    // Ensure user exists in database
    await chatService.getOrCreateUser(userId, user.email, user.firstName);

    const chats = await chatService.listChats({ userId });

    return c.json({ chats });
});

// POST /api/chat - Create a new chat
app.post('/', async (c) => {
    const userId = c.get('userId')!;
    const user = c.get('user')!;
    const body = await c.req.json();

    // Ensure user exists
    await chatService.getOrCreateUser(userId, user.email, user.firstName);

    const chat = await chatService.createChat({
        userId,
        title: body.title,
        modelPreference: body.model_id,
    });

    return c.json(chat, 201);
});

// GET /api/chat/:id - Get chat by ID with messages
app.get('/:id', async (c) => {
    const userId = c.get('userId')!;
    const chatId = c.req.param('id');

    const chat = await chatService.getChatWithMessages(chatId, userId);

    if (!chat) {
        return c.json({ error: 'Chat not found' }, 404);
    }

    return c.json(chat);
});

// PATCH /api/chat/:id - Update chat
app.patch('/:id', async (c) => {
    const userId = c.get('userId')!;
    const chatId = c.req.param('id');
    const body = await c.req.json();

    await chatService.updateChat(chatId, userId, {
        title: body.title,
        modelPreference: body.model_id,
        isArchived: body.is_archived,
    });

    return c.json({ success: true });
});

// DELETE /api/chat/:id - Delete chat
app.delete('/:id', async (c) => {
    const userId = c.get('userId')!;
    const chatId = c.req.param('id');

    await chatService.deleteChat(chatId, userId);

    return c.json({ success: true });
});

// POST /api/chat/:id/message - Send a message (streaming)
app.post('/:id/message', async (c) => {
    const userId = c.get('userId')!;
    const chatId = c.req.param('id');
    const body = await c.req.json();

    const { content, model_id, routing_mode, enable_thinking, stream: shouldStream } = body;

    // Verify chat exists and belongs to user
    const chat = await chatService.getChat(chatId, userId);
    if (!chat) {
        return c.json({ error: 'Chat not found' }, 404);
    }

    // Save user message to database
    const userMessage = await chatService.createMessage({
        chatId,
        userId,
        role: 'user',
        content,
    });

    // Auto-generate title if this is the first message
    const existingMessages = await chatService.getMessages(chatId);
    if (existingMessages.length === 1) {
        await chatService.autoGenerateTitle(chatId, content);
    }

    // ========================================
    // OPENMEMORY RETRIEVAL
    // ========================================
    let memoriesUsed: { id: string; content: string; sector: string; confidence: number; trace?: { recall_reason: string } }[] = [];

    try {
        // Search memories using OpenMemory (with explainable traces)
        const memories = await openMemory.searchMemories(content, userId, { limit: 5 });

        memoriesUsed = memories.map(m => ({
            id: m.id,
            content: m.content,
            sector: m.sector || 'semantic',
            confidence: m.salience || 0.8,
            trace: m.trace,
        }));
    } catch (error) {
        console.error('[Memory] OpenMemory search failed:', error);
        // Continue without memory context
    }

    // Get message history for context
    const history = existingMessages.map(m => ({
        role: m.role,
        content: m.content,
    }));

    // Build request to agent service
    const agentRequest = {
        messages: history,
        model_id: model_id || chat.modelPreference || 'openai/gpt-5.2',
        user_id: userId,
        chat_id: chatId,
        include_mcp_tools: true,
        stream: shouldStream !== false,
        routing_mode: routing_mode || 'manual',
        enable_thinking: enable_thinking || false,
        temperature: 0.7,
        // Include memory context if using memory
        memory_context: decision.useMemory ? memoriesUsed.map(m => m.content).join('\n\n') : undefined,
    };

    // Stream response from agent service
    if (shouldStream !== false) {
        return streamSSE(c, async (stream) => {
            let fullContent = '';
            let modelUsed = model_id;

            try {
                // ========================================
                // EMIT DECISION EVENT (Transparency)
                // ========================================
                await stream.writeSSE({
                    data: JSON.stringify({
                        type: 'decision',
                        queryType: decision.queryType,
                        useMemory: decision.useMemory,
                        sectors: decision.sectors,
                        reasoning: decision.reasoning,
                    })
                });

                // Emit memories used if any
                if (memoriesUsed.length > 0) {
                    await stream.writeSSE({
                        data: JSON.stringify({
                            type: 'memories_used',
                            memories: memoriesUsed,
                        })
                    });
                }

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

                    // Parse SSE events
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));

                                if (data.type === 'token') {
                                    fullContent += data.content;
                                }
                                if (data.type === 'routing') {
                                    modelUsed = data.model;
                                }

                                await stream.writeSSE({ data: JSON.stringify(data) });
                            } catch {
                                // Skip malformed JSON
                            }
                        }
                    }
                }

                // Save assistant message to database
                await chatService.createMessage({
                    chatId,
                    userId,
                    role: 'assistant',
                    content: fullContent,
                    modelUsed,
                });

                await stream.writeSSE({ data: JSON.stringify({ type: 'end' }) });

            } catch (error) {
                console.error('Streaming error:', error);
                await stream.writeSSE({
                    data: JSON.stringify({ type: 'error', message: String(error) })
                });
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

        const result = await response.json() as { content: string; model_used: string; routing?: unknown };

        // Save assistant message
        const assistantMessage = await chatService.createMessage({
            chatId,
            userId,
            role: 'assistant',
            content: result.content,
            modelUsed: result.model_used,
        });

        return c.json({
            userMessage,
            assistantMessage,
            routing: result.routing,
        });
    } catch (error) {
        console.error('Chat error:', error);
        return c.json({ error: 'Failed to get response from agent' }, 500);
    }
});

// POST /api/chat/:id/multi - Multi-model comparison (ULTRA only)
app.post('/:id/multi', async (c) => {
    const userId = c.get('userId')!;
    const chatId = c.req.param('id');
    const body = await c.req.json();

    // Verify chat exists
    const chat = await chatService.getChat(chatId, userId);
    if (!chat) {
        return c.json({ error: 'Chat not found' }, 404);
    }

    // TODO: Check user tier is ULTRA

    const { content, models } = body;

    // Save user message
    await chatService.createMessage({
        chatId,
        userId,
        role: 'user',
        content,
    });

    // Get message history
    const messages = await chatService.getMessages(chatId);
    const history = messages.map(m => ({
        role: m.role,
        content: m.content,
    }));

    const agentRequest = {
        messages: history,
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
