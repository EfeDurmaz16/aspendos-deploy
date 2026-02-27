import { PrismaClient } from '@prisma/client';

/**
 * Connection Pool Configuration (via DATABASE_URL query parameters)
 *
 * Prisma manages its own connection pool. Tune it by appending query parameters
 * to your DATABASE_URL. Do NOT modify the URL at runtime; set it in your
 * environment or .env file.
 *
 * Recommended production DATABASE_URL parameters:
 *
 *   ?connection_limit=20         Max connections in the pool (default: num_cpus * 2 + 1)
 *   &pool_timeout=10             Seconds to wait for a free connection before erroring (default: 10)
 *   &connect_timeout=5           Seconds to wait when opening a new connection (default: 5)
 *   &socket_timeout=30           Seconds before an idle connection is closed (default: platform-dependent)
 *   &statement_cache_size=100    Number of prepared statements cached per connection (default: 100)
 *   &pgbouncer=true              Enable PgBouncer compatibility mode (disables prepared statements)
 *
 * Example:
 *   DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10&connect_timeout=5"
 *
 * For Railway/Supabase with PgBouncer:
 *   DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=20"
 */

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'production'
            ? ['error', 'warn']
            : ['query', 'error', 'warn'],
        datasourceUrl: process.env.DATABASE_URL,
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Log connection pool configuration on startup
{
    const dbUrl = process.env.DATABASE_URL || '';
    const params = new URL(dbUrl.startsWith('postgresql') ? dbUrl : 'postgresql://x@x/x').searchParams;
    const poolConfig = {
        connection_limit: params.get('connection_limit') || 'default',
        pool_timeout: params.get('pool_timeout') || 'default',
        pgbouncer: params.get('pgbouncer') || 'false',
    };
    console.log('[DB] Pool config:', JSON.stringify(poolConfig));
}

// ---------------------------------------------------------------------------
// Initial Connection with Retry
// ---------------------------------------------------------------------------

const CONNECT_MAX_RETRIES = 5;
const CONNECT_BASE_DELAY_MS = 500;
const CONNECT_MAX_DELAY_MS = 10_000;

function connectDelay(attempt: number): number {
    const exponential = CONNECT_BASE_DELAY_MS * Math.pow(2, attempt);
    const jitter = Math.random() * exponential * 0.3;
    return Math.min(exponential + jitter, CONNECT_MAX_DELAY_MS);
}

/**
 * Establish the initial database connection with retry logic.
 *
 * Retries up to 5 times with exponential backoff + jitter. Call this
 * during server startup to fail fast if the database is unreachable.
 *
 * @throws Error if all connection attempts are exhausted
 */
export async function connectWithRetry(): Promise<void> {
    for (let attempt = 0; attempt <= CONNECT_MAX_RETRIES; attempt++) {
        try {
            await prisma.$connect();
            if (attempt > 0) {
                console.info(`[DB] Connected after ${attempt + 1} attempt(s)`);
            }
            return;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            if (attempt === CONNECT_MAX_RETRIES) {
                console.error(
                    `[DB] Failed to connect after ${CONNECT_MAX_RETRIES + 1} attempts: ${message}`
                );
                throw error;
            }

            const delay = connectDelay(attempt);
            console.warn(
                `[DB] Connection attempt ${attempt + 1}/${CONNECT_MAX_RETRIES + 1} failed: ${message}. Retrying in ${Math.round(delay)}ms...`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}

// ---------------------------------------------------------------------------
// Graceful Shutdown
// ---------------------------------------------------------------------------

let isDisconnecting = false;

/**
 * Gracefully disconnect Prisma client.
 * Call during server shutdown to release connection pool.
 * Safe to call multiple times -- only the first invocation disconnects.
 */
export async function disconnectDb(): Promise<void> {
    if (isDisconnecting) return;
    isDisconnecting = true;

    try {
        await prisma.$disconnect();
    } catch (error) {
        console.error('[DB] Error during disconnect:', error);
        throw error;
    }
}

/**
 * Register process signal handlers for graceful database shutdown.
 * Automatically called when this module is first imported in a non-test
 * environment.
 */
export function registerShutdownHandlers(): void {
    const handler = async () => {
        console.info('[DB] Received shutdown signal, disconnecting...');
        await disconnectDb();
    };

    process.on('SIGINT', handler);
    process.on('SIGTERM', handler);
}

// Auto-register in non-test environments
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
    registerShutdownHandlers();
}

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

const HEALTH_CHECK_TIMEOUT_MS = 5_000;

export interface DatabaseHealthResult {
    healthy: boolean;
    latencyMs: number;
    error?: string;
}

/**
 * Run a lightweight health check against the database.
 *
 * Executes `SELECT 1` with a configurable timeout. Suitable for
 * readiness probes and periodic health monitoring.
 *
 * @param timeoutMs - Maximum time to wait for the query (default: 5000ms)
 * @returns Health result with latency and status
 */
export async function checkDatabaseHealth(
    timeoutMs: number = HEALTH_CHECK_TIMEOUT_MS
): Promise<DatabaseHealthResult> {
    const start = Date.now();

    try {
        const result = await Promise.race([
            prisma.$queryRaw`SELECT 1`,
            new Promise<never>((_, reject) =>
                setTimeout(
                    () => reject(new Error(`Health check timed out after ${timeoutMs}ms`)),
                    timeoutMs
                )
            ),
        ]);

        // Verify the query returned something sensible
        if (!result) {
            throw new Error('Health check query returned empty result');
        }

        return {
            healthy: true,
            latencyMs: Date.now() - start,
        };
    } catch (error) {
        return {
            healthy: false,
            latencyMs: Date.now() - start,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

export * from '@prisma/client';
