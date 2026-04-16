/**
 * Zod Validation Schemas for Skills Routes
 */
import { z } from 'zod';

const VALID_CATEGORIES = ['productivity', 'research', 'creative', 'coding', 'personal'] as const;

const idString = z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/);

export const skillIdParamSchema = z.object({
    id: idString,
});

export const createSkillSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
    description: z
        .string()
        .min(1, 'Description is required')
        .max(2000, 'Description must be 2,000 characters or less'),
    systemPrompt: z
        .string()
        .min(1, 'System prompt is required')
        .max(10000, 'System prompt must be 10,000 characters or less'),
    toolConfig: z.record(z.unknown()).optional().default({}),
    guardPolicy: z.record(z.unknown()).optional().default({}),
    category: z.enum(VALID_CATEGORIES).optional().default('personal'),
});

export const updateSkillSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().min(1).max(2000).optional(),
    systemPrompt: z.string().min(1).max(10000).optional(),
    toolConfig: z.record(z.unknown()).optional(),
    guardPolicy: z.record(z.unknown()).optional(),
    category: z.enum(VALID_CATEGORIES).optional(),
});

export const executeSkillSchema = z.object({
    input: z
        .string()
        .min(1, 'Input is required')
        .max(50000, 'Input must be 50,000 characters or less'),
    chatId: z.string().optional(),
    output: z.string().max(100000).optional(),
    success: z.boolean().optional().default(true),
    durationMs: z.number().int().min(0).optional().default(0),
});

export const feedbackSchema = z.object({
    rating: z.number().int().min(1).max(5),
});

export const listSkillsQuerySchema = z.object({
    category: z.enum(VALID_CATEGORIES).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
});

export const executionIdParamSchema = z.object({
    executionId: idString,
});
