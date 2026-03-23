/**
 * Zod Validation Schemas for Approval Routes
 */
import { z } from 'zod';

const idString = z
    .string()
    .min(1, 'ID is required')
    .max(128, 'ID is too long')
    .regex(
        /^[a-zA-Z0-9_-]+$/,
        'ID must contain only alphanumeric characters, hyphens, and underscores'
    );

export const approvalIdParamSchema = z.object({
    id: idString,
});

export const approveQuerySchema = z.object({
    always_allow: z.enum(['true', 'false']).optional(),
});

export const toolAllowlistParamSchema = z.object({
    toolName: z
        .string()
        .min(1, 'Tool name is required')
        .max(100, 'Tool name too long')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Tool name must be alphanumeric'),
});
