import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import bs58 from 'bs58';
import {
    DID_PREFIX,
    ED25519_PRIVATE_KEY_LENGTH,
    ED25519_PRIVATE_KEY_LENGTH_EXTENDED,
    ED25519_PUBLIC_KEY_LENGTH,
    KeyError,
} from '@fides/shared';

ed25519.hashes.sha512 = sha512;

export async function generateKeyPair() {
    try {
        const privateKey = ed25519.utils.randomSecretKey();
        const publicKey = await ed25519.getPublicKeyAsync(privateKey);

        return { publicKey, privateKey };
    } catch (error) {
        throw new KeyError(
            `Failed to generate keypair: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

export function isValidDID(did) {
    if (!did.startsWith(DID_PREFIX)) return false;

    const encoded = did.slice(DID_PREFIX.length);
    if (!encoded) return false;

    try {
        return bs58.decode(encoded).length === ED25519_PUBLIC_KEY_LENGTH;
    } catch {
        return false;
    }
}

export function generateDID(publicKey) {
    if (publicKey.length !== ED25519_PUBLIC_KEY_LENGTH) {
        throw new KeyError(`Public key must be ${ED25519_PUBLIC_KEY_LENGTH} bytes`);
    }

    return `${DID_PREFIX}${bs58.encode(publicKey)}`;
}

export function parseDID(did) {
    if (!isValidDID(did)) {
        throw new KeyError(`Invalid DID format: expected ${DID_PREFIX}<valid-base58-pubkey>`);
    }

    return bs58.decode(did.slice(DID_PREFIX.length));
}

export async function sign(message, privateKey) {
    try {
        if (
            privateKey.length !== ED25519_PRIVATE_KEY_LENGTH &&
            privateKey.length !== ED25519_PRIVATE_KEY_LENGTH_EXTENDED
        ) {
            throw new KeyError(
                `Private key must be ${ED25519_PRIVATE_KEY_LENGTH} or ${ED25519_PRIVATE_KEY_LENGTH_EXTENDED} bytes`
            );
        }

        return await ed25519.signAsync(message, privateKey);
    } catch (error) {
        throw new KeyError(
            `Failed to sign message: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

export async function verify(message, signature, publicKey) {
    try {
        if (publicKey.length !== ED25519_PUBLIC_KEY_LENGTH) {
            throw new KeyError(`Public key must be ${ED25519_PUBLIC_KEY_LENGTH} bytes`);
        }

        return await ed25519.verifyAsync(signature, message, publicKey);
    } catch (error) {
        throw new KeyError(
            `Failed to verify signature: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

export * from '@fides/shared';
