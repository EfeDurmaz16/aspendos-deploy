/**
 * PAC Service - Proactive AI Callbacks
 *
 * Handles commitment detection, reminder scheduling, and escalation.
 */

import { prisma } from '../lib/prisma';

// Types
export type ReminderType = 'EXPLICIT' | 'IMPLICIT';
export type ReminderStatus = 'PENDING' | 'SNOOZED' | 'COMPLETED' | 'DISMISSED';
export type ReminderPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DetectedCommitment {
    content: string;
    type: ReminderType;
    priority: ReminderPriority;
    triggerAt: Date;
    confidence: number;
}

// Patterns for explicit commitment detection
const EXPLICIT_PATTERNS = [
    /remind me (?:to )?(.+?)(?:\s+(?:in|at|on|by)\s+(.+))?$/i,
    /(?:I'll|I will|I need to|I have to|I should|I must)\s+(.+?)(?:\s+(?:by|before|on)\s+(.+))?$/i,
    /(?:don't let me forget|help me remember)\s+(?:to )?(.+)/i,
    /set (?:a )?reminder (?:for |to )?(.+)/i,
];

// Patterns for implicit commitment detection
const IMPLICIT_PATTERNS = [
    /(?:I'm going to|I plan to|I intend to)\s+(.+)/i,
    /(?:I'll try to|I want to)\s+(.+)/i,
    /(?:let me|I should probably)\s+(.+)/i,
    /(?:tomorrow|next week|later)\s+I(?:'ll| will| need to)\s+(.+)/i,
];

// Time pattern extraction
const TIME_PATTERNS = [
    { pattern: /in (\d+) minutes?/i, extract: (m: RegExpMatchArray) => parseInt(m[1]) },
    { pattern: /in (\d+) hours?/i, extract: (m: RegExpMatchArray) => parseInt(m[1]) * 60 },
    { pattern: /in (\d+) days?/i, extract: (m: RegExpMatchArray) => parseInt(m[1]) * 60 * 24 },
    { pattern: /tomorrow/i, extract: () => 24 * 60 },
    { pattern: /next week/i, extract: () => 7 * 24 * 60 },
    { pattern: /(?:this |tonight|this evening)/i, extract: () => 8 * 60 }, // ~8 hours
];

/**
 * Detect commitments in a message
 */
export function detectCommitments(message: string): DetectedCommitment[] {
    const commitments: DetectedCommitment[] = [];
    const now = new Date();

    // Check explicit patterns first
    for (const pattern of EXPLICIT_PATTERNS) {
        const match = message.match(pattern);
        if (match) {
            const content = match[1]?.trim();
            if (!content) continue;

            const timeStr = match[2];
            const triggerMinutes = extractTimeOffset(timeStr || message);

            commitments.push({
                content,
                type: 'EXPLICIT',
                priority: 'MEDIUM',
                triggerAt: new Date(now.getTime() + triggerMinutes * 60 * 1000),
                confidence: 0.95,
            });
        }
    }

    // Check implicit patterns if no explicit found
    if (commitments.length === 0) {
        for (const pattern of IMPLICIT_PATTERNS) {
            const match = message.match(pattern);
            if (match) {
                const content = match[1]?.trim();
                if (!content || content.length < 5) continue;

                const triggerMinutes = extractTimeOffset(message);

                commitments.push({
                    content,
                    type: 'IMPLICIT',
                    priority: 'LOW',
                    triggerAt: new Date(now.getTime() + triggerMinutes * 60 * 1000),
                    confidence: 0.7,
                });
            }
        }
    }

    return commitments;
}

/**
 * Extract time offset from text
 */
function extractTimeOffset(text: string): number {
    for (const { pattern, extract } of TIME_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            return extract(match);
        }
    }
    // Default to 1 hour if no time specified
    return 60;
}

/**
 * Create a reminder
 */
export async function createReminder(
    userId: string,
    commitment: DetectedCommitment,
    conversationId?: string,
    messageId?: string
) {
    return prisma.pACReminder.create({
        data: {
            userId,
            type: commitment.type,
            content: commitment.content,
            triggerAt: commitment.triggerAt,
            priority: commitment.priority,
            status: 'PENDING',
            confidence: commitment.confidence,
            conversationId,
            messageId,
        },
    });
}

/**
 * Get pending reminders for a user
 */
export async function getPendingReminders(userId: string, limit = 20) {
    return prisma.pACReminder.findMany({
        where: {
            userId,
            status: { in: ['PENDING', 'SNOOZED'] },
        },
        orderBy: [{ triggerAt: 'asc' }],
        take: limit,
        include: {
            conversation: {
                select: { id: true, title: true },
            },
        },
    });
}

/**
 * Get due reminders (ready to trigger)
 */
export async function getDueReminders(limit = 100) {
    const now = new Date();
    return prisma.pACReminder.findMany({
        where: {
            status: 'PENDING',
            triggerAt: { lte: now },
        },
        take: limit,
        include: {
            user: {
                select: { id: true, email: true, name: true },
            },
            conversation: {
                select: { id: true, title: true },
            },
        },
    });
}

/**
 * Complete a reminder
 */
export async function completeReminder(reminderId: string, userId: string) {
    return prisma.pACReminder.updateMany({
        where: { id: reminderId, userId },
        data: {
            status: 'COMPLETED',
            completedAt: new Date(),
        },
    });
}

/**
 * Dismiss a reminder
 */
export async function dismissReminder(reminderId: string, userId: string) {
    return prisma.pACReminder.updateMany({
        where: { id: reminderId, userId },
        data: {
            status: 'DISMISSED',
            dismissedAt: new Date(),
        },
    });
}

/**
 * Snooze a reminder
 */
export async function snoozeReminder(reminderId: string, userId: string, minutes: number) {
    const reminder = await prisma.pACReminder.findFirst({
        where: { id: reminderId, userId },
    });

    if (!reminder) {
        throw new Error('Reminder not found');
    }

    const newTriggerAt = new Date(Date.now() + minutes * 60 * 1000);

    await prisma.pACReminder.update({
        where: { id: reminderId },
        data: {
            status: 'SNOOZED',
            triggerAt: newTriggerAt,
            snoozeCount: { increment: 1 },
        },
    });

    // Record escalation event
    await prisma.pACEscalation.create({
        data: {
            reminderId,
            type: 'SNOOZE',
            previousTriggerAt: reminder.triggerAt,
            newTriggerAt,
        },
    });

    return { newTriggerAt };
}

/**
 * Get or create user's PAC settings
 */
export async function getPACSettings(userId: string) {
    let settings = await prisma.pACSettings.findUnique({
        where: { userId },
    });

    if (!settings) {
        settings = await prisma.pACSettings.create({
            data: {
                userId,
                enabled: true,
                explicitEnabled: true,
                implicitEnabled: true,
                pushEnabled: true,
                emailEnabled: false,
                quietHoursEnabled: false,
                quietHoursStart: '22:00',
                quietHoursEnd: '08:00',
                escalationEnabled: true,
                digestEnabled: false,
                digestTime: '09:00',
            },
        });
    }

    return settings;
}

/**
 * Update PAC settings
 */
export async function updatePACSettings(
    userId: string,
    settings: Partial<{
        enabled: boolean;
        explicitEnabled: boolean;
        implicitEnabled: boolean;
        pushEnabled: boolean;
        emailEnabled: boolean;
        quietHoursEnabled: boolean;
        quietHoursStart: string;
        quietHoursEnd: string;
        escalationEnabled: boolean;
        digestEnabled: boolean;
        digestTime: string;
    }>
) {
    return prisma.pACSettings.upsert({
        where: { userId },
        update: settings,
        create: {
            userId,
            enabled: settings.enabled ?? true,
            explicitEnabled: settings.explicitEnabled ?? true,
            implicitEnabled: settings.implicitEnabled ?? true,
            pushEnabled: settings.pushEnabled ?? true,
            emailEnabled: settings.emailEnabled ?? false,
            quietHoursEnabled: settings.quietHoursEnabled ?? false,
            quietHoursStart: settings.quietHoursStart ?? '22:00',
            quietHoursEnd: settings.quietHoursEnd ?? '08:00',
            escalationEnabled: settings.escalationEnabled ?? true,
            digestEnabled: settings.digestEnabled ?? false,
            digestTime: settings.digestTime ?? '09:00',
        },
    });
}

/**
 * Check if in quiet hours
 */
export function isInQuietHours(
    settings: { quietHoursEnabled: boolean; quietHoursStart: string; quietHoursEnd: string }
): boolean {
    if (!settings.quietHoursEnabled) return false;

    const now = new Date();
    const [startHour, startMin] = settings.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes <= endMinutes) {
        // Same day range (e.g., 14:00 - 18:00)
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
        // Overnight range (e.g., 22:00 - 08:00)
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
}

/**
 * Get PAC statistics
 */
export async function getPACStats(userId: string) {
    const [total, pending, completed, snoozed] = await Promise.all([
        prisma.pACReminder.count({ where: { userId } }),
        prisma.pACReminder.count({ where: { userId, status: 'PENDING' } }),
        prisma.pACReminder.count({ where: { userId, status: 'COMPLETED' } }),
        prisma.pACReminder.count({ where: { userId, status: 'SNOOZED' } }),
    ]);

    return {
        total,
        pending,
        completed,
        snoozed,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
}
