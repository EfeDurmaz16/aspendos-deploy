import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Timing-safe string comparison to prevent timing attacks.
 *
 * Uses crypto.timingSafeEqual under the hood, which compares two buffers
 * in constant time regardless of where they differ. If the strings have
 * different lengths, we still perform a constant-time comparison against
 * a derived value to avoid leaking length information.
 */
export function verifyTimingSafe(actual: string, expected: string): boolean {
    if (!actual || !expected) return false;

    const actualBuf = Buffer.from(actual, 'utf-8');
    const expectedBuf = Buffer.from(expected, 'utf-8');

    // If lengths differ, compare expected against itself to avoid
    // leaking length information through timing, then return false.
    if (actualBuf.length !== expectedBuf.length) {
        timingSafeEqual(expectedBuf, expectedBuf);
        return false;
    }

    return timingSafeEqual(actualBuf, expectedBuf);
}

/**
 * Verify an HMAC SHA-256 signature against a payload and secret.
 *
 * Computes the expected HMAC of the payload using the secret, then
 * performs a timing-safe comparison against the provided signature.
 * The signature is expected to be a lowercase hex string.
 */
export function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
    if (!payload || !signature || !secret) return false;

    try {
        const expected = createHmac('sha256', secret).update(payload, 'utf-8').digest('hex');
        return verifyTimingSafe(signature, expected);
    } catch {
        return false;
    }
}
