/**
 * PAC Service - Proactive AI Callbacks
 *
 * Handles commitment detection, reminder scheduling, and escalation.
 * Migrated from Prisma to Convex action_log events.
 */

import { getConvexClient, api } from '../lib/convex';

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
    { pattern: /in (\d+) minutes?/i, extract: (m: RegExpMatchArray) => parseInt(m[1], 10) },
    { pattern: /in (\d+) hours?/i, extract: (m: RegExpMatchArray) => parseInt(m[1], 10) * 60 },
    { pattern: /in (\d+) days?/i, extract: (m: RegExpMatchArray) => parseInt(m[1], 10) * 60 * 24 },
    { pattern: /tomorrow/i, extract: () => 24 * 60 },
    { pattern: /next week/i, extract: () => 7 * 24 * 60 },
    { pattern: /(?:this |tonight|this evening)/i, extract: () => 8 * 60 },
];

/**
 * Detect commitments in a message
 */
export function detectCommitments(message: string): DetectedCommitment[] {
    const commitments: DetectedCommitment[] = [];
    const now = new Date();

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
    return 60;
}

/**
 * Adjust trigger time toward user's optimal hour and day-of-week (feedback loop).
 */
function adjustToOptimalHour(
    triggerAt: Date,
    optimalHour: number | null,
    bestDayOfWeek: number | null,
    type: ReminderType
): Date {
    if (type === 'EXPLICIT') return triggerAt;

    const adjusted = new Date(triggerAt);

    if (bestDayOfWeek !== null) {
        const currentDay = adjusted.getDay();
        const isWeekend = currentDay === 0 || currentDay === 6;
        const bestIsWeekday = bestDayOfWeek >= 1 && bestDayOfWeek <= 5;

        if (isWeekend && bestIsWeekday) {
            const daysUntilMonday = currentDay === 0 ? 1 : 2;
            adjusted.setDate(adjusted.getDate() + daysUntilMonday);
        }
    }

    if (optimalHour !== null) {
        const triggerHour = adjusted.getHours();
        const diff = optimalHour - triggerHour;

        if (Math.abs(diff) >= 1 && Math.abs(diff) <= 4) {
            const nudgeHours = Math.sign(diff) * Math.min(Math.abs(diff), 2);
            adjusted.setHours(adjusted.getHours() + nudgeHours);
        }
    }

    if (adjusted.getTime() > Date.now()) return adjusted;

    return triggerAt;
}

/**
 * Create a reminder with behavioral learning adjustment
 */
export async function createReminder(
    userId: string,
    commitment: DetectedCommitment,
    chatId?: string
) {
    let adjustedTriggerAt = commitment.triggerAt;
    if (commitment.type === 'IMPLICIT') {
        try {
            const effectiveness = await computeEffectiveness(userId);
            adjustedTriggerAt = adjustToOptimalHour(
                commitment.triggerAt,
                effectiveness.optimalHour,
                effectiveness.bestDayOfWeek,
                commitment.type
            );
        } catch {
            // If effectiveness computation fails, use original time
        }
    }

    const priorityMap: Record<string, number> = { LOW: 30, MEDIUM: 50, HIGH: 80 };
    try {
        const client = getConvexClient();
        return await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'pac_reminder',
            details: {
                type: commitment.type,
                content: commitment.content,
                triggerAt: adjustedTriggerAt.getTime(),
                priority: priorityMap[commitment.priority] || 50,
                status: 'PENDING',
                source: commitment.type === 'EXPLICIT' ? 'explicit' : 'implicit',
                sourceText: commitment.content,
                chatId,
            },
        });
    } catch {
        return null;
    }
}

/**
 * Get pending reminders for a user
 */
export async function getPendingReminders(userId: string, limit = 20) {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: 200,
        });
        return (logs || [])
            .filter(
                (l: any) =>
                    l.event_type === 'pac_reminder' &&
                    (l.details?.status === 'PENDING' || l.details?.status === 'SNOOZED')
            )
            .sort((a: any, b: any) => (a.details?.triggerAt || 0) - (b.details?.triggerAt || 0))
            .slice(0, limit);
    } catch {
        return [];
    }
}

/**
 * Get due reminders (ready to trigger)
 */
export async function getDueReminders(limit = 100) {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listRecent, { limit: 500 });
        const now = Date.now();
        return (logs || [])
            .filter(
                (l: any) =>
                    l.event_type === 'pac_reminder' &&
                    l.details?.status === 'PENDING' &&
                    l.details?.triggerAt <= now
            )
            .slice(0, limit);
    } catch {
        return [];
    }
}

/**
 * Complete a reminder — logs an acknowledgement event
 */
export async function completeReminder(reminderId: string, userId: string) {
    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'pac_reminder_response',
            details: {
                reminderId,
                status: 'ACKNOWLEDGED',
                respondedAt: Date.now(),
                responseType: 'acknowledged',
            },
        });

        // MOAT: Cross-system feedback loop (PAC -> Memory)
        try {
            const logs = await client.query(api.actionLog.listByUser, {
                user_id: userId as any,
                limit: 200,
            });
            const reminder = (logs || []).find(
                (l: any) => l._id === reminderId && l.event_type === 'pac_reminder'
            );
            if (reminder) {
                const openMemory = await import('./memory-router.service');
                await openMemory.addMemory(`Completed task: ${reminder.details?.content}`, userId, {
                    sector: 'episodic',
                    metadata: { source: 'pac_completion', reminderId },
                });
            }
        } catch {
            /* non-blocking cross-system bridge */
        }

        return { count: 1 };
    } catch {
        return { count: 0 };
    }
}

/**
 * Dismiss a reminder
 */
export async function dismissReminder(reminderId: string, userId: string) {
    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'pac_reminder_response',
            details: {
                reminderId,
                status: 'DISMISSED',
                respondedAt: Date.now(),
                responseType: 'dismissed',
            },
        });
        return { count: 1 };
    } catch {
        return { count: 0 };
    }
}

/**
 * Snooze a reminder
 */
export async function snoozeReminder(reminderId: string, userId: string, minutes: number) {
    const newTriggerAt = new Date(Date.now() + minutes * 60 * 1000);

    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'pac_reminder_snooze',
            details: {
                reminderId,
                newTriggerAt: newTriggerAt.getTime(),
                status: 'SNOOZED',
            },
        });

        // Record escalation event
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'pac_escalation',
            details: {
                reminderId,
                level: 1,
                channel: 'in_app',
                scheduledAt: newTriggerAt.getTime(),
                status: 'pending',
            },
        });

        return { newTriggerAt };
    } catch {
        return { newTriggerAt };
    }
}

/**
 * Get or create user's PAC settings
 */
export async function getPACSettings(userId: string) {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: 100,
        });
        const settingsLog = (logs || []).find(
            (l: any) => l.event_type === 'pac_settings'
        );
        if (settingsLog) return settingsLog.details;
    } catch {
        // fall through to defaults
    }

    // Return default settings
    const defaults = {
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
    };

    // Persist defaults
    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'pac_settings',
            details: defaults,
        });
    } catch {
        // Non-blocking
    }

    return defaults;
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
    const current = await getPACSettings(userId);
    const merged = { ...current, ...settings, userId };

    try {
        const client = getConvexClient();
        await client.mutation(api.actionLog.log, {
            user_id: userId as any,
            event_type: 'pac_settings',
            details: merged,
        });
        return merged;
    } catch {
        return merged;
    }
}

/**
 * Check if in quiet hours
 */
export function isInQuietHours(settings: {
    quietHoursStart?: string;
    quietHoursEnd?: string;
}): boolean {
    if (!settings.quietHoursStart || !settings.quietHoursEnd) return false;

    const now = new Date();
    const [startHour, startMin] = settings.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes <= endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
}

/**
 * Get PAC statistics with behavioral learning insights
 */
export async function getPACStats(userId: string) {
    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: 500,
        });

        const reminders = (logs || []).filter((l: any) => l.event_type === 'pac_reminder');
        const responses = (logs || []).filter((l: any) => l.event_type === 'pac_reminder_response');

        const total = reminders.length;
        const pending = reminders.filter((r: any) => r.details?.status === 'PENDING').length;
        const completed = responses.filter((r: any) => r.details?.responseType === 'acknowledged').length;
        const snoozed = (logs || []).filter((l: any) => l.event_type === 'pac_reminder_snooze').length;
        const dismissed = responses.filter((r: any) => r.details?.responseType === 'dismissed').length;

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
    } catch {
        return {
            total: 0,
            pending: 0,
            completed: 0,
            snoozed: 0,
            dismissed: 0,
            completionRate: 0,
            effectiveness: {
                engagementRate: 0,
                avgResponseTimeMin: 0,
                optimalHour: null,
                bestDayOfWeek: null,
                implicitAccuracy: 0,
                snoozeRate: 0,
                recommendation: 'Not enough data yet. Keep using PAC reminders.',
            },
        };
    }
}

// ============================================
// BEHAVIORAL LEARNING
// ============================================

interface EffectivenessMetrics {
    engagementRate: number;
    avgResponseTimeMin: number;
    optimalHour: number | null;
    bestDayOfWeek: number | null;
    implicitAccuracy: number;
    snoozeRate: number;
    recommendation: string;
}

/**
 * Compute PAC effectiveness from user's historical behavior.
 */
async function computeEffectiveness(userId: string): Promise<EffectivenessMetrics> {
    const defaultMetrics: EffectivenessMetrics = {
        engagementRate: 0,
        avgResponseTimeMin: 0,
        optimalHour: null,
        bestDayOfWeek: null,
        implicitAccuracy: 0,
        snoozeRate: 0,
        recommendation: 'Not enough data yet. Keep using PAC reminders.',
    };

    try {
        const client = getConvexClient();
        const logs = await client.query(api.actionLog.listByUser, {
            user_id: userId as any,
            limit: 500,
        });

        // Build reminder + response pairs
        const reminders = (logs || []).filter((l: any) => l.event_type === 'pac_reminder');
        const responses = (logs || []).filter((l: any) => l.event_type === 'pac_reminder_response');
        const snoozes = (logs || []).filter((l: any) => l.event_type === 'pac_reminder_snooze');

        if (reminders.length === 0) return defaultMetrics;

        // Build a response map by reminderId
        const responseMap = new Map<string, any>();
        for (const r of responses) {
            responseMap.set(r.details?.reminderId, r);
        }

        const now = Date.now();
        const DECAY_HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1000;

        function recencyWeight(timestamp: number): number {
            const age = now - timestamp;
            return 0.5 ** (age / DECAY_HALF_LIFE_MS);
        }

        // Weighted engagement rate
        let weightedAck = 0;
        let weightedTotal = 0;
        for (const r of reminders) {
            const w = recencyWeight(r.timestamp);
            weightedTotal += w;
            const resp = responseMap.get(r._id);
            if (resp?.details?.responseType === 'acknowledged') weightedAck += w;
        }
        const engagementRate = weightedTotal > 0 ? (weightedAck / weightedTotal) * 100 : 0;

        // Avg response time
        const responseTimes: number[] = [];
        for (const r of reminders) {
            const resp = responseMap.get(r._id);
            if (resp?.details?.respondedAt && r.details?.triggerAt) {
                responseTimes.push((resp.details.respondedAt - r.details.triggerAt) / (1000 * 60));
            }
        }
        const avgResponseTimeMin =
            responseTimes.length > 0
                ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
                : 0;

        // Optimal hour
        const hourCounts = new Map<number, { ack: number; total: number }>();
        for (const r of reminders) {
            if (!r.details?.triggerAt) continue;
            const hour = new Date(r.details.triggerAt).getHours();
            const w = recencyWeight(r.timestamp);
            const curr = hourCounts.get(hour) || { ack: 0, total: 0 };
            curr.total += w;
            const resp = responseMap.get(r._id);
            if (resp?.details?.responseType === 'acknowledged') curr.ack += w;
            hourCounts.set(hour, curr);
        }

        let optimalHour: number | null = null;
        let bestRate = 0;
        for (const [hour, counts] of Array.from(hourCounts.entries())) {
            if (counts.total >= 3) {
                const rate = counts.ack / counts.total;
                if (rate > bestRate) {
                    bestRate = rate;
                    optimalHour = hour;
                }
            }
        }

        // Best day of week
        const dayCounts = new Map<number, { ack: number; total: number }>();
        for (const r of reminders) {
            if (!r.details?.triggerAt) continue;
            const day = new Date(r.details.triggerAt).getDay();
            const w = recencyWeight(r.timestamp);
            const curr = dayCounts.get(day) || { ack: 0, total: 0 };
            curr.total += w;
            const resp = responseMap.get(r._id);
            if (resp?.details?.responseType === 'acknowledged') curr.ack += w;
            dayCounts.set(day, curr);
        }

        let bestDayOfWeek: number | null = null;
        let bestDayRate = 0;
        for (const [day, counts] of Array.from(dayCounts.entries())) {
            if (counts.total >= 3) {
                const rate = counts.ack / counts.total;
                if (rate > bestDayRate) {
                    bestDayRate = rate;
                    bestDayOfWeek = day;
                }
            }
        }

        // Implicit accuracy
        const implicitReminders = reminders.filter((r: any) => r.details?.type === 'IMPLICIT');
        const implicitAck = implicitReminders.filter((r: any) => {
            const resp = responseMap.get(r._id);
            return resp?.details?.responseType === 'acknowledged';
        }).length;
        const implicitAccuracy =
            implicitReminders.length > 0 ? (implicitAck / implicitReminders.length) * 100 : 0;

        // Snooze rate
        const snoozeRate = reminders.length > 0 ? (snoozes.length / reminders.length) * 100 : 0;

        // Recommendation
        let recommendation = '';
        if (engagementRate < 30) {
            recommendation =
                'Low engagement. Consider reducing reminder frequency or switching to explicit-only mode.';
        } else if (snoozeRate > 50) {
            recommendation = `High snooze rate. Try scheduling reminders around ${optimalHour !== null ? `${optimalHour}:00` : 'your most active hours'}.`;
        } else if (implicitAccuracy < 40 && implicitReminders.length > 5) {
            recommendation =
                'Implicit detection accuracy is low. Consider disabling implicit reminders.';
        } else if (engagementRate > 70) {
            recommendation = 'Great engagement! PAC is working well for you.';
        } else {
            recommendation = 'Moderate engagement. PAC is learning your patterns.';
        }

        return {
            engagementRate: Math.round(engagementRate * 10) / 10,
            avgResponseTimeMin: Math.round(avgResponseTimeMin * 10) / 10,
            optimalHour,
            bestDayOfWeek,
            implicitAccuracy: Math.round(implicitAccuracy * 10) / 10,
            snoozeRate: Math.round(snoozeRate * 10) / 10,
            recommendation,
        };
    } catch {
        return defaultMetrics;
    }
}
