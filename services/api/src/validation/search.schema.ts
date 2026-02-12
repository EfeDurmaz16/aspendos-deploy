/**
 * Zod Validation Schemas for Search Routes
 */
import { z } from 'zod';

const VALID_SEARCH_TYPES = ['all', 'chats', 'memories'] as const;

/**
 * Search query parameters schema
 */
export const searchQuerySchema = z.object({
    q: z
        .string()
        .min(1, 'Query parameter "q" is required'),
    type: z.enum(VALID_SEARCH_TYPES, {
        errorMap: () => ({
            message: 'Invalid type. Must be all, chats, or memories',
        }),
    }).optional().default('all'),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
});

/**
 * Search suggestion query parameters schema
 */
export const searchSuggestSchema = z.object({
    q: z.string().optional().default(''),
    limit: z.coerce.number().int().min(1).max(10).optional().default(5),
});
