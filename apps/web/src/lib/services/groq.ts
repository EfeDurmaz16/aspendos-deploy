import Groq from 'groq-sdk';

// ============================================
// GROQ CLIENT (For fast routing decisions)
// ============================================

let _groqClient: Groq | null = null;

export function getGroqClient(): Groq {
    if (!_groqClient) {
        _groqClient = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });
    }
    return _groqClient;
}

// ============================================
// ROUTING MODELS (Fast, low-cost)
// ============================================

export const ROUTER_MODEL = 'llama-3.1-8b-instant';
export const FALLBACK_ROUTER_MODEL = 'llama3-8b-8192';

// ============================================
// ROUTING DECISION TYPES
// ============================================

export type RouteDecision =
    | { type: 'direct_reply'; model: string; reason: string }
    | { type: 'rag_search'; query: string; model: string; reason: string }
    | { type: 'tool_call'; tool: string; params: Record<string, unknown>; reason: string }
    | { type: 'proactive_schedule'; schedule: { time: string; action: string }; reason: string };

// ============================================
// ROUTER SYSTEM PROMPT
// ============================================

const ROUTER_SYSTEM_PROMPT = `You are Aspendos Router, a fast decision-making AI that routes user queries to the appropriate handler.

Analyze the user's message and decide the best approach:

1. **direct_reply** - For general questions, conversations, creative tasks
   - Use when: Greeting, opinion, explanation, coding help, creative writing
   - Choose model based on complexity:
     - Simple/fast: "gpt-4o-mini" or "claude-3-haiku-20240307"
     - Complex/reasoning: "gpt-4o" or "claude-3-5-sonnet-20241022"

2. **rag_search** - When the user asks about their past conversations, memories, or specific context
   - Use when: "Remember when...", "What did I say about...", personal history
   - Extract a search query from their message

3. **tool_call** - When external tools/APIs are needed
   - Use when: Web search, image generation, file operations, calendar
   - Specify the tool name and parameters

4. **proactive_schedule** - When the user wants to be reminded or alerted later
   - Use when: "Remind me...", "Alert me when...", future notifications
   - Extract time and action to schedule

Respond ONLY with valid JSON in this exact format:
{
  "type": "direct_reply" | "rag_search" | "tool_call" | "proactive_schedule",
  "model": "model-name", // for direct_reply/rag_search
  "query": "search terms", // for rag_search
  "tool": "tool-name", // for tool_call
  "params": {}, // for tool_call
  "schedule": {"time": "...", "action": "..."}, // for proactive_schedule
  "reason": "Brief explanation of routing decision"
}`;

// ============================================
// ROUTE USER MESSAGE
// ============================================

export async function routeUserMessage(
    userMessage: string,
    context?: { recentMessages?: string[]; userPreferences?: Record<string, unknown> }
): Promise<RouteDecision> {
    const contextStr = context?.recentMessages?.length
        ? `\n\nRecent conversation context:\n${context.recentMessages.slice(-3).join('\n')}`
        : '';

    try {
        const completion = await getGroqClient().chat.completions.create({
            model: ROUTER_MODEL,
            messages: [
                { role: 'system', content: ROUTER_SYSTEM_PROMPT },
                { role: 'user', content: `User message: "${userMessage}"${contextStr}\n\nDecide the route:` },
            ],
            temperature: 0.1,
            max_tokens: 500,
            response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Empty response from router');
        }

        const decision = JSON.parse(content) as RouteDecision;
        return decision;
    } catch (error) {
        console.warn('[Router] Primary router failed, trying fallback:', error);

        // Fallback to simpler model
        try {
            const fallback = await getGroqClient().chat.completions.create({
                model: FALLBACK_ROUTER_MODEL,
                messages: [
                    { role: 'system', content: ROUTER_SYSTEM_PROMPT },
                    { role: 'user', content: `User message: "${userMessage}"\n\nDecide the route:` },
                ],
                temperature: 0.1,
                max_tokens: 500,
            });

            const content = fallback.choices[0]?.message?.content;
            if (content) {
                // Try to extract JSON from response
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]) as RouteDecision;
                }
            }
        } catch (fallbackError) {
            console.error('[Router] Fallback also failed:', fallbackError);
        }

        // Default to direct reply with fast model
        return {
            type: 'direct_reply',
            model: 'gpt-4o-mini',
            reason: 'Router fallback - defaulting to direct reply',
        };
    }
}

// ============================================
// STREAMING COMPLETION VIA GROQ
// ============================================

export async function* createGroqStreamingCompletion(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    options: { model?: string; temperature?: number; maxTokens?: number } = {}
): AsyncGenerator<{ type: 'text' | 'done'; content: string }> {
    const { model = 'llama-3.1-70b-versatile', temperature = 0.7, maxTokens = 4000 } = options;

    const stream = await getGroqClient().chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
    });

    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
            yield { type: 'text', content };
        }
    }

    yield { type: 'done', content: '' };
}

export default getGroqClient;
