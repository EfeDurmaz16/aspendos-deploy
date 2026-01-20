/**
 * Zod Validation Schemas for Scheduler Routes
 */
import { z } from 'zod';

/**
 * Channel preference enum
 */
export const channelPrefSchema = z.enum(['auto', 'push', 'email', 'in_app']);

/**
 * Tone enum
 */
export const toneSchema = z.enum(['friendly', 'professional', 'encouraging']);

/**
 * Scheduled task creation schema
 */
export const createScheduledTaskSchema = z.object({
    chatId: z.string().uuid('chatId must be a valid UUID'),
    triggerAt: z.string().min(1, 'triggerAt is required'),
    intent: z
        .string()
        .min(1, 'intent is required')
        .max(500, 'intent must be at most 500 characters'),
    contextSummary: z
        .string()
        .max(2000, 'contextSummary must be at most 2000 characters')
        .optional(),
    topic: z.string().max(200, 'topic must be at most 200 characters').optional(),
    tone: toneSchema.optional(),
    channelPref: channelPrefSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
});

/**
 * Reschedule task schema
 */
export const rescheduleTaskSchema = z.object({
    triggerAt: z.string().min(1, 'triggerAt is required'),
});

/**
 * Execute task schema (webhook)
 */
export const executeTaskSchema = z.object({
    taskId: z.string().uuid('taskId must be a valid UUID'),
});

/**
 * Get tasks query schema
 */
export const getTasksQuerySchema = z.object({
    status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
    chatId: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
});
