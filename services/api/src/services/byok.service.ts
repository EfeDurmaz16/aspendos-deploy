const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

let encryptionKey: CryptoKey | null = null;

async function getEncryptionKey(): Promise<CryptoKey> {
    if (encryptionKey) return encryptionKey;

    const secret = process.env.BYOK_ENCRYPTION_SECRET;
    if (!secret) throw new Error('BYOK_ENCRYPTION_SECRET not configured');

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret.padEnd(32, '0').slice(0, 32)),
        'PBKDF2',
        false,
        ['deriveKey'],
    );

    encryptionKey = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: new TextEncoder().encode('yula-byok'), iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt'],
    );

    return encryptionKey;
}

export async function encryptCredential(plaintext: string): Promise<{ encrypted: string; iv: string }> {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv },
        key,
        encoded,
    );

    return {
        encrypted: Buffer.from(ciphertext).toString('base64'),
        iv: Buffer.from(iv).toString('base64'),
    };
}

export async function decryptCredential(encrypted: string, iv: string): Promise<string> {
    const key = await getEncryptionKey();
    const ciphertext = Buffer.from(encrypted, 'base64');
    const ivBytes = Buffer.from(iv, 'base64');

    const plaintext = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv: ivBytes },
        key,
        ciphertext,
    );

    return new TextDecoder().decode(plaintext);
}
