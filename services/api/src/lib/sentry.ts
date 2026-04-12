/**
 * Sentry no-op shim — Phase A Day 0 (Tier 1.1 cleanup)
 *
 * @sentry/node was removed because @sentry/nextjs blocked Next.js 16 upgrade
 * via OpenTelemetry version conflicts. This shim preserves the public API
 * surface so call sites in services/api/src/index.ts don't break, but every
 * function is a no-op.
 *
 * Day 14 task 14.6 will swap this shim back to a real implementation IF
 * @sentry/nextjs@10.45.0+ proves Next 16 compatible without the postinstall
 * symlink hack. Otherwise we use Vercel native logs + PostHog error tracking.
 *
 * Removed in commit: <to-be-set-on-day-0-commit>
 * Tracked in plan: docs at ~/.claude/plans/golden-spinning-stallman.md
 */

// Sentry namespace surface — minimal subset matching prior @sentry/node usage
export const Sentry = {
    init: (_config: unknown) => {},
    captureException: (_err: unknown, _ctx?: unknown) => {},
    captureMessage: (_msg: string, _level?: string) => {},
    setUser: (_user: unknown) => {},
    setTag: (_key: string, _value: string) => {},
    setContext: (_name: string, _ctx: unknown) => {},
    addBreadcrumb: (_crumb: unknown) => {},
    startSpan: <T>(_opts: unknown, fn: () => T): T => fn(),
    httpIntegration: () => ({}),
    captureConsoleIntegration: (_opts?: unknown) => ({}),
};

export function initSentry() {
    // no-op: Sentry removed in Phase A Day 0 (Tier 1.1)
}

export function setSentryUserContext(_userId: string, _tier?: string) {
    // no-op
}

export function setSentryRequestContext(_requestId: string, _path: string, _method: string) {
    // no-op
}
