/**
 * Request Signing & Webhook Verification
 * HMAC-SHA256 signing for outbound API calls and inbound webhook verification.
 * Uses constant-time comparison and replay attack prevention.
 */

import { createHmac, timingSafeEqual } from 'crypto';

const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Sign a payload using HMAC-SHA256.
 * Returns the hex signature and the timestamp used.
 */
export function signRequest(
    payload: string,
    secret: string,
    timestamp?: number,
): { signature: string; timestamp: number } {
    const ts = timestamp ?? Date.now();
    const message = `${ts}.${payload}`;
    const signature = createHmac('sha256', secret).update(message).digest('hex');
    return { signature, timestamp: ts };
}

/**
 * Verify an HMAC-SHA256 signature against a payload.
 * Rejects replayed requests older than maxAgeMs (default 5 min).
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifySignature(
    payload: string,
    signature: string,
    secret: string,
    timestamp: number,
    maxAgeMs: number = DEFAULT_MAX_AGE_MS,
): boolean {
    const age = Math.abs(Date.now() - timestamp);
    if (age > maxAgeMs) {
        return false;
    }

    const message = `${timestamp}.${payload}`;
    const expected = createHmac('sha256', secret).update(message).digest('hex');

    if (expected.length !== signature.length) {
        return false;
    }

    const expectedBuf = Buffer.from(expected, 'utf-8');
    const signatureBuf = Buffer.from(signature, 'utf-8');

    return timingSafeEqual(expectedBuf, signatureBuf);
}

/**
 * Create standard webhook headers for an outbound request.
 * Returns X-Signature and X-Timestamp headers.
 */
export function createWebhookHeaders(
    payload: string,
    secret: string,
): Record<string, string> {
    const { signature, timestamp } = signRequest(payload, secret);
    return {
        'X-Signature': signature,
        'X-Timestamp': String(timestamp),
    };
}
