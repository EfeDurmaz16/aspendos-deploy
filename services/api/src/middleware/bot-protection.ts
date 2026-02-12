/**
 * Bot Protection Middleware
 *
 * Hono middleware that checks incoming requests for bot behavior using
 * User-Agent analysis and request pattern tracking. Blocks high-confidence
 * bots on API endpoints while allowing known good bots on public endpoints.
 *
 * Integrates with bot-detection tracker for analytics.
 */
import type { Context, Next } from 'hono';
import {
    type BotDetectionEvent,
    botDetectionTracker,
    getBotScore,
    isBotUserAgent,
    isGoodBot,
} from '../lib/bot-detection';

// ─── Request History Tracking (per IP) ───────────────────────────────────────

interface RequestRecord {
    timestamp: number;
    path: string;
}

const requestHistory = new Map<string, RequestRecord[]>();

/** Maximum request records to keep per IP */
const MAX_HISTORY_PER_IP = 50;

/** Time window to keep request history (5 minutes) */
const HISTORY_WINDOW_MS = 5 * 60 * 1000;

// Cleanup stale entries every 2 minutes
setInterval(() => {
    const cutoff = Date.now() - HISTORY_WINDOW_MS;
    for (const [key, records] of requestHistory.entries()) {
        const filtered = records.filter((r) => r.timestamp >= cutoff);
        if (filtered.length === 0) {
            requestHistory.delete(key);
        } else {
            requestHistory.set(key, filtered);
        }
    }
}, 2 * 60 * 1000);

// ─── Skip Paths ──────────────────────────────────────────────────────────────

/** Paths that skip bot protection entirely */
const SKIP_PATHS = new Set(['/health', '/status', '/ready', '/metrics']);

function shouldSkipPath(path: string): boolean {
    if (SKIP_PATHS.has(path)) return true;
    if (path.startsWith('/.well-known/')) return true;
    return false;
}

/** Paths considered "public" where good bots are allowed */
function isPublicEndpoint(path: string): boolean {
    return (
        path === '/health' ||
        path === '/status' ||
        path === '/ready' ||
        path === '/metrics' ||
        path.startsWith('/.well-known/') ||
        path.startsWith('/api/docs') ||
        path === '/api/models' ||
        path.startsWith('/api/models/') ||
        path === '/api/legal/terms' ||
        path === '/api/legal/privacy' ||
        path === '/api/changelog' ||
        path === '/api/errors'
    );
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/** Bot score threshold above which requests are blocked on API endpoints */
const BOT_BLOCK_THRESHOLD = 80;

/**
 * Bot protection middleware.
 *
 * - Blocks bots with score > 80 on API endpoints (returns 403).
 * - Allows known good bots (e.g. Googlebot) on public endpoints only.
 * - Tracks all bot detections in memory for analytics.
 * - Skips /health, /status, /ready, /metrics, /.well-known/*.
 */
export function botProtection() {
    return async (c: Context, next: Next) => {
        const path = c.req.path;

        // Skip bot protection for infrastructure endpoints
        if (shouldSkipPath(path)) {
            await next();
            return;
        }

        const ua = c.req.header('user-agent') || '';
        const ip =
            c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
            c.req.header('cf-connecting-ip') ||
            'unknown';

        // Track request for pattern analysis
        const now = Date.now();
        let history = requestHistory.get(ip);
        if (!history) {
            history = [];
            requestHistory.set(ip, history);
        }
        history.push({ timestamp: now, path });

        // Trim old entries and cap size
        const cutoff = now - HISTORY_WINDOW_MS;
        const trimmed = history.filter((r) => r.timestamp >= cutoff);
        if (trimmed.length > MAX_HISTORY_PER_IP) {
            trimmed.splice(0, trimmed.length - MAX_HISTORY_PER_IP);
        }
        requestHistory.set(ip, trimmed);

        // Analyze User-Agent
        const uaResult = isBotUserAgent(ua);

        // If no bot signal from UA and not enough history for pattern analysis, skip
        if (!uaResult.isBot && trimmed.length < 5) {
            await next();
            return;
        }

        // Calculate bot score with request pattern when we have enough history
        const patternInput = trimmed.length >= 5 ? trimmed : undefined;
        const score = getBotScore(ua, patternInput);

        // If score is below threshold, allow through
        if (score < BOT_BLOCK_THRESHOLD) {
            // Still record detections for analytics if bot-like at all
            if (uaResult.isBot || score > 30) {
                const event: BotDetectionEvent = {
                    ip,
                    userAgent: ua.slice(0, 200), // Truncate long UAs
                    botType: uaResult.botType || 'pattern-suspect',
                    score,
                    path,
                    timestamp: now,
                    blocked: false,
                };
                botDetectionTracker.record(event);
            }

            await next();
            return;
        }

        // Score is above threshold - check if it's a good bot on a public endpoint
        if (uaResult.isBot && uaResult.botType && isGoodBot(uaResult.botType) && isPublicEndpoint(path)) {
            // Allow good bots on public endpoints, but track
            const event: BotDetectionEvent = {
                ip,
                userAgent: ua.slice(0, 200),
                botType: uaResult.botType,
                score,
                path,
                timestamp: now,
                blocked: false,
            };
            botDetectionTracker.record(event);

            await next();
            return;
        }

        // Block the request
        const event: BotDetectionEvent = {
            ip,
            userAgent: ua.slice(0, 200),
            botType: uaResult.botType || 'pattern-detected',
            score,
            path,
            timestamp: now,
            blocked: true,
        };
        botDetectionTracker.record(event);

        return c.json(
            {
                error: 'Bot detected',
                code: 'BOT_DETECTED',
            },
            403
        );
    };
}

// ─── Exports for Testing / Analytics ─────────────────────────────────────────

/** Get bot detection statistics for analytics dashboard */
export function getBotDetectionStats() {
    return botDetectionTracker.getStats();
}

/** Get recent bot detection events */
export function getRecentBotDetections(limit?: number) {
    return botDetectionTracker.getRecentDetections(limit);
}

/** Clear request history and detection events (for testing) */
export function clearBotProtection_forTesting() {
    requestHistory.clear();
    botDetectionTracker.clear();
}

export default botProtection;
