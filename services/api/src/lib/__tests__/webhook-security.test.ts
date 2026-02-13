import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { verifyHmacSignature, verifyTimingSafe } from '../webhook-security';

describe('webhook-security', () => {
    // ─── verifyTimingSafe ─────────────────────────────────────────────────────

    describe('verifyTimingSafe', () => {
        it('returns true for identical strings', () => {
            expect(verifyTimingSafe('my-secret-value', 'my-secret-value')).toBe(true);
        });

        it('returns false for different strings of equal length', () => {
            expect(verifyTimingSafe('aaaa', 'bbbb')).toBe(false);
        });

        it('returns false for mismatched lengths', () => {
            expect(verifyTimingSafe('short', 'a-much-longer-string')).toBe(false);
        });

        it('returns false when actual is empty', () => {
            expect(verifyTimingSafe('', 'expected')).toBe(false);
        });

        it('returns false when expected is empty', () => {
            expect(verifyTimingSafe('actual', '')).toBe(false);
        });

        it('returns false when both are empty', () => {
            expect(verifyTimingSafe('', '')).toBe(false);
        });

        it('handles unicode strings safely', () => {
            expect(verifyTimingSafe('hello-world', 'hello-world')).toBe(true);
            expect(verifyTimingSafe('hello-world', 'hello-World')).toBe(false);
        });

        it('handles single-character strings', () => {
            expect(verifyTimingSafe('a', 'a')).toBe(true);
            expect(verifyTimingSafe('a', 'b')).toBe(false);
        });
    });

    // ─── verifyHmacSignature ──────────────────────────────────────────────────

    describe('verifyHmacSignature', () => {
        const SECRET = 'webhook-secret-key-123';
        const PAYLOAD = JSON.stringify({ event: 'test.event', data: { id: 1 } });

        function computeHmac(payload: string, secret: string): string {
            return createHmac('sha256', secret).update(payload, 'utf-8').digest('hex');
        }

        it('returns true for a valid HMAC signature', () => {
            const signature = computeHmac(PAYLOAD, SECRET);
            expect(verifyHmacSignature(PAYLOAD, signature, SECRET)).toBe(true);
        });

        it('returns false for an invalid signature', () => {
            const badSignature = 'a'.repeat(64);
            expect(verifyHmacSignature(PAYLOAD, badSignature, SECRET)).toBe(false);
        });

        it('returns false when the payload has been tampered with', () => {
            const signature = computeHmac(PAYLOAD, SECRET);
            const tampered = JSON.stringify({ event: 'test.event', data: { id: 999 } });
            expect(verifyHmacSignature(tampered, signature, SECRET)).toBe(false);
        });

        it('returns false when the secret is wrong', () => {
            const signature = computeHmac(PAYLOAD, SECRET);
            expect(verifyHmacSignature(PAYLOAD, signature, 'wrong-secret')).toBe(false);
        });

        it('returns false when payload is empty', () => {
            const signature = computeHmac(PAYLOAD, SECRET);
            expect(verifyHmacSignature('', signature, SECRET)).toBe(false);
        });

        it('returns false when signature is empty', () => {
            expect(verifyHmacSignature(PAYLOAD, '', SECRET)).toBe(false);
        });

        it('returns false when secret is empty', () => {
            expect(verifyHmacSignature(PAYLOAD, 'some-sig', '')).toBe(false);
        });

        it('returns false for a signature with mismatched length', () => {
            expect(verifyHmacSignature(PAYLOAD, 'tooshort', SECRET)).toBe(false);
        });

        it('produces consistent results across multiple calls', () => {
            const signature = computeHmac(PAYLOAD, SECRET);
            const results = Array.from({ length: 10 }, () =>
                verifyHmacSignature(PAYLOAD, signature, SECRET)
            );
            expect(results.every((r) => r === true)).toBe(true);
        });
    });
});
