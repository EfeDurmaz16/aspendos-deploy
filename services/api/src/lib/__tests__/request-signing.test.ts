import { describe, expect, it } from 'vitest';
import { createWebhookHeaders, signRequest, verifySignature } from '../request-signing';

const TEST_SECRET = 'test-webhook-secret-key';
const TEST_PAYLOAD = JSON.stringify({ event: 'chat.created', userId: 'user_123' });

describe('request-signing', () => {
    describe('signRequest', () => {
        it('returns a hex signature and timestamp', () => {
            const result = signRequest(TEST_PAYLOAD, TEST_SECRET);

            expect(typeof result.signature).toBe('string');
            expect(result.signature).toMatch(/^[a-f0-9]{64}$/);
            expect(typeof result.timestamp).toBe('number');
        });

        it('uses the provided timestamp when given', () => {
            const fixedTimestamp = 1700000000000;
            const result = signRequest(TEST_PAYLOAD, TEST_SECRET, fixedTimestamp);

            expect(result.timestamp).toBe(fixedTimestamp);
        });

        it('generates a current timestamp when none is provided', () => {
            const before = Date.now();
            const result = signRequest(TEST_PAYLOAD, TEST_SECRET);
            const after = Date.now();

            expect(result.timestamp).toBeGreaterThanOrEqual(before);
            expect(result.timestamp).toBeLessThanOrEqual(after);
        });

        it('produces deterministic signatures for the same inputs', () => {
            const ts = 1700000000000;
            const a = signRequest(TEST_PAYLOAD, TEST_SECRET, ts);
            const b = signRequest(TEST_PAYLOAD, TEST_SECRET, ts);

            expect(a.signature).toBe(b.signature);
        });

        it('produces different signatures for different payloads', () => {
            const ts = 1700000000000;
            const a = signRequest('payload-a', TEST_SECRET, ts);
            const b = signRequest('payload-b', TEST_SECRET, ts);

            expect(a.signature).not.toBe(b.signature);
        });

        it('produces different signatures for different secrets', () => {
            const ts = 1700000000000;
            const a = signRequest(TEST_PAYLOAD, 'secret-a', ts);
            const b = signRequest(TEST_PAYLOAD, 'secret-b', ts);

            expect(a.signature).not.toBe(b.signature);
        });
    });

    describe('verifySignature', () => {
        it('verifies a valid signature (sign/verify roundtrip)', () => {
            const { signature, timestamp } = signRequest(TEST_PAYLOAD, TEST_SECRET);
            const valid = verifySignature(TEST_PAYLOAD, signature, TEST_SECRET, timestamp);

            expect(valid).toBe(true);
        });

        it('rejects a tampered payload', () => {
            const { signature, timestamp } = signRequest(TEST_PAYLOAD, TEST_SECRET);
            const tamperedPayload = JSON.stringify({ event: 'chat.created', userId: 'attacker' });
            const valid = verifySignature(tamperedPayload, signature, TEST_SECRET, timestamp);

            expect(valid).toBe(false);
        });

        it('rejects a tampered signature', () => {
            const { timestamp } = signRequest(TEST_PAYLOAD, TEST_SECRET);
            const fakeSignature = 'a'.repeat(64);
            const valid = verifySignature(TEST_PAYLOAD, fakeSignature, TEST_SECRET, timestamp);

            expect(valid).toBe(false);
        });

        it('rejects a wrong secret', () => {
            const { signature, timestamp } = signRequest(TEST_PAYLOAD, TEST_SECRET);
            const valid = verifySignature(TEST_PAYLOAD, signature, 'wrong-secret', timestamp);

            expect(valid).toBe(false);
        });

        it('rejects an expired timestamp (replay attack prevention)', () => {
            const oldTimestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago
            const { signature } = signRequest(TEST_PAYLOAD, TEST_SECRET, oldTimestamp);
            const valid = verifySignature(TEST_PAYLOAD, signature, TEST_SECRET, oldTimestamp);

            expect(valid).toBe(false);
        });

        it('accepts a timestamp within the default 5-minute window', () => {
            const recentTimestamp = Date.now() - 4 * 60 * 1000; // 4 minutes ago
            const { signature } = signRequest(TEST_PAYLOAD, TEST_SECRET, recentTimestamp);
            const valid = verifySignature(TEST_PAYLOAD, signature, TEST_SECRET, recentTimestamp);

            expect(valid).toBe(true);
        });

        it('respects a custom maxAgeMs value', () => {
            const customMaxAge = 10_000; // 10 seconds
            const oldTimestamp = Date.now() - 15_000; // 15 seconds ago
            const { signature } = signRequest(TEST_PAYLOAD, TEST_SECRET, oldTimestamp);
            const valid = verifySignature(
                TEST_PAYLOAD,
                signature,
                TEST_SECRET,
                oldTimestamp,
                customMaxAge,
            );

            expect(valid).toBe(false);
        });

        it('accepts within a custom maxAgeMs window', () => {
            const customMaxAge = 30_000; // 30 seconds
            const recentTimestamp = Date.now() - 20_000; // 20 seconds ago
            const { signature } = signRequest(TEST_PAYLOAD, TEST_SECRET, recentTimestamp);
            const valid = verifySignature(
                TEST_PAYLOAD,
                signature,
                TEST_SECRET,
                recentTimestamp,
                customMaxAge,
            );

            expect(valid).toBe(true);
        });

        it('rejects signatures with mismatched length', () => {
            const { timestamp } = signRequest(TEST_PAYLOAD, TEST_SECRET);
            const shortSignature = 'abcdef';
            const valid = verifySignature(TEST_PAYLOAD, shortSignature, TEST_SECRET, timestamp);

            expect(valid).toBe(false);
        });

        it('rejects future timestamps beyond the window', () => {
            const futureTimestamp = Date.now() + 6 * 60 * 1000; // 6 minutes in the future
            const { signature } = signRequest(TEST_PAYLOAD, TEST_SECRET, futureTimestamp);
            const valid = verifySignature(TEST_PAYLOAD, signature, TEST_SECRET, futureTimestamp);

            expect(valid).toBe(false);
        });
    });

    describe('createWebhookHeaders', () => {
        it('returns X-Signature and X-Timestamp headers', () => {
            const headers = createWebhookHeaders(TEST_PAYLOAD, TEST_SECRET);

            expect(headers).toHaveProperty('X-Signature');
            expect(headers).toHaveProperty('X-Timestamp');
        });

        it('X-Signature is a valid 64-char hex string', () => {
            const headers = createWebhookHeaders(TEST_PAYLOAD, TEST_SECRET);

            expect(headers['X-Signature']).toMatch(/^[a-f0-9]{64}$/);
        });

        it('X-Timestamp is a numeric string', () => {
            const headers = createWebhookHeaders(TEST_PAYLOAD, TEST_SECRET);

            expect(headers['X-Timestamp']).toMatch(/^\d+$/);
        });

        it('generated headers pass verification', () => {
            const headers = createWebhookHeaders(TEST_PAYLOAD, TEST_SECRET);
            const valid = verifySignature(
                TEST_PAYLOAD,
                headers['X-Signature'],
                TEST_SECRET,
                Number(headers['X-Timestamp']),
            );

            expect(valid).toBe(true);
        });

        it('returns only the expected keys', () => {
            const headers = createWebhookHeaders(TEST_PAYLOAD, TEST_SECRET);
            const keys = Object.keys(headers);

            expect(keys).toHaveLength(2);
            expect(keys).toContain('X-Signature');
            expect(keys).toContain('X-Timestamp');
        });
    });
});
