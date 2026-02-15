/**
 * Commitment Detector Service - Proactive Agentic Callback (PAC)
 *
 * Detects temporal commitments in AI responses and generates
 * re-engagement messages when scheduled tasks are executed.
 * All AI calls route through Vercel AI Gateway.
 */
import type { ScheduledTask } from '@aspendos/db';
import { gateway, generateText } from 'ai';
import { type CommitmentDetectionResult, parseTimeExpression } from './scheduler.service';

// Use a lightweight model for commitment detection to minimize costs
const DETECTION_MODEL = process.env.COMMITMENT_DETECTION_MODEL || 'openai/gpt-4o-mini';
const REENGAGEMENT_MODEL = process.env.REENGAGEMENT_MODEL || 'openai/gpt-4o-mini';

// ============================================
// COMMITMENT DETECTION
// ============================================

const COMMITMENT_DETECTION_PROMPT = `You are analyzing an AI assistant's response to detect if it made a temporal commitment to the user.

A temporal commitment is when the AI promises to:
- Follow up at a specific time ("I'll check on you tomorrow")
- Remind the user about something ("I'll remind you next week")
- Continue a conversation later ("Let's revisit this in 3 days")
- Schedule a check-in ("We should discuss your progress in a week")

Analyze the assistant's message and respond with a JSON object:

{
  "has_commitment": boolean,
  "time_frame": string | null,  // e.g., "tomorrow", "1 week", "in 3 days"
  "intent": string | null,       // What the AI promised to do, e.g., "Check on study progress"
  "topic": string | null,        // Topic of the follow-up, e.g., "Gym Motivation"
  "tone": "friendly" | "professional" | "encouraging" | null
}

If no commitment is detected, return:
{ "has_commitment": false, "time_frame": null, "intent": null, "topic": null, "tone": null }

Respond ONLY with the JSON object, no other text.`;

/**
 * Detect if an AI response contains a temporal commitment
 */
export async function detectCommitment(
    assistantMessage: string,
    conversationContext?: string
): Promise<CommitmentDetectionResult> {
    try {
        const { text } = await generateText({
            model: gateway(DETECTION_MODEL),
            temperature: 0.1,
            maxOutputTokens: 200,
            system: COMMITMENT_DETECTION_PROMPT,
            prompt: conversationContext
                ? `Context: ${conversationContext}\n\nAssistant's message to analyze:\n${assistantMessage}`
                : `Assistant's message to analyze:\n${assistantMessage}`,
        });

        const result = JSON.parse(text.trim()) as {
            has_commitment: boolean;
            time_frame: string | null;
            intent: string | null;
            topic: string | null;
            tone: 'friendly' | 'professional' | 'encouraging' | null;
        };

        if (!result.has_commitment) {
            return { hasCommitment: false };
        }

        const absoluteTime = result.time_frame ? parseTimeExpression(result.time_frame) : null;

        return {
            hasCommitment: true,
            timeFrame: result.time_frame || undefined,
            intent: result.intent || undefined,
            topic: result.topic || undefined,
            tone: result.tone || undefined,
            absoluteTime: absoluteTime || undefined,
        };
    } catch (error) {
        console.error('Commitment detection failed:', error);
        return { hasCommitment: false };
    }
}

// ============================================
// RE-ENGAGEMENT MESSAGE GENERATION
// ============================================

const REENGAGEMENT_PROMPT_TEMPLATE = `You are an AI assistant resuming a previous conversation with a user.

Current date and time: {{CURRENT_TIME}}

You previously made a commitment to follow up with this user. Here are the details:

- Original intent: {{INTENT}}
- Topic: {{TOPIC}}
- Desired tone: {{TONE}}
- Context summary: {{CONTEXT}}

Generate a friendly, proactive opening message to resume this conversation. The message should:
1. Acknowledge the time that has passed
2. Reference the specific topic/intent naturally
3. Be warm but not overly casual
4. Invite the user to continue the conversation
5. Be 1-3 sentences maximum

Do NOT:
- Ask if now is a good time (assume it is)
- Apologize for reaching out
- Be overly formal or robotic

Respond with ONLY the message text, nothing else.`;

/**
 * Generate a re-engagement message for a scheduled task
 */
export async function generateReengagementMessage(task: ScheduledTask): Promise<string> {
    try {
        const prompt = REENGAGEMENT_PROMPT_TEMPLATE.replace(
            '{{CURRENT_TIME}}',
            new Date().toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            })
        )
            .replace('{{INTENT}}', task.intent || 'Follow up with the user')
            .replace('{{TOPIC}}', task.topic || 'Previous conversation')
            .replace('{{TONE}}', task.tone || 'friendly')
            .replace('{{CONTEXT}}', task.contextSummary || 'No additional context available');

        const { text } = await generateText({
            model: gateway(REENGAGEMENT_MODEL),
            temperature: 0.7,
            maxOutputTokens: 150,
            system: prompt,
            prompt: 'Generate the re-engagement message now.',
        });

        return text.trim() || generateFallbackMessage(task);
    } catch (error) {
        console.error('Re-engagement message generation failed:', error);
        return generateFallbackMessage(task);
    }
}

/**
 * Generate a simple fallback message when API fails
 */
function generateFallbackMessage(task: ScheduledTask): string {
    const toneMessages = {
        friendly: `Hey! Just checking in ${task.topic ? `about ${task.topic}` : ''}. How's everything going?`,
        professional: `Hello! I wanted to follow up ${task.topic ? `regarding ${task.topic}` : 'on our previous discussion'}. Do you have any updates?`,
        encouraging: `Hi there! I'm excited to hear how things are progressing ${task.topic ? `with ${task.topic}` : ''}. What's new?`,
    };

    return toneMessages[task.tone as keyof typeof toneMessages] || toneMessages.friendly;
}

// ============================================
// CONTEXT SUMMARIZATION
// ============================================

/**
 * Generate a context summary for a scheduled task
 */
export async function generateContextSummary(conversationHistory: string): Promise<string> {
    if (!conversationHistory) {
        return '';
    }

    try {
        const { text } = await generateText({
            model: gateway(DETECTION_MODEL),
            temperature: 0.3,
            maxOutputTokens: 200,
            prompt: `Summarize the following conversation context in 2-3 sentences.
Focus on the key topics discussed and any important details that would help resume the conversation later.
Be concise but capture the essential context.

Conversation:
${conversationHistory}

Summary:`,
        });

        return text.trim();
    } catch (error) {
        console.error('Context summarization failed:', error);
        return '';
    }
}
