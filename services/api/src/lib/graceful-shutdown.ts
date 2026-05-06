/**
 * Graceful Shutdown Handler
 *
 * Tracks in-flight requests and ensures clean shutdown with:
 * - Request tracking via middleware
 * - Draining mode (503 for new requests)
 * - Timeout for in-flight request completion
 * - Database connection cleanup
 * - SSE stream cleanup
 * - Signal handler registration
 */

import type { Context, Next } from 'hono';
import { prisma } from './prisma';

type ServerStatus = 'running' | 'draining' | 'stopped';

interface ShutdownState {
    status: ServerStatus;
    inFlightRequests: number;
    startTime: number;
    drainingStartTime: number | null;
    sseStreams: Set<ReadableStreamDefaultController>;
}

const state: ShutdownState = {
    status: 'running',
    inFlightRequests: 0,
    startTime: Date.now(),
    drainingStartTime: null,
    sseStreams: new Set(),
};

/**
 * Middleware to check draining state and reject new requests during shutdown
 */
export function shutdownMiddleware() {
    return async (c: Context, next: Next) => {
        if (state.status === 'draining') {
            c.header('Retry-After', '60'); // Suggest retry in 60 seconds
            return c.json(
                {
                    error: 'Server is shutting down',
                    code: 'SERVICE_UNAVAILABLE',
                    retryAfter: 60,
                },
                503
            );
        }

        if (state.status === 'stopped') {
            return c.json(
                {
                    error: 'Server is stopped',
                    code: 'SERVICE_UNAVAILABLE',
                },
                503
            );
        }

        // Track in-flight request
        state.inFlightRequests++;
        try {
            await next();
        } finally {
            state.inFlightRequests--;
        }
    };
}

/**
 * Get current server status
 */
export function getServerStatus() {
    return {
        status: state.status,
        inFlightRequests: state.inFlightRequests,
        uptime: Date.now() - state.startTime,
        drainingDuration: state.drainingStartTime ? Date.now() - state.drainingStartTime : null,
        sseStreamCount: state.sseStreams.size,
    };
}

/**
 * Register an SSE stream for cleanup during shutdown
 */
export function registerSSEStream(controller: ReadableStreamDefaultController) {
    state.sseStreams.add(controller);
}

/**
 * Unregister an SSE stream (when it closes naturally)
 */
export function unregisterSSEStream(controller: ReadableStreamDefaultController) {
    state.sseStreams.delete(controller);
}

/**
 * Close all active SSE streams
 */
async function closeSSEStreams() {
    console.log(`[Shutdown] Closing ${state.sseStreams.size} SSE streams...`);
    for (const controller of state.sseStreams) {
        try {
            controller.close();
        } catch (error) {
            console.error('[Shutdown] Error closing SSE stream:', error);
        }
    }
    state.sseStreams.clear();
}

/**
 * Wait for in-flight requests to complete with timeout
 */
async function waitForInFlightRequests(timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 100; // Check every 100ms

    while (state.inFlightRequests > 0) {
        const elapsed = Date.now() - startTime;
        if (elapsed >= timeoutMs) {
            console.warn(
                `[Shutdown] Timeout reached with ${state.inFlightRequests} requests still in-flight`
            );
            return false;
        }

        console.log(
            `[Shutdown] Waiting for ${state.inFlightRequests} in-flight requests... (${Math.round(elapsed / 1000)}s elapsed)`
        );
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    console.log('[Shutdown] All in-flight requests completed');
    return true;
}

/**
 * Graceful shutdown handler
 *
 * @param timeoutMs - Maximum time to wait for in-flight requests (default: 30000ms)
 * @returns Promise that resolves when shutdown is complete
 */
export async function shutdown(timeoutMs = 30000): Promise<void> {
    if (state.status !== 'running') {
        console.warn(`[Shutdown] Already ${state.status}, ignoring shutdown request`);
        return;
    }

    console.log('[Shutdown] Initiating graceful shutdown...');
    state.status = 'draining';
    state.drainingStartTime = Date.now();

    // Step 1: Close SSE streams immediately
    await closeSSEStreams();

    // Step 2: Wait for in-flight requests with timeout
    const completedInTime = await waitForInFlightRequests(timeoutMs);
    if (!completedInTime) {
        console.warn(
            `[Shutdown] Proceeding with shutdown despite ${state.inFlightRequests} in-flight requests`
        );
    }

    // Step 3: Close database connections
    try {
        console.log('[Shutdown] Closing database connections...');
        await prisma.$disconnect();
        console.log('[Shutdown] Database connections closed');
    } catch (error) {
        console.error('[Shutdown] Error closing database connections:', error);
    }

    state.status = 'stopped';
    console.log('[Shutdown] Graceful shutdown complete');
}

/**
 * Register signal handlers for graceful shutdown
 */
export function registerSignalHandlers(): void {
    const handleSignal = (signal: string) => {
        console.log(`[Shutdown] Received ${signal}, initiating graceful shutdown...`);
        shutdown()
            .then(() => {
                console.log('[Shutdown] Exiting process');
                process.exit(0);
            })
            .catch((error) => {
                console.error('[Shutdown] Error during shutdown:', error);
                process.exit(1);
            });
    };

    process.on('SIGTERM', () => handleSignal('SIGTERM'));
    process.on('SIGINT', () => handleSignal('SIGINT'));
}

/**
 * Reset state for testing purposes
 * @internal
 */
export function _forTestingReset(): void {
    state.status = 'running';
    state.inFlightRequests = 0;
    state.startTime = Date.now();
    state.drainingStartTime = null;
    state.sseStreams.clear();
}
