/**
 * Prisma compatibility shim for web API routes.
 * Returns safe fallback values — routes will show empty data until
 * they're individually migrated to Convex queries.
 */

const readFallbacks: Record<string, any> = {
    count: 0,
    findMany: [],
    findFirst: null,
    findUnique: null,
    create: null,
    update: null,
    delete: null,
    deleteMany: { count: 0 },
    updateMany: { count: 0 },
    createMany: { count: 0 },
    aggregate: { _count: 0, _sum: {}, _avg: {}, _min: {}, _max: {} },
    groupBy: [],
};

function createModelProxy(_name: string) {
    return new Proxy({}, {
        get(_target, method) {
            if (typeof method !== 'string') return undefined;
            return async (..._args: any[]) => readFallbacks[method] ?? null;
        },
    });
}

export const prisma = new Proxy({}, {
    get(_target, prop) {
        if (typeof prop !== 'string') return undefined;
        if (prop === '$transaction') {
            return async (input: any) => {
                if (typeof input === 'function') return input(prisma);
                if (Array.isArray(input)) return Promise.all(input);
                return [];
            };
        }
        if (prop.startsWith('$')) return async () => {};
        return createModelProxy(prop);
    },
}) as any;
