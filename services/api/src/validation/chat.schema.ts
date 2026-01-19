/**
 * Zod Validation Schemas for Chat Routes
 */
import { z } from 'zod';

/**
 * Message content schema
 */
export const messageContentSchema = z
    .string()
    .min(1, 'Message content cannot be empty')
    .max(10000, 'Message content must be at most 10000 characters');

/**
 * Model ID schema - validates supported model IDs
 */
export const modelIdSchema = z
    .string()
    .regex(
        /^(openai|anthropic|google|xai|groq|deepseek)\/.+$/,
        'Model ID must be in format: provider/model-name'
    );

/**
 * Send message schema
 */
export const sendMessageSchema = z.object({
    text: messageContentSchema,
    model_id: modelIdSchema.optional(),
});

/**
 * Create chat schema
 */
export const createChatSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
    modelPreference: modelIdSchema.optional(),
});

/**
 * Update chat schema
 */
export const updateChatSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters').optional(),
    modelPreference: modelIdSchema.optional(),
});

/**
 * Share chat schema
 */
export const shareChatSchema = z.object({
    expiresInDays: z.coerce.number().int().min(1).max(365).default(7),
});
