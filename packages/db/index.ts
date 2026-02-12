import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
        datasourceUrl: process.env.DATABASE_URL,
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Gracefully disconnect Prisma client.
 * Call during server shutdown to release connection pool.
 */
export async function disconnectDb() {
    await prisma.$disconnect();
}

export * from '@prisma/client';
