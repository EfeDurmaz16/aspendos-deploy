/**
 * Zod Validation Schemas for Messaging Routes
 */
import { z } from 'zod';

const VALID_PLATFORMS = ['telegram', 'whatsapp', 'slack', 'discord'] as const;

export const createConnectionSchema = z.object({
    platform: z.enum(VALID_PLATFORMS),
    platformUserId: z
        .string()
        .min(1, 'Platform user ID is required')
        .max(256, 'Platform user ID too long'),
    metadata: z.record(z.unknown()).optional(),
});

export const connectionIdParamSchema = z.object({
    id: z
        .string()
        .min(1)
        .max(128)
        .regex(/^[a-zA-Z0-9_-]+$/),
});
