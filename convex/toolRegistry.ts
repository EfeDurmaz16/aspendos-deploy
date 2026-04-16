import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Register a tool with its reversibility metadata.
 * Upserts: if a tool with the same name exists, it updates the entry.
 */
export const registerTool = mutation({
    args: {
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
    args: { name: v.string() },
    handler: async (ctx, args) => {
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
        if (args.reversibility_class) {
            return await ctx.db
                .query('tool_registry')
                .withIndex('by_reversibility_class', (q) =>
                    q.eq('reversibility_class', args.reversibility_class!)
                )
                .collect();
        }
        return await ctx.db.query('tool_registry').collect();
    },
});

/**
 * Remove a tool from the registry.
 */
export const unregisterTool = mutation({
    args: { name: v.string() },
    handler: async (ctx, args) => {
        const tool = await ctx.db
            .query('tool_registry')
            .withIndex('by_name', (q) => q.eq('name', args.name))
            .first();
        if (tool) {
            await ctx.db.delete(tool._id);
        }
    },
});
