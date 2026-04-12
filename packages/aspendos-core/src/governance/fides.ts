import type { ReversibilityMetadata } from '../reversibility/types';

interface FidesSignResult {
    signature: string;
    did: string;
    timestamp: number;
}

interface KeyPair {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
}

let fidesSingleton: FidesService | null = null;

export class FidesService {
    private keyPair: KeyPair | null = null;
    private did: string | null = null;
    private initialized = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            const fides = await import('@fides/sdk');
            this.keyPair = await fides.generateKeyPair();
            this.did = fides.generateDID(this.keyPair.publicKey);
            this.initialized = true;
        } catch {
            this.keyPair = await this.generateFallbackKeyPair();
            this.did = `did:key:fallback_${Date.now()}`;
            this.initialized = true;
        }
    }

    async signToolCall(
        toolName: string,
        args: unknown,
        metadata: ReversibilityMetadata,
    ): Promise<FidesSignResult> {
        await this.initialize();

        const payload = JSON.stringify({
            tool: toolName,
            args,
            class: metadata.reversibility_class,
            ts: Date.now(),
        });

        try {
            const fides = await import('@fides/sdk');
            const signature = fides.sign(
                new TextEncoder().encode(payload),
                this.keyPair!.privateKey,
            );
            return {
                signature: Buffer.from(signature).toString('base64'),
                did: this.did!,
                timestamp: Date.now(),
            };
        } catch {
            const hash = await this.hashPayload(payload);
            return {
                signature: hash,
                did: this.did!,
                timestamp: Date.now(),
            };
        }
    }

    async verifySignature(
        payload: string,
        signature: string,
        signerDid: string,
    ): Promise<boolean> {
        try {
            const fides = await import('@fides/sdk');
            const publicKey = fides.parseDID(signerDid);
            if (!publicKey) return false;

            return fides.verify(
                new TextEncoder().encode(payload),
                Buffer.from(signature, 'base64'),
                publicKey,
            );
        } catch {
            return false;
        }
    }

    async counterSignWithUser(
        commitHash: string,
        userKeyPair: KeyPair,
    ): Promise<FidesSignResult> {
        try {
            const fides = await import('@fides/sdk');
            const payload = new TextEncoder().encode(commitHash);
            const signature = fides.sign(payload, userKeyPair.privateKey);
            const did = fides.generateDID(userKeyPair.publicKey);
            return {
                signature: Buffer.from(signature).toString('base64'),
                did,
                timestamp: Date.now(),
            };
        } catch {
            const hash = await this.hashPayload(commitHash);
            return {
                signature: hash,
                did: `did:key:user_${Date.now()}`,
                timestamp: Date.now(),
            };
        }
    }

    getDID(): string {
        return this.did ?? 'uninitialized';
    }

    private async generateFallbackKeyPair(): Promise<KeyPair> {
        const key = crypto.getRandomValues(new Uint8Array(32));
        return { publicKey: key, privateKey: key };
    }

    private async hashPayload(payload: string): Promise<string> {
        const data = new TextEncoder().encode(payload);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Buffer.from(hash).toString('base64');
    }
}

export function getFides(): FidesService {
    if (!fidesSingleton) {
        fidesSingleton = new FidesService();
    }
    return fidesSingleton;
}
