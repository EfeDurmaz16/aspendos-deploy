import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgitService } from '../../audit/agit';
import type { ReversibilityMetadata } from '../../reversibility/types';
import { canonicalJson } from '../canonical';
import { FidesService } from '../fides';

const metadata: ReversibilityMetadata = {
    reversibility_class: 'undoable',
    human_explanation: 'Test action',
};

const originalVitestEnv = process.env.VITEST;

function forceMissingFidesSdk(fides: FidesService) {
    (fides as unknown as { loadSdk: () => Promise<null> }).loadSdk = async () => null;
}

describe('canonical governance primitives', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        delete process.env.AGIT_REPO_PATH;
        delete process.env.ALLOW_IN_MEMORY_GOVERNANCE;
        delete process.env.FIDES_TEST_SIGNING_SECRET;
        process.env.NODE_ENV = 'test';
        if (originalVitestEnv === undefined) {
            delete process.env.VITEST;
        } else {
            process.env.VITEST = originalVitestEnv;
        }
    });

    it('canonicalizes object keys deterministically', () => {
        expect(canonicalJson({ b: 2, a: { d: 4, c: 3 } })).toBe(
            canonicalJson({ a: { c: 3, d: 4 }, b: 2 })
        );
    });

    it('signs and verifies canonical tool payloads in explicit test fallback mode', async () => {
        process.env.FIDES_TEST_SIGNING_SECRET = 'test-secret';

        const fides = new FidesService();
        forceMissingFidesSdk(fides);
        const args = { z: 1, a: 2 };
        const signed = await fides.signToolCall('file.write', args, metadata);
        const payload = fides.getToolCallPayload('file.write', { a: 2, z: 1 }, metadata);

        expect(signed.did).toBe('did:fides:test-fallback');
        await expect(fides.verifySignature(payload, signed.signature, signed.did)).resolves.toBe(
            true
        );
    });

    it('signs and verifies canonical governance commit payloads', async () => {
        const fides = new FidesService();
        const args = { z: 1, a: 2 };
        const result = { success: true, value: { b: 2, a: 1 } };
        const signed = await fides.signGovernanceCommit('file.write', args, metadata, {
            result,
            status: 'executed',
        });
        const payload = fides.getGovernanceCommitPayload('file.write', { a: 2, z: 1 }, metadata, {
            result: { value: { a: 1, b: 2 }, success: true },
            status: 'executed',
        });

        await expect(fides.verifySignature(payload, signed.signature, signed.did)).resolves.toBe(
            true
        );
    });

    it('refuses FIDES fallback signatures in production', async () => {
        process.env.NODE_ENV = 'production';
        delete process.env.FIDES_TEST_SIGNING_SECRET;

        const fides = new FidesService();
        forceMissingFidesSdk(fides);

        await expect(fides.initialize()).rejects.toThrow(/Refusing to create fallback FIDES/);
    });

    it('refuses FIDES fallback signatures outside test without explicit local fallback opt-in', async () => {
        process.env.NODE_ENV = 'development';
        process.env.VITEST = 'false';
        process.env.FIDES_TEST_SIGNING_SECRET = 'dev-secret';
        delete process.env.ALLOW_IN_MEMORY_GOVERNANCE;

        const fides = new FidesService();
        forceMissingFidesSdk(fides);

        await expect(fides.initialize()).rejects.toThrow(
            /explicit local\/test governance fallback/
        );
    });

    it('allows FIDES fallback signatures outside test only with explicit local fallback opt-in', async () => {
        process.env.NODE_ENV = 'development';
        process.env.VITEST = 'false';
        process.env.FIDES_TEST_SIGNING_SECRET = 'dev-secret';
        process.env.ALLOW_IN_MEMORY_GOVERNANCE = 'true';

        const fides = new FidesService();
        forceMissingFidesSdk(fides);

        await expect(fides.initialize()).resolves.toBeUndefined();
        await expect(fides.isUsingExplicitTestFallback()).resolves.toBe(true);
    });

    it('uses deterministic local AGIT hashes outside production fallback paths', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(123_456);

        const base = {
            userId: 'user-1',
            toolName: 'file.write',
            args: { z: 1, a: 2 },
            metadata,
            fidesSignature: 'sig-1',
            fidesDid: 'did:fides:test',
            type: 'pre' as const,
        };
        const agitA = new AgitService();
        const agitB = new AgitService();

        const commitA = await agitA.commitAction(base);
        const commitB = await agitB.commitAction({
            ...base,
            args: { a: 2, z: 1 },
        });

        expect(commitA.hash).toMatch(/^[a-f0-9]{64}$/);
        expect(commitB.hash).toBe(commitA.hash);
        await expect(agitA.verifyCommit(commitA.hash)).resolves.toBe(true);
    });

    it('keeps local AGIT hashes independent from record timestamps', async () => {
        const base = {
            userId: 'timestamp-independent-user',
            toolName: 'file.write',
            args: { path: '/tmp/a.txt', content: 'hello' },
            metadata,
            fidesSignature: 'sig-1',
            fidesDid: 'did:fides:test',
            type: 'pre' as const,
        };

        vi.spyOn(Date, 'now').mockReturnValueOnce(111).mockReturnValueOnce(222);

        const agit = new AgitService();
        const first = await agit.commitAction(base);
        const second = await agit.commitAction(base);

        expect(first.timestamp).toBe(111);
        expect(second.timestamp).toBe(222);
        expect(second.hash).toBe(first.hash);
    });

    it('refuses in-memory AGIT commits in production', async () => {
        process.env.NODE_ENV = 'production';
        delete process.env.AGIT_REPO_PATH;

        const agit = new AgitService();

        await expect(
            agit.commitAction({
                userId: 'user-1',
                toolName: 'file.write',
                args: {},
                metadata,
                fidesSignature: 'sig-1',
                fidesDid: 'did:fides:test',
                type: 'pre',
            })
        ).rejects.toThrow(/AGIT_REPO_PATH is required in production/);
    });

    it('refuses in-memory AGIT commits outside test without explicit local fallback opt-in', async () => {
        process.env.NODE_ENV = 'development';
        process.env.VITEST = 'false';
        delete process.env.AGIT_REPO_PATH;
        delete process.env.ALLOW_IN_MEMORY_GOVERNANCE;

        const agit = new AgitService();

        await expect(
            agit.commitAction({
                userId: 'user-1',
                toolName: 'file.write',
                args: {},
                metadata,
                fidesSignature: 'sig-1',
                fidesDid: 'did:fides:test',
                type: 'pre',
            })
        ).rejects.toThrow(/ALLOW_IN_MEMORY_GOVERNANCE=true/);
    });

    it('allows in-memory AGIT commits outside test only with explicit local fallback opt-in', async () => {
        process.env.NODE_ENV = 'development';
        process.env.VITEST = 'false';
        process.env.ALLOW_IN_MEMORY_GOVERNANCE = 'true';
        delete process.env.AGIT_REPO_PATH;

        const agit = new AgitService();

        await expect(
            agit.commitAction({
                userId: 'user-1',
                toolName: 'file.write',
                args: {},
                metadata,
                fidesSignature: 'sig-1',
                fidesDid: 'did:fides:test',
                type: 'pre',
            })
        ).resolves.toMatchObject({
            did: 'did:fides:test',
            signature: 'sig-1',
        });
    });

    it('filters AGIT client history by commit owner metadata', async () => {
        const agit = new AgitService();
        (agit as any).initialized = true;
        (agit as any).client = {
            log: vi.fn().mockResolvedValue([
                {
                    hash: 'other-commit',
                    metadata: {
                        fidesDid: 'did:fides:other',
                        fidesSignature: 'sig-other',
                        userId: 'user-2',
                    },
                    timestamp: 1,
                },
                {
                    hash: 'own-commit',
                    metadata: {
                        fidesDid: 'did:fides:user-1',
                        fidesSignature: 'sig-user-1',
                        userId: 'user-1',
                    },
                    timestamp: 2,
                },
            ]),
        };

        await expect(agit.historyForUser('user-1', 10)).resolves.toEqual([
            {
                hash: 'own-commit',
                did: 'did:fides:user-1',
                signature: 'sig-user-1',
                timestamp: 2,
            },
        ]);
    });

    it('fails loud when production AGIT history cannot be read', async () => {
        process.env.NODE_ENV = 'production';
        const agit = new AgitService();
        (agit as any).initialized = true;
        (agit as any).client = {
            log: vi.fn().mockRejectedValue(new Error('repo offline')),
        };

        await expect(agit.historyForUser('user-1', 10)).rejects.toThrow(
            /AGIT log failed: Error: repo offline/
        );
    });

    it('fails loud when production AGIT revert cannot be applied', async () => {
        process.env.NODE_ENV = 'production';
        const agit = new AgitService();
        (agit as any).initialized = true;
        (agit as any).client = {
            revert: vi.fn().mockRejectedValue(new Error('revert denied')),
        };

        await expect(agit.revert('user-1', 'commit-1')).rejects.toThrow(
            /AGIT revert failed: revert denied/
        );
    });
});
