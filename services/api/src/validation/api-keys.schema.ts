/**
 * Zod Validation Schemas for API Key Routes
 */
import { z } from 'zod';

const VALID_PERMISSIONS = [
    'chat:read',
    'chat:write',
    'memory:read',
    'memory:write',
    'council:read',
    'council:write',
    'pac:read',
    'pac:write',
] as const;

/**
 * Create API key schema
 */
export const createApiKeySchema = z.object({
    name: z
        .string()
        .min(1, 'Name must be between 1 and 100 characters')
        .max(100, 'Name must be between 1 and 100 characters')
        .transform((val) => val.trim()),
    permissions: z
        .array(
            z.enum(VALID_PERMISSIONS, {
                errorMap: () => ({
                    message: `Invalid permission. Must be one of: ${VALID_PERMISSIONS.join(', ')}`,
                }),
            })
        )
        .optional()
        .default([]),
    expiresInDays: z
        .number()
        .int()
        .min(1, 'expiresInDays must be at least 1')
        .max(365, 'expiresInDays must be 365 or less')
        .nullable()
        .optional()
        .default(null),
});

/**
 * API key ID parameter schema
 */
export const apiKeyIdParamSchema = z.object({
    id: z.string().min(1, 'API key ID is required'),
});
