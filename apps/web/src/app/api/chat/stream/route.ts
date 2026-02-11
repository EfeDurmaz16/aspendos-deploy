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
            temperature: rawTemperature = 0.7,
            maxTokens: rawMaxTokens = 4000,
            skipRouter = false,
        } = body;

        // Clamp user-controlled parameters to safe bounds
        const temperature = Math.max(0, Math.min(2, Number(rawTemperature) || 0.7));
        const maxTokens = Math.min(Math.max(1, Math.floor(Number(rawMaxTokens) || 4000)), 8000);

        if (!message?.trim()) {
            return new Response(JSON.stringify({ error: 'Message is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Cap input message length to prevent cost runaway (32K chars ~ 8K tokens)
        if (message.length > 32000) {
            return new Response(JSON.stringify({ error: 'Message too long. Maximum 32,000 characters.' }), {
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

        // ========================================
        // MODEL-TIER GATING
        // ========================================
        const TIER_ALLOWED_MODELS: Record<string, string[]> = {
            FREE: ['gpt-4o-mini', 'gemini-flash', 'gemini-2.0-flash'],
            STARTER: ['gpt-4o-mini', 'claude-3-haiku', 'gemini-flash', 'gemini-2.0-flash'],
            PRO: [], // Empty array = all models allowed
            ULTRA: [], // Empty array = all models allowed
        };

        const userTier = user.tier || 'FREE';
        const allowedModels = TIER_ALLOWED_MODELS[userTier];

        // If user explicitly requests a model, validate tier access
        if (model && allowedModels.length > 0 && !allowedModels.includes(model)) {
            return new Response(
                JSON.stringify({ error: 'Model not available on your plan. Please upgrade.' }),
                {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        // Check daily cost ceiling to prevent runaway spend
        if (user.billingAccount) {
            const dailyUsed = user.billingAccount.creditUsed || 0;
            const monthlyCredit = user.billingAccount.monthlyCredit || 0;
            const dailyCeiling = monthlyCredit / 25; // ~monthly / 25 working days
            if (dailyCeiling > 0 && dailyUsed >= monthlyCredit) {
                return new Response(
                    JSON.stringify({ error: 'Monthly token budget exhausted. Please upgrade or wait for reset.' }),
                    { status: 403, headers: { 'Content-Type': 'application/json' } }
                );
            }
        }

        // Check billing limits with atomic decrement to prevent race conditions
        if (user.billingAccount) {
            const result = await prisma.billingAccount.updateMany({
                where: { userId: user.id, chatsRemaining: { gt: 0 } },
                data: { chatsRemaining: { decrement: 1 } },
            });
            if (result.count === 0) {
                return new Response(
                    JSON.stringify({ error: 'Chat limit reached. Please upgrade your plan.' }),
                    {
                        status: 403,
                        headers: { 'Content-Type': 'application/json' },
                    }
                );
            }
        }

        // Get recent messages for context (with IDOR protection)
        let recentMessages: string[] = [];
        if (chatId) {
            // Verify chat ownership before accessing messages
            const chatOwnership = await prisma.chat.findFirst({
                where: { id: chatId, userId: session.userId },
                select: { id: true },
            });

            if (!chatOwnership) {
                return new Response(JSON.stringify({ error: 'Chat not found or access denied' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            const recent = await prisma.message.findMany({
                where: { chatId, userId: session.userId },
                orderBy: { createdAt: 'desc' },
                take: 6,
                select: { role: true, content: true },
            });
            recentMessages = recent
                .reverse()
                .map((m: { role: string; content: string }) => `${m.role}: ${m.content.slice(0, 200)}`);
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

                        let selectedModel = (decision as { model: string }).model || 'gpt-4o-mini';

                        // Override model if user's tier doesn't allow it
                        if (allowedModels.length > 0 && !allowedModels.includes(selectedModel)) {
                            selectedModel = 'gpt-4o-mini';
                        }

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
                        // Handle proactive scheduling - connect to real PAC queue
                        const scheduleDecision = decision as { schedule: { time: string; action: string }; reason: string };

                        // Attempt to schedule via PAC service
                        try {
                            const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8080';
                            const pacResponse = await fetch(`${apiBase}/api/pac/reminders`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Cookie': req.headers.get('cookie') || '' },
                                body: JSON.stringify({
                                    content: scheduleDecision.schedule.action,
                                    triggerAt: scheduleDecision.schedule.time,
                                    type: 'EXPLICIT',
                                }),
                            });

                            if (pacResponse.ok) {
                                fullContent = `I've scheduled a reminder for you: "${scheduleDecision.schedule.action}" at ${scheduleDecision.schedule.time}.\n\nYou'll be notified when it's time.`;
                            } else {
                                fullContent = `I tried to schedule a reminder for "${scheduleDecision.schedule.action}" at ${scheduleDecision.schedule.time}, but the scheduling service returned an error. Please try setting the reminder manually.`;
                            }
                        } catch {
                            fullContent = `I'll remind you: "${scheduleDecision.schedule.action}" at ${scheduleDecision.schedule.time}.\n\nNote: The reminder service is temporarily unavailable. Please set a manual reminder as backup.`;
                        }

                        usedModel = 'system';
                        controller.enqueue(
                            sse.encode({
                                type: 'text',
                                content: fullContent,
                            })
                        );
                    }

                    // ========================================
                    // PHASE 3: DONE & POST-PROCESSING
                    // ========================================
                    controller.enqueue(sse.done());

                    // Store message and update billing (async)
                    // Approximate token count: ~3.5 chars/token for English, ~2 for code/multilingual
                    const charsPerToken = /[\u0080-\uffff]/.test(message) ? 2 : 3.5;
                    const tokensIn = Math.ceil(message.length / charsPerToken);
                    const tokensOut = Math.ceil(fullContent.length / charsPerToken);

                    // Calculate approximate cost based on model and tokens
                    const costPerInputToken = usedModel.includes('gpt-4o-mini') ? 0.00000015 : usedModel.includes('gpt-4o') ? 0.0000025 : usedModel.includes('claude') ? 0.000003 : usedModel.includes('gemini') ? 0.0000001 : 0.000001;
                    const costPerOutputToken = costPerInputToken * 4;
                    const estimatedCost = (tokensIn * costPerInputToken) + (tokensOut * costPerOutputToken);

                    if (chatId) {
                        // Batch DB writes in a transaction for data consistency
                        prisma.$transaction([
                            prisma.message.createMany({
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
                                        costUsd: estimatedCost,
                                    },
                                ],
                            }),
                            prisma.chat.updateMany({
                                where: { id: chatId, userId: user.id },
                                data: { updatedAt: new Date() },
                            }),
                        ]).catch((err: unknown) =>
                            console.error('[Chat] Failed to save messages:', err)
                        );
                    }

                    // Fire-and-forget: don't block response on embedding
                    void (async () => {
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
                            console.error('Background embedding failed:', error);
                        }
                    })();

                    // Update credit usage in K-tokens (consistent with billing service)
                    if (user.billingAccount) {
                        const kTokensUsed = Math.ceil((tokensIn + tokensOut) / 1000);
                        prisma.billingAccount
                            .update({
                                where: { userId: user.id },
                                data: {
                                    creditUsed: { increment: kTokensUsed },
                                },
                            })
                            .catch((err: unknown) =>
                                console.error('[Chat] Failed to update billing credit:', err)
                            );
                    }

                    controller.close();
                } catch (error) {
                    console.error('[Chat] Streaming error:', error);
                    controller.enqueue(
                        sse.encode({
                            type: 'error',
                            content: 'Streaming failed',
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
