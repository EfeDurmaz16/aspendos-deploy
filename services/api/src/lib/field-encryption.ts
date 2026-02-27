/**
 * Field-level encryption utility using AES-256-GCM.
 *
 * Encrypts individual fields (e.g. API keys, PII) before storing in the database.
 * Uses PBKDF2 for key derivation from the ENCRYPTION_KEY environment variable.
 *
 * New format (v2, with random salt, base64-encoded):
 *   [16-byte salt][16-byte IV][16-byte auth tag][ciphertext]
 *
 * Legacy format (v1, static salt, base64-encoded):
 *   [16-byte IV][16-byte auth tag][ciphertext]
 *
 * Prefix: "enc::" marks a value as encrypted for easy detection.
 * Decryption auto-detects format by trying v2 first, then falling back to v1.
 */
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 16;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_DIGEST = 'sha512';
const LEGACY_SALT = 'yula-os-field-encryption-salt'; // Static salt for v1 backward compat
const ENCRYPTED_PREFIX = 'enc::';

/**
 * Derive a 256-bit key from a passphrase and salt using PBKDF2.
 */
function deriveKey(passphrase: string, salt: string | Buffer): Buffer {
    return pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, KEY_LENGTH, PBKDF2_DIGEST);
}

/**
 * Resolve the encryption key from the environment.
 * Throws if ENCRYPTION_KEY is not set.
 */
function getEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    return key;
}

/**
 * Encrypt a plaintext string using AES-256-GCM with a random per-value salt.
 * Returns a prefixed base64 string containing the salt, IV, auth tag, and ciphertext.
 */
export function encryptField(plaintext: string): string {
    const salt = randomBytes(SALT_LENGTH);
    const key = deriveKey(getEncryptionKey(), salt);
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Pack v2: [salt][IV][authTag][ciphertext]
    const packed = Buffer.concat([salt, iv, authTag, encrypted]);
    return ENCRYPTED_PREFIX + packed.toString('base64');
}

/**
 * Decrypt an encrypted field string back to plaintext.
 * Auto-detects v2 (random salt) vs v1 (static salt) format.
 */
export function decryptField(ciphertext: string): string {
    return decryptFieldWithKey(getEncryptionKey(), ciphertext);
}

/**
 * Decrypt using a specific key (used internally and for key rotation).
 * Tries v2 format first, falls back to v1 legacy format.
 */
function decryptFieldWithKey(passphrase: string, ciphertext: string): string {
    if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
        throw new Error('Value does not appear to be encrypted (missing prefix)');
    }

    const raw = ciphertext.slice(ENCRYPTED_PREFIX.length);
    const packed = Buffer.from(raw, 'base64');

    // Try v2 format first (with per-value salt)
    if (packed.length >= SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH) {
        try {
            const salt = packed.subarray(0, SALT_LENGTH);
            const iv = packed.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
            const authTag = packed.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
            const encrypted = packed.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

            const key = deriveKey(passphrase, salt);
            const decipher = createDecipheriv(ALGORITHM, key, iv);
            decipher.setAuthTag(authTag);

            const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
            return decrypted.toString('utf8');
        } catch {
            // v2 decryption failed — try v1 legacy format below
        }
    }

    // Fallback: v1 legacy format (static salt)
    if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH) {
        throw new Error('Encrypted value is too short to be valid');
    }

    const iv = packed.subarray(0, IV_LENGTH);
    const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const key = deriveKey(passphrase, LEGACY_SALT);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
}

/**
 * Check whether a value appears to be encrypted (has the expected prefix).
 */
export function isEncrypted(value: string): boolean {
    if (!value.startsWith(ENCRYPTED_PREFIX)) {
        return false;
    }

    // Validate that the remainder is valid base64 and long enough
    try {
        const raw = value.slice(ENCRYPTED_PREFIX.length);
        const packed = Buffer.from(raw, 'base64');
        return packed.length >= IV_LENGTH + AUTH_TAG_LENGTH;
    } catch {
        return false;
    }
}

/**
 * Re-encrypt a ciphertext from an old key to a new key.
 * Always produces v2 format (random salt) output.
 */
export function rotateEncryption(oldKey: string, newKey: string, ciphertext: string): string {
    const plaintext = decryptFieldWithKey(oldKey, ciphertext);

    const salt = randomBytes(SALT_LENGTH);
    const key = deriveKey(newKey, salt);
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const packed = Buffer.concat([salt, iv, authTag, encrypted]);
    return ENCRYPTED_PREFIX + packed.toString('base64');
}
