/**
 * Zod Validation Schemas for Voice Routes
 */
import { z } from 'zod';

const ALLOWED_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
const MAX_TTS_TEXT_LENGTH = 4096;

/**
 * Text-to-speech synthesis schema
 */
export const synthesizeSchema = z.object({
    text: z
        .string()
        .min(1, 'No text provided')
        .max(MAX_TTS_TEXT_LENGTH, `Text exceeds maximum length of ${MAX_TTS_TEXT_LENGTH} characters`),
    voice: z.enum(ALLOWED_VOICES, {
        errorMap: () => ({ message: 'Invalid voice parameter' }),
    }).optional().default('alloy'),
    speed: z.number().min(0.25).max(4.0).optional().default(1.0),
});

/**
 * Transcription options schema (for multipart form metadata)
 */
export const transcribeOptionsSchema = z.object({
    language: z
        .string()
        .min(2, 'Language code must be at least 2 characters')
        .max(10, 'Language code must be 10 characters or less')
        .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, 'Invalid language code format (e.g., en, en-US)')
        .optional()
        .default('en'),
});
