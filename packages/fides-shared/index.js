export const ALGORITHM = 'ed25519';
export const CONTENT_DIGEST_ALGORITHM = 'sha-256';
export const DEFAULT_CLOCK_DRIFT_SECONDS = 30;
export const DEFAULT_SIGNATURE_EXPIRY_SECONDS = 300;
export const DID_PREFIX = 'did:fides:';
export const ED25519_PRIVATE_KEY_LENGTH = 32;
export const ED25519_PRIVATE_KEY_LENGTH_EXTENDED = 64;
export const ED25519_PUBLIC_KEY_LENGTH = 32;
export const MAX_REQUEST_BODY_SIZE = 10 * 1024 * 1024;
export const MIN_TRUST_LEVEL = 0;
export const MAX_TRUST_LEVEL = 100;
export const WELL_KNOWN_PATH = '/.well-known/fides.json';

export class DiscoveryError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DiscoveryError';
    }
}

export class KeyError extends Error {
    constructor(message) {
        super(message);
        this.name = 'KeyError';
    }
}

export class TrustError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TrustError';
    }
}
