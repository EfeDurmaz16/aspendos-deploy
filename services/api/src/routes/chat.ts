/**
 * Chat API Routes
 * Handles chat CRUD and message streaming via Vercel AI SDK.
 * Uses OpenMemory for cognitive memory retrieval.
 */

import { generateText, stepCountIs, streamText } from 'ai';
import { Hono } from 'hono';
import { getModel, isModelAvailableForTier } from '../lib/ai-providers';
import { getMCPTools, isMCPInitialized } from '../lib/mcp-clients';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import * as chatService from '../services/chat.service';
import { getMemoryAgent, type MemoryDecision } from '../services/memory-agent';
import * as openMemory from '../services/openmemory.service';
import { getToolsForTier, type UserTier } from '../tools';
import {
    chatIdParamSchema,
    createChatSchema,
    forkChatSchema,
    messageFeedbackSchema,
    messageIdParamSchema,
    multiModelSchema,
    sendMessageSchema,
    updateChatSchema,
} from '../validation/chat.schema';

// Message type for AI SDK
interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

const app = new Hono();

// Apply auth middleware to all routes
app.use('*', requireAuth);

// GET /api/chat - List all chats for user
app.get('/', async (c) => {
    const userId = c.get('userId')!;
    const user = c.get('user')!;

    // Ensure user exists in database
    await chatService.getOrCreateUser(userId, user.email, user.name);

    const chats = await chatService.listChats({ userId });

    return c.json({ chats });
});

// POST /api/chat - Create a new chat
app.post('/', validateBody(createChatSchema), async (c) => {
    const userId = c.get('userId')!;
    const user = c.get('user')!;
    const validatedBody = c.get('validatedBody') as {
        title?: string;
        model_id?: string;
    };

    // Ensure user exists
    await chatService.getOrCreateUser(userId, user.email, user.name);

    const chat = await chatService.createChat({
        userId,
        title: validatedBody.title,
        modelPreference: validatedBody.model_id,
    });

    return c.json(chat, 201);
});

// GET /api/chat/:id - Get chat by ID with messages
app.get('/:id', validateParams(chatIdParamSchema), async (c) => {
    const userId = c.get('userId')!;
    const validatedParams = c.get('validatedParams') as { id: string };
    const chatId = validatedParams.id;

    const chat = await chatService.getChatWithMessages(chatId, userId);

    if (!chat) {
        return c.json({ error: 'Chat not found' }, 404);
    }

    return c.json(chat);
});

// PATCH /api/chat/:id - Update chat
app.patch('/:id', validateParams(chatIdParamSchema), validateBody(updateChatSchema), async (c) => {
    const userId = c.get('userId')!;
    const validatedParams = c.get('validatedParams') as { id: string };
    const validatedBody = c.get('validatedBody') as {
        title?: string;
        model_id?: string;
        is_archived?: boolean;
    };
    const chatId = validatedParams.id;

    await chatService.updateChat(chatId, userId, {
        title: validatedBody.title,
        modelPreference: validatedBody.model_id,
        isArchived: validatedBody.is_archived,
    });

    return c.json({ success: true });
});

// DELETE /api/chat/:id - Delete chat
app.delete('/:id', validateParams(chatIdParamSchema), async (c) => {
    const userId = c.get('userId')!;
    const validatedParams = c.get('validatedParams') as { id: string };
    const chatId = validatedParams.id;

    await chatService.deleteChat(chatId, userId);

    return c.json({ success: true });
});

// POST /api/chat/:id/message - Send a message (streaming)
app.post(
    '/:id/message',
    validateParams(chatIdParamSchema),
    validateBody(sendMessageSchema),
    async (c) => {
        const userId = c.get('userId')!;
        const validatedParams = c.get('validatedParams') as { id: string };
        const validatedBody = c.get('validatedBody') as {
            content: string;
            model_id?: string;
            enable_thinking?: boolean;
            stream: boolean;
        };
        const chatId = validatedParams.id;

        const { content, model_id, enable_thinking, stream: shouldStream } = validatedBody;

    // Get user tier (default to STARTER if not available)
    const user = c.get('user');
    const userTier: UserTier =
        ((user as unknown as Record<string, unknown>)?.tier as UserTier) || 'STARTER';

    // Verify chat exists and belongs to user
    const chat = await chatService.getChat(chatId, userId);
    if (!chat) {
        return c.json({ error: 'Chat not found' }, 404);
    }

    // Determine model to use
    const modelId = model_id || chat.modelPreference || 'openai/gpt-4o-mini';

    // Validate model is available for user's tier
    if (!isModelAvailableForTier(modelId, userTier)) {
        return c.json({ error: 'Model not available for your tier' }, 403);
    }

    // Save user message to database
    await chatService.createMessage({
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
    // MEMORY DECISION LAYER
    // ========================================
    const memoryAgent = getMemoryAgent();
    const decision = await memoryAgent.decideMemoryUsage(userId, content);

    // ========================================
    // OPENMEMORY RETRIEVAL
    // ========================================
    let memoriesUsed: {
        id: string;
        content: string;
        sector: string;
        confidence: number;
        trace?: { recall_reason: string };
    }[] = [];

    if (decision.useMemory) {
        try {
            const memories = await openMemory.searchMemories(content, userId, { limit: 5 });
            memoriesUsed = memories.map((m) => ({
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
    }

    // Build message history
    const history: Message[] = existingMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
    }));

    // Build system prompt with memory context
    const systemPrompt = buildSystemPrompt(decision, memoriesUsed, enable_thinking);

    // Get tools for user's tier
    const tools = getToolsForTier(userTier, userId);

    // Merge MCP tools if available
    let allTools = { ...tools };
    if (isMCPInitialized()) {
        try {
            const mcpTools = await getMCPTools();
            allTools = { ...tools, ...mcpTools };
        } catch (error) {
            console.error('[MCP] Failed to get MCP tools:', error);
        }
    }

    // ========================================
    // STREAMING RESPONSE
    // ========================================
    if (shouldStream) {
        try {
            const result = streamText({
                model: getModel(modelId),
                system: systemPrompt,
                messages: history,
                tools: allTools,
                stopWhen: stepCountIs(5), // Allow up to 5 tool calls
                temperature: 0.7,
                onFinish: async ({ text, usage }) => {
                    // Save assistant message to database
                    await chatService.createMessage({
                        chatId,
                        userId,
                        role: 'assistant',
                        content: text,
                        modelUsed: modelId,
                        tokensIn: usage?.totalTokens,
                        tokensOut: usage?.totalTokens,
                    });
                },
            });

            // Return AI SDK compatible stream response
            // Include custom headers for decision metadata
            const response = result.toTextStreamResponse({
                headers: {
                    'X-Memory-Decision': JSON.stringify({
                        useMemory: decision.useMemory,
                        queryType: decision.queryType,
                        sectors: decision.sectors,
                        reasoning: decision.reasoning,
                    }),
                    'X-Memories-Used': JSON.stringify(
                        memoriesUsed.map((m) => ({
                            id: m.id,
                            sector: m.sector,
                            confidence: m.confidence,
                        }))
                    ),
                },
            });

            return response;
        } catch (error) {
            console.error('[Chat] Streaming error:', error);
            return c.json(
                {
                    error: 'Failed to stream response',
                    details: error instanceof Error ? error.message : 'Unknown error',
                },
                500
            );
        }
    }

    // ========================================
    // NON-STREAMING RESPONSE
    // ========================================
    try {
        const result = await generateText({
            model: getModel(modelId),
            system: systemPrompt,
            messages: history,
            tools: allTools,
            stopWhen: stepCountIs(5),
            temperature: 0.7,
        });

        // Save assistant message
        const assistantMessage = await chatService.createMessage({
            chatId,
            userId,
            role: 'assistant',
            content: result.text,
            modelUsed: modelId,
            tokensIn: result.usage?.totalTokens,
            tokensOut: result.usage?.totalTokens,
        });

        return c.json({
            message: assistantMessage,
            decision,
            memoriesUsed,
            usage: result.usage,
            toolCalls: result.toolCalls,
        });
    } catch (error) {
        console.error('[Chat] Generation error:', error);
        return c.json(
            {
                error: 'Failed to generate response',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            500
        );
    }
});

// POST /api/chat/:id/multi - Multi-model comparison (ULTRA only)
app.post(
    '/:id/multi',
    validateParams(chatIdParamSchema),
    validateBody(multiModelSchema),
    async (c) => {
        const userId = c.get('userId')!;
        const validatedParams = c.get('validatedParams') as { id: string };
        const validatedBody = c.get('validatedBody') as {
            content: string;
            models: string[];
        };
        const chatId = validatedParams.id;
        const user = c.get('user');
        const userTier: UserTier =
            ((user as unknown as Record<string, unknown>)?.tier as UserTier) || 'STARTER';

        // Check ULTRA tier
        if (userTier !== 'ULTRA') {
            return c.json({ error: 'Multi-model comparison requires ULTRA tier' }, 403);
        }

        // Verify chat exists
        const chat = await chatService.getChat(chatId, userId);
        if (!chat) {
            return c.json({ error: 'Chat not found' }, 404);
        }

        const { content, models } = validatedBody;

    // Save user message
    await chatService.createMessage({
        chatId,
        userId,
        role: 'user',
        content,
    });

    // Get message history
    const messages = await chatService.getMessages(chatId);
    const history: Message[] = messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
    }));

    // Run all models in parallel
    const results = await Promise.allSettled(
        models.map(async (modelId: string) => {
            try {
                const result = await generateText({
                    model: getModel(modelId),
                    messages: history,
                    temperature: 0.7,
                });
                return {
                    modelId,
                    text: result.text,
                    usage: result.usage,
                };
            } catch (error) {
                return {
                    modelId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        })
    );

    const responses = results.map((r, i) => {
        if (r.status === 'fulfilled') {
            return r.value;
        }
        return {
            modelId: models[i],
            error: 'Failed to generate response',
        };
    });

    return c.json({ responses });
});

/**
 * Build system prompt with memory context
 */
function buildSystemPrompt(
    decision: MemoryDecision,
    memories: { content: string; sector: string; confidence: number }[],
    enableThinking?: boolean
): string {
    let prompt = `You are Aspendos, a thoughtful AI assistant with cognitive memory capabilities.

Your approach:
- Be concise but thorough
- Use the user's memories when relevant to personalize responses
- Leverage available tools when they can help answer questions
- Think step by step for complex problems`;

    if (enableThinking) {
        prompt += `\n\nWrap your reasoning process in <thinking> tags before providing your response.`;
    }

    if (decision.useMemory && memories.length > 0) {
        prompt += `\n\n## User Context (from memory)
The following memories from the user may be relevant to this conversation:

${memories.map((m, _i) => `[${m.sector}] ${m.content}`).join('\n\n')}

Use this context to personalize your response when appropriate. Don't mention that you're using memories unless directly asked.`;
    }

    return prompt;
}

// ============================================
// FEEDBACK ENDPOINT
// ============================================

// POST /api/chat/message/:messageId/feedback - Add feedback to a message
app.post(
    '/message/:messageId/feedback',
    validateParams(messageIdParamSchema),
    validateBody(messageFeedbackSchema),
    async (c) => {
        const userId = c.get('userId')!;
        const validatedParams = c.get('validatedParams') as { messageId: string };
        const validatedBody = c.get('validatedBody') as { feedback: 'up' | 'down' };
        const messageId = validatedParams.messageId;
        const { feedback } = validatedBody;

        const updatedMessage = await chatService.addMessageFeedback(messageId, userId, feedback);

        if (!updatedMessage) {
            return c.json({ error: 'Message not found' }, 404);
        }

        return c.json({ success: true });
    }
);

// ============================================
// FORK & SHARE ENDPOINTS
// ============================================

// POST /api/chat/:id/fork - Fork a chat from a specific message
app.post(
    '/:id/fork',
    validateParams(chatIdParamSchema),
    validateBody(forkChatSchema),
    async (c) => {
        const userId = c.get('userId')!;
        const validatedParams = c.get('validatedParams') as { id: string };
        const validatedBody = c.get('validatedBody') as { fromMessageId?: string };
        const chatId = validatedParams.id;

        try {
            const newChat = await chatService.forkChat(chatId, userId, validatedBody.fromMessageId);
            return c.json(newChat, 201);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fork chat';
            if (message.includes('not found')) {
                return c.json({ error: message }, 404);
            }
            return c.json({ error: message }, 500);
        }
    }
);

// POST /api/chat/:id/share - Create or get share token for a chat
app.post('/:id/share', validateParams(chatIdParamSchema), async (c) => {
    const userId = c.get('userId')!;
    const validatedParams = c.get('validatedParams') as { id: string };
    const chatId = validatedParams.id;

    try {
        const token = await chatService.createShareToken(chatId, userId);
        return c.json({ token, url: `/chat/shared/${token}` });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create share token';
        if (message.includes('not found')) {
            return c.json({ error: message }, 404);
        }
        return c.json({ error: message }, 500);
    }
});

// DELETE /api/chat/:id/share - Revoke share token for a chat
app.delete('/:id/share', validateParams(chatIdParamSchema), async (c) => {
    const userId = c.get('userId')!;
    const validatedParams = c.get('validatedParams') as { id: string };
    const chatId = validatedParams.id;

    try {
        await chatService.revokeShareToken(chatId, userId);
        return c.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to revoke share token';
        if (message.includes('not found')) {
            return c.json({ error: message }, 404);
        }
        return c.json({ error: message }, 500);
    }
});

export default app;
