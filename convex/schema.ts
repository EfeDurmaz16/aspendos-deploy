import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    users: defineTable({
        workos_id: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        avatar_url: v.optional(v.string()),
        tier: v.union(
            v.literal('free'),
            v.literal('personal'),
            v.literal('pro'),
            v.literal('pro_byok'),
            v.literal('team'),
            v.literal('team_byok'),
        ),
        stripe_customer_id: v.optional(v.string()),
        fides_did: v.optional(v.string()),
        created_at: v.number(),
    })
        .index('by_workos_id', ['workos_id'])
        .index('by_email', ['email'])
        .index('by_stripe_customer_id', ['stripe_customer_id']),

    conversations: defineTable({
        user_id: v.id('users'),
        title: v.optional(v.string()),
        created_at: v.number(),
        last_message_at: v.number(),
    })
        .index('by_user', ['user_id'])
        .index('by_user_recent', ['user_id', 'last_message_at']),

    messages: defineTable({
        conversation_id: v.id('conversations'),
        user_id: v.id('users'),
        role: v.union(v.literal('user'), v.literal('assistant'), v.literal('system'), v.literal('tool')),
        content: v.string(),
        tool_calls: v.optional(v.any()),
        created_at: v.number(),
    })
        .index('by_conversation', ['conversation_id'])
        .index('by_conversation_time', ['conversation_id', 'created_at']),

    memories: defineTable({
        user_id: v.id('users'),
        supermemory_id: v.optional(v.string()),
        content_preview: v.optional(v.string()),
        source: v.optional(v.string()),
        created_at: v.number(),
    }).index('by_user', ['user_id']),

    commits: defineTable({
        user_id: v.id('users'),
        parent_hash: v.optional(v.string()),
        hash: v.string(),
        ancestor_chain: v.optional(v.array(v.string())),
        tool_name: v.string(),
        args: v.any(),
        status: v.union(
            v.literal('pending'),
            v.literal('executed'),
            v.literal('reverted'),
            v.literal('failed'),
        ),
        result: v.optional(v.any()),
        reversibility_class: v.union(
            v.literal('undoable'),
            v.literal('cancelable_window'),
            v.literal('compensatable'),
            v.literal('approval_only'),
            v.literal('irreversible_blocked'),
        ),
        rollback_strategy: v.optional(v.any()),
        rollback_deadline: v.optional(v.number()),
        human_explanation: v.optional(v.string()),
        fides_signature: v.optional(v.string()),
        fides_signer_did: v.optional(v.string()),
        counter_signature: v.optional(v.string()),
        counter_signer_did: v.optional(v.string()),
        timestamp: v.number(),
    })
        .index('by_user', ['user_id'])
        .index('by_user_time', ['user_id', 'timestamp'])
        .index('by_hash', ['hash']),

    approvals: defineTable({
        user_id: v.id('users'),
        commit_hash: v.string(),
        surface: v.string(),
        surface_message_id: v.optional(v.string()),
        expires_at: v.number(),
        status: v.union(
            v.literal('pending'),
            v.literal('approved'),
            v.literal('rejected'),
            v.literal('expired'),
        ),
    })
        .index('by_user', ['user_id'])
        .index('by_commit_hash', ['commit_hash'])
        .index('by_status', ['status']),

    snapshots: defineTable({
        user_id: v.id('users'),
        snapshot_id: v.string(),
        target_path: v.string(),
        prior_content: v.string(),
        created_at: v.number(),
    })
        .index('by_user', ['user_id'])
        .index('by_snapshot_id', ['snapshot_id']),

    subscriptions: defineTable({
        user_id: v.id('users'),
        stripe_subscription_id: v.string(),
        tier: v.union(
            v.literal('personal'),
            v.literal('pro'),
            v.literal('pro_byok'),
            v.literal('team'),
            v.literal('team_byok'),
        ),
        status: v.union(
            v.literal('active'),
            v.literal('past_due'),
            v.literal('canceled'),
            v.literal('trialing'),
        ),
        current_period_end: v.number(),
        seats: v.optional(v.number()),
        byok: v.boolean(),
    })
        .index('by_user', ['user_id'])
        .index('by_stripe_id', ['stripe_subscription_id']),

    tool_allowlist: defineTable({
        user_id: v.id('users'),
        tool_name: v.string(),
        granted_at: v.number(),
    })
        .index('by_user', ['user_id'])
        .index('by_user_tool', ['user_id', 'tool_name']),

    action_log: defineTable({
        user_id: v.optional(v.id('users')),
        event_type: v.string(),
        details: v.optional(v.any()),
        timestamp: v.number(),
    })
        .index('by_user', ['user_id'])
        .index('by_event_type', ['event_type'])
        .index('by_timestamp', ['timestamp']),

    byok_credentials: defineTable({
        user_id: v.id('users'),
        provider: v.string(),
        encrypted_key: v.string(),
        iv: v.string(),
        last_rotated_at: v.number(),
    })
        .index('by_user', ['user_id'])
        .index('by_user_provider', ['user_id', 'provider']),
});
