/**
 * Zod Validation Schemas for Memory Routes
 */
import { z } from 'zod';

export const VALID_SECTORS = ['semantic', 'episodic', 'procedural', 'emotional', 'reflective'] as const;

/**
 * Validates a memory ID string.
 * Accepts UUID v4, CUID, CUID2, and nanoid formats commonly used as database identifiers.
 */
const memoryIdString = z
    .string()
    .min(1, 'Memory ID is required')
    .max(128, 'Memory ID is too long')
    .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Memory ID must contain only alphanumeric characters, hyphens, and underscores'
    );

export const addMemorySchema = z.object({
    content: z
        .string()
        .min(1, 'content is required')
        .max(10000, 'content must be 10,000 characters or less'),
    sector: z.enum(VALID_SECTORS).optional().default('semantic'),
    tags: z.array(z.string().min(1).max(100)).max(20).optional(),
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
    id: memoryIdString,
});

export const updateMemorySchema = z.object({
    content: z
        .string()
        .min(1, 'content is required')
        .max(10000, 'content must be 10,000 characters or less')
        .optional(),
    sector: z.enum(VALID_SECTORS).optional(),
    isPinned: z.boolean().optional(),
    metadata: z.record(z.unknown()).optional(),
});

export const bulkDeleteSchema = z.object({
    ids: z
        .array(memoryIdString)
        .min(1, 'ids array is required')
        .max(100, 'Maximum 100 items per bulk delete'),
});

export const memoryFeedbackSchema = z.object({
    memoryId: memoryIdString,
    wasHelpful: z.boolean(),
});
