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

function allowsFallbackSigning(): boolean {
    return isTestRuntime() || process.env.ALLOW_IN_MEMORY_GOVERNANCE === 'true';
}

export class FidesService {
    private keyPair: KeyPair | null = null;
    private did: string | null = null;
    private initialized = false;
    private fallbackSecret: string | null = null;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        const fides = await this.loadSdk();
        if (fides) {
            this.keyPair = await fides.generateKeyPair();
            this.did = fides.generateDID(this.keyPair.publicKey);
            this.initialized = true;
            return;
        }

        const fallbackSecret =
            process.env.FIDES_TEST_SIGNING_SECRET ??
            (process.env.VITEST ? 'vitest-fides-test-secret' : undefined);
        if (!fallbackSecret || isProductionRuntime() || !allowsFallbackSigning()) {
            throw new Error(
                '@fides/sdk is unavailable. Refusing fallback FIDES signatures without explicit local/test governance fallback.'
            );
        }

        this.fallbackSecret = fallbackSecret;
        this.did = 'did:fides:test-fallback';
        this.initialized = true;
    }

    private async loadSdk() {
        try {
            return await import('@fides/sdk');
        } catch {
            return null;
        }
    }

    private signaturePayload(toolName: string, args: unknown, metadata: ReversibilityMetadata) {
        return canonicalJson({
            args,
            reversibility_class: metadata.reversibility_class,
            tool: toolName,
        });
    }

    private async signWithFallback(payload: string): Promise<string> {
        if (!this.fallbackSecret) {
            throw new Error('FIDES fallback signing requested without explicit test secret');
        }
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(this.fallbackSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
        return Buffer.from(signature).toString('base64');
    }

    private async verifyWithFallback(payload: string, signature: string): Promise<boolean> {
        const expected = await this.signWithFallback(payload);
        return expected === signature;
    }

    async signToolCall(
        toolName: string,
        args: unknown,
        metadata: ReversibilityMetadata
    ): Promise<FidesSignResult> {
        await this.initialize();

        const payload = this.signaturePayload(toolName, args, metadata);
        const timestamp = Date.now();

        const fides = await this.loadSdk();
        if (fides && this.keyPair) {
            const signature = await fides.sign(
                new TextEncoder().encode(payload),
                this.keyPair.privateKey
            );
            return {
                signature: Buffer.from(signature).toString('base64'),
                did: this.did!,
                timestamp,
            };
        }

        return {
            signature: await this.signWithFallback(payload),
            did: this.did!,
            timestamp,
        };
    }

    async verifySignature(payload: string, signature: string, signerDid: string): Promise<boolean> {
        const fides = await this.loadSdk();
        if (fides) {
            const publicKey = fides.parseDID(signerDid);
            if (!publicKey) return false;

            return await fides.verify(
                new TextEncoder().encode(payload),
                Buffer.from(signature, 'base64'),
                publicKey
            );
        }

        await this.initialize();
        return signerDid === this.did && this.verifyWithFallback(payload, signature);
    }

    async counterSignWithUser(commitHash: string, userKeyPair: KeyPair): Promise<FidesSignResult> {
        const fides = await this.loadSdk();
        if (fides) {
            const payload = new TextEncoder().encode(commitHash);
            const signature = await fides.sign(payload, userKeyPair.privateKey);
            const did = fides.generateDID(userKeyPair.publicKey);
            return {
                signature: Buffer.from(signature).toString('base64'),
                did,
                timestamp: Date.now(),
            };
        }

        throw new Error('Cannot counter-sign without @fides/sdk');
    }

    getDID(): string {
        return this.did ?? 'uninitialized';
    }
}

export function getFides(): FidesService {
    if (!fidesSingleton) {
        fidesSingleton = new FidesService();
    }
    return fidesSingleton;
}
