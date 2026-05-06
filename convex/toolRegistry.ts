import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireServiceSecret } from './lib/serviceSecret';

const DEFAULT_TOOL_REGISTRY_LIMIT = 100;
const MAX_TOOL_REGISTRY_LIMIT = 500;

function clampLimit(value: number | undefined) {
    return Math.min(Math.max(value ?? DEFAULT_TOOL_REGISTRY_LIMIT, 1), MAX_TOOL_REGISTRY_LIMIT);
}

/**
 * Register a tool with its reversibility metadata.
 * Upserts: if a tool with the same name exists, it updates the entry.
 */
export const registerTool = mutation({
    args: {
        service_secret: v.string(),
        name: v.string(),
        description: v.string(),
        reversibility_class: v.union(
            v.literal('undoable'),
            v.literal('cancelable_window'),
            v.literal('compensatable'),
            v.literal('approval_only'),
            v.literal('irreversible_blocked')
        ),
        rollback_strategy: v.optional(v.any()),
        human_explanation: v.string(),
        registered_by: v.optional(v.id('users')),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        // Upsert: check if tool already registered
        const existing = await ctx.db
            .query('tool_registry')
            .withIndex('by_name', (q) => q.eq('name', args.name))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                description: args.description,
                reversibility_class: args.reversibility_class,
                rollback_strategy: args.rollback_strategy,
                human_explanation: args.human_explanation,
                registered_by: args.registered_by,
                registered_at: Date.now(),
            });
            return existing._id;
        }

        return await ctx.db.insert('tool_registry', {
            ...args,
            registered_at: Date.now(),
        });
    },
});

/**
 * Get metadata for a single tool by name.
 */
export const getToolMetadata = query({
    args: { service_secret: v.string(), name: v.string() },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        return await ctx.db
            .query('tool_registry')
            .withIndex('by_name', (q) => q.eq('name', args.name))
            .first();
    },
});

/**
 * List all registered tools, optionally filtered by reversibility class.
 */
export const listTools = query({
    args: {
        service_secret: v.string(),
        limit: v.optional(v.number()),
        reversibility_class: v.optional(
            v.union(
                v.literal('undoable'),
                v.literal('cancelable_window'),
                v.literal('compensatable'),
                v.literal('approval_only'),
                v.literal('irreversible_blocked')
            )
        ),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const limit = clampLimit(args.limit);
        const reversibilityClass = args.reversibility_class;
        if (reversibilityClass) {
            return await ctx.db
                .query('tool_registry')
                .withIndex('by_reversibility_class', (q) =>
                    q.eq('reversibility_class', reversibilityClass)
                )
                .take(limit);
        }
        return await ctx.db
            .query('tool_registry')
            .withIndex('by_registered_at')
            .order('desc')
            .take(limit);
    },
});

/**
 * Remove a tool from the registry.
 */
export const unregisterTool = mutation({
    args: { service_secret: v.string(), name: v.string() },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const tool = await ctx.db
            .query('tool_registry')
            .withIndex('by_name', (q) => q.eq('name', args.name))
            .first();
        if (tool) {
            await ctx.db.delete(tool._id);
        }
    },
});
