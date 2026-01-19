/**
 * Zod Validation Schemas for Billing Routes
 */
import { z } from 'zod';

/**
 * Subscription tier enum
 */
export const subscriptionTierSchema = z.enum(['STARTER', 'PRO', 'ULTRA']);

/**
 * Update subscription tier schema
 */
export const updateSubscriptionTierSchema = z.object({
    tier: subscriptionTierSchema,
});

/**
 * Create checkout session schema
 */
export const createCheckoutSessionSchema = z.object({
    tier: subscriptionTierSchema,
    interval: z.enum(['month', 'year']),
    successUrl: z.string().url('successUrl must be a valid URL').optional(),
    cancelUrl: z.string().url('cancelUrl must be a valid URL').optional(),
});

/**
 * Webhook signature verification schema
 */
export const webhookEventSchema = z.object({
    type: z.string(),
    data: z.record(z.unknown()),
});
