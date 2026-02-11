/**
 * YULA AI Router
 *
 * Fast routing decisions using Groq Llama via Vercel AI SDK.
 * Routes user messages to appropriate handlers.
 */

import { generateText } from 'ai';
import { groq } from './providers';

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

const ROUTER_SYSTEM_PROMPT = `You are Yula Router, a fast decision-making AI that routes user queries to the appropriate handler.

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
  "model": "model-name",
  "query": "search terms",
  "tool": "tool-name",
  "params": {},
  "schedule": {"time": "...", "action": "..."},
  "reason": "Brief explanation of routing decision"
}`;

// ============================================
// ROUTE USER MESSAGE
// ============================================

interface RoutingContext {
    recentMessages?: string[];
    userPreferences?: Record<string, unknown>;
    userTier?: 'FREE' | 'STARTER' | 'PRO' | 'ULTRA';
}

// Tier-aware model selection: don't route to models the user can't access
const TIER_MODEL_MAP: Record<string, string[]> = {
    FREE: ['gpt-4o-mini', 'gemini-flash', 'gemini-2.0-flash'],
    STARTER: ['gpt-4o-mini', 'claude-3-haiku-20240307', 'gemini-flash', 'gemini-2.0-flash'],
    PRO: [], // all models
    ULTRA: [], // all models
};

function constrainModelToTier(model: string, tier?: string): string {
    if (!tier) return model;
    const allowed = TIER_MODEL_MAP[tier];
    if (!allowed || allowed.length === 0) return model; // PRO/ULTRA = all
    if (allowed.includes(model)) return model;
    return 'gpt-4o-mini'; // Fallback to free-tier model
}

/**
 * Route a user message using fast Groq Llama model
 */
export async function routeUserMessage(
    userMessage: string,
    context?: RoutingContext
): Promise<RouteDecision> {
    const contextStr = context?.recentMessages?.length
        ? `\n\nRecent conversation context:\n${context.recentMessages.slice(-3).join('\n')}`
        : '';

    const userPrompt = `User message: "${userMessage}"${contextStr}\n\nDecide the route:`;

    try {
        // Primary: Use fast Groq router
        const result = await generateText({
            model: groq('llama-3.1-8b-instant'),
            messages: [
                { role: 'system', content: ROUTER_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.1,
            maxOutputTokens: 500,
        });

        const content = result.text;
        if (!content) {
            throw new Error('Empty response from router');
        }

        // Parse and validate JSON response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const raw = JSON.parse(jsonMatch[0]);

            // Runtime validation: ensure type is one of the valid decision types
            const VALID_ROUTE_TYPES = ['direct_reply', 'rag_search', 'tool_call', 'proactive_schedule'];
            if (!raw || typeof raw !== 'object' || !VALID_ROUTE_TYPES.includes(raw.type)) {
                throw new Error(`Invalid route type from LLM: ${raw?.type}`);
            }

            // Sanitize string fields to prevent injection
            const decision: RouteDecision = {
                ...raw,
                type: raw.type,
                reason: typeof raw.reason === 'string' ? raw.reason.slice(0, 500) : 'No reason provided',
            } as RouteDecision;

            // Constrain model to user's tier
            if ('model' in decision && decision.model) {
                decision.model = constrainModelToTier(decision.model, context?.userTier);
            }
            return decision;
        }

        throw new Error('No JSON found in router response');
    } catch (error) {
        console.warn('[Router] Primary router failed, trying fallback:', error);

        // Fallback: Try alternate Groq model
        try {
            const fallback = await generateText({
                model: groq('llama3-8b-8192'),
                messages: [
                    { role: 'system', content: ROUTER_SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.1,
                maxOutputTokens: 500,
            });

            const content = fallback.text;
            if (content) {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const raw = JSON.parse(jsonMatch[0]);
                    const VALID_ROUTE_TYPES = ['direct_reply', 'rag_search', 'tool_call', 'proactive_schedule'];
                    if (raw && typeof raw === 'object' && VALID_ROUTE_TYPES.includes(raw.type)) {
                        return raw as RouteDecision;
                    }
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
// ROUTING UTILITIES
// ============================================

/**
 * Determine if a message needs RAG search
 */
export function needsMemorySearch(message: string): boolean {
    const memoryPatterns = [
        /remember when/i,
        /what did (i|we) (say|talk|discuss)/i,
        /last time/i,
        /previously/i,
        /earlier/i,
        /you told me/i,
        /i mentioned/i,
        /our conversation about/i,
        /recall/i,
        /my (preference|favorite|setting)/i,
    ];

    return memoryPatterns.some((pattern) => pattern.test(message));
}

/**
 * Determine if a message is a simple greeting
 */
export function isGreeting(message: string): boolean {
    const greetingPatterns = [
        /^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening))[\s!.,]*$/i,
        /^(what's up|sup|yo)[\s!.,]*$/i,
    ];

    return greetingPatterns.some((pattern) => pattern.test(message.trim()));
}

/**
 * Fast route for obvious cases (skip LLM router)
 */
export function fastRoute(message: string): RouteDecision | null {
    // Simple greetings
    if (isGreeting(message)) {
        return {
            type: 'direct_reply',
            model: 'gpt-4o-mini',
            reason: 'Fast route: simple greeting',
        };
    }

    // Memory queries
    if (needsMemorySearch(message)) {
        return {
            type: 'rag_search',
            query: message,
            model: 'gpt-4o-mini',
            reason: 'Fast route: memory query detected',
        };
    }

    // Reminder requests - let LLM router handle schedule extraction
    if (/remind me|set.*(reminder|alarm|alert)/i.test(message)) {
        return null;
    }

    return null;
}

// ============================================
// AVAILABLE TOOLS REGISTRY
// ============================================

export const AVAILABLE_TOOLS = {
    web_search: {
        name: 'web_search',
        description: 'Search the web for current information',
        params: ['query'],
    },
    image_generation: {
        name: 'image_generation',
        description: 'Generate images using AI',
        params: ['prompt', 'style'],
    },
    code_execution: {
        name: 'code_execution',
        description: 'Execute code in a sandboxed environment',
        params: ['language', 'code'],
    },
} as const;

export type ToolName = keyof typeof AVAILABLE_TOOLS;
