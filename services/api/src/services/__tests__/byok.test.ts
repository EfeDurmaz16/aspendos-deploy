import { beforeAll, describe, expect, it } from 'vitest';
import { decryptCredential, encryptCredential } from '../byok.service';

describe('BYOK Vault', () => {
    beforeAll(() => {
        process.env.BYOK_ENCRYPTION_SECRET = 'test-secret-key-for-byok-vault-32';
    });

    it('encrypts and decrypts a credential round-trip', async () => {
        const apiKey = 'sk-test-123456789abcdef';
        const { encrypted, iv } = await encryptCredential(apiKey);

        expect(encrypted).not.toBe(apiKey);
        expect(iv).toBeTruthy();

        const decrypted = await decryptCredential(encrypted, iv);
        expect(decrypted).toBe(apiKey);
    });

    it('produces different ciphertexts for same input (random IV)', async () => {
        const apiKey = 'sk-test-same-key';
        const result1 = await encryptCredential(apiKey);
        const result2 = await encryptCredential(apiKey);

        expect(result1.encrypted).not.toBe(result2.encrypted);
        expect(result1.iv).not.toBe(result2.iv);
    });

    it('fails to decrypt with wrong IV', async () => {
        const { encrypted } = await encryptCredential('sk-test-key');
        const wrongIv = Buffer.from(crypto.getRandomValues(new Uint8Array(12))).toString('base64');

        await expect(decryptCredential(encrypted, wrongIv)).rejects.toThrow();
    });
});
