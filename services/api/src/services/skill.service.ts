/**
 * Skill Service
 *
 * First-class skills with execution tracking and guard policies.
 * Inspired by OpenClaw's 60+ skills and Hermes Agent's learning loop.
 *
 * Unlike simple prompt templates, Skills include tool configuration,
 * guard policies, and execution tracking for self-improvement.
 */

import { prisma } from '@aspendos/db';

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
    return prisma.skill.create({
        data: {
            name: params.name,
            description: params.description,
            systemPrompt: params.systemPrompt,
            toolConfig: params.toolConfig,
            guardPolicy: params.guardPolicy,
            category: params.category,
            isSystem: params.isSystem ?? false,
            isPublic: params.isPublic ?? false,
            createdBy: params.createdBy,
        },
    });
}

export async function getSkill(id: string) {
    return prisma.skill.findUnique({ where: { id } });
}

export async function listSkills(options?: {
    category?: SkillCategory;
    userId?: string;
    includeSystem?: boolean;
    limit?: number;
    offset?: number;
}) {
    return prisma.skill.findMany({
        where: {
            ...(options?.category ? { category: options.category } : {}),
            OR: [
                { isSystem: true },
                { isPublic: true },
                ...(options?.userId ? [{ createdBy: options.userId }] : []),
            ],
        },
        orderBy: { usageCount: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
    });
}

export async function updateSkill(
    id: string,
    data: Partial<CreateSkillParams> & { version?: number }
) {
    return prisma.skill.update({
        where: { id },
        data: {
            ...data,
            version: data.version ? { increment: 1 } : undefined,
        },
    });
}

export async function deleteSkill(id: string) {
    return prisma.skill.delete({ where: { id } });
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
    const [execution] = await Promise.all([
        prisma.skillExecution.create({ data: params }),
        prisma.skill.update({
            where: { id: params.skillId },
            data: { usageCount: { increment: 1 } },
        }),
    ]);

    // Update success rate (rolling average)
    await updateSuccessRate(params.skillId);

    return execution;
}

export async function recordFeedback(executionId: string, feedback: number) {
    return prisma.skillExecution.update({
        where: { id: executionId },
        data: { feedback: Math.max(1, Math.min(5, feedback)) },
    });
}

export async function getSkillExecutions(
    skillId: string,
    options?: { limit?: number; userId?: string }
) {
    return prisma.skillExecution.findMany({
        where: {
            skillId,
            ...(options?.userId ? { userId: options.userId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 20,
    });
}

// ============================================
// ANALYTICS
// ============================================

async function updateSuccessRate(skillId: string) {
    const recentExecutions = await prisma.skillExecution.findMany({
        where: { skillId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { success: true },
    });

    if (recentExecutions.length === 0) return;

    const successCount = recentExecutions.filter((e) => e.success).length;
    const successRate = successCount / recentExecutions.length;

    await prisma.skill.update({
        where: { id: skillId },
        data: { successRate },
    });
}

export async function getSkillAnalytics(skillId: string) {
    const [skill, recentExecs, avgFeedback] = await Promise.all([
        prisma.skill.findUnique({ where: { id: skillId } }),
        prisma.skillExecution.findMany({
            where: { skillId },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: { success: true, feedback: true, durationMs: true },
        }),
        prisma.skillExecution.aggregate({
            where: { skillId, feedback: { not: null } },
            _avg: { feedback: true },
            _count: { feedback: true },
        }),
    ]);

    return {
        skillId,
        name: skill?.name,
        usageCount: skill?.usageCount ?? 0,
        successRate: skill?.successRate ?? 0,
        version: skill?.version ?? 1,
        avgFeedback: avgFeedback._avg.feedback ?? 0,
        feedbackCount: avgFeedback._count.feedback,
        avgDurationMs:
            recentExecs.length > 0
                ? Math.round(recentExecs.reduce((s, e) => s + e.durationMs, 0) / recentExecs.length)
                : 0,
    };
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
        const existing = await prisma.skill.findFirst({
            where: { name: skill.name, isSystem: true },
        });
        if (!existing) {
            await createSkill(skill);
        }
    }
}
