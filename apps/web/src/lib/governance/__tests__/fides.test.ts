import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdkMocks = vi.hoisted(() => ({
    generateDID: vi.fn(() => 'did:fides:web-test'),
    generateKeyPair: vi.fn(async () => ({
        publicKey: new Uint8Array([1, 2, 3]),
        privateKey: new Uint8Array([4, 5, 6]),
    })),
    sign: vi.fn(async (payload: Uint8Array) => payload),
}));

vi.mock('@fides/sdk', () => ({
    generateDID: sdkMocks.generateDID,
    generateKeyPair: sdkMocks.generateKeyPair,
    sign: sdkMocks.sign,
}));

function normalizeForSignature(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((item) => normalizeForSignature(item));

    const record = value as Record<string, unknown>;
    return Object.keys(record)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
            const item = record[key];
            if (item !== undefined) acc[key] = normalizeForSignature(item);
            return acc;
        }, {});
}

function canonicalJson(value: unknown): string {
    return JSON.stringify(normalizeForSignature(value));
}

describe('web FIDES governance signatures', () => {
    beforeEach(() => {
        vi.resetModules();
        sdkMocks.generateDID.mockClear();
        sdkMocks.generateKeyPair.mockClear();
        sdkMocks.sign.mockClear();
    });

    it('signs parent-bound canonical payloads', async () => {
        const { signGovernanceCommit } = await import('../fides');
        const payload = {
            args: { z: 1, a: 2 },
            parent_hash: 'parent-commit-1',
            result: { success: true, value: { b: 2, a: 1 } },
            reversibility_class: 'undoable',
            status: 'executed',
            tool_name: 'file.write',
        };

        const signed = await signGovernanceCommit(payload);
        const signedPayload = new TextDecoder().decode(sdkMocks.sign.mock.calls[0]?.[0]);

        expect(signed.fides_signer_did).toBe('did:fides:web-test');
        expect(signedPayload).toBe(
            canonicalJson({
                args: { a: 2, z: 1 },
                parent_hash: 'parent-commit-1',
                result: { success: true, value: { a: 1, b: 2 } },
                reversibility_class: 'undoable',
                status: 'executed',
                tool_name: 'file.write',
            })
        );
    });

    it('changes signed bytes when the parent hash changes', async () => {
        const { signGovernanceCommit } = await import('../fides');
        await signGovernanceCommit({
            args: { a: 1 },
            parent_hash: 'parent-commit-1',
            result: { success: true },
            reversibility_class: 'undoable',
            status: 'executed',
            tool_name: 'file.write',
        });
        await signGovernanceCommit({
            args: { a: 1 },
            parent_hash: 'parent-commit-2',
            result: { success: true },
            reversibility_class: 'undoable',
            status: 'executed',
            tool_name: 'file.write',
        });

        const firstPayload = new TextDecoder().decode(sdkMocks.sign.mock.calls[0]?.[0]);
        const secondPayload = new TextDecoder().decode(sdkMocks.sign.mock.calls[1]?.[0]);

        expect(firstPayload).not.toBe(secondPayload);
        expect(firstPayload).toContain('"parent_hash":"parent-commit-1"');
        expect(secondPayload).toContain('"parent_hash":"parent-commit-2"');
    });
});
