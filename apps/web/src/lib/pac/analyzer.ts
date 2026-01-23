import { getGroqClient, ROUTER_MODEL } from '@/lib/services/groq';
import type { PACAnalysisResult } from './types';

// ============================================
// PAC ANALYZER - Uses Groq for fast analysis
// ============================================

const PAC_SYSTEM_PROMPT = `You are the Aspendos Proactive Agent. Analyze user context and decide if any proactive notifications are needed.

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
        const completion = await getGroqClient().chat.completions.create({
            model: ROUTER_MODEL,
            messages: [
                { role: 'system', content: PAC_SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `Analyze this context and decide if any proactive notifications are needed:\n\n${contextParts.join('\n\n')}`,
                },
            ],
            temperature: 0.3,
            max_tokens: 500,
            response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
            return { shouldNotify: false, items: [] };
        }

        const result = JSON.parse(content) as PACAnalysisResult;
        return result;
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
        'don\'t forget',
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
