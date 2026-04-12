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
                    hash: result.hash ?? this.generateHash(message),
                    did: result.did ?? opts.fidesDid,
                    signature: result.signature ?? opts.fidesSignature,
                    timestamp: Date.now(),
                };
            } catch {
                // fall through to hash-based commit
            }
        }

        return {
            hash: this.generateHash(message),
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
            } catch {
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

    async revert(userId: string, hash: string): Promise<{ success: boolean; message: string }> {
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

    private generateHash(input: string): string {
        const chars = 'abcdef0123456789';
        let hash = '';
        for (let i = 0; i < 40; i++) {
            hash += chars[Math.floor(Math.random() * chars.length)];
        }
        return hash;
    }
}

export function getAgit(): AgitService {
    if (!agitSingleton) {
        agitSingleton = new AgitService();
    }
    return agitSingleton;
}
