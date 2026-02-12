/**
 * Zod Validation Schemas for Memory Routes
 */
import { z } from 'zod';

const VALID_SECTORS = ['semantic', 'episodic', 'procedural', 'emotional', 'reflective'] as const;

export const addMemorySchema = z.object({
    content: z
        .string()
        .min(1, 'content is required')
        .max(10000, 'content must be 10,000 characters or less'),
    sector: z.enum(VALID_SECTORS).optional().default('semantic'),
    tags: z.array(z.string()).max(20).optional(),
    metadata: z.record(z.unknown()).optional(),
});

export const searchMemorySchema = z.object({
    query: z
        .string()
        .min(1, 'query is required')
        .max(2000, 'query must be 2,000 characters or less'),
    sector: z.enum(VALID_SECTORS).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(5),
});

export const memoryIdParamSchema = z.object({
    id: z.string().min(1, 'Memory ID is required'),
});

export const bulkDeleteSchema = z.object({
    ids: z
        .array(z.string().min(1))
        .min(1, 'ids array is required')
        .max(100, 'Maximum 100 items per bulk delete'),
});

export const memoryFeedbackSchema = z.object({
    memoryId: z.string().min(1, 'memoryId is required'),
    wasHelpful: z.boolean(),
});
