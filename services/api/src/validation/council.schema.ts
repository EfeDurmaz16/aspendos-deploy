/**
 * Zod Validation Schemas for Council Routes
 */
import { z } from 'zod';

const VALID_PERSONAS = ['SCHOLAR', 'CREATIVE', 'PRACTICAL', 'DEVILS_ADVOCATE'] as const;

export const createCouncilSessionSchema = z.object({
    query: z
        .string()
        .min(1, 'query is required')
        .max(2000, 'Query too long. Maximum 2,000 characters.'),
});

export const selectPersonaSchema = z.object({
    persona: z.enum(VALID_PERSONAS, {
        errorMap: () => ({ message: 'Invalid persona. Must be SCHOLAR, CREATIVE, PRACTICAL, or DEVILS_ADVOCATE' }),
    }),
});

export const sessionIdParamSchema = z.object({
    id: z.string().min(1, 'Session ID is required'),
});
