/**
 * Distributed Tracing Middleware
 * Implements W3C Trace Context and OpenTelemetry-compatible tracing
 *
 * Features:
 * - Automatic trace ID generation per request
 * - W3C Trace Context propagation (traceparent, tracestate)
 * - Span creation for HTTP, DB, AI, Memory operations
 * - In-memory ring buffer for recent traces (last 1000)
 * - OpenTelemetry-compatible export format
 */

import type { Context, Next } from 'hono';
import { nanoid } from 'nanoid';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SpanKind = 'http' | 'db' | 'ai' | 'memory' | 'external';

export interface Span {
    spanId: string;
    traceId: string;
    parentSpanId?: string;
    name: string;
    kind: SpanKind;
    startTime: number;
    endTime?: number;
    duration?: number;
    status: 'ok' | 'error';
    attributes: Record<string, string | number | boolean>;
    events: SpanEvent[];
}

export interface SpanEvent {
    timestamp: number;
    name: string;
    attributes?: Record<string, string | number | boolean>;
}

export interface Trace {
    traceId: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    status: 'ok' | 'error';
    method: string;
    path: string;
    statusCode?: number;
    userId?: string;
    requestId: string;
    spans: Span[];
}

interface W3CTraceParent {
    version: string;
    traceId: string;
    parentId: string;
    flags: string;
}

// ─── Trace Storage (Ring Buffer) ──────────────────────────────────────────────

const MAX_TRACES = 1000;
const traces: Trace[] = [];
const traceIndex = new Map<string, number>();

/**
 * Add a trace to the ring buffer
 */
function addTrace(trace: Trace): void {
    if (traces.length >= MAX_TRACES) {
        const removed = traces.shift();
        if (removed) {
            traceIndex.delete(removed.traceId);
        }
    }
    traces.push(trace);
    traceIndex.set(trace.traceId, traces.length - 1);
}

/**
 * Get a trace by ID
 */
export function getTrace(traceId: string): Trace | undefined {
    const idx = traceIndex.get(traceId);
    return idx !== undefined ? traces[idx] : undefined;
}

/**
 * Get all traces (with optional filtering)
 */
export function getTraces(options?: {
    status?: 'ok' | 'error';
    path?: string;
    minDuration?: number;
    limit?: number;
    offset?: number;
}): Trace[] {
    let filtered = [...traces];

    // Filter by status
    if (options?.status) {
        filtered = filtered.filter((t) => t.status === options.status);
    }

    // Filter by path (exact match or starts with)
    if (options?.path) {
        const path = options.path;
        filtered = filtered.filter(
            (t) => t.path === path || t.path.startsWith(path)
        );
    }

    // Filter by minimum duration
    if (options?.minDuration !== undefined) {
        filtered = filtered.filter((t) => (t.duration || 0) >= options.minDuration!);
    }

    // Sort by start time (newest first)
    filtered.sort((a, b) => b.startTime - a.startTime);

    // Paginate
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;
    return filtered.slice(offset, offset + limit);
}

/**
 * Get trace statistics
 */
export function getTraceStats() {
    const now = Date.now();
    const last5Min = traces.filter((t) => now - t.startTime < 5 * 60 * 1000);
    const last1Hour = traces.filter((t) => now - t.startTime < 60 * 60 * 1000);

    const errorCount = traces.filter((t) => t.status === 'error').length;
    const durations = traces.filter((t) => t.duration).map((t) => t.duration!);
    const avgDuration =
        durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const p95Duration =
        durations.length > 0
            ? durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)]
            : 0;

    return {
        total: traces.length,
        last5Min: last5Min.length,
        last1Hour: last1Hour.length,
        errorCount,
        errorRate: traces.length > 0 ? errorCount / traces.length : 0,
        avgDurationMs: Math.round(avgDuration),
        p95DurationMs: Math.round(p95Duration),
        oldestTraceAge: traces.length > 0 ? now - traces[0].startTime : 0,
    };
}

// ─── W3C Trace Context Parsing ────────────────────────────────────────────────

/**
 * Parse W3C traceparent header
 * Format: version-traceId-parentId-flags
 * Example: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
 */
function parseTraceParent(header: string): W3CTraceParent | null {
    const parts = header.split('-');
    if (parts.length !== 4) return null;

    const [version, traceId, parentId, flags] = parts;

    // Validate version (must be 00)
    if (version !== '00') return null;

    // Validate traceId (32 hex chars, not all zeros)
    if (!/^[0-9a-f]{32}$/i.test(traceId) || traceId === '00000000000000000000000000000000') {
        return null;
    }

    // Validate parentId (16 hex chars, not all zeros)
    if (!/^[0-9a-f]{16}$/i.test(parentId) || parentId === '0000000000000000') {
        return null;
    }

    // Validate flags (2 hex chars)
    if (!/^[0-9a-f]{2}$/i.test(flags)) return null;

    return { version, traceId, parentId, flags };
}

/**
 * Generate a W3C-compatible trace ID (32 hex chars)
 */
function generateTraceId(): string {
    return nanoid(32)
        .replace(/[^0-9a-f]/gi, '0')
        .toLowerCase();
}

/**
 * Generate a span ID (16 hex chars)
 */
function generateSpanId(): string {
    return nanoid(16)
        .replace(/[^0-9a-f]/gi, '0')
        .toLowerCase();
}

// ─── Tracing Middleware ───────────────────────────────────────────────────────

export function tracingMiddleware() {
    return async (c: Context, next: Next) => {
        // Extract or generate trace ID
        let traceId: string;
        let parentSpanId: string | undefined;

        // Try W3C traceparent header first
        const traceparent = c.req.header('traceparent');
        if (traceparent) {
            const parsed = parseTraceParent(traceparent);
            if (parsed) {
                traceId = parsed.traceId;
                parentSpanId = parsed.parentId;
            } else {
                traceId = generateTraceId();
            }
        } else {
            // Try X-Trace-Id header
            const xTraceId = c.req.header('x-trace-id');
            if (xTraceId && /^[0-9a-f]{32}$/i.test(xTraceId)) {
                traceId = xTraceId.toLowerCase();
            } else {
                traceId = generateTraceId();
            }
        }

        // Get or generate request ID
        const requestId = c.get('requestId') || crypto.randomUUID();
        if (!c.get('requestId')) {
            c.set('requestId', requestId);
        }

        // Create root HTTP span
        const httpSpan: Span = {
            spanId: generateSpanId(),
            traceId,
            parentSpanId,
            name: `${c.req.method} ${c.req.path}`,
            kind: 'http',
            startTime: Date.now(),
            status: 'ok',
            attributes: {
                'http.method': c.req.method,
                'http.url': c.req.path,
                'http.user_agent': c.req.header('user-agent') || 'unknown',
            },
            events: [],
        };

        // Create trace object
        const trace: Trace = {
            traceId,
            startTime: Date.now(),
            status: 'ok',
            method: c.req.method,
            path: c.req.path,
            requestId,
            spans: [httpSpan],
        };

        // Store in context
        c.set('traceId', traceId);
        c.set('spanId', httpSpan.spanId);
        c.set('rootSpan', httpSpan);
        c.set('trace', trace);

        // Set trace headers in response
        c.header('X-Trace-Id', traceId);
        c.header('X-Span-Id', httpSpan.spanId);

        let hadError = false;
        try {
            await next();
        } catch (error) {
            hadError = true;
            // Mark as error
            httpSpan.status = 'error';
            trace.status = 'error';
            httpSpan.attributes['error'] = true;
            httpSpan.attributes['error.message'] =
                error instanceof Error ? error.message : 'Unknown error';

            // Add error event
            httpSpan.events.push({
                timestamp: Date.now(),
                name: 'exception',
                attributes: {
                    'exception.type': error instanceof Error ? error.constructor.name : 'Error',
                    'exception.message': error instanceof Error ? error.message : String(error),
                },
            });

            throw error;
        } finally {
            // Check if error was handled by onError middleware (status >= 400)
            if (!hadError && c.res.status >= 400) {
                httpSpan.status = 'error';
                trace.status = 'error';
                httpSpan.attributes['error'] = true;
            } else if (!hadError) {
                // Mark as successful
                httpSpan.status = 'ok';
                trace.status = 'ok';
            }

            httpSpan.attributes['http.status_code'] = c.res.status;
            trace.statusCode = c.res.status;

            // Capture user ID if available
            const userId = c.get('userId');
            if (userId) {
                httpSpan.attributes['user.id'] = userId;
                trace.userId = userId;
            }

            // Finalize span
            httpSpan.endTime = Date.now();
            httpSpan.duration = httpSpan.endTime - httpSpan.startTime;

            // Finalize trace
            trace.endTime = Date.now();
            trace.duration = trace.endTime - trace.startTime;

            // Store trace in ring buffer
            addTrace(trace);
        }
    };
}

// ─── Span Creation Helpers ────────────────────────────────────────────────────

/**
 * Create a child span for tracking sub-operations
 * The span is automatically added to the trace when endSpan() is called
 */
export function createSpan(
    c: Context,
    name: string,
    kind: SpanKind,
    attributes?: Record<string, string | number | boolean>
): Span {
    const traceId = c.get('traceId') || generateTraceId();
    const parentSpanId = c.get('spanId');
    const trace = c.get('trace') as Trace | undefined;

    const span: Span = {
        spanId: generateSpanId(),
        traceId,
        parentSpanId,
        name,
        kind,
        startTime: Date.now(),
        status: 'ok',
        attributes: attributes || {},
        events: [],
    };

    // Store reference to trace in span for later access
    (span as any)._trace = trace;

    return span;
}

/**
 * End a span and add it to the trace
 */
export function endSpan(span: Span, status: 'ok' | 'error' = 'ok', error?: Error): void {
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    if (error) {
        span.attributes['error'] = true;
        span.attributes['error.message'] = error.message;
        span.events.push({
            timestamp: Date.now(),
            name: 'exception',
            attributes: {
                'exception.type': error.constructor.name,
                'exception.message': error.message,
            },
        });
    }

    // Add span to the trace
    const trace = (span as any)._trace as Trace | undefined;
    if (trace && !trace.spans.includes(span)) {
        trace.spans.push(span);
    }

    // Clean up internal reference
    delete (span as any)._trace;
}

/**
 * Add an event to a span
 */
export function addSpanEvent(
    span: Span,
    name: string,
    attributes?: Record<string, string | number | boolean>
): void {
    span.events.push({
        timestamp: Date.now(),
        name,
        attributes,
    });
}

// ─── OpenTelemetry Export Format ──────────────────────────────────────────────

/**
 * Export traces in OpenTelemetry format
 */
export function exportTracesOTLP(traceIds?: string[]) {
    const tracesToExport = traceIds
        ? traceIds.map((id) => getTrace(id)).filter((t): t is Trace => t !== undefined)
        : traces;

    return {
        resourceSpans: tracesToExport.map((trace) => ({
            resource: {
                attributes: [
                    { key: 'service.name', value: { stringValue: 'yula-api' } },
                    { key: 'service.version', value: { stringValue: '1.0.0' } },
                ],
            },
            scopeSpans: [
                {
                    scope: {
                        name: 'yula-tracing',
                        version: '1.0.0',
                    },
                    spans: trace.spans.map((span) => ({
                        traceId: span.traceId,
                        spanId: span.spanId,
                        parentSpanId: span.parentSpanId,
                        name: span.name,
                        kind: span.kind.toUpperCase(),
                        startTimeUnixNano: span.startTime * 1_000_000,
                        endTimeUnixNano: span.endTime ? span.endTime * 1_000_000 : undefined,
                        attributes: Object.entries(span.attributes).map(([key, value]) => ({
                            key,
                            value:
                                typeof value === 'string'
                                    ? { stringValue: value }
                                    : typeof value === 'number'
                                      ? { intValue: value }
                                      : { boolValue: value },
                        })),
                        events: span.events.map((event) => ({
                            timeUnixNano: event.timestamp * 1_000_000,
                            name: event.name,
                            attributes: event.attributes
                                ? Object.entries(event.attributes).map(([key, value]) => ({
                                      key,
                                      value:
                                          typeof value === 'string'
                                              ? { stringValue: value }
                                              : typeof value === 'number'
                                                ? { intValue: value }
                                                : { boolValue: value },
                                  }))
                                : [],
                        })),
                        status: {
                            code: span.status === 'ok' ? 'STATUS_CODE_OK' : 'STATUS_CODE_ERROR',
                        },
                    })),
                },
            ],
        })),
    };
}

export default tracingMiddleware;
