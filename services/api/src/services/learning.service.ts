/**
 * Learning Service
 *
 * Pattern detection and skill auto-suggestion from agent action history.
 * Inspired by Hermes Agent's learning loop — the agent creates skills
 * from experience, improves them during use, and builds a deepening
 * understanding of user workflows.
 *
 * Flow:
 * 1. Query AgentActionLog for recurring tool sequences
 * 2. If same sequence appears 3+ times for similar queries → pattern detected
 * 3. Extract skill draft (system prompt, tool sequence, guard config)
 * 4. Suggest to user: "I noticed you often do X. Create a shortcut?"
 */

import { prisma } from '@aspendos/db';
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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get all tool call sessions (grouped by sessionId)
    const sessions = await prisma.agentActionLog.groupBy({
        by: ['sessionId'],
        where: {
            userId,
            actionType: 'tool_call',
            toolName: { not: null },
            createdAt: { gte: thirtyDaysAgo },
        },
        _count: { id: true },
        having: { id: { _count: { gte: 2 } } }, // Sessions with 2+ tool calls
    });

    // For each session, get the tool sequence
    const sequences: Array<{ tools: string[]; sessionId: string }> = [];

    for (const session of sessions.slice(0, 50)) {
        // Limit to 50 sessions
        const actions = await prisma.agentActionLog.findMany({
            where: {
                userId,
                sessionId: session.sessionId,
                actionType: 'tool_call',
                toolName: { not: null },
            },
            orderBy: { createdAt: 'asc' },
            select: { toolName: true },
            take: 10, // Max 10 tools per sequence
        });

        const tools = actions.map((a) => a.toolName!).filter(Boolean);
        if (tools.length >= 2) {
            sequences.push({ tools, sessionId: session.sessionId });
        }
    }

    // Count occurrences of each unique tool sequence
    const sequenceCounts = new Map<
        string,
        { count: number; tools: string[]; sessions: string[] }
    >();

    for (const seq of sequences) {
        const key = seq.tools.join('→');
        const existing = sequenceCounts.get(key) || { count: 0, tools: seq.tools, sessions: [] };
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
    const skills = await prisma.skill.findMany({
        where: {
            usageCount: { gte: 5 }, // Only check skills with enough data
            OR: [{ successRate: { lt: 0.7 } }],
            ...(userId ? { createdBy: userId } : {}),
        },
        select: { id: true },
    });

    // Also check average feedback
    const lowFeedbackSkills = await prisma.skillExecution.groupBy({
        by: ['skillId'],
        where: {
            feedback: { not: null },
            ...(userId ? { userId } : {}),
        },
        _avg: { feedback: true },
        _count: { feedback: true },
        having: {
            feedback: { _count: { gte: 3 }, _avg: { lt: 3.0 } },
        },
    });

    const skillIds = new Set([
        ...skills.map((s) => s.id),
        ...lowFeedbackSkills.map((s) => s.skillId),
    ]);

    return Array.from(skillIds);
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
