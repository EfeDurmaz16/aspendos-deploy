import { parseDID, verify as verifyFidesSignature } from '@fides/sdk';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

declare const process: { env: { CONVEX_SERVICE_SECRET?: string } };

const DEFAULT_COMMIT_CHAIN_LIMIT = 25;
const MAX_COMMIT_CHAIN_LIMIT = 100;
const DEFAULT_VERIFY_CHAIN_LIMIT = 100;
const MAX_VERIFY_CHAIN_LIMIT = 500;

function requireServiceSecret(serviceSecret: string) {
    const expected = process.env.CONVEX_SERVICE_SECRET;
    if (!expected) {
        throw new Error('CONVEX_SERVICE_SECRET is not configured');
    }
    if (serviceSecret !== expected) {
        throw new Error('Invalid service secret');
    }
}

function clampCommitChainLimit(value: number | undefined) {
    return Math.min(Math.max(value ?? DEFAULT_COMMIT_CHAIN_LIMIT, 1), MAX_COMMIT_CHAIN_LIMIT);
}

function clampVerifyChainLimit(value: number | undefined) {
    return Math.min(Math.max(value ?? DEFAULT_VERIFY_CHAIN_LIMIT, 1), MAX_VERIFY_CHAIN_LIMIT);
}

function normalizeForHash(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((item) => normalizeForHash(item));

    const record = value as Record<string, unknown>;
    return Object.keys(record)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
            const item = record[key];
            if (item !== undefined) acc[key] = normalizeForHash(item);
            return acc;
        }, {});
}

function canonicalJson(value: unknown): string {
    return JSON.stringify(normalizeForHash(value));
}

function commitPayload(args: {
    args: unknown;
    parent_hash?: string;
    result?: unknown;
    reversibility_class: string;
    status: string;
    tool_name: string;
}) {
    return {
        args: args.args,
        parent_hash: args.parent_hash ?? null,
        result: args.result,
        reversibility_class: args.reversibility_class,
        status: args.status,
        tool_name: args.tool_name,
    };
}

function fidesSignaturePayload(args: {
    args: unknown;
    parent_hash?: string | null;
    result?: unknown;
    reversibility_class: string;
    status: string;
    tool_name: string;
}) {
    return {
        args: args.args,
        parent_hash: args.parent_hash ?? null,
        result: args.result,
        reversibility_class: args.reversibility_class,
        status: args.status,
        tool_name: args.tool_name,
    };
}

async function hashCommitPayload(args: {
    args: unknown;
    parent_hash?: string;
    result?: unknown;
    reversibility_class: string;
    status: string;
    tool_name: string;
}) {
    return await sha256Hex(canonicalJson(commitPayload(args)));
}

function base64ToBytes(value: string) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}

async function verifyExternalFidesSignature(args: {
    args: unknown;
    fides_signature: string;
    fides_signer_did: string;
    parent_hash?: string | null;
    result?: unknown;
    reversibility_class: string;
    status: string;
    tool_name: string;
}) {
    try {
        const publicKey = parseDID(args.fides_signer_did);
        const payload = canonicalJson(
            fidesSignaturePayload({
                args: args.args,
                parent_hash: args.parent_hash ?? null,
                result: args.result,
                reversibility_class: args.reversibility_class,
                status: args.status,
                tool_name: args.tool_name,
            })
        );
        return await verifyFidesSignature(
            new TextEncoder().encode(payload),
            base64ToBytes(args.fides_signature),
            publicKey
        );
    } catch {
        return false;
    }
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
        service_secret: v.string(),
        user_id: v.id('users'),
        expected_parent_hash: v.optional(v.union(v.string(), v.null())),
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
        fides_signature: v.optional(v.string()),
        fides_signer_did: v.optional(v.string()),
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
        requireServiceSecret(args.service_secret);
        const now = Date.now();
        const status = args.status ?? 'pending';

        // 1. Verify the user exists before appending to their chain.
        const user = await ctx.db.get(args.user_id);
        if (!user) throw new Error('User not found');

        // 2. Find the latest commit for this user to form the parent link
        const latestCommit = await ctx.db
            .query('commits')
            .withIndex('by_user_time', (q) => q.eq('user_id', args.user_id))
            .order('desc')
            .first();

        const parentHash = latestCommit?.hash ?? null;
        if ((args.expected_parent_hash ?? null) !== parentHash) {
            throw new Error('Commit parent changed; retry with latest parent hash');
        }

        if (!!args.fides_signature !== !!args.fides_signer_did) {
            throw new Error('Both fides_signature and fides_signer_did are required together');
        }

        // 3. Bind a verified external FIDES authority signature to the commit.
        const hasExternalFidesSignature = !!args.fides_signature && !!args.fides_signer_did;
        if (!hasExternalFidesSignature) {
            throw new Error('External FIDES signature is required');
        }
        const externalSignatureValid = await verifyExternalFidesSignature({
            args: args.args,
            fides_signature: args.fides_signature!,
            fides_signer_did: args.fides_signer_did!,
            parent_hash: parentHash,
            result: args.result,
            reversibility_class: args.reversibility_class,
            status,
            tool_name: args.tool_name,
        });
        if (!externalSignatureValid) {
            throw new Error('Invalid external FIDES signature');
        }
        const fidesSignature = args.fides_signature!;
        const fidesSignerDid = args.fides_signer_did!;
        const fidesSignatureSource = 'external';

        // 4. Build AGIT commit hash from the same canonical payload the
        // FIDES signature covers, so status/result mutations invalidate it.
        const payloadHash = await hashCommitPayload({
            args: args.args,
            parent_hash: parentHash ?? undefined,
            result: args.result,
            reversibility_class: args.reversibility_class,
            status,
            tool_name: args.tool_name,
        });
        const commitHash = await sha256Hex(`${parentHash ?? 'genesis'}${payloadHash}`);

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
            payload_hash: payloadHash,
            fides_signature: fidesSignature,
            fides_signer_did: fidesSignerDid,
            fides_signature_source: fidesSignatureSource,
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

        // 8. Approval-only tools create a pending approval automatically.
        // Irreversible-blocked tools are audit records, not approvable work.
        if (args.reversibility_class === 'approval_only') {
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
            fidesDid: fidesSignerDid,
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

        // Check 1: Recompute canonical commit payload and verify it matches
        const expectedPayloadHash = await hashCommitPayload({
            args: commit.args,
            parent_hash: commit.parent_hash,
            result: commit.result,
            reversibility_class: commit.reversibility_class,
            status: commit.status,
            tool_name: commit.tool_name,
        });
        checks.payload_integrity = commit.payload_hash === expectedPayloadHash;

        const expectedHash = await sha256Hex(
            `${commit.parent_hash ?? 'genesis'}${expectedPayloadHash}`
        );
        checks.hash_integrity = expectedHash === commit.hash;

        // Check 2: Verify the authority signature binding. Only external FIDES
        // Ed25519 signatures over the canonical semantic governance payload are valid.
        if (commit.fides_signature && commit.fides_signer_did) {
            if (commit.fides_signature_source === 'external') {
                checks.fides_signature = await verifyExternalFidesSignature({
                    args: commit.args,
                    fides_signature: commit.fides_signature,
                    fides_signer_did: commit.fides_signer_did,
                    parent_hash: commit.parent_hash ?? null,
                    result: commit.result,
                    reversibility_class: commit.reversibility_class,
                    status: commit.status,
                    tool_name: commit.tool_name,
                });
            } else {
                checks.fides_signature = false;
            }
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
// revertCommit — legacy direct Convex revert endpoint.
// Reversal commits must be appended through a caller that can attach an
// external FIDES authority signature, such as the web /api/undo route.
// ---------------------------------------------------------------------------

export const revertCommit = mutation({
    args: {
        service_secret: v.string(),
        hash: v.string(),
        user_id: v.id('users'),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
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

        const recentReversals = await ctx.db
            .query('commits')
            .withIndex('by_user_time', (q) => q.eq('user_id', args.user_id))
            .order('desc')
            .take(500);
        const alreadyReverted = recentReversals.some((candidate) => {
            const candidateArgs = candidate.args as {
                reverted_hash?: string;
                cancelled_hash?: string;
            };
            return (
                candidate.status === 'executed' &&
                (candidateArgs.reverted_hash === args.hash ||
                    candidateArgs.cancelled_hash === args.hash)
            );
        });

        if (alreadyReverted) {
            return { success: false, error: 'Commit already reverted' };
        }

        return {
            success: false,
            error: 'Direct Convex revert is disabled; use the signed API undo route.',
        };
    },
});

// ---------------------------------------------------------------------------
// updateCommitResult — deprecated.
// Commit payloads are signed and hash-bound. Mutating result/status after insert
// would invalidate the audit record, so callers must append a new signAndCommit
// entry for execution outcomes instead.
// ---------------------------------------------------------------------------

export const updateCommitResult = mutation({
    args: {
        hash: v.string(),
        status: v.union(v.literal('executed'), v.literal('failed')),
        result: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        void ctx;
        void args;
        throw new Error('Commit results are append-only; use governance.signAndCommit');
    },
});

// ---------------------------------------------------------------------------
// getCommitChain — paginated commit history for a user.
// ---------------------------------------------------------------------------

export const getCommitChain = query({
    args: {
        service_secret: v.string(),
        user_id: v.id('users'),
        limit: v.optional(v.number()),
        cursor: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const limit = clampCommitChainLimit(args.limit);

        // If cursor is provided, start from that commit's timestamp
        if (args.cursor) {
            const cursor = args.cursor;
            const cursorCommit = await ctx.db
                .query('commits')
                .withIndex('by_hash', (q) => q.eq('hash', cursor))
                .first();

            if (!cursorCommit) {
                return { commits: [], nextCursor: null };
            }

            const commits = await ctx.db
                .query('commits')
                .withIndex('by_user_time', (q) =>
                    q.eq('user_id', args.user_id).lt('timestamp', cursorCommit.timestamp)
                )
                .order('desc')
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
        service_secret: v.string(),
        user_id: v.id('users'),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const limit = clampVerifyChainLimit(args.limit);
        const commits = await ctx.db
            .query('commits')
            .withIndex('by_user_time', (q) => q.eq('user_id', args.user_id))
            .order('asc')
            .take(limit);

        const results: Array<{ hash: string; valid: boolean; error?: string }> = [];
        const hashSet = new Set<string>();

        for (const commit of commits) {
            // Verify hash integrity
            const expectedPayloadHash = await hashCommitPayload({
                args: commit.args,
                parent_hash: commit.parent_hash,
                result: commit.result,
                reversibility_class: commit.reversibility_class,
                status: commit.status,
                tool_name: commit.tool_name,
            });
            const expectedHash = await sha256Hex(
                `${commit.parent_hash ?? 'genesis'}${expectedPayloadHash}`
            );

            if (commit.payload_hash !== expectedPayloadHash || expectedHash !== commit.hash) {
                results.push({ hash: commit.hash, valid: false, error: 'Hash mismatch' });
                continue;
            }

            if (!commit.fides_signature || !commit.fides_signer_did) {
                results.push({
                    hash: commit.hash,
                    valid: false,
                    error: 'Missing FIDES signature',
                });
                continue;
            }

            const fidesSignatureValid =
                commit.fides_signature_source === 'external' &&
                (await verifyExternalFidesSignature({
                    args: commit.args,
                    fides_signature: commit.fides_signature,
                    fides_signer_did: commit.fides_signer_did,
                    result: commit.result,
                    reversibility_class: commit.reversibility_class,
                    status: commit.status,
                    tool_name: commit.tool_name,
                }));
            if (!fidesSignatureValid) {
                results.push({
                    hash: commit.hash,
                    valid: false,
                    error: 'Invalid FIDES signature',
                });
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
