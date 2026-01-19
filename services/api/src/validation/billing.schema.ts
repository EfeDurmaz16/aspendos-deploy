/**
 * Zod Validation Schemas for Billing Routes
 */
import { z } from 'zod';

/**
 * Query schema for usage history
 */
export const getUsageQuerySchema = z.object({
    limit: z.coerce
        .number()
        .int('limit must be an integer')
        .min(1, 'limit must be at least 1')
        .max(1000, 'limit must be at most 1000')
        .default(50),
});

/**
 * Plan enum (lowercase to match Polar API)
 */
export const planSchema = z.enum(['starter', 'pro', 'ultra'], {
    errorMap: () => ({ message: 'plan must be one of: starter, pro, ultra' }),
});

/**
 * Billing cycle enum
 */
export const billingCycleSchema = z.enum(['monthly', 'annual'], {
    errorMap: () => ({ message: 'cycle must be one of: monthly, annual' }),
});

/**
 * Create checkout session schema
 */
export const createCheckoutSchema = z.object({
    plan: planSchema,
    cycle: billingCycleSchema.default('monthly'),
    success_url: z.string().url('success_url must be a valid URL').optional(),
    cancel_url: z.string().url('cancel_url must be a valid URL').optional(),
});
