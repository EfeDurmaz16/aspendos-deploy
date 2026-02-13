/**
 * Zod Validation Schemas for Notification Routes
 */
import { z } from 'zod';

const ALLOWED_DEVICE_TYPES = ['web', 'android', 'ios'] as const;

/**
 * Push subscription registration schema
 */
export const pushSubscriptionSchema = z.object({
    endpoint: z
        .string()
        .min(1, 'endpoint is required')
        .url('endpoint must be a valid URL')
        .refine((url) => url.startsWith('https://'), {
            message: 'endpoint must be HTTPS',
        }),
    keys: z.object({
        p256dh: z.string().min(1, 'keys.p256dh is required'),
        auth: z.string().min(1, 'keys.auth is required'),
    }),
    deviceType: z.enum(ALLOWED_DEVICE_TYPES).optional().default('web'),
});

/**
 * Notification preferences update schema
 */
export const notificationPreferencesSchema = z
    .object({
        pushEnabled: z.boolean().optional(),
        emailEnabled: z.boolean().optional(),
        inAppEnabled: z.boolean().optional(),
        quietHoursEnabled: z.boolean().optional(),
        quietHoursStart: z
            .string()
            .regex(/^\d{2}:\d{2}$/, 'quietHoursStart must be in HH:MM format')
            .optional(),
        quietHoursEnd: z
            .string()
            .regex(/^\d{2}:\d{2}$/, 'quietHoursEnd must be in HH:MM format')
            .optional(),
    })
    .refine(
        (data) => Object.values(data).some((v) => v !== undefined),
        { message: 'No valid preference fields provided' }
    );

/**
 * Push unsubscribe schema
 */
export const pushUnsubscribeSchema = z.object({
    endpoint: z.string().min(1, 'endpoint is required').url('endpoint must be a valid URL'),
});
