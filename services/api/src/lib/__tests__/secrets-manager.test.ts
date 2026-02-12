import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearAccessLog,
    containsSecrets,
    getAccessLog,
    getSecret,
    getSecretsHealth,
    markSecretRotated,
    redactSecrets,
    requireSecret,
    validateSecret,
} from '../secrets-manager';

describe('Secrets Manager', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        clearAccessLog();
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    describe('getSecret', () => {
        it('should return secret value from env', () => {
            process.env.DATABASE_URL = 'postgresql://test:pass@localhost/db';
            const value = getSecret('database_url', 'test');
            expect(value).toBe('postgresql://test:pass@localhost/db');
        });

        it('should return undefined for unset secret', () => {
            delete process.env.OPENAI_API_KEY;
            const value = getSecret('openai_api_key', 'test');
            expect(value).toBeUndefined();
        });

        it('should return undefined for unknown key', () => {
            const value = getSecret('nonexistent_key', 'test');
            expect(value).toBeUndefined();
        });

        it('should log access', () => {
            process.env.DATABASE_URL = 'postgresql://test:pass@localhost/db';
            getSecret('database_url', 'chat-service');

            const log = getAccessLog();
            expect(log.length).toBe(1);
            expect(log[0].key).toBe('database_url');
            expect(log[0].accessedBy).toBe('chat-service');
            expect(log[0].accessedAt).toBeLessThanOrEqual(Date.now());
        });
    });

    describe('requireSecret', () => {
        it('should return value when set', () => {
            process.env.BETTER_AUTH_SECRET = 'my-secret-key';
            const value = requireSecret('better_auth_secret', 'test');
            expect(value).toBe('my-secret-key');
        });

        it('should throw when required secret is not set', () => {
            delete process.env.BETTER_AUTH_SECRET;
            expect(() => requireSecret('better_auth_secret', 'test')).toThrow(
                'Required secret "better_auth_secret"'
            );
        });
    });

    describe('validateSecret', () => {
        it('should validate format for OpenAI key', () => {
            process.env.OPENAI_API_KEY = 'sk-abc123def456';
            expect(validateSecret('openai_api_key').isValid).toBe(true);
        });

        it('should reject invalid format for OpenAI key', () => {
            process.env.OPENAI_API_KEY = 'invalid-key';
            const result = validateSecret('openai_api_key');
            expect(result.isValid).toBe(false);
            expect(result.reason).toContain('does not match expected format');
        });

        it('should validate format for Anthropic key', () => {
            process.env.ANTHROPIC_API_KEY = 'sk-ant-abc123';
            expect(validateSecret('anthropic_api_key').isValid).toBe(true);
        });

        it('should validate format for Groq key', () => {
            process.env.GROQ_API_KEY = 'gsk_abc123';
            expect(validateSecret('groq_api_key').isValid).toBe(true);
        });

        it('should validate format for DATABASE_URL', () => {
            process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
            expect(validateSecret('database_url').isValid).toBe(true);
        });

        it('should accept optional unset secrets', () => {
            delete process.env.OPENAI_API_KEY;
            expect(validateSecret('openai_api_key').isValid).toBe(true);
        });

        it('should reject required unset secrets', () => {
            delete process.env.DATABASE_URL;
            const result = validateSecret('database_url');
            expect(result.isValid).toBe(false);
            expect(result.reason).toContain('is not set');
        });

        it('should reject unknown keys', () => {
            const result = validateSecret('unknown_key');
            expect(result.isValid).toBe(false);
            expect(result.reason).toContain('Unknown secret key');
        });
    });

    describe('getSecretsHealth', () => {
        it('should return health for all registered secrets', () => {
            const health = getSecretsHealth();
            expect(health.length).toBeGreaterThan(0);

            for (const entry of health) {
                expect(entry).toHaveProperty('key');
                expect(entry).toHaveProperty('isSet');
                expect(entry).toHaveProperty('isValid');
                expect(entry).toHaveProperty('accessCount');
                expect(entry).toHaveProperty('needsRotation');
                expect(entry).toHaveProperty('description');
            }
        });

        it('should track access counts', () => {
            process.env.DATABASE_URL = 'postgresql://test@localhost/db';
            getSecret('database_url', 'test1');
            getSecret('database_url', 'test2');
            getSecret('database_url', 'test3');

            const health = getSecretsHealth();
            const dbHealth = health.find((h) => h.key === 'database_url');
            expect(dbHealth?.accessCount).toBe(3);
        });
    });

    describe('markSecretRotated', () => {
        it('should update rotation timestamp', () => {
            markSecretRotated('better_auth_secret');

            const health = getSecretsHealth();
            const authHealth = health.find((h) => h.key === 'better_auth_secret');
            expect(authHealth?.needsRotation).toBe(false);
        });
    });

    describe('containsSecrets', () => {
        it('should detect secret values in text', () => {
            process.env.OPENAI_API_KEY = 'sk-abcdef123456789';
            expect(containsSecrets('My key is sk-abcdef123456789')).toBe(true);
        });

        it('should return false when no secrets present', () => {
            process.env.OPENAI_API_KEY = 'sk-abcdef123456789';
            expect(containsSecrets('No secrets here')).toBe(false);
        });

        it('should skip short secret values', () => {
            process.env.GROQ_API_KEY = 'short';
            expect(containsSecrets('Contains short text')).toBe(false);
        });
    });

    describe('redactSecrets', () => {
        it('should redact secret values from text', () => {
            process.env.OPENAI_API_KEY = 'sk-abcdef123456789';
            const result = redactSecrets('Key: sk-abcdef123456789');
            expect(result).toBe('Key: [REDACTED:openai_api_key]');
            expect(result).not.toContain('sk-abcdef123456789');
        });

        it('should redact multiple secrets', () => {
            process.env.OPENAI_API_KEY = 'sk-openai-key-value';
            process.env.ANTHROPIC_API_KEY = 'sk-ant-anthropic-key-value';
            const text = 'Keys: sk-openai-key-value and sk-ant-anthropic-key-value';
            const result = redactSecrets(text);
            expect(result).not.toContain('sk-openai-key-value');
            expect(result).not.toContain('sk-ant-anthropic-key-value');
        });

        it('should leave non-secret text unchanged', () => {
            const text = 'Normal log message with no secrets';
            expect(redactSecrets(text)).toBe(text);
        });
    });

    describe('getAccessLog', () => {
        it('should return recent access entries', () => {
            process.env.DATABASE_URL = 'postgresql://test@localhost/db';
            getSecret('database_url', 'service-a');
            getSecret('database_url', 'service-b');

            const log = getAccessLog();
            expect(log.length).toBe(2);
            expect(log[0].accessedBy).toBe('service-a');
            expect(log[1].accessedBy).toBe('service-b');
        });

        it('should respect limit parameter', () => {
            process.env.DATABASE_URL = 'postgresql://test@localhost/db';
            for (let i = 0; i < 10; i++) {
                getSecret('database_url', `service-${i}`);
            }

            const log = getAccessLog(3);
            expect(log.length).toBe(3);
        });

        it('should clear access log', () => {
            process.env.DATABASE_URL = 'postgresql://test@localhost/db';
            getSecret('database_url', 'test');
            expect(getAccessLog().length).toBe(1);

            clearAccessLog();
            expect(getAccessLog().length).toBe(0);
        });
    });
});
