/**
 * Zod Validation Schemas for Workspace Routes
 */
import { z } from 'zod';

const VALID_ROLES = ['admin', 'member', 'viewer'] as const;

/**
 * Create workspace schema
 */
export const createWorkspaceSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Workspace name is required')
        .max(100, 'Workspace name must be 100 characters or less'),
});

/**
 * Update workspace schema
 */
export const updateWorkspaceSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Workspace name is required')
        .max(100, 'Workspace name must be 100 characters or less'),
});

/**
 * Add member to workspace schema
 */
export const addMemberSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
    role: z.enum(VALID_ROLES, {
        errorMap: () => ({
            message: 'Invalid role. Must be admin, member, or viewer.',
        }),
    }),
});

/**
 * Update member role schema
 */
export const updateMemberRoleSchema = z.object({
    role: z.enum(VALID_ROLES, {
        errorMap: () => ({
            message: 'Invalid role. Must be admin, member, or viewer.',
        }),
    }),
});
