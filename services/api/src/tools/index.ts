/**
 * AI Tool Definitions
 * Tools for the AI to interact with memory and external services.
 */
import { tool } from 'ai';
import { z } from 'zod';
import * as openMemory from '../services/openmemory.service';

// ============================================
// MEMORY TOOLS
// ============================================

/**
 * Create a tool factory that injects userId for memory search
 */
export function createMemorySearchTool(userId: string) {
    return tool({
        description:
            "Search the user's memories for relevant context based on a query. Use this to find information the user has previously shared or discussed.",
        inputSchema: z.object({
            query: z.string().describe('The search query to find relevant memories'),
            limit: z
                .number()
                .optional()
                .default(5)
                .describe('Maximum number of memories to return'),
        }),
        execute: async ({ query, limit }) => {
            try {
                const memories = await openMemory.searchMemories(query, userId, { limit });
                return {
                    success: true,
                    memories: memories.map((m) => ({
                        content: m.content,
                        sector: m.sector,
                        confidence: m.salience || 0.8,
                        recall_reason: m.trace?.recall_reason,
                    })),
                };
            } catch (error) {
                console.error('[Tool: memory_search] Error:', error);
                return {
                    success: false,
                    error: 'Failed to search memories',
                };
            }
        },
    });
}

/**
 * Add a new memory
 */
export function createMemoryAddTool(userId: string) {
    return tool({
        description:
            "Save important information to the user's memory. Use this when the user shares preferences, important facts, or things they want to remember.",
        inputSchema: z.object({
            content: z.string().describe('The content to save as a memory'),
            sector: z
                .enum(['episodic', 'semantic', 'procedural', 'emotional', 'reflective'])
                .describe(
                    'The memory sector: episodic (events), semantic (facts), procedural (how-to), emotional (feelings), reflective (insights)'
                ),
            tags: z.array(z.string()).optional().describe('Optional tags for categorization'),
        }),
        execute: async ({ content, sector, tags }) => {
            try {
                const result = await openMemory.addMemory(content, userId, {
                    sector,
                    tags,
                });
                return {
                    success: true,
                    id: result.id,
                    message: `Memory saved to ${sector} sector`,
                };
            } catch (error) {
                console.error('[Tool: memory_add] Error:', error);
                return {
                    success: false,
                    error: 'Failed to save memory',
                };
            }
        },
    });
}

/**
 * Reinforce an existing memory (increases importance)
 */
export function createMemoryReinforceTool(_userId: string) {
    return tool({
        description:
            'Reinforce an existing memory to increase its importance and prevent decay. Use when a memory proves useful or relevant.',
        inputSchema: z.object({
            memoryId: z.string().describe('The ID of the memory to reinforce'),
        }),
        execute: async ({ memoryId }) => {
            try {
                await openMemory.reinforceMemory(memoryId);
                return {
                    success: true,
                    message: 'Memory reinforced successfully',
                };
            } catch (error) {
                console.error('[Tool: memory_reinforce] Error:', error);
                return {
                    success: false,
                    error: 'Failed to reinforce memory',
                };
            }
        },
    });
}

// ============================================
// UTILITY TOOLS
// ============================================

/**
 * Calculator tool for basic math
 */
export const calculatorTool = tool({
    description: 'Perform basic mathematical calculations. Use for arithmetic, percentages, etc.',
    inputSchema: z.object({
        expression: z
            .string()
            .describe('Mathematical expression to evaluate (e.g., "2 + 2", "100 * 0.15")'),
    }),
    execute: async ({ expression }) => {
        try {
            // Simple safe evaluation using Function constructor
            // Only allow numbers, operators, parentheses, and spaces
            const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, '');
            if (sanitized !== expression) {
                return { success: false, error: 'Invalid characters in expression' };
            }

            // Use Function for safer evaluation than eval
            const result = new Function(`return ${sanitized}`)();

            return {
                success: true,
                expression,
                result: Number(result),
            };
        } catch (_error) {
            return {
                success: false,
                error: 'Failed to evaluate expression',
            };
        }
    },
});

/**
 * Current time/date tool
 */
export const currentTimeTool = tool({
    description: 'Get the current date and time.',
    inputSchema: z.object({
        timezone: z
            .string()
            .optional()
            .default('UTC')
            .describe('Timezone (e.g., "America/New_York", "UTC")'),
    }),
    execute: async ({ timezone }) => {
        try {
            const now = new Date();
            const formatted = now.toLocaleString('en-US', { timeZone: timezone });
            return {
                success: true,
                datetime: formatted,
                iso: now.toISOString(),
                timezone,
            };
        } catch {
            return {
                success: true,
                datetime: new Date().toISOString(),
                iso: new Date().toISOString(),
                timezone: 'UTC',
            };
        }
    },
});

// ============================================
// TOOL SETS BY TIER
// ============================================

export type UserTier = 'FREE' | 'STARTER' | 'PRO' | 'ULTRA';

/**
 * Get tools available for a user's tier
 */
export function getToolsForTier(tier: UserTier, userId: string) {
    // Base tools for all tiers
    const baseTools = {
        memory_search: createMemorySearchTool(userId),
        calculator: calculatorTool,
        current_time: currentTimeTool,
    };

    // PRO tier adds memory writing
    if (tier === 'PRO' || tier === 'ULTRA') {
        return {
            ...baseTools,
            memory_add: createMemoryAddTool(userId),
            memory_reinforce: createMemoryReinforceTool(userId),
        };
    }

    // ULTRA tier could add more tools in the future
    // e.g., web_search, code_execution, etc.

    return baseTools;
}

/**
 * Get all available tools (for system use)
 */
export function getAllTools(userId: string) {
    return {
        memory_search: createMemorySearchTool(userId),
        memory_add: createMemoryAddTool(userId),
        memory_reinforce: createMemoryReinforceTool(userId),
        calculator: calculatorTool,
        current_time: currentTimeTool,
    };
}
