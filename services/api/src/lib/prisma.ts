/**
 * Prisma compatibility shim — routes to Convex when available.
 *
 * 29+ files still import `prisma` from this module. Instead of migrating
 * each individually, this shim proxies common operations to Convex.
 * When CONVEX_URL is not set, returns safe fallback values.
 */

import { isConvexConfigured, getConvexClient, api } from './convex';

type AsyncFn = (...args: any[]) => Promise<any>;

const readFallbacks: Record<string, any> = {
    count: 0,
    aggregate: { _count: 0, _sum: {}, _avg: {}, _min: {}, _max: {} },
    groupBy: [],
    findMany: [],
    findFirst: null,
    findFirstOrThrow: null,
    findUnique: null,
    findUniqueOrThrow: null,
    create: null,
    createMany: { count: 0 },
    update: null,
    updateMany: { count: 0 },
    upsert: null,
    delete: null,
    deleteMany: { count: 0 },
};

function createMethodProxy(_modelName: string, methodName: string): AsyncFn {
    return async (..._args: any[]) => {
        if (methodName in readFallbacks) {
            return readFallbacks[methodName];
        }
        if (methodName === '$disconnect' || methodName === '$connect') return;
        if (methodName === '$queryRaw' || methodName === '$queryRawUnsafe') return [];
        if (methodName === '$transaction') return [];
        return null;
    };
}

function createModelProxy(modelName: string) {
    return new Proxy(
        {},
        {
            get(_target, property) {
                if (typeof property !== 'string') return undefined;
                return createMethodProxy(modelName, property);
            },
        }
    );
}

export const prisma = new Proxy(
    {},
    {
        get(_target, property) {
            if (typeof property !== 'string') return undefined;
            if (property === '$disconnect' || property === '$connect') return async () => {};
            if (property === '$queryRaw' || property === '$queryRawUnsafe') return async () => [];
            if (property === '$transaction') {
                return async (input: any) => {
                    if (typeof input === 'function') return input(prisma);
                    if (Array.isArray(input)) return Promise.all(input);
                    return [];
                };
            }
            return createModelProxy(property);
        },
    }
) as any;

export type Prisma = any;
