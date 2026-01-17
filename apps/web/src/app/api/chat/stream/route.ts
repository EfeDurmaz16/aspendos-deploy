import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import { prisma } from '@aspendos/db'
import { openai, createEmbedding, createStreamingChatCompletion } from '@/lib/services/openai'
import { searchMemories, storeConversationEmbedding } from '@/lib/services/qdrant'
import { v4 as uuidv4 } from 'uuid'

// ============================================
// TYPES
// ============================================

interface ChatRequest {
    message: string
    model?: string
    chatId?: string
    temperature?: number
    maxTokens?: number
}

interface StreamChunk {
    type: 'text' | 'memory_context' | 'error' | 'done'
    content: string
    metadata?: Record<string, unknown>
}

// ============================================
// SSE HELPERS
// ============================================

function createSSEEncoder() {
    const encoder = new TextEncoder()

    return {
        encode: (chunk: StreamChunk): Uint8Array => {
            const data = `data: ${JSON.stringify(chunk)}\n\n`
            return encoder.encode(data)
        },
        done: (): Uint8Array => {
            return encoder.encode('data: [DONE]\n\n')
        }
    }
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function POST(req: NextRequest) {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    try {
        const body: ChatRequest = await req.json()
        const { message, model = 'gpt-4o-mini', chatId, temperature = 0.7, maxTokens = 4000 } = body

        if (!message?.trim()) {
            return new Response(JSON.stringify({ error: 'Message is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { clerkId },
            include: { billingAccount: true }
        })

        if (!user) {
            return new Response(JSON.stringify({ error: 'User not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Check billing limits
        if (user.billingAccount && user.billingAccount.chatsRemaining <= 0) {
            return new Response(JSON.stringify({ error: 'Chat limit reached. Please upgrade your plan.' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const sse = createSSEEncoder()

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // 1. Create embedding for the user message
                    let queryEmbedding: number[] = []
                    let memoryContext = ''

                    try {
                        queryEmbedding = await createEmbedding(message)

                        // 2. Search for relevant memories
                        const memories = await searchMemories(user.id, queryEmbedding, 5)

                        if (memories.length > 0) {
                            memoryContext = memories.map(m => `- ${m.content}`).join('\n')
                            controller.enqueue(sse.encode({
                                type: 'memory_context',
                                content: `Retrieved ${memories.length} relevant memories`,
                                metadata: { memoryCount: memories.length }
                            }))
                        }
                    } catch (error) {
                        // Memory search failed, continue without context
                        console.warn('[Chat] Memory search failed:', error)
                    }

                    // 3. Build messages with context
                    const systemPrompt = memoryContext
                        ? `You are a helpful AI assistant. You have the following context about the user from previous conversations:\n\n${memoryContext}\n\nUse this context when relevant, but don't explicitly mention "I remember" unless it's natural.`
                        : 'You are a helpful AI assistant.'

                    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ]

                    // 4. Stream the response
                    let fullContent = ''

                    for await (const chunk of createStreamingChatCompletion(messages, { model, temperature, maxTokens })) {
                        if (chunk.type === 'text') {
                            fullContent += chunk.content
                            controller.enqueue(sse.encode({
                                type: 'text',
                                content: chunk.content
                            }))
                        }
                    }

                    // 5. Send done signal
                    controller.enqueue(sse.done())

                    // 6. Store message and update billing (async, don't block response)
                    const tokensIn = Math.ceil(message.length / 4)
                    const tokensOut = Math.ceil(fullContent.length / 4)

                    if (chatId) {
                        // Save messages to database
                        prisma.message.createMany({
                            data: [
                                { chatId, userId: user.id, role: 'user', content: message },
                                { chatId, userId: user.id, role: 'assistant', content: fullContent, modelUsed: model, tokensIn, tokensOut }
                            ]
                        }).catch(err => console.error('[Chat] Failed to save messages:', err))

                        // Update chat title if first message
                        prisma.chat.update({
                            where: { id: chatId },
                            data: { updatedAt: new Date() }
                        }).catch(() => { })
                    }

                    // 7. Store conversation embedding for future search
                    if (queryEmbedding.length > 0) {
                        try {
                            const exchangeText = `User: ${message}\nAssistant: ${fullContent.slice(0, 500)}`
                            const exchangeEmbedding = await createEmbedding(exchangeText)

                            await storeConversationEmbedding({
                                id: uuidv4(),
                                vector: exchangeEmbedding,
                                userId: user.id,
                                conversationId: chatId || 'unknown',
                                messageId: uuidv4(),
                                content: exchangeText,
                                role: 'exchange'
                            })
                        } catch (error) {
                            console.warn('[Chat] Failed to store embedding:', error)
                        }
                    }

                    // 8. Update billing
                    if (user.billingAccount) {
                        prisma.billingAccount.update({
                            where: { userId: user.id },
                            data: {
                                chatsRemaining: { decrement: 1 },
                                creditUsed: { increment: tokensIn + tokensOut }
                            }
                        }).catch(err => console.error('[Chat] Failed to update billing:', err))
                    }

                    controller.close()
                } catch (error) {
                    console.error('[Chat] Streaming error:', error)
                    controller.enqueue(sse.encode({
                        type: 'error',
                        content: error instanceof Error ? error.message : 'Streaming failed'
                    }))
                    controller.close()
                }
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
            }
        })
    } catch (error) {
        console.error('[Chat API] Error:', error)
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
