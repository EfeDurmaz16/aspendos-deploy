import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// ---------------------------------------------------------------------------
// Helpers: FIDES signing + AGIT hashing run inside Convex mutations using
// the Web Crypto API (available in Convex runtime).
// ---------------------------------------------------------------------------

/** HMAC-SHA256(secret, data) → hex string. Used for FIDES signatures. */
async function hmacSha256(secret: string, data: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
    return Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/** SHA-256(input) → hex string. Used for AGIT commit hashes. */
async function sha256Hex(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

// ---------------------------------------------------------------------------
// signAndCommit — the primary governance entry point.
// Creates a FIDES signature, computes the AGIT commit hash, inserts the
// commit record, and logs the action.
// ---------------------------------------------------------------------------

export const signAndCommit = mutation({
    args: {
        user_id: v.id('users'),
        tool_name: v.string(),
        args: v.any(),
        reversibility_class: v.union(
            v.literal('undoable'),
            v.literal('cancelable_window'),
            v.literal('compensatable'),
            v.literal('approval_only'),
            v.literal('irreversible_blocked')
        ),
        rollback_strategy: v.optional(v.any()),
        rollback_deadline: v.optional(v.number()),
        human_explanation: v.optional(v.string()),
        status: v.optional(
            v.union(
                v.literal('pending'),
                v.literal('executed'),
                v.literal('reverted'),
                v.literal('failed')
            )
        ),
        result: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const status = args.status ?? 'pending';

        // 1. Resolve the user's fides_did (agent DID secret for HMAC)
        const user = await ctx.db.get(args.user_id);
        if (!user) throw new Error('User not found');
        const agentDid = user.fides_did ?? `did:yula:agent:${args.user_id}`;

        // 2. Find the latest commit for this user to form the parent link
        const latestCommit = await ctx.db
            .query('commits')
            .withIndex('by_user_time', (q) => q.eq('user_id', args.user_id))
            .order('desc')
            .first();

        const parentHash = latestCommit?.hash ?? null;

        // 3. Build FIDES signature: HMAC-SHA256(agent_did, payload)
        const signaturePayload = JSON.stringify({
            tool_name: args.tool_name,
            args: args.args,
            timestamp: now,
        });
        const fidesSignature = await hmacSha256(agentDid, signaturePayload);

        // 4. Build AGIT commit hash: SHA256(parent_hash + tool_name + args + timestamp)
        const commitInput = `${parentHash ?? 'genesis'}${args.tool_name}${JSON.stringify(args.args)}${now}`;
        const commitHash = await sha256Hex(commitInput);

        // 5. Build ancestor chain (up to 10 deep for efficient traversal)
        const ancestorChain: string[] = [];
        if (parentHash) {
            ancestorChain.push(parentHash);
            if (latestCommit?.ancestor_chain) {
                const prior = latestCommit.ancestor_chain as string[];
                ancestorChain.push(...prior.slice(0, 9));
            }
        }

        // 6. Insert commit record
        const commitId = await ctx.db.insert('commits', {
            user_id: args.user_id,
            parent_hash: parentHash ?? undefined,
            hash: commitHash,
            ancestor_chain: ancestorChain.length > 0 ? ancestorChain : undefined,
            tool_name: args.tool_name,
            args: args.args,
            status,
            result: args.result,
            reversibility_class: args.reversibility_class,
            rollback_strategy: args.rollback_strategy,
            rollback_deadline: args.rollback_deadline,
            human_explanation: args.human_explanation,
            fides_signature: fidesSignature,
            fides_signer_did: agentDid,
            timestamp: now,
        });

        // 7. Write audit log entry
        await ctx.db.insert('action_log', {
            user_id: args.user_id,
            event_type: 'governance.commit.created',
            details: {
                commit_hash: commitHash,
                tool_name: args.tool_name,
                reversibility_class: args.reversibility_class,
                status,
                parent_hash: parentHash,
            },
            timestamp: now,
        });

        // 8. If this is an approval_only or irreversible_blocked tool, create
        //    a pending approval automatically
        if (
            args.reversibility_class === 'approval_only' ||
            args.reversibility_class === 'irreversible_blocked'
        ) {
            await ctx.db.insert('approvals', {
                user_id: args.user_id,
                commit_hash: commitHash,
                surface: 'auto',
                expires_at: now + 5 * 60 * 1000, // 5 minute window
                status: 'pending',
            });
        }

        return {
            commitId,
            commitHash,
            fidesSignature,
            fidesDid: agentDid,
            parentHash,
            status,
        };
    },
});

// ---------------------------------------------------------------------------
// verifyCommit — verify the FIDES signature and hash chain integrity.
// ---------------------------------------------------------------------------

export const verifyCommit = query({
    args: { hash: v.string() },
    handler: async (ctx, args) => {
        const commit = await ctx.db
            .query('commits')
            .withIndex('by_hash', (q) => q.eq('hash', args.hash))
            .first();

        if (!commit) {
            return { valid: false, error: 'Commit not found', checks: {} };
        }

        const checks: Record<string, boolean> = {};

        // Check 1: Recompute AGIT hash and verify it matches
        const expectedInput = `${commit.parent_hash ?? 'genesis'}${commit.tool_name}${JSON.stringify(commit.args)}${commit.timestamp}`;
        const expectedHash = await sha256Hex(expectedInput);
        checks.hash_integrity = expectedHash === commit.hash;

        // Check 2: Verify FIDES signature matches expected HMAC
        if (commit.fides_signature && commit.fides_signer_did) {
            const signaturePayload = JSON.stringify({
                tool_name: commit.tool_name,
                args: commit.args,
                timestamp: commit.timestamp,
            });
            const expectedSig = await hmacSha256(commit.fides_signer_did, signaturePayload);
            checks.fides_signature = expectedSig === commit.fides_signature;
        } else {
            checks.fides_signature = false;
        }

        // Check 3: Parent chain continuity — verify parent hash exists (if set)
        if (commit.parent_hash) {
            const parent = await ctx.db
                .query('commits')
                .withIndex('by_hash', (q) => q.eq('hash', commit.parent_hash!))
                .first();
            checks.parent_exists = !!parent;
            if (parent) {
                checks.parent_before_child = parent.timestamp <= commit.timestamp;
                checks.parent_same_user = parent.user_id === commit.user_id;
            }
        } else {
            // Genesis commit — no parent expected
            checks.parent_exists = true;
            checks.parent_before_child = true;
            checks.parent_same_user = true;
        }

        const valid = Object.values(checks).every((v) => v === true);

        return {
            valid,
            commit: {
                hash: commit.hash,
                tool_name: commit.tool_name,
                status: commit.status,
                reversibility_class: commit.reversibility_class,
                timestamp: commit.timestamp,
                fides_signer_did: commit.fides_signer_did,
            },
            checks,
        };
    },
});

// ---------------------------------------------------------------------------
// revertCommit — mark a commit as reverted if its reversibility class allows.
// For undoable commits with a snapshot, return the snapshot info for the
// caller to execute the actual restore.
// ---------------------------------------------------------------------------

export const revertCommit = mutation({
    args: {
        hash: v.string(),
        user_id: v.id('users'),
    },
    handler: async (ctx, args) => {
        const commit = await ctx.db
            .query('commits')
            .withIndex('by_hash', (q) => q.eq('hash', args.hash))
            .first();

        if (!commit) {
            return { success: false, error: 'Commit not found' };
        }

        if (commit.user_id !== args.user_id) {
            return { success: false, error: 'Unauthorized: commit belongs to a different user' };
        }

        if (commit.status === 'reverted') {
            return { success: false, error: 'Commit already reverted' };
        }

        if (commit.status === 'pending') {
            // Pending commits can simply be cancelled
            await ctx.db.patch(commit._id, { status: 'reverted' });
            await ctx.db.insert('action_log', {
                user_id: args.user_id,
                event_type: 'governance.commit.cancelled',
                details: { commit_hash: args.hash },
                timestamp: Date.now(),
            });
            return { success: true, action: 'cancelled' };
        }

        const { reversibility_class } = commit;

        if (reversibility_class === 'irreversible_blocked') {
            return {
                success: false,
                error: 'Irreversible action cannot be reverted',
            };
        }

        if (reversibility_class === 'approval_only') {
            return {
                success: false,
                error: 'Approval-only actions must be reversed through the approval flow',
            };
        }

        // Check cancel window for cancelable_window class
        if (reversibility_class === 'cancelable_window') {
            if (commit.rollback_deadline && Date.now() > commit.rollback_deadline) {
                return {
                    success: false,
                    error: 'Cancel window has expired',
                };
            }
        }

        // Mark commit as reverted
        await ctx.db.patch(commit._id, { status: 'reverted' });

        // Look up snapshot if rollback_strategy references one
        let snapshotData = null;
        const rollbackStrategy = commit.rollback_strategy as
            | {
                  kind: string;
                  snapshot_id?: string;
                  compensate_tool?: string;
                  compensate_args?: unknown;
              }
            | undefined;

        if (rollbackStrategy?.kind === 'snapshot_restore' && rollbackStrategy.snapshot_id) {
            const snapshot = await ctx.db
                .query('snapshots')
                .withIndex('by_snapshot_id', (q) =>
                    q.eq('snapshot_id', rollbackStrategy.snapshot_id!)
                )
                .first();
            if (snapshot) {
                snapshotData = {
                    snapshot_id: snapshot.snapshot_id,
                    target_path: snapshot.target_path,
                    prior_content: snapshot.prior_content,
                };
            }
        }

        // Create a revert commit in the chain
        const now = Date.now();
        const revertInput = `${commit.hash}revert_${commit.tool_name}${JSON.stringify({ reverted_hash: args.hash })}${now}`;
        const revertHash = await sha256Hex(revertInput);

        const user = await ctx.db.get(args.user_id);
        const agentDid = user?.fides_did ?? `did:yula:agent:${args.user_id}`;

        const revertPayload = JSON.stringify({
            tool_name: `revert_${commit.tool_name}`,
            args: { reverted_hash: args.hash },
            timestamp: now,
        });
        const revertSignature = await hmacSha256(agentDid, revertPayload);

        await ctx.db.insert('commits', {
            user_id: args.user_id,
            parent_hash: commit.hash,
            hash: revertHash,
            ancestor_chain: [commit.hash, ...(commit.ancestor_chain ?? []).slice(0, 9)],
            tool_name: `revert_${commit.tool_name}`,
            args: { reverted_hash: args.hash },
            status: 'executed',
            result: { reverted: true },
            reversibility_class: 'undoable',
            human_explanation: `Reverted action: ${commit.human_explanation ?? commit.tool_name}`,
            fides_signature: revertSignature,
            fides_signer_did: agentDid,
            timestamp: now,
        });

        // Audit log
        await ctx.db.insert('action_log', {
            user_id: args.user_id,
            event_type: 'governance.commit.reverted',
            details: {
                original_hash: args.hash,
                revert_hash: revertHash,
                reversibility_class,
                rollback_strategy: rollbackStrategy?.kind,
            },
            timestamp: now,
        });

        return {
            success: true,
            action: 'reverted',
            revertHash,
            snapshot: snapshotData,
            compensate:
                rollbackStrategy?.kind === 'compensation'
                    ? {
                          tool: rollbackStrategy.compensate_tool,
                          args: rollbackStrategy.compensate_args,
                      }
                    : null,
        };
    },
});

// ---------------------------------------------------------------------------
// updateCommitResult — called after tool execution to record the outcome.
// ---------------------------------------------------------------------------

export const updateCommitResult = mutation({
    args: {
        hash: v.string(),
        status: v.union(v.literal('executed'), v.literal('failed')),
        result: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const commit = await ctx.db
            .query('commits')
            .withIndex('by_hash', (q) => q.eq('hash', args.hash))
            .first();

        if (!commit) throw new Error(`Commit ${args.hash} not found`);

        await ctx.db.patch(commit._id, {
            status: args.status,
            result: args.result,
        });

        await ctx.db.insert('action_log', {
            user_id: commit.user_id,
            event_type: `governance.commit.${args.status}`,
            details: {
                commit_hash: args.hash,
                tool_name: commit.tool_name,
            },
            timestamp: Date.now(),
        });

        return { hash: args.hash, status: args.status };
    },
});

// ---------------------------------------------------------------------------
// getCommitChain — paginated commit history for a user.
// ---------------------------------------------------------------------------

export const getCommitChain = query({
    args: {
        user_id: v.id('users'),
        limit: v.optional(v.number()),
        cursor: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 25;

        // If cursor is provided, start from that commit's timestamp
        if (args.cursor) {
            const cursorCommit = await ctx.db
                .query('commits')
                .withIndex('by_hash', (q) => q.eq('hash', args.cursor!))
                .first();

            if (!cursorCommit) {
                return { commits: [], nextCursor: null };
            }

            const commits = await ctx.db
                .query('commits')
                .withIndex('by_user_time', (q) => q.eq('user_id', args.user_id))
                .order('desc')
                .filter((q) => q.lt(q.field('timestamp'), cursorCommit.timestamp))
                .take(limit + 1);

            const hasMore = commits.length > limit;
            const page = hasMore ? commits.slice(0, limit) : commits;
            const nextCursor = hasMore ? page[page.length - 1]!.hash : null;

            return { commits: page, nextCursor };
        }

        const commits = await ctx.db
            .query('commits')
            .withIndex('by_user_time', (q) => q.eq('user_id', args.user_id))
            .order('desc')
            .take(limit + 1);

        const hasMore = commits.length > limit;
        const page = hasMore ? commits.slice(0, limit) : commits;
        const nextCursor = hasMore ? page[page.length - 1]!.hash : null;

        return { commits: page, nextCursor };
    },
});

// ---------------------------------------------------------------------------
// verifyChain — verify the full commit chain integrity for a user.
// ---------------------------------------------------------------------------

export const verifyChain = query({
    args: {
        user_id: v.id('users'),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 100;
        const commits = await ctx.db
            .query('commits')
            .withIndex('by_user_time', (q) => q.eq('user_id', args.user_id))
            .order('asc')
            .take(limit);

        const results: Array<{ hash: string; valid: boolean; error?: string }> = [];
        const hashSet = new Set<string>();

        for (const commit of commits) {
            // Verify hash integrity
            const expectedInput = `${commit.parent_hash ?? 'genesis'}${commit.tool_name}${JSON.stringify(commit.args)}${commit.timestamp}`;
            const expectedHash = await sha256Hex(expectedInput);

            if (expectedHash !== commit.hash) {
                results.push({ hash: commit.hash, valid: false, error: 'Hash mismatch' });
                continue;
            }

            // Verify parent linkage
            if (commit.parent_hash && !hashSet.has(commit.parent_hash)) {
                results.push({
                    hash: commit.hash,
                    valid: false,
                    error: `Parent ${commit.parent_hash} not in chain`,
                });
                continue;
            }

            hashSet.add(commit.hash);
            results.push({ hash: commit.hash, valid: true });
        }

        const allValid = results.every((r) => r.valid);
        const invalidCount = results.filter((r) => !r.valid).length;

        return {
            chain_valid: allValid,
            total: results.length,
            invalid_count: invalidCount,
            results,
        };
    },
});
