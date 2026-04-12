/**
 * Learning Service
 *
 * Pattern detection and skill auto-suggestion from agent action history.
 * Inspired by Hermes Agent's learning loop — the agent creates skills
 * from experience, improves them during use, and builds a deepening
 * understanding of user workflows.
 *
 * Flow:
 * 1. Query action_log for recurring tool sequences
 * 2. If same sequence appears 3+ times for similar queries -> pattern detected
 * 3. Extract skill draft (system prompt, tool sequence, guard config)
 * 4. Suggest to user: "I noticed you often do X. Create a shortcut?"
 *
 * Backed by Convex action_log.
 */

import { getConvexClient, api } from '../lib/convex';
import * as skillService from './skill.service';

// ============================================
// TYPES
// ============================================

export interface DetectedPattern {
    toolSequence: string[];
    occurrences: number;
    lastSeen: Date;
    sampleInputs: string[];
    suggestedName: string;
    suggestedDescription: string;
}

// ============================================
// PATTERN DETECTION
// ============================================

/**
 * Detect recurring tool usage patterns for a user.
 * Returns patterns that appear 3+ times in the last 30 days.
 */
export async function detectPatterns(userId: string): Promise<DetectedPattern[]> {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: 2000,
        });

        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

        // Filter to tool_call events in the last 30 days
        const toolCallLogs = logs.filter(
            (l) =>
                l.event_type === 'tool_call' &&
                l.timestamp >= thirtyDaysAgo &&
                l.details?.toolName
        );

        // Group by sessionId
        const sessionGroups = new Map<string, Array<{ toolName: string; timestamp: number }>>();
        for (const log of toolCallLogs) {
            const sessionId = (log.details?.sessionId as string) || 'unknown';
            if (!sessionGroups.has(sessionId)) {
                sessionGroups.set(sessionId, []);
            }
            sessionGroups.get(sessionId)!.push({
                toolName: log.details!.toolName as string,
                timestamp: log.timestamp,
            });
        }

        // Build sequences from sessions with 2+ tool calls
        const sequences: Array<{ tools: string[]; sessionId: string }> = [];
        for (const [sessionId, actions] of sessionGroups) {
            if (actions.length < 2) continue;
            // Sort by timestamp ascending
            actions.sort((a, b) => a.timestamp - b.timestamp);
            const tools = actions.slice(0, 10).map((a) => a.toolName);
            sequences.push({ tools, sessionId });
        }

        // Count occurrences of each unique tool sequence
        const sequenceCounts = new Map<
            string,
            { count: number; tools: string[]; sessions: string[] }
        >();

        for (const seq of sequences.slice(0, 50)) {
            const key = seq.tools.join('→');
            const existing = sequenceCounts.get(key) || {
                count: 0,
                tools: seq.tools,
                sessions: [],
            };
            existing.count++;
            existing.sessions.push(seq.sessionId);
            sequenceCounts.set(key, existing);
        }

        // Filter to patterns with 3+ occurrences
        const patterns: DetectedPattern[] = [];

        for (const [_key, value] of sequenceCounts) {
            if (value.count < 3) continue;

            patterns.push({
                toolSequence: value.tools,
                occurrences: value.count,
                lastSeen: new Date(), // Approximate
                sampleInputs: [], // Would need to query chat messages
                suggestedName: generatePatternName(value.tools),
                suggestedDescription: `Automated workflow: ${value.tools.join(' → ')} (used ${value.count} times)`,
            });
        }

        return patterns.sort((a, b) => b.occurrences - a.occurrences);
    } catch (error) {
        console.error('[Learning] detectPatterns failed:', error);
        return [];
    }
}

/**
 * Create a skill from a detected pattern.
 */
export async function createSkillFromPattern(
    userId: string,
    pattern: DetectedPattern
): Promise<string> {
    const skill = await skillService.createSkill({
        name: pattern.suggestedName,
        description: pattern.suggestedDescription,
        systemPrompt: `You are executing a learned workflow: ${pattern.toolSequence.join(' → ')}. Follow this tool sequence to accomplish the user's task efficiently.`,
        toolConfig: { allowedTools: pattern.toolSequence, sequence: true },
        guardPolicy: { maxIterations: pattern.toolSequence.length + 5 },
        category: 'productivity',
        createdBy: userId,
    });

    return skill.id;
}

/**
 * Check if any skills need refinement based on execution feedback.
 * Skills with success rate < 70% or avg feedback < 3.0 get flagged.
 */
export async function getSkillsNeedingRefinement(userId?: string): Promise<string[]> {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listRecent, { limit: 2000 });

        // Filter to skill_execution events
        const execLogs = logs.filter(
            (l) =>
                l.event_type === 'skill_execution' &&
                (!userId || l.user_id === (userId as any))
        );

        // Group by skillId
        const skillStats = new Map<
            string,
            { total: number; successes: number; feedbackSum: number; feedbackCount: number }
        >();

        for (const log of execLogs) {
            const skillId = log.details?.skillId as string;
            if (!skillId) continue;

            const stats = skillStats.get(skillId) || {
                total: 0,
                successes: 0,
                feedbackSum: 0,
                feedbackCount: 0,
            };
            stats.total++;
            if (log.details?.success) stats.successes++;
            if (typeof log.details?.feedback === 'number') {
                stats.feedbackSum += log.details.feedback;
                stats.feedbackCount++;
            }
            skillStats.set(skillId, stats);
        }

        const needsRefinement: string[] = [];
        for (const [skillId, stats] of skillStats) {
            if (stats.total < 5) continue; // Not enough data
            const successRate = stats.successes / stats.total;
            const avgFeedback =
                stats.feedbackCount >= 3
                    ? stats.feedbackSum / stats.feedbackCount
                    : 5.0; // Default OK

            if (successRate < 0.7 || avgFeedback < 3.0) {
                needsRefinement.push(skillId);
            }
        }

        return needsRefinement;
    } catch (error) {
        console.error('[Learning] getSkillsNeedingRefinement failed:', error);
        return [];
    }
}

// ============================================
// SKILL AUTO-REFINEMENT
// ============================================

export async function refineSkill(skillId: string): Promise<boolean> {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listRecent, { limit: 1000 });

        // Find the skill definition
        const skillLog = logs.find(
            (l) =>
                l.event_type === 'skill_created' &&
                l.details?.skillId === skillId
        );
        if (!skillLog) return false;

        // Find failed executions
        const failures = logs
            .filter(
                (l) =>
                    l.event_type === 'skill_execution' &&
                    l.details?.skillId === skillId &&
                    !l.details?.success
            )
            .slice(0, 10);

        if (failures.length === 0) return false;

        const failureInputs = failures
            .map((f) => (f.details?.input as string) || '')
            .filter(Boolean);
        const patterns = findCommonWords(failureInputs);
        if (patterns.length === 0) return false;

        const currentPrompt = (skillLog.details?.systemPrompt as string) || '';
        const refinedPrompt = `${currentPrompt}\n\nKnown failure patterns to handle carefully:\n${patterns.map((p) => `- ${p}`).join('\n')}`;

        // Log the refinement
        await client.mutation(api.actionLog.log, {
            event_type: 'skill_refined',
            details: {
                skillId,
                refinedPrompt,
                failurePatterns: patterns,
            },
        });

        return true;
    } catch (error) {
        console.error('[Learning] refineSkill failed:', error);
        return false;
    }
}

export async function runRefinementCycle(userId?: string): Promise<number> {
    const skillIds = await getSkillsNeedingRefinement(userId);
    let refined = 0;
    for (const id of skillIds) {
        if (await refineSkill(id)) refined++;
    }
    return refined;
}

function findCommonWords(strings: string[]): string[] {
    if (strings.length < 2) return [];
    const wordCounts = new Map<string, number>();
    for (const str of strings) {
        const words = new Set(
            str
                .toLowerCase()
                .split(/\s+/)
                .filter((w) => w.length > 4)
        );
        for (const word of words) {
            wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
    }
    const threshold = Math.ceil(strings.length * 0.5);
    return Array.from(wordCounts.entries())
        .filter(([, count]) => count >= threshold)
        .map(([word]) => word)
        .slice(0, 5);
}

// ============================================
// HELPERS
// ============================================

function generatePatternName(tools: string[]): string {
    const prefix = tools.length <= 2 ? 'quick' : 'workflow';
    const toolNames = tools.slice(0, 3).map(simplifyToolName).join('-');
    return `${prefix}-${toolNames}`;
}

function simplifyToolName(name: string): string {
    return name
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 15);
}
