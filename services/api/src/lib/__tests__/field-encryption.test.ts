import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decryptField, encryptField, isEncrypted, rotateEncryption } from '../field-encryption';

const TEST_KEY = 'test-encryption-key-for-vitest-runs';
const ALT_KEY = 'alternate-key-for-rotation-testing';

describe('field-encryption', () => {
    beforeEach(() => {
        process.env.ENCRYPTION_KEY = TEST_KEY;
    });

    afterEach(() => {
        delete process.env.ENCRYPTION_KEY;
    });

    describe('encrypt/decrypt roundtrip', () => {
        it('should encrypt and decrypt a simple string', () => {
            const plaintext = 'hello world';
            const encrypted = encryptField(plaintext);
            const decrypted = decryptField(encrypted);
            expect(decrypted).toBe(plaintext);
        });

        it('should produce different ciphertexts for the same plaintext (random IV)', () => {
            const plaintext = 'deterministic?';
            const a = encryptField(plaintext);
            const b = encryptField(plaintext);
            expect(a).not.toBe(b);
            // Both should still decrypt to the same value
            expect(decryptField(a)).toBe(plaintext);
            expect(decryptField(b)).toBe(plaintext);
        });

        it('should return a string prefixed with enc::', () => {
            const encrypted = encryptField('test');
            expect(encrypted.startsWith('enc::')).toBe(true);
        });
    });

    describe('different input types', () => {
        it('should handle an empty string', () => {
            const encrypted = encryptField('');
            const decrypted = decryptField(encrypted);
            expect(decrypted).toBe('');
        });

        it('should handle unicode characters', () => {
            const plaintext = 'Merhaba dunya! Turkce karakterler: cicek, ogrenci, guzel';
            const encrypted = encryptField(plaintext);
            expect(decryptField(encrypted)).toBe(plaintext);
        });

        it('should handle emoji and multibyte characters', () => {
            const plaintext = 'Hello from Tokyo: \u6771\u4EAC \uD83C\uDDEF\uD83C\uDDF5 \uD83C\uDF38';
            const encrypted = encryptField(plaintext);
            expect(decryptField(encrypted)).toBe(plaintext);
        });

        it('should handle a long string (10KB)', () => {
            const plaintext = 'A'.repeat(10_000);
            const encrypted = encryptField(plaintext);
            expect(decryptField(encrypted)).toBe(plaintext);
        });

        it('should handle JSON content', () => {
            const json = JSON.stringify({ api_key: 'sk-12345', nested: { deep: true } });
            const encrypted = encryptField(json);
            expect(JSON.parse(decryptField(encrypted))).toEqual({
                api_key: 'sk-12345',
                nested: { deep: true },
            });
        });

        it('should handle newlines and special whitespace', () => {
            const plaintext = 'line1\nline2\ttab\r\nwindows';
            const encrypted = encryptField(plaintext);
            expect(decryptField(encrypted)).toBe(plaintext);
        });
    });

    describe('tampering detection', () => {
        it('should fail when ciphertext is modified', () => {
            const encrypted = encryptField('sensitive data');
            // Flip a character in the base64 payload (after the prefix)
            const prefix = 'enc::';
            const payload = encrypted.slice(prefix.length);
            const chars = payload.split('');
            // Modify a character in the middle of the payload
            const midpoint = Math.floor(chars.length / 2);
            chars[midpoint] = chars[midpoint] === 'A' ? 'B' : 'A';
            const tampered = prefix + chars.join('');

            expect(() => decryptField(tampered)).toThrow();
        });

        it('should fail when auth tag is zeroed out', () => {
            const encrypted = encryptField('auth tag test');
            const raw = encrypted.slice('enc::'.length);
            const packed = Buffer.from(raw, 'base64');

            // Zero out the auth tag (bytes 16-28)
            for (let i = 16; i < 28; i++) {
                packed[i] = 0;
            }

            const tampered = 'enc::' + packed.toString('base64');
            expect(() => decryptField(tampered)).toThrow();
        });

        it('should fail when decrypted with a different key', () => {
            const encrypted = encryptField('wrong key test');
            process.env.ENCRYPTION_KEY = ALT_KEY;
            expect(() => decryptField(encrypted)).toThrow();
        });

        it('should fail when prefix is missing', () => {
            expect(() => decryptField('not-encrypted-value')).toThrow('missing prefix');
        });

        it('should fail when payload is too short', () => {
            expect(() => decryptField('enc::dG9vc2hvcnQ=')).toThrow('too short');
        });
    });

    describe('isEncrypted', () => {
        it('should return true for encrypted values', () => {
            const encrypted = encryptField('check me');
            expect(isEncrypted(encrypted)).toBe(true);
        });

        it('should return false for plain strings', () => {
            expect(isEncrypted('just a normal string')).toBe(false);
        });

        it('should return false for strings with the prefix but invalid base64', () => {
            expect(isEncrypted('enc::not-valid')).toBe(false);
        });

        it('should return false for strings with the prefix but payload too short', () => {
            expect(isEncrypted('enc::dG9vc2hvcnQ=')).toBe(false);
        });

        it('should return false for an empty string', () => {
            expect(isEncrypted('')).toBe(false);
        });
    });

    describe('key rotation', () => {
        it('should re-encrypt from old key to new key', () => {
            const plaintext = 'rotate me';
            const encrypted = encryptField(plaintext);

            const rotated = rotateEncryption(TEST_KEY, ALT_KEY, encrypted);

            // Old key should no longer decrypt
            process.env.ENCRYPTION_KEY = TEST_KEY;
            expect(() => decryptField(rotated)).toThrow();

            // New key should decrypt successfully
            process.env.ENCRYPTION_KEY = ALT_KEY;
            expect(decryptField(rotated)).toBe(plaintext);
        });

        it('should produce a valid encrypted value after rotation', () => {
            const encrypted = encryptField('rotation check');
            const rotated = rotateEncryption(TEST_KEY, ALT_KEY, encrypted);
            expect(isEncrypted(rotated)).toBe(true);
        });

        it('should fail rotation with wrong old key', () => {
            const encrypted = encryptField('wrong old key');
            expect(() => rotateEncryption('wrong-key', ALT_KEY, encrypted)).toThrow();
        });
    });

    describe('missing ENCRYPTION_KEY', () => {
        it('should throw when ENCRYPTION_KEY is not set', () => {
            delete process.env.ENCRYPTION_KEY;
            expect(() => encryptField('no key')).toThrow('ENCRYPTION_KEY');
        });
    });
});
