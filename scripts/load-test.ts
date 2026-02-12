/**
 * YULA API Load Testing Script
 * Run with: bun run scripts/load-test.ts
 *
 * Tests API endpoints under load to identify bottlenecks and breaking points.
 * No external dependencies required - uses native fetch.
 */

const BASE_URL = process.env.API_URL || 'http://localhost:8080';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '10', 10);
const DURATION_MS = parseInt(process.env.DURATION || '30000', 10);
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

interface LoadTestResult {
    endpoint: string;
    method: string;
    totalRequests: number;
    successCount: number;
    errorCount: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    maxLatencyMs: number;
    minLatencyMs: number;
    requestsPerSecond: number;
    errorRate: number;
    statusCodes: Record<number, number>;
}

interface EndpointConfig {
    method: string;
    path: string;
    body?: unknown;
    headers?: Record<string, string>;
    requiresAuth: boolean;
}

const ENDPOINTS: EndpointConfig[] = [
    { method: 'GET', path: '/health', requiresAuth: false },
    { method: 'GET', path: '/ready', requiresAuth: false },
    { method: 'GET', path: '/api/models', requiresAuth: false },
    { method: 'GET', path: '/api/errors', requiresAuth: false },
    { method: 'GET', path: '/api/features/all', requiresAuth: false },
    { method: 'GET', path: '/api/changelog', requiresAuth: false },
    { method: 'GET', path: '/api/legal/terms', requiresAuth: false },
    { method: 'GET', path: '/api/webhooks/events', requiresAuth: false },
    ...(AUTH_TOKEN
        ? [
              { method: 'GET', path: '/api/chat', requiresAuth: true },
              { method: 'GET', path: '/api/memory', requiresAuth: true },
              { method: 'GET', path: '/api/features', requiresAuth: true },
              { method: 'GET', path: '/api/billing', requiresAuth: true },
              { method: 'GET', path: '/api/rate-limit', requiresAuth: true },
          ]
        : []),
];

function percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
}

async function runEndpointTest(config: EndpointConfig): Promise<LoadTestResult> {
    const latencies: number[] = [];
    const statusCodes: Record<number, number> = {};
    let successCount = 0;
    let errorCount = 0;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(config.requiresAuth && AUTH_TOKEN ? { Cookie: `better-auth.session_token=${AUTH_TOKEN}` } : {}),
        ...(config.headers || {}),
    };

    const startTime = Date.now();
    const workers: Promise<void>[] = [];

    for (let i = 0; i < CONCURRENCY; i++) {
        workers.push(
            (async () => {
                while (Date.now() - startTime < DURATION_MS) {
                    const reqStart = performance.now();
                    try {
                        const response = await fetch(`${BASE_URL}${config.path}`, {
                            method: config.method,
                            headers,
                            body: config.body ? JSON.stringify(config.body) : undefined,
                        });

                        const latency = performance.now() - reqStart;
                        latencies.push(latency);
                        statusCodes[response.status] = (statusCodes[response.status] || 0) + 1;

                        if (response.status >= 200 && response.status < 400) {
                            successCount++;
                        } else {
                            errorCount++;
                        }

                        // Consume body to free connection
                        await response.text();
                    } catch {
                        const latency = performance.now() - reqStart;
                        latencies.push(latency);
                        errorCount++;
                        statusCodes[0] = (statusCodes[0] || 0) + 1;
                    }
                }
            })()
        );
    }

    await Promise.all(workers);

    const sorted = latencies.sort((a, b) => a - b);
    const totalRequests = successCount + errorCount;
    const elapsedSeconds = (Date.now() - startTime) / 1000;

    return {
        endpoint: `${config.method} ${config.path}`,
        method: config.method,
        totalRequests,
        successCount,
        errorCount,
        avgLatencyMs: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
        p50LatencyMs: Math.round(percentile(sorted, 50)),
        p95LatencyMs: Math.round(percentile(sorted, 95)),
        p99LatencyMs: Math.round(percentile(sorted, 99)),
        maxLatencyMs: Math.round(sorted[sorted.length - 1] || 0),
        minLatencyMs: Math.round(sorted[0] || 0),
        requestsPerSecond: Math.round(totalRequests / elapsedSeconds),
        errorRate: totalRequests > 0 ? Math.round((errorCount / totalRequests) * 10000) / 100 : 0,
        statusCodes,
    };
}

async function main() {
    console.log('='.repeat(70));
    console.log('YULA API Load Test');
    console.log('='.repeat(70));
    console.log(`Target:      ${BASE_URL}`);
    console.log(`Concurrency: ${CONCURRENCY} workers per endpoint`);
    console.log(`Duration:    ${DURATION_MS / 1000}s per endpoint`);
    console.log(`Endpoints:   ${ENDPOINTS.length}`);
    console.log(`Auth:        ${AUTH_TOKEN ? 'yes' : 'no (public endpoints only)'}`);
    console.log('='.repeat(70));

    // Quick connectivity check
    try {
        const resp = await fetch(`${BASE_URL}/health`);
        if (!resp.ok) {
            console.error(`Health check failed: ${resp.status}`);
            process.exit(1);
        }
        console.log('Health check passed. Starting load test...\n');
    } catch (e) {
        console.error(`Cannot reach ${BASE_URL}/health - is the server running?`);
        process.exit(1);
    }

    const results: LoadTestResult[] = [];

    for (const endpoint of ENDPOINTS) {
        process.stdout.write(`Testing ${endpoint.method} ${endpoint.path}...`);
        const result = await runEndpointTest(endpoint);
        results.push(result);
        console.log(` ${result.requestsPerSecond} req/s (p95: ${result.p95LatencyMs}ms, err: ${result.errorRate}%)`);
    }

    // Summary table
    console.log('\n' + '='.repeat(70));
    console.log('RESULTS SUMMARY');
    console.log('='.repeat(70));
    console.log(
        'Endpoint'.padEnd(30) +
            'RPS'.padStart(8) +
            'p50'.padStart(8) +
            'p95'.padStart(8) +
            'p99'.padStart(8) +
            'Err%'.padStart(8)
    );
    console.log('-'.repeat(70));

    for (const r of results) {
        console.log(
            r.endpoint.padEnd(30) +
                String(r.requestsPerSecond).padStart(8) +
                `${r.p50LatencyMs}ms`.padStart(8) +
                `${r.p95LatencyMs}ms`.padStart(8) +
                `${r.p99LatencyMs}ms`.padStart(8) +
                `${r.errorRate}%`.padStart(8)
        );
    }

    console.log('-'.repeat(70));

    // Overall stats
    const totalReqs = results.reduce((s, r) => s + r.totalRequests, 0);
    const totalErrors = results.reduce((s, r) => s + r.errorCount, 0);
    const avgRps = Math.round(results.reduce((s, r) => s + r.requestsPerSecond, 0) / results.length);
    const maxP95 = Math.max(...results.map((r) => r.p95LatencyMs));

    console.log(`Total requests: ${totalReqs}`);
    console.log(`Total errors:   ${totalErrors} (${Math.round((totalErrors / totalReqs) * 10000) / 100}%)`);
    console.log(`Avg RPS:        ${avgRps}`);
    console.log(`Max p95:        ${maxP95}ms`);

    // Pass/fail criteria
    const PASS_CRITERIA = {
        maxP95Ms: 500,
        maxErrorRate: 5,
        minRps: 50,
    };

    console.log('\n' + '='.repeat(70));
    console.log('PASS/FAIL CRITERIA');
    console.log('='.repeat(70));

    const failures: string[] = [];
    for (const r of results) {
        if (r.p95LatencyMs > PASS_CRITERIA.maxP95Ms) {
            failures.push(`${r.endpoint}: p95 ${r.p95LatencyMs}ms > ${PASS_CRITERIA.maxP95Ms}ms`);
        }
        if (r.errorRate > PASS_CRITERIA.maxErrorRate) {
            failures.push(`${r.endpoint}: error rate ${r.errorRate}% > ${PASS_CRITERIA.maxErrorRate}%`);
        }
        if (r.requestsPerSecond < PASS_CRITERIA.minRps) {
            failures.push(`${r.endpoint}: ${r.requestsPerSecond} rps < ${PASS_CRITERIA.minRps} rps`);
        }
    }

    if (failures.length === 0) {
        console.log('ALL ENDPOINTS PASSED');
    } else {
        console.log('FAILURES:');
        for (const f of failures) {
            console.log(`  - ${f}`);
        }
    }

    process.exit(failures.length > 0 ? 1 : 0);
}

main();
