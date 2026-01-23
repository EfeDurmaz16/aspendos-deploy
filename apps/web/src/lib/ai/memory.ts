/**
 * YULA AI Memory Extraction
 *
 * Extract key insights from conversations for memory storage.
 */

import { createCompletion } from './generate';

// ============================================
// MEMORY EXTRACTION
// ============================================

const MEMORY_EXTRACTION_PROMPT = `You are a memory extraction assistant. Extract 2-4 key facts or insights about the user from the conversation. Focus on:
- User preferences
- Important information shared
- Topics of interest
- Decisions made

Return ONLY a JSON array of strings, each string being one insight. No explanation.`;

/**
 * Extract key insights from a conversation for memory storage
 */
export async function extractMemoryInsights(conversationText: string): Promise<string[]> {
    try {
        const result = await createCompletion(
            [
                { role: 'system', content: MEMORY_EXTRACTION_PROMPT },
                { role: 'user', content: conversationText },
            ],
            {
                model: 'gpt-4o-mini',
                temperature: 0.3,
                maxTokens: 500,
            }
        );

        // Parse JSON array from response
        const content = result.content.trim();
        const jsonMatch = content.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        // Try parsing the whole content as JSON
        return JSON.parse(content);
    } catch (error) {
        console.warn('[Memory] Failed to extract insights:', error);
        return [];
    }
}

/**
 * Generate a summary of a conversation
 */
export async function summarizeConversation(messages: string[]): Promise<string> {
    const conversationText = messages.join('\n');

    const result = await createCompletion(
        [
            {
                role: 'system',
                content:
                    'Summarize this conversation in 1-2 sentences, focusing on the main topic and outcome.',
            },
            { role: 'user', content: conversationText },
        ],
        {
            model: 'gpt-4o-mini',
            temperature: 0.3,
            maxTokens: 200,
        }
    );

    return result.content;
}
