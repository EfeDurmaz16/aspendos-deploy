/**
 * Zod Validation Schemas for Import Routes
 */
import { z } from 'zod';

export const createImportJobSchema = z.object({
    source: z.enum(['CHATGPT', 'CLAUDE', 'GEMINI', 'PERPLEXITY']).optional(),
    fileName: z.string().max(500).optional().default('unknown'),
    fileSize: z.number().int().min(0).optional().default(0),
    content: z
        .unknown()
        .refine((val) => val !== null && val !== undefined && typeof val === 'object', {
            message: 'content is required and must be a JSON object or array',
        }),
});

export const jobIdParamSchema = z.object({
    id: z.string().min(1, 'Job ID is required'),
});

export const entityIdParamSchema = z.object({
    id: z.string().min(1, 'Job ID is required'),
    entityId: z.string().min(1, 'Entity ID is required'),
});

export const updateEntitySelectionSchema = z.object({
    selected: z.boolean(),
});

export const bulkSelectSchema = z.object({
    entityIds: z
        .array(z.string().min(1))
        .min(1, 'entityIds array is required')
        .max(500, 'Maximum 500 entities per bulk operation'),
    selected: z.boolean(),
});

export const executeImportSchema = z.object({
    selectedIds: z.array(z.string().min(1)).optional(),
});
