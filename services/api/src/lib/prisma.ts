/**
 * Prisma Client with Field Encryption Extension
 *
 * Re-exports the Prisma client from @aspendos/db, extended with
 * automatic field encryption for sensitive Account model fields
 * (accessToken, refreshToken, idToken).
 */
import { prisma as basePrisma } from '@aspendos/db';
import { decryptField, encryptField, isEncrypted } from './field-encryption';

const ENCRYPTED_FIELDS = ['accessToken', 'refreshToken', 'idToken'] as const;

function encryptionEnabled(): boolean {
    return !!process.env.ENCRYPTION_KEY;
}

/**
 * Encrypt sensitive fields before writing to the Account table.
 */
function encryptAccountFields(data: Record<string, unknown>): Record<string, unknown> {
    if (!encryptionEnabled()) return data;
    const result = { ...data };
    for (const field of ENCRYPTED_FIELDS) {
        const value = result[field];
        if (typeof value === 'string' && value.length > 0 && !isEncrypted(value)) {
            result[field] = encryptField(value);
        }
    }
    return result;
}

/**
 * Decrypt sensitive fields after reading from the Account table.
 */
function decryptAccountFields<T>(record: T): T {
    if (!encryptionEnabled() || !record || typeof record !== 'object') return record;
    const obj = record as Record<string, unknown>;
    for (const field of ENCRYPTED_FIELDS) {
        const value = obj[field];
        if (typeof value === 'string' && isEncrypted(value)) {
            try {
                obj[field] = decryptField(value);
            } catch {
                // If decryption fails, leave as-is (may be rotated key)
            }
        }
    }
    return record;
}

function decryptAccountResults<T>(result: T): T {
    if (Array.isArray(result)) {
        return result.map(decryptAccountFields) as T;
    }
    return decryptAccountFields(result);
}

export const prisma = basePrisma.$extends({
    query: {
        account: {
            async create({ args, query }) {
                if (args.data) {
                    args.data = encryptAccountFields(args.data as Record<string, unknown>) as typeof args.data;
                }
                const result = await query(args);
                return decryptAccountResults(result);
            },
            async update({ args, query }) {
                if (args.data) {
                    args.data = encryptAccountFields(args.data as Record<string, unknown>) as typeof args.data;
                }
                const result = await query(args);
                return decryptAccountResults(result);
            },
            async upsert({ args, query }) {
                if (args.create) {
                    args.create = encryptAccountFields(args.create as Record<string, unknown>) as typeof args.create;
                }
                if (args.update) {
                    args.update = encryptAccountFields(args.update as Record<string, unknown>) as typeof args.update;
                }
                const result = await query(args);
                return decryptAccountResults(result);
            },
            async findUnique({ args, query }) {
                const result = await query(args);
                return decryptAccountResults(result);
            },
            async findFirst({ args, query }) {
                const result = await query(args);
                return decryptAccountResults(result);
            },
            async findMany({ args, query }) {
                const result = await query(args);
                return decryptAccountResults(result);
            },
        },
    },
});
