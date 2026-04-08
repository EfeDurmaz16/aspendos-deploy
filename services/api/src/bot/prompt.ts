/**
 * Bot System Prompt Builder
 *
 * Builds system prompts for the Chat SDK bot with memory context
 * and platform-specific formatting hints.
 */

/**
 * Get system prompt with memory context for a bot user.
 */
export async function getSystemPrompt(userId: string, query: string): Promise<string> {
    let prompt = `You are Yula, a helpful AI personal assistant available across messaging platforms.

Your capabilities:
- Search and manage the user's memories
- Schedule reminders and follow-ups
- Perform calculations
- Answer questions with personalized context

Guidelines:
- Be concise — messaging platforms have character limits
- Use short paragraphs, not walls of text
- When using tools that require approval, explain why you need it
- Remember context from previous messages in this thread`;

    // Add memory context if user is identified
    if (userId && userId !== 'anonymous') {
        try {
            const memoryRouter = await import('../services/memory-router.service');
            const memories = await memoryRouter.searchMemories(query, userId, { limit: 3 });

            if (memories.length > 0) {
                prompt += `\n\n## User Context
${memories.map((m) => `- [${m.sector || 'semantic'}] ${m.content}`).join('\n')}`;
            }

            // Get user profile from SuperMemory if available
            try {
                const profile = await memoryRouter.supermemory.getUserProfile(userId, query);
                if (profile.static.length > 0 || profile.dynamic.length > 0) {
                    prompt += `\n\n## User Profile
${[...profile.static, ...profile.dynamic].join('\n')}`;
                }
            } catch {
                // Profile not available
            }
        } catch {
            // Memory not available, continue without context
        }
    }

    return prompt;
}
