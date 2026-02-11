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
 * Adjust trigger time toward user's optimal hour (feedback loop).
 * Only nudges implicit reminders by up to 2 hours toward the learned best hour.
 * Explicit reminders respect the user's exact request.
 */
function adjustToOptimalHour(triggerAt: Date, optimalHour: number | null, type: ReminderType): Date {
    if (optimalHour === null || type === 'EXPLICIT') return triggerAt;

    const triggerHour = triggerAt.getHours();
    const diff = optimalHour - triggerHour;

    // Only nudge if within +-4 hours and the nudge is meaningful (>= 1hr)
    if (Math.abs(diff) >= 1 && Math.abs(diff) <= 4) {
        // Nudge up to 2 hours toward optimal
        const nudgeHours = Math.sign(diff) * Math.min(Math.abs(diff), 2);
        const adjusted = new Date(triggerAt);
        adjusted.setHours(adjusted.getHours() + nudgeHours);
        // Don't move into the past
        if (adjusted.getTime() > Date.now()) return adjusted;
    }

    return triggerAt;
}

/**
 * Create a reminder with behavioral learning adjustment
 */
export async function createReminder(
    userId: string,
    commitment: DetectedCommitment,
    chatId?: string,
) {
    // Close the feedback loop: adjust implicit reminder timing toward optimal hour
    let adjustedTriggerAt = commitment.triggerAt;
    if (commitment.type === 'IMPLICIT') {
        try {
            const effectiveness = await computeEffectiveness(userId);
            adjustedTriggerAt = adjustToOptimalHour(
                commitment.triggerAt,
                effectiveness.optimalHour,
                commitment.type,
            );
        } catch {
            // If effectiveness computation fails, use original time
        }
    }

    const priorityMap: Record<string, number> = { LOW: 30, MEDIUM: 50, HIGH: 80 };
    return prisma.pACReminder.create({
        data: {
            userId,
            type: commitment.type,
            content: commitment.content,
            triggerAt: adjustedTriggerAt,
            priority: priorityMap[commitment.priority] || 50,
            status: 'PENDING',
            source: commitment.type === 'EXPLICIT' ? 'explicit' : 'implicit',
            sourceText: commitment.content,
            chatId,
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
            status: 'ACKNOWLEDGED',
            respondedAt: new Date(),
            responseType: 'acknowledged',
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
            respondedAt: new Date(),
            responseType: 'dismissed',
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
        },
    });

    // Record escalation event
    await prisma.pACEscalation.create({
        data: {
            reminderId,
            level: 1,
            channel: 'in_app',
            scheduledAt: newTriggerAt,
            status: 'pending',
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
    settings: { quietHoursStart?: string; quietHoursEnd?: string }
): boolean {
    if (!settings.quietHoursStart || !settings.quietHoursEnd) return false;

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
 * Get PAC statistics with behavioral learning insights
 */
export async function getPACStats(userId: string) {
    const [total, pending, completed, snoozed, dismissed] = await Promise.all([
        prisma.pACReminder.count({ where: { userId } }),
        prisma.pACReminder.count({ where: { userId, status: 'PENDING' } }),
        prisma.pACReminder.count({ where: { userId, status: 'ACKNOWLEDGED' } }),
        prisma.pACReminder.count({ where: { userId, status: 'SNOOZED' } }),
        prisma.pACReminder.count({ where: { userId, status: 'DISMISSED' } }),
    ]);

    // Behavioral learning: compute effectiveness metrics
    const effectiveness = await computeEffectiveness(userId);

    return {
        total,
        pending,
        completed,
        snoozed,
        dismissed,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        effectiveness,
    };
}

// ============================================
// BEHAVIORAL LEARNING
// ============================================

interface EffectivenessMetrics {
    engagementRate: number;        // % of reminders acknowledged (not dismissed)
    avgResponseTimeMin: number;    // avg time between trigger and response
    optimalHour: number | null;    // best hour for delivery
    implicitAccuracy: number;      // % of implicit reminders that were useful
    snoozeRate: number;            // how often user delays
    recommendation: string;        // actionable insight
}

/**
 * Compute PAC effectiveness from user's historical behavior.
 * This is the behavioral learning engine that makes PAC smarter over time.
 * Competitors just send reminders; we learn WHEN and HOW to send them.
 */
async function computeEffectiveness(userId: string): Promise<EffectivenessMetrics> {
    const reminders = await prisma.pACReminder.findMany({
        where: {
            userId,
            status: { in: ['ACKNOWLEDGED', 'DISMISSED', 'SNOOZED'] },
        },
        select: {
            type: true,
            status: true,
            triggerAt: true,
            respondedAt: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200, // Look at last 200 interactions
    });

    if (reminders.length === 0) {
        return {
            engagementRate: 0,
            avgResponseTimeMin: 0,
            optimalHour: null,
            implicitAccuracy: 0,
            snoozeRate: 0,
            recommendation: 'Not enough data yet. Keep using PAC reminders.',
        };
    }

    // Engagement rate
    const acknowledged = reminders.filter(r => r.status === 'ACKNOWLEDGED').length;
    const engagementRate = (acknowledged / reminders.length) * 100;

    // Average response time
    const responseTimes = reminders
        .filter(r => r.respondedAt && r.triggerAt)
        .map(r => (r.respondedAt!.getTime() - r.triggerAt.getTime()) / (1000 * 60));
    const avgResponseTimeMin = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    // Find optimal hour (when user most often acknowledges)
    const hourCounts = new Map<number, { ack: number; total: number }>();
    for (const r of reminders) {
        const hour = r.triggerAt.getHours();
        const curr = hourCounts.get(hour) || { ack: 0, total: 0 };
        curr.total++;
        if (r.status === 'ACKNOWLEDGED') curr.ack++;
        hourCounts.set(hour, curr);
    }

    let optimalHour: number | null = null;
    let bestRate = 0;
    for (const [hour, counts] of hourCounts) {
        if (counts.total >= 3) { // Need at least 3 samples
            const rate = counts.ack / counts.total;
            if (rate > bestRate) {
                bestRate = rate;
                optimalHour = hour;
            }
        }
    }

    // Implicit accuracy
    const implicitReminders = reminders.filter(r => r.type === 'IMPLICIT');
    const implicitAck = implicitReminders.filter(r => r.status === 'ACKNOWLEDGED').length;
    const implicitAccuracy = implicitReminders.length > 0
        ? (implicitAck / implicitReminders.length) * 100
        : 0;

    // Snooze rate
    const snoozed = reminders.filter(r => r.status === 'SNOOZED').length;
    const snoozeRate = (snoozed / reminders.length) * 100;

    // Generate recommendation
    let recommendation = '';
    if (engagementRate < 30) {
        recommendation = 'Low engagement. Consider reducing reminder frequency or switching to explicit-only mode.';
    } else if (snoozeRate > 50) {
        recommendation = `High snooze rate. Try scheduling reminders around ${optimalHour !== null ? `${optimalHour}:00` : 'your most active hours'}.`;
    } else if (implicitAccuracy < 40 && implicitReminders.length > 5) {
        recommendation = 'Implicit detection accuracy is low. Consider disabling implicit reminders.';
    } else if (engagementRate > 70) {
        recommendation = 'Great engagement! PAC is working well for you.';
    } else {
        recommendation = 'Moderate engagement. PAC is learning your patterns.';
    }

    return {
        engagementRate: Math.round(engagementRate * 10) / 10,
        avgResponseTimeMin: Math.round(avgResponseTimeMin * 10) / 10,
        optimalHour,
        implicitAccuracy: Math.round(implicitAccuracy * 10) / 10,
        snoozeRate: Math.round(snoozeRate * 10) / 10,
        recommendation,
    };
}
