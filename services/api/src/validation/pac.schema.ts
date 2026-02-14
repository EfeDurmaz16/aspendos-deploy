/**
 * Zod Validation Schemas for PAC Routes
 */
import { z } from 'zod';

export const detectCommitmentsSchema = z.object({
    message: z
        .string()
        .min(1, 'message is required')
        .max(10000, 'Message too long. Maximum 10,000 characters.'),
    conversationId: z.string().optional(),
});

export const createReminderSchema = z.object({
    content: z.string().min(1, 'content is required').max(1000, 'Content too long'),
    type: z.enum(['EXPLICIT', 'IMPLICIT']).default('EXPLICIT'),
    triggerAt: z.string().min(1, 'triggerAt is required'),
    conversationId: z.string().optional(),
});


export const snoozeReminderSchema = z.object({
    minutes: z
        .number()
        .int()
        .min(1, 'minutes must be at least 1')
        .max(10080, 'minutes must be at most 10080 (7 days)'),
});

export const updatePACSettingsSchema = z.object({
    enabled: z.boolean().optional(),
    explicitEnabled: z.boolean().optional(),
    implicitEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: z
        .string()
        .regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format')
        .optional(),
    quietHoursEnd: z
        .string()
        .regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format')
        .optional(),
    escalationEnabled: z.boolean().optional(),
    digestEnabled: z.boolean().optional(),
    digestTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format')
        .optional(),
});

export const reminderIdParamSchema = z.object({
    id: z.string().min(1, 'Reminder ID is required'),
});
