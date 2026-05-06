export interface AgentIdentity {
    did: string;
    publicKey: string;
    metadata?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
}

export interface DiscoveryDocument {
    identity: AgentIdentity;
    services?: Array<{
        id: string;
        type: string;
        endpoint: string;
    }>;
}

export interface KeyPair {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
}

export interface TrustAttestation {
    id: string;
    issuerDid: string;
    subjectDid: string;
    trustLevel: number;
    issuedAt: string;
    signature: string;
    payload: string;
}

export interface TrustPath {
    from: string;
    to: string;
    path: string[];
    trustLevel: number;
}

export interface TrustScore {
    did: string;
    score: number;
    attestations: number;
    lastUpdated?: string;
}

export declare const ALGORITHM: 'ed25519';
export declare const CONTENT_DIGEST_ALGORITHM: 'sha-256';
export declare const DEFAULT_CLOCK_DRIFT_SECONDS: 30;
export declare const DEFAULT_SIGNATURE_EXPIRY_SECONDS: 300;
export declare const DID_PREFIX: 'did:fides:';
export declare const ED25519_PRIVATE_KEY_LENGTH: 32;
export declare const ED25519_PRIVATE_KEY_LENGTH_EXTENDED: 64;
export declare const ED25519_PUBLIC_KEY_LENGTH: 32;
export declare const MAX_REQUEST_BODY_SIZE: number;
export declare const MIN_TRUST_LEVEL: 0;
export declare const MAX_TRUST_LEVEL: 100;
export declare const WELL_KNOWN_PATH: '/.well-known/fides.json';

export declare class DiscoveryError extends Error {
    constructor(message: string);
}

export declare class KeyError extends Error {
    constructor(message: string);
}

export declare class TrustError extends Error {
    constructor(message: string);
}
