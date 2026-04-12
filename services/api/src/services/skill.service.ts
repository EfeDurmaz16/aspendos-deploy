/**
 * Skill Service
 *
 * First-class skills with execution tracking and guard policies.
 * Inspired by OpenClaw's 60+ skills and Hermes Agent's learning loop.
 *
 * Migrated from Prisma to Convex action_log events.
 */

import { getConvexClient, api } from '../lib/convex';

// ============================================
// TYPES
// ============================================

export type SkillCategory = 'productivity' | 'research' | 'creative' | 'coding' | 'personal';

export interface CreateSkillParams {
    name: string;
    description: string;
    systemPrompt: string;
    toolConfig: Record<string, unknown>;
    guardPolicy: Record<string, unknown>;
    category: SkillCategory;
    isSystem?: boolean;
    isPublic?: boolean;
    createdBy?: string;
}

// ============================================
// CRUD
// ============================================

export async function createSkill(params: CreateSkillParams) {
    try {
        const client = getConvexClient();
        return await client.mutation(api.actionLog.log, {
            user_id: params.createdBy ? (params.createdBy as any) : undefined,
            event_type: 'skill_created',
            details: {
                name: params.name,
                description: params.description,
                systemPrompt: params.systemPrompt,
                toolConfig: params.toolConfig,
                guardPolicy: params.guardPolicy,
                category: params.category,
                isSystem: params.isSystem ?? false,
                isPublic: params.isPublic ?? false,
                createdBy: params.createdBy,
                usageCount: 0,
                successRate: 0,
                version: 1,
            },
        });
    } catch {
        return null;
    }
}

export async function getSkill(id: string) {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listRecent, { limit: 500 });
        const match = (logs || []).find(
            (l: any) => l._id === id && l.event_type === 'skill_created'
        );
        return match ? { id: match._id, ...match.details } : null;
    } catch {
        return null;
    }
}

export async function listSkills(options?: {
    category?: SkillCategory;
    userId?: string;
    includeSystem?: boolean;
    limit?: number;
    offset?: number;
}) {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listRecent, { limit: 500 });
        let skills = (logs || [])
            .filter((l: any) => l.event_type === 'skill_created')
            .map((l: any) => ({ id: l._id, ...l.details }));

        if (options?.category) {
            skills = skills.filter((s: any) => s.category === options.category);
        }

        // Filter: show system, public, or user-owned skills
        skills = skills.filter((s: any) => {
            if (s.isSystem) return true;
            if (s.isPublic) return true;
            if (options?.userId && s.createdBy === options.userId) return true;
            return false;
        });

        // Sort by usage count descending
        skills.sort((a: any, b: any) => (b.usageCount || 0) - (a.usageCount || 0));

        const offset = options?.offset ?? 0;
        const limit = options?.limit ?? 50;
        return skills.slice(offset, offset + limit);
    } catch {
        return [];
    }
}

export async function updateSkill(
    id: string,
    data: Partial<CreateSkillParams> & { version?: number }
) {
    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            event_type: 'skill_updated',
            details: { skillId: id, ...data },
        });
        return { id, ...data };
    } catch {
        return null;
    }
}

export async function deleteSkill(id: string) {
    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            event_type: 'skill_deleted',
            details: { skillId: id },
        });
        return { id };
    } catch {
        return null;
    }
}

// ============================================
// EXECUTION TRACKING
// ============================================

export async function recordExecution(params: {
    skillId: string;
    userId: string;
    chatId?: string;
    input: string;
    output?: string;
    success: boolean;
    durationMs: number;
}) {
    try {
        const client = getConvexClient();
        const executionId = await client.mutation(api.actionLog.log, {
            user_id: params.userId as any,
            event_type: 'skill_execution',
            details: params,
        });
        return { id: executionId, ...params };
    } catch {
        return null;
    }
}

export async function recordFeedback(executionId: string, feedback: number) {
    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            event_type: 'skill_execution_feedback',
            details: {
                executionId,
                feedback: Math.max(1, Math.min(5, feedback)),
            },
        });
        return { executionId, feedback };
    } catch {
        return null;
    }
}

export async function getSkillExecutions(
    skillId: string,
    options?: { limit?: number; userId?: string }
) {
    try {
        const client = getConvexClient();
        const logs = options?.userId
            ? await client.query(api.actionLog.listByUser, {
                  user_id: options.userId as any,
                  limit: 200,
              })
            : await client.query(api.actionLog.listRecent, { limit: 200 });

        return (logs || [])
            .filter(
                (l: any) =>
                    l.event_type === 'skill_execution' && l.details?.skillId === skillId
            )
            .slice(0, options?.limit ?? 20)
            .map((l: any) => ({ id: l._id, ...l.details }));
    } catch {
        return [];
    }
}

// ============================================
// ANALYTICS
// ============================================

export async function getSkillAnalytics(skillId: string) {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listRecent, { limit: 500 });

        const skill = (logs || []).find(
            (l: any) => l._id === skillId && l.event_type === 'skill_created'
        );

        const executions = (logs || []).filter(
            (l: any) => l.event_type === 'skill_execution' && l.details?.skillId === skillId
        );

        const feedbacks = (logs || []).filter(
            (l: any) =>
                l.event_type === 'skill_execution_feedback' &&
                executions.some((e: any) => e._id === l.details?.executionId)
        );

        const successCount = executions.filter((e: any) => e.details?.success).length;
        const successRate = executions.length > 0 ? successCount / executions.length : 0;

        const avgFeedback =
            feedbacks.length > 0
                ? feedbacks.reduce((sum: number, f: any) => sum + (f.details?.feedback || 0), 0) /
                  feedbacks.length
                : 0;

        const avgDurationMs =
            executions.length > 0
                ? Math.round(
                      executions.reduce((s: number, e: any) => s + (e.details?.durationMs || 0), 0) /
                          executions.length
                  )
                : 0;

        return {
            skillId,
            name: skill?.details?.name,
            usageCount: executions.length,
            successRate,
            version: skill?.details?.version ?? 1,
            avgFeedback,
            feedbackCount: feedbacks.length,
            avgDurationMs,
        };
    } catch {
        return {
            skillId,
            name: undefined,
            usageCount: 0,
            successRate: 0,
            version: 1,
            avgFeedback: 0,
            feedbackCount: 0,
            avgDurationMs: 0,
        };
    }
}

// ============================================
// SYSTEM SKILLS
// ============================================

/** Seed the 7 system skills if they don't exist. */
export async function seedSystemSkills() {
    const systemSkills: CreateSkillParams[] = [
        {
            name: 'deep-research',
            description:
                'Multi-step web search with synthesis. Searches multiple sources and synthesizes findings into a comprehensive answer.',
            systemPrompt:
                'You are a research agent. Search for information from multiple angles, synthesize findings, and provide a comprehensive, well-sourced answer. Cite your sources.',
            toolConfig: { allowedTools: ['searchMemories', 'addMemory', 'current_time'] },
            guardPolicy: { maxIterations: 15, costBudget: 1.0 },
            category: 'research',
            isSystem: true,
            isPublic: true,
        },
        {
            name: 'memory-curator',
            description:
                'Organize and prune memories. Reviews stored memories, identifies duplicates, and suggests cleanup actions.',
            systemPrompt:
                "You are a memory curator. Review the user's stored memories, identify duplicates, outdated information, and suggest organization improvements. Be careful not to delete important memories.",
            toolConfig: {
                allowedTools: ['searchMemories', 'addMemory', 'memoryForget', 'documentList'],
            },
            guardPolicy: { maxIterations: 10, requireApprovalForDeletes: true },
            category: 'productivity',
            isSystem: true,
            isPublic: true,
        },
        {
            name: 'commitment-tracker',
            description:
                'Enhanced PAC with follow-up chains. Tracks commitments, sets reminders, and proactively follows up.',
            systemPrompt:
                'You are a commitment tracker. Help the user track their commitments, set appropriate reminders, and follow up on previous commitments. Be proactive but not intrusive.',
            toolConfig: { allowedTools: ['searchMemories', 'addMemory', 'current_time'] },
            guardPolicy: { maxIterations: 8 },
            category: 'productivity',
            isSystem: true,
            isPublic: true,
        },
        {
            name: 'code-reviewer',
            description:
                'Code analysis with security checks. Reviews code for bugs, security vulnerabilities, and best practices.',
            systemPrompt:
                'You are a code reviewer. Analyze the provided code for bugs, security vulnerabilities (OWASP Top 10), performance issues, and adherence to best practices. Provide specific, actionable feedback.',
            toolConfig: { allowedTools: ['searchMemories', 'calculator'] },
            guardPolicy: { maxIterations: 5 },
            category: 'coding',
            isSystem: true,
            isPublic: true,
        },
        {
            name: 'meeting-prep',
            description: 'Pull context from memory and calendar for meeting preparation.',
            systemPrompt:
                "You are a meeting prep assistant. Search the user's memories for relevant context about the meeting topic, participants, and previous discussions. Create a concise briefing document.",
            toolConfig: { allowedTools: ['searchMemories', 'getProfile', 'current_time'] },
            guardPolicy: { maxIterations: 8 },
            category: 'productivity',
            isSystem: true,
            isPublic: true,
        },
        {
            name: 'daily-brief',
            description:
                'Proactive morning summary of pending tasks, reminders, and relevant context.',
            systemPrompt:
                'You are a daily briefing assistant. Compile a concise morning summary including pending reminders, recent memory updates, and any relevant context for the day ahead. Keep it actionable and brief.',
            toolConfig: { allowedTools: ['searchMemories', 'getProfile', 'current_time'] },
            guardPolicy: { maxIterations: 5 },
            category: 'productivity',
            isSystem: true,
            isPublic: true,
        },
        {
            name: 'learning-plan',
            description: 'Create and track learning objectives with structured progression.',
            systemPrompt:
                'You are a learning plan assistant. Help the user create structured learning plans with milestones, track their progress, and suggest next steps based on their learning history.',
            toolConfig: { allowedTools: ['searchMemories', 'addMemory', 'current_time'] },
            guardPolicy: { maxIterations: 10 },
            category: 'personal',
            isSystem: true,
            isPublic: true,
        },
    ];

    for (const skill of systemSkills) {
        try {
            const existing = await listSkills();
            const found = existing.find(
                (s: any) => s.name === skill.name && s.isSystem === true
            );
            if (!found) {
                await createSkill(skill);
            }
        } catch {
            // Non-blocking seed
        }
    }
}
