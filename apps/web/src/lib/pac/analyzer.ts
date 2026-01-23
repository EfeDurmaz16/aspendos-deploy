/**
 * YULA PAC (Proactive AI Callbacks) Analyzer
 *
 * Uses Groq for fast analysis via Vercel AI SDK.
 */

import { generateText } from 'ai';
import { groq } from '@/lib/ai/providers';
import type { PACAnalysisResult } from './types';

// ============================================
// PAC ANALYZER - Uses Groq for fast analysis
// ============================================

const PAC_SYSTEM_PROMPT = `You are the Yula Proactive Agent. Analyze user context and decide if any proactive notifications are needed.

You should generate notifications for:
1. **Reminders** - Things the user mentioned wanting to do or remember
2. **Suggestions** - Helpful ideas based on their patterns
3. **Alerts** - Important time-sensitive information
4. **Insights** - Interesting patterns or connections you notice

Be conservative - only suggest notifications that would genuinely help the user.
Do NOT suggest notifications for trivial things.

Respond ONLY with valid JSON:
{
  "shouldNotify": true/false,
  "items": [
    {
      "type": "reminder" | "suggestion" | "alert" | "insight",
      "title": "Short title (max 50 chars)",
      "description": "Brief description (max 200 chars)",
      "priority": "low" | "medium" | "high",
      "triggerReason": "Why this notification is being suggested"
    }
  ]
}

If no notifications are warranted, return: {"shouldNotify": false, "items": []}`;

export async function analyzeContextForPAC(
    userId: string,
    recentContext: {
        recentMessages?: string[];
        recentMemories?: string[];
        currentTime?: Date;
        timezone?: string;
    }
): Promise<PACAnalysisResult> {
    const currentTime = recentContext.currentTime || new Date();
    const contextParts: string[] = [];

    if (recentContext.recentMessages?.length) {
        contextParts.push(`Recent conversation:\n${recentContext.recentMessages.slice(-5).join('\n')}`);
    }

    if (recentContext.recentMemories?.length) {
        contextParts.push(`Relevant memories:\n${recentContext.recentMemories.slice(-3).join('\n')}`);
    }

    contextParts.push(`Current time: ${currentTime.toISOString()}`);
    if (recentContext.timezone) {
        contextParts.push(`User timezone: ${recentContext.timezone}`);
    }

    try {
        // Use Vercel AI SDK generateText with Groq router model
        const result = await generateText({
            model: groq('llama-3.1-8b-instant'),
            messages: [
                { role: 'system', content: PAC_SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `Analyze this context and decide if any proactive notifications are needed:\n\n${contextParts.join('\n\n')}`,
                },
            ],
            temperature: 0.3,
            maxOutputTokens: 500,
        });

        const content = result.text;
        if (!content) {
            return { shouldNotify: false, items: [] };
        }

        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as PACAnalysisResult;
            return parsed;
        }

        return { shouldNotify: false, items: [] };
    } catch (error) {
        console.error('[PAC Analyzer] Error:', error);
        return { shouldNotify: false, items: [] };
    }
}

// ============================================
// QUICK PAC CHECK - Lightweight analysis
// ============================================

export async function quickPACCheck(lastMessage: string): Promise<boolean> {
    // Check for explicit reminder/scheduling keywords
    const reminderKeywords = [
        'remind me',
        "don't forget",
        'remember to',
        'alert me',
        'notify me',
        'schedule',
        'later today',
        'tomorrow',
        'next week',
    ];

    const lowerMessage = lastMessage.toLowerCase();
    return reminderKeywords.some((kw) => lowerMessage.includes(kw));
}
