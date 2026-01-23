import { prisma } from '@aspendos/db';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@/lib/auth';
import { createEmbedding, executeHybridRoute, createUnifiedStreamingCompletion } from '@/lib/ai';
import { storeConversationEmbedding } from '@/lib/services/qdrant';

// ============================================
// TYPES
// ============================================

interface ChatRequest {
    message: string;
    model?: string;
    chatId?: string;
    temperature?: number;
    maxTokens?: number;
    skipRouter?: boolean;
}

interface StreamChunk {
    type: 'text' | 'memory_context' | 'routing' | 'fallback' | 'error' | 'done';
    content: string;
    metadata?: Record<string, unknown>;
}

// ============================================
// SSE HELPERS
// ============================================

function createSSEEncoder() {
    const encoder = new TextEncoder();

    return {
        encode: (chunk: StreamChunk): Uint8Array => {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            return encoder.encode(data);
        },
        done: (): Uint8Array => {
            return encoder.encode('data: [DONE]\n\n');
        },
    };
}

// ============================================
// ROUTE HANDLER - HYBRID ROUTER IMPLEMENTATION
// ============================================

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session?.userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body: ChatRequest = await req.json();
        const {
            message,
            model,
            chatId,
            temperature = 0.7,
            maxTokens = 4000,
            skipRouter = false,
        } = body;

        if (!message?.trim()) {
            return new Response(JSON.stringify({ error: 'Message is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            include: { billingAccount: true },
        });

        if (!user) {
            return new Response(JSON.stringify({ error: 'User not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Check billing limits
        if (user.billingAccount && user.billingAccount.chatsRemaining <= 0) {
            return new Response(
                JSON.stringify({ error: 'Chat limit reached. Please upgrade your plan.' }),
                {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        // Get recent messages for context
        let recentMessages: string[] = [];
        if (chatId) {
            const recent = await prisma.message.findMany({
                where: { chatId },
                orderBy: { createdAt: 'desc' },
                take: 6,
                select: { role: true, content: true },
            });
            recentMessages = recent.reverse().map((m) => `${m.role}: ${m.content.slice(0, 200)}`);
        }

        const sse = createSSEEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // ========================================
                    // PHASE 1: HYBRID ROUTING (Groq-Llama-8b)
                    // ========================================
                    const routeResult = await executeHybridRoute(message, user.id, {
                        recentMessages,
                        skipRouter,
                        forceModel: model,
                    });

                    const { decision, memoryContext, memories } = routeResult;

                    // Send routing decision to client
                    controller.enqueue(
                        sse.encode({
                            type: 'routing',
                            content: `Route: ${decision.type}`,
                            metadata: {
                                decision: decision.type,
                                model: decision.type === 'direct_reply' || decision.type === 'rag_search'
                                    ? (decision as { model: string }).model
                                    : undefined,
                                reason: decision.reason,
                            },
                        })
                    );

                    // Send memory context if found
                    if (memories && memories.length > 0) {
                        controller.enqueue(
                            sse.encode({
                                type: 'memory_context',
                                content: `Retrieved ${memories.length} relevant memories`,
                                metadata: { memoryCount: memories.length },
                            })
                        );
                    }

                    // ========================================
                    // PHASE 2: HANDLE ROUTING DECISION
                    // ========================================

                    let fullContent = '';
                    let usedModel = '';

                    if (decision.type === 'direct_reply' || decision.type === 'rag_search') {
                        // Build messages with context
                        const systemPrompt = memoryContext
                            ? `You are Aspendos, a helpful AI assistant with persistent memory. You have context from previous conversations:\n\n${memoryContext}\n\nUse this context naturally when relevant.`
                            : 'You are Aspendos, a helpful AI assistant with persistent memory across conversations.';

                        const selectedModel = (decision as { model: string }).model || 'gpt-4o-mini';
                        usedModel = selectedModel;

                        const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: message },
                        ];

                        // Stream response with automatic fallback
                        for await (const chunk of createUnifiedStreamingCompletion(messages, {
                            model: selectedModel,
                            temperature,
                            maxTokens,
                            userId: user.id,
                        })) {
                            if (chunk.type === 'text') {
                                fullContent += chunk.content;
                                controller.enqueue(
                                    sse.encode({
                                        type: 'text',
                                        content: chunk.content,
                                    })
                                );
                            } else if (chunk.type === 'fallback') {
                                usedModel = (chunk.metadata?.newModel as string) || usedModel;
                                controller.enqueue(
                                    sse.encode({
                                        type: 'fallback',
                                        content: chunk.content,
                                        metadata: chunk.metadata,
                                    })
                                );
                            } else if (chunk.type === 'error') {
                                controller.enqueue(
                                    sse.encode({
                                        type: 'error',
                                        content: chunk.content,
                                    })
                                );
                            }
                        }
                    } else if (decision.type === 'tool_call') {
                        // Handle tool calls
                        const toolDecision = decision as { tool: string; params: Record<string, unknown>; reason: string };
                        fullContent = `[Tool call requested: ${toolDecision.tool}]\n\nThis feature is being implemented. Tool: ${toolDecision.tool}, Params: ${JSON.stringify(toolDecision.params)}`;
                        usedModel = 'system';

                        controller.enqueue(
                            sse.encode({
                                type: 'text',
                                content: fullContent,
                            })
                        );
                    } else if (decision.type === 'proactive_schedule') {
                        // Handle proactive scheduling
                        const scheduleDecision = decision as { schedule: { time: string; action: string }; reason: string };
                        fullContent = `[Proactive reminder scheduled]\n\nI'll remind you: "${scheduleDecision.schedule.action}" at ${scheduleDecision.schedule.time}.\n\n(PAC system will handle this notification)`;
                        usedModel = 'system';

                        controller.enqueue(
                            sse.encode({
                                type: 'text',
                                content: fullContent,
                            })
                        );

                        // TODO: Store in PAC queue
                    }

                    // ========================================
                    // PHASE 3: DONE & POST-PROCESSING
                    // ========================================
                    controller.enqueue(sse.done());

                    // Store message and update billing (async)
                    const tokensIn = Math.ceil(message.length / 4);
                    const tokensOut = Math.ceil(fullContent.length / 4);

                    if (chatId) {
                        prisma.message
                            .createMany({
                                data: [
                                    { chatId, userId: user.id, role: 'user', content: message },
                                    {
                                        chatId,
                                        userId: user.id,
                                        role: 'assistant',
                                        content: fullContent,
                                        modelUsed: usedModel,
                                        tokensIn,
                                        tokensOut,
                                    },
                                ],
                            })
                            .catch((err) => console.error('[Chat] Failed to save messages:', err));

                        prisma.chat
                            .update({
                                where: { id: chatId },
                                data: { updatedAt: new Date() },
                            })
                            .catch(() => {});
                    }

                    // Store conversation embedding
                    try {
                        const exchangeText = `User: ${message}\nAssistant: ${fullContent.slice(0, 500)}`;
                        const exchangeEmbedding = await createEmbedding(exchangeText);

                        await storeConversationEmbedding({
                            id: uuidv4(),
                            vector: exchangeEmbedding,
                            userId: user.id,
                            conversationId: chatId || 'unknown',
                            messageId: uuidv4(),
                            content: exchangeText,
                            role: 'exchange',
                        });
                    } catch (error) {
                        console.warn('[Chat] Failed to store embedding:', error);
                    }

                    // Update billing
                    if (user.billingAccount) {
                        prisma.billingAccount
                            .update({
                                where: { userId: user.id },
                                data: {
                                    chatsRemaining: { decrement: 1 },
                                    creditUsed: { increment: tokensIn + tokensOut },
                                },
                            })
                            .catch((err) => console.error('[Chat] Failed to update billing:', err));
                    }

                    controller.close();
                } catch (error) {
                    console.error('[Chat] Streaming error:', error);
                    controller.enqueue(
                        sse.encode({
                            type: 'error',
                            content: error instanceof Error ? error.message : 'Streaming failed',
                        })
                    );
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
            },
        });
    } catch (error) {
        console.error('[Chat API] Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
