import { timingSafeEqual } from 'node:crypto';
import type { ReversibilityMetadata } from '../reversibility/types';
import { canonicalJson, isProductionRuntime } from './canonical';

interface FidesSignResult {
    signature: string;
    did: string;
    timestamp: number;
}

interface KeyPair {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
}

type FidesSdk = {
    generateKeyPair: () => Promise<KeyPair>;
    generateDID: (publicKey: Uint8Array) => string;
    sign: (payload: Uint8Array, privateKey: Uint8Array) => Uint8Array | Promise<Uint8Array>;
    parseDID: (did: string) => Uint8Array | null;
    verify: (
        payload: Uint8Array,
        signature: Uint8Array,
        publicKey: Uint8Array
    ) => boolean | Promise<boolean>;
};

let fidesSingleton: FidesService | null = null;

export class FidesService {
    private keyPair: KeyPair | null = null;
    private did: string | null = null;
    private initialized = false;
    private sdk: FidesSdk | null = null;
    private fallbackSecret: string | null = null;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        const fides = await this.loadSdk();
        if (fides) {
            const keyPair = await fides.generateKeyPair();
            this.keyPair = keyPair;
            this.did = fides.generateDID(keyPair.publicKey);
            this.sdk = fides;
            this.initialized = true;
            return;
        }

        const fallbackSecret =
            process.env.FIDES_TEST_SIGNING_SECRET ??
            (process.env.VITEST ? 'vitest-fides-test-secret' : undefined);
        if (!fallbackSecret || isProductionRuntime()) {
            throw new Error(
                '@fides/sdk is unavailable. Refusing to create fallback FIDES signatures on production paths.'
            );
        }

        this.fallbackSecret = fallbackSecret;
        this.did = 'did:fides:test-fallback';
        this.initialized = true;
    }

    private async loadSdk(): Promise<FidesSdk | null> {
        try {
            return (await import('@fides/sdk')) as FidesSdk;
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
        const expectedBuffer = Buffer.from(expected);
        const actualBuffer = Buffer.from(signature);
        return (
            expectedBuffer.length === actualBuffer.length &&
            timingSafeEqual(expectedBuffer, actualBuffer)
        );
    }

    private async ensureFallbackInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
        if (!this.fallbackSecret) {
            throw new Error('FIDES fallback is not enabled');
        }
    }

    private async signPayload(payload: string): Promise<string> {
        if (this.sdk && this.keyPair) {
            const signature = await this.sdk.sign(
                new TextEncoder().encode(payload),
                this.keyPair.privateKey
            );
            return Buffer.from(signature).toString('base64');
        }
        return this.signWithFallback(payload);
    }

    async isUsingExplicitTestFallback(): Promise<boolean> {
        await this.initialize();
        return !!this.fallbackSecret;
    }

    getToolCallPayload(toolName: string, args: unknown, metadata: ReversibilityMetadata): string {
        return this.signaturePayload(toolName, args, metadata);
    }

    async signToolCall(
        toolName: string,
        args: unknown,
        metadata: ReversibilityMetadata
    ): Promise<FidesSignResult> {
        await this.initialize();

        const payload = this.signaturePayload(toolName, args, metadata);
        const timestamp = Date.now();

        return {
            signature: await this.signPayload(payload),
            did: this.did!,
            timestamp,
        };
    }

    async verifySignature(payload: string, signature: string, signerDid: string): Promise<boolean> {
        await this.initialize();
        if (this.sdk) {
            const publicKey = this.sdk.parseDID(signerDid);
            if (!publicKey) return false;

            return this.sdk.verify(
                new TextEncoder().encode(payload),
                Buffer.from(signature, 'base64'),
                publicKey
            );
        }

        await this.ensureFallbackInitialized();
        return signerDid === this.did && this.verifyWithFallback(payload, signature);
    }

    async counterSignWithUser(commitHash: string, userKeyPair: KeyPair): Promise<FidesSignResult> {
        await this.initialize();
        if (this.sdk) {
            const payload = new TextEncoder().encode(commitHash);
            const signature = await this.sdk.sign(payload, userKeyPair.privateKey);
            const did = this.sdk.generateDID(userKeyPair.publicKey);
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
