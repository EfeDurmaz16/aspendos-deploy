/**
 * Context Compression
 *
 * Structured summaries for long conversations to reduce token cost.
 * Inspired by Hermes Agent's compression template pattern.
 *
 * Triggered when conversation exceeds ~20K tokens.
 * Iterative: each compression updates the summary rather than
 * re-summarizing from scratch.
 */

import { gateway, generateText } from 'ai';

// ============================================
// TYPES
// ============================================

export interface CompressedContext {
    goal: string;
    progress: string;
    decisions: string[];
    resources: string[];
    nextSteps: string[];
    compressedAt: Date;
    originalTokenCount: number;
    compressedTokenCount: number;
}

// ============================================
// COMPRESSION
// ============================================

const COMPRESSION_PROMPT = `Analyze this conversation and create a structured summary. Be concise but preserve critical information.

Output format (use exactly these headers):
GOAL: [What the user is trying to achieve - 1 sentence]
PROGRESS: [What's been done so far - 2-3 sentences max]
DECISIONS: [Key choices made, one per line, prefixed with "- "]
RESOURCES: [Relevant files, URLs, or references mentioned, one per line, prefixed with "- "]
NEXT STEPS: [What needs to happen next, one per line, prefixed with "- "]`;

/**
 * Compress a conversation into a structured summary.
 */
export async function compressConversation(
    messages: Array<{ role: string; content: string }>,
    existingSummary?: CompressedContext
): Promise<CompressedContext> {
    const conversationText = messages.map((m) => `${m.role}: ${m.content}`).join('\n\n');

    const estimatedTokens = Math.ceil(conversationText.length / 4);

    let prompt = COMPRESSION_PROMPT;
    if (existingSummary) {
        prompt += `\n\nPrevious summary (update rather than recreate):\nGOAL: ${existingSummary.goal}\nPROGRESS: ${existingSummary.progress}\nDECISIONS:\n${existingSummary.decisions.map((d) => `- ${d}`).join('\n')}\nRESOURCES:\n${existingSummary.resources.map((r) => `- ${r}`).join('\n')}\nNEXT STEPS:\n${existingSummary.nextSteps.map((n) => `- ${n}`).join('\n')}`;
    }

    const model = gateway('groq', { modelId: 'llama-4-scout' });

    const result = await generateText({
        model,
        system: prompt,
        prompt: conversationText,
        temperature: 0.3,
        maxTokens: 500,
    });

    return parseCompressedContext(result.text, estimatedTokens);
}

/**
 * Check if a conversation needs compression.
 * Returns true if estimated tokens exceed threshold.
 */
export function needsCompression(messages: Array<{ content: string }>, threshold = 20000): boolean {
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 4);
    return estimatedTokens > threshold;
}

/**
 * Build a system prompt addition from compressed context.
 */
export function buildCompressedContextPrompt(context: CompressedContext): string {
    const sections = [`**Goal**: ${context.goal}`, `**Progress**: ${context.progress}`];

    if (context.decisions.length > 0) {
        sections.push(`**Key Decisions**:\n${context.decisions.map((d) => `- ${d}`).join('\n')}`);
    }
    if (context.resources.length > 0) {
        sections.push(`**Resources**:\n${context.resources.map((r) => `- ${r}`).join('\n')}`);
    }
    if (context.nextSteps.length > 0) {
        sections.push(`**Next Steps**:\n${context.nextSteps.map((n) => `- ${n}`).join('\n')}`);
    }

    return `## Conversation Context (Compressed)\n${sections.join('\n\n')}`;
}

// ============================================
// HELPERS
// ============================================

function parseCompressedContext(text: string, originalTokenCount: number): CompressedContext {
    const lines = text.split('\n');

    let goal = '';
    let progress = '';
    const decisions: string[] = [];
    const resources: string[] = [];
    const nextSteps: string[] = [];
    let currentSection = '';

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('GOAL:')) {
            goal = trimmed.replace('GOAL:', '').trim();
            currentSection = 'goal';
        } else if (trimmed.startsWith('PROGRESS:')) {
            progress = trimmed.replace('PROGRESS:', '').trim();
            currentSection = 'progress';
        } else if (trimmed.startsWith('DECISIONS:')) {
            currentSection = 'decisions';
        } else if (trimmed.startsWith('RESOURCES:')) {
            currentSection = 'resources';
        } else if (trimmed.startsWith('NEXT STEPS:')) {
            currentSection = 'nextSteps';
        } else if (trimmed.startsWith('- ')) {
            const item = trimmed.replace('- ', '');
            switch (currentSection) {
                case 'decisions':
                    decisions.push(item);
                    break;
                case 'resources':
                    resources.push(item);
                    break;
                case 'nextSteps':
                    nextSteps.push(item);
                    break;
            }
        } else if (trimmed && currentSection === 'progress' && !progress) {
            progress = trimmed;
        }
    }

    const compressedText = [goal, progress, ...decisions, ...resources, ...nextSteps].join(' ');
    const compressedTokenCount = Math.ceil(compressedText.length / 4);

    return {
        goal: goal || 'Not specified',
        progress: progress || 'No progress noted',
        decisions,
        resources,
        nextSteps,
        compressedAt: new Date(),
        originalTokenCount,
        compressedTokenCount,
    };
}
