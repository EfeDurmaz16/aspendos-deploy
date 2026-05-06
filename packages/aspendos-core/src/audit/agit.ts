import type { ReversibilityMetadata, ToolResult } from '../reversibility/types';

interface CommitRecord {
    hash: string;
    did: string;
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
    private fidesClient: any = null;
    private initialized = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            const agit = await import('@agit/sdk');
            this.client = new agit.AgitClient({ adapter: 'memory' });
            await this.client.open();

            const fidesMod = await import('@fides/sdk');
            const keyPair = await fidesMod.generateKeyPair();
            this.fidesClient = new agit.AgitFidesClient(this.client, {
                did: fidesMod.generateDID(keyPair.publicKey),
                keyPair,
            });
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

        if (this.fidesClient) {
            try {
                const branch = `user_${opts.userId}`;
                try {
                    await this.client.branch.create({ name: branch, from: 'main' });
                } catch {
                    // Branch may already exist
                }

                const result = await this.fidesClient.signedCommit(state, message);
                return {
                    hash: result.hash ?? (await this.generateHash(opts, message, state)),
                    did: result.did ?? opts.fidesDid,
                    signature: result.signature ?? opts.fidesSignature,
                    timestamp: Date.now(),
                };
            } catch (error) {
                if (isProductionRuntime() || !allowsDeterministicFallback()) {
                    throw error;
                }
            }
        }

        return {
            hash: await this.generateHash(opts, message, state),
            did: opts.fidesDid,
            signature: opts.fidesSignature,
            timestamp: Date.now(),
        };
    }

    async historyForUser(userId: string, limit = 50): Promise<CommitRecord[]> {
        await this.initialize();

        if (this.client) {
            try {
                const logs = await this.client.log({ limit, branch: `user_${userId}` });
                return logs.map((l: any) => ({
                    hash: l.hash,
                    did: l.metadata?.did ?? '',
                    signature: l.metadata?.signature ?? '',
                    timestamp: l.timestamp ?? Date.now(),
                }));
            } catch (error) {
                if (isProductionRuntime()) throw error;
                return [];
            }
        }
        return [];
    }

    async verifyCommit(hash: string): Promise<boolean> {
        await this.initialize();

        if (this.fidesClient) {
            try {
                return await this.fidesClient.verifyCommit(hash);
            } catch {
                return false;
            }
        }
        return false;
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
