import { canonicalJson, isProductionRuntime, sha256Hex } from '../governance/canonical';
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
            this.initialized = true;
            return;
        }

        try {
            const agit = await import('@agit/sdk');
            this.client = await agit.AgitClient.open(repoPath, {
                agentId: 'yula-api',
            });
            this.initialized = true;
        } catch (error) {
            if (isProductionRuntime()) {
                throw new Error(`Failed to initialize AGIT repository: ${String(error)}`);
            }
            this.initialized = true;
        }
    }

    async commitAction(opts: AgitCommitOptions): Promise<CommitRecord> {
        await this.initialize();

        const message = `${opts.type}:${opts.toolName}:${opts.metadata.reversibility_class}`;
        const timestamp = Date.now();
        const state = {
            args: opts.args,
            class: opts.metadata.reversibility_class,
            explanation: opts.metadata.human_explanation,
            result: opts.result,
            timestamp,
            tool: opts.toolName,
            type: opts.type,
            userId: opts.userId,
        };

        if (this.client) {
            try {
                const hash = await this.client.commit({
                    memory: state,
                    message,
                    metadata: {
                        fidesDid: opts.fidesDid,
                        fidesSignature: opts.fidesSignature,
                        type: opts.type,
                        userId: opts.userId,
                    },
                });
                return {
                    hash,
                    did: opts.fidesDid,
                    signature: opts.fidesSignature,
                    timestamp,
                };
            } catch (error) {
                if (isProductionRuntime()) {
                    throw new Error(`AGIT commit failed: ${String(error)}`);
                }
            }
        }

        const hash = await sha256Hex(
            canonicalJson({
                message,
                state,
                signature: opts.fidesSignature,
            })
        );
        const record = {
            hash,
            did: opts.fidesDid,
            signature: opts.fidesSignature,
            timestamp,
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
                        did: l.metadata?.fidesDid ?? '',
                        signature: l.metadata?.fidesSignature ?? '',
                        timestamp: l.timestamp ?? Date.now(),
                    }));
            } catch {
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
        return [...this.localHistory.values()].some((records) =>
            records.some((record) => record.hash === hash)
        );
    }

    async revert(_userId: string, hash: string): Promise<{ success: boolean; message: string }> {
        await this.initialize();

        if (this.client) {
            try {
                await this.client.revert(hash);
                return { success: true, message: `Reverted to ${hash}` };
            } catch (e: any) {
                return { success: false, message: e?.message ?? 'Revert failed' };
            }
        }
        return { success: false, message: 'AGIT client not initialized' };
    }
}

export function getAgit(): AgitService {
    if (!agitSingleton) {
        agitSingleton = new AgitService();
    }
    return agitSingleton;
}
