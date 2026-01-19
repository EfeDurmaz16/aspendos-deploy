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
 * Create chat schema
 */
export const createChatSchema = z.object({
    title: z.string().min(1).max(200, 'Title must be at most 200 characters').optional(),
    model_id: modelIdSchema.optional(),
});

/**
 * Update chat schema
 */
export const updateChatSchema = z.object({
    title: z.string().min(1).max(200, 'Title must be at most 200 characters').optional(),
    model_id: modelIdSchema.optional(),
    is_archived: z.boolean().optional(),
});

/**
 * Send message schema
 */
export const sendMessageSchema = z.object({
    content: messageContentSchema,
    model_id: modelIdSchema.optional(),
    enable_thinking: z.boolean().optional(),
    stream: z.boolean().default(true),
});

/**
 * Multi-model comparison schema
 */
export const multiModelSchema = z.object({
    content: messageContentSchema,
    models: z
        .array(modelIdSchema)
        .min(1, 'At least one model is required')
        .max(5, 'Maximum 5 models allowed')
        .default(['openai/gpt-4o', 'anthropic/claude-sonnet-4-20250514', 'google/gemini-2.0-flash']),
});

/**
 * Message feedback schema
 */
export const messageFeedbackSchema = z.object({
    feedback: z.enum(['up', 'down'], {
        errorMap: () => ({ message: 'feedback must be either "up" or "down"' }),
    }),
});

/**
 * Fork chat schema
 */
export const forkChatSchema = z.object({
    fromMessageId: z.string().uuid('fromMessageId must be a valid UUID').optional(),
});

/**
 * Chat ID parameter schema
 */
export const chatIdParamSchema = z.object({
    id: z.string().uuid('Chat ID must be a valid UUID'),
});

/**
 * Message ID parameter schema
 */
export const messageIdParamSchema = z.object({
    messageId: z.string().uuid('Message ID must be a valid UUID'),
});
