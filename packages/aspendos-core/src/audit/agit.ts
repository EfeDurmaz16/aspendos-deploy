import type { ReversibilityMetadata, ToolResult } from '../reversibility/types';

interface CommitRecord {
    hash: string;
    did: string;
    parentHash?: string | null;
    signature: string;
    timestamp: number;
}

interface AgitCommitOptions {
    userId: string;
    toolName: string;
    args: unknown;
    metadata: ReversibilityMetadata;
    fidesSignature: string;
    fidesDid: string;
    parentHash?: string | null;
    type: 'pre' | 'post';
    result?: ToolResult;
}

let agitSingleton: AgitService | null = null;

function normalize(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => normalize(item));

    const record = value as Record<string, unknown>;
    return Object.keys(record)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
            const item = record[key];
            if (item !== undefined) acc[key] = normalize(item);
            return acc;
        }, {});
}

function canonicalJson(value: unknown): string {
    return JSON.stringify(normalize(value));
}

function isProductionRuntime(): boolean {
    return process.env.NODE_ENV === 'production';
}

function isTestRuntime(): boolean {
    return (
        process.env.NODE_ENV === 'test' || (!!process.env.VITEST && process.env.VITEST !== 'false')
    );
}

function allowsDeterministicFallback(): boolean {
    return isTestRuntime() || process.env.ALLOW_IN_MEMORY_GOVERNANCE === 'true';
}

async function sha256Hex(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

export class AgitService {
    private client: any = null;
    private initialized = false;
    private localHistory = new Map<string, CommitRecord[]>();

    async initialize(): Promise<void> {
        if (this.initialized) return;

        const repoPath = process.env.AGIT_REPO_PATH;
        if (!repoPath) {
            if (isProductionRuntime()) {
                throw new Error(
                    'AGIT_REPO_PATH is required in production. Refusing in-memory AGIT commits.'
                );
            }
            if (!allowsDeterministicFallback()) {
                throw new Error(
                    'AGIT_REPO_PATH is required unless ALLOW_IN_MEMORY_GOVERNANCE=true is set for local development. Refusing in-memory AGIT commits.'
                );
            }
            this.initialized = true;
            return;
        }

        try {
            const agit = await import('@agit/sdk');
            this.client = await agit.AgitClient.open(repoPath, { agentId: 'aspendos-core' });
            this.initialized = true;
        } catch {
            if (isProductionRuntime() || !allowsDeterministicFallback()) {
                throw new Error(
                    '@agit/sdk is unavailable. Refusing deterministic AGIT fallback without explicit local/test governance fallback.'
                );
            }
            this.initialized = true;
        }
    }

    async commitAction(opts: AgitCommitOptions): Promise<CommitRecord> {
        await this.initialize();

        const message = `${opts.type}:${opts.toolName}:${opts.metadata.reversibility_class}`;
        const state = {
            tool: opts.toolName,
            args: opts.args,
            class: opts.metadata.reversibility_class,
            explanation: opts.metadata.human_explanation,
            result: opts.result,
        };

        if (this.client) {
            try {
                const hash = await this.client.commit({
                    memory: state,
                    message,
                    metadata: {
                        did: opts.fidesDid,
                        fidesDid: opts.fidesDid,
                        fidesSignature: opts.fidesSignature,
                        signature: opts.fidesSignature,
                        parentHash: opts.parentHash ?? null,
                        type: opts.type,
                        userId: opts.userId,
                    },
                });
                return {
                    hash,
                    did: opts.fidesDid,
                    parentHash: opts.parentHash ?? null,
                    signature: opts.fidesSignature,
                    timestamp: Date.now(),
                };
            } catch (error) {
                if (isProductionRuntime() || !allowsDeterministicFallback()) {
                    throw error;
                }
            }
        }

        const record = {
            hash: await this.generateHash(opts, message, state),
            did: opts.fidesDid,
            parentHash: opts.parentHash ?? null,
            signature: opts.fidesSignature,
            timestamp: Date.now(),
        };
        const history = this.localHistory.get(opts.userId) ?? [];
        history.unshift(record);
        this.localHistory.set(opts.userId, history);
        return record;
    }

    async historyForUser(userId: string, limit = 50): Promise<CommitRecord[]> {
        await this.initialize();

        if (this.client) {
            try {
                const logs = await this.client.log({ limit });
                return logs
                    .filter((l: any) => l.metadata?.userId === userId)
                    .slice(0, limit)
                    .map((l: any) => ({
                        hash: l.hash,
                        did: l.metadata?.did ?? l.metadata?.fidesDid ?? '',
                        parentHash: l.metadata?.parentHash ?? null,
                        signature: l.metadata?.signature ?? l.metadata?.fidesSignature ?? '',
                        timestamp: l.timestamp ?? Date.now(),
                    }));
            } catch (error) {
                if (isProductionRuntime()) throw error;
                return [];
            }
        }
        return (this.localHistory.get(userId) ?? []).slice(0, limit);
    }

    async verifyCommit(hash: string): Promise<boolean> {
        await this.initialize();

        if (this.client) {
            try {
                await this.client.getState(hash);
                return true;
            } catch {
                return false;
            }
        }
        const records = [...this.localHistory.values()].flat();
        const record = records.find((candidate) => candidate.hash === hash);
        if (!record) return false;
        return (
            !record.parentHash || records.some((candidate) => candidate.hash === record.parentHash)
        );
    }

    async revert(_userId: string, hash: string): Promise<{ success: boolean; message: string }> {
        await this.initialize();

        if (this.client) {
            try {
                await this.client.revert(hash);
                return { success: true, message: `Reverted to ${hash}` };
            } catch (e: any) {
                if (isProductionRuntime()) throw e;
                return { success: false, message: e?.message ?? 'Revert failed' };
            }
        }
        return { success: false, message: 'AGIT client not initialized' };
    }

    private async generateHash(
        opts: AgitCommitOptions,
        message: string,
        state: Record<string, unknown>
    ): Promise<string> {
        return sha256Hex(
            canonicalJson({
                fides_did: opts.fidesDid,
                fides_signature: opts.fidesSignature,
                message,
                parent_hash: opts.parentHash ?? null,
                state,
                type: opts.type,
                user_id: opts.userId,
            })
        );
    }
}

export function getAgit(): AgitService {
    if (!agitSingleton) {
        agitSingleton = new AgitService();
    }
    return agitSingleton;
}
