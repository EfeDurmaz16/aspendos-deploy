/**
 * SLA Monitoring System for YULA API
 * Tracks request metrics, uptime, latency percentiles, and incidents
 */

interface RequestMetric {
    path: string;
    method: string;
    statusCode: number;
    durationMs: number;
    timestamp: number;
}

interface Incident {
    id: string;
    service: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    timestamp: number;
    resolvedAt?: number;
}

interface SLAReport {
    uptime: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    errorRate: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    slowRequests: number;
}

interface SLATargets {
    uptime?: number;
    p95Latency?: number;
    errorRate?: number;
}

interface SLABreach {
    timestamp: number;
    metric: string;
    expected: number;
    actual: number;
    severity: 'warning' | 'critical';
}

interface StatusPageData {
    status: 'operational' | 'degraded' | 'major_outage';
    services: {
        chat: 'operational' | 'degraded' | 'major_outage';
        memory: 'operational' | 'degraded' | 'major_outage';
        council: 'operational' | 'degraded' | 'major_outage';
        billing: 'operational' | 'degraded' | 'major_outage';
    };
    incidents: Incident[];
}

interface UptimeDay {
    date: string;
    uptime: number;
    totalRequests: number;
    failedRequests: number;
}

// In-memory storage (in production, use Redis or similar)
const requestMetrics: RequestMetric[] = [];
const incidents: Incident[] = [];
const slaBreaches: SLABreach[] = [];

// Default SLA targets
const DEFAULT_SLA_TARGETS: Required<SLATargets> = {
    uptime: 99.9,
    p95Latency: 500,
    errorRate: 0.1,
};

/**
 * Record a request for SLA tracking
 */
export function recordRequest(
    path: string,
    method: string,
    statusCode: number,
    durationMs: number
): void {
    const metric: RequestMetric = {
        path,
        method,
        statusCode,
        durationMs,
        timestamp: Date.now(),
    };
    requestMetrics.push(metric);

    // Check for SLA violations in real-time
    checkForSLAViolations(metric);
}

/**
 * Get SLA report for a given period (default: last 24 hours)
 */
export function getSLAReport(periodMs = 24 * 60 * 60 * 1000): SLAReport {
    const now = Date.now();
    const cutoff = now - periodMs;

    const relevantMetrics = requestMetrics.filter((m) => m.timestamp >= cutoff);

    if (relevantMetrics.length === 0) {
        return {
            uptime: 100,
            p50Latency: 0,
            p95Latency: 0,
            p99Latency: 0,
            errorRate: 0,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            slowRequests: 0,
        };
    }

    const totalRequests = relevantMetrics.length;
    const failedRequests = relevantMetrics.filter((m) => m.statusCode >= 500).length;
    const successfulRequests = totalRequests - failedRequests;
    const slowRequests = relevantMetrics.filter((m) => m.durationMs > 1000).length;

    const uptime = (successfulRequests / totalRequests) * 100;
    const errorRate = (failedRequests / totalRequests) * 100;

    // Calculate percentiles
    const sortedDurations = relevantMetrics.map((m) => m.durationMs).sort((a, b) => a - b);

    const p50Latency = calculatePercentile(sortedDurations, 50);
    const p95Latency = calculatePercentile(sortedDurations, 95);
    const p99Latency = calculatePercentile(sortedDurations, 99);

    return {
        uptime,
        p50Latency,
        p95Latency,
        p99Latency,
        errorRate,
        totalRequests,
        successfulRequests,
        failedRequests,
        slowRequests,
    };
}

/**
 * Get SLA report for a specific endpoint
 */
export function getEndpointSLA(path: string, periodMs = 24 * 60 * 60 * 1000): SLAReport {
    const now = Date.now();
    const cutoff = now - periodMs;

    const relevantMetrics = requestMetrics.filter((m) => m.timestamp >= cutoff && m.path === path);

    if (relevantMetrics.length === 0) {
        return {
            uptime: 100,
            p50Latency: 0,
            p95Latency: 0,
            p99Latency: 0,
            errorRate: 0,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            slowRequests: 0,
        };
    }

    const totalRequests = relevantMetrics.length;
    const failedRequests = relevantMetrics.filter((m) => m.statusCode >= 500).length;
    const successfulRequests = totalRequests - failedRequests;
    const slowRequests = relevantMetrics.filter((m) => m.durationMs > 1000).length;

    const uptime = (successfulRequests / totalRequests) * 100;
    const errorRate = (failedRequests / totalRequests) * 100;

    const sortedDurations = relevantMetrics.map((m) => m.durationMs).sort((a, b) => a - b);

    const p50Latency = calculatePercentile(sortedDurations, 50);
    const p95Latency = calculatePercentile(sortedDurations, 95);
    const p99Latency = calculatePercentile(sortedDurations, 99);

    return {
        uptime,
        p50Latency,
        p95Latency,
        p99Latency,
        errorRate,
        totalRequests,
        successfulRequests,
        failedRequests,
        slowRequests,
    };
}

/**
 * Check if current metrics meet SLA targets
 */
export function isWithinSLA(slaTargets: SLATargets = DEFAULT_SLA_TARGETS): boolean {
    const report = getSLAReport();

    const targets = { ...DEFAULT_SLA_TARGETS, ...slaTargets };

    return (
        report.uptime >= targets.uptime &&
        report.p95Latency <= targets.p95Latency &&
        report.errorRate <= targets.errorRate
    );
}

/**
 * Get list of SLA violations
 */
export function getSLABreaches(periodMs = 24 * 60 * 60 * 1000): SLABreach[] {
    const now = Date.now();
    const cutoff = now - periodMs;

    return slaBreaches.filter((b) => b.timestamp >= cutoff);
}

/**
 * Get status page data
 */
export function getStatusPageData(): StatusPageData {
    const now = Date.now();
    const last24h = 24 * 60 * 60 * 1000;

    const recentIncidents = incidents.filter(
        (inc) => inc.timestamp >= now - last24h && !inc.resolvedAt
    );

    // Get service-specific status
    const chatStatus = getServiceStatus('/chat');
    const memoryStatus = getServiceStatus('/memory');
    const councilStatus = getServiceStatus('/council');
    const billingStatus = getServiceStatus('/billing');

    // Determine overall status
    const serviceStatuses = [chatStatus, memoryStatus, councilStatus, billingStatus];
    const overallStatus = determineOverallStatus(serviceStatuses);

    return {
        status: overallStatus,
        services: {
            chat: chatStatus,
            memory: memoryStatus,
            council: councilStatus,
            billing: billingStatus,
        },
        incidents: recentIncidents,
    };
}

/**
 * Record an incident
 */
export function recordIncident(
    service: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string
): string {
    const incident: Incident = {
        id: generateIncidentId(),
        service,
        severity,
        description,
        timestamp: Date.now(),
    };

    incidents.push(incident);
    return incident.id;
}

/**
 * Resolve an incident
 */
export function resolveIncident(incidentId: string): boolean {
    const incident = incidents.find((inc) => inc.id === incidentId);

    if (!incident) {
        return false;
    }

    incident.resolvedAt = Date.now();
    return true;
}

/**
 * Get uptime history for the last N days
 */
export function getUptimeHistory(days = 7): UptimeDay[] {
    const now = Date.now();
    const history: UptimeDay[] = [];

    for (let i = days - 1; i >= 0; i--) {
        const dayStart = now - i * 24 * 60 * 60 * 1000;
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;

        const dayMetrics = requestMetrics.filter(
            (m) => m.timestamp >= dayStart && m.timestamp < dayEnd
        );

        const totalRequests = dayMetrics.length;
        const failedRequests = dayMetrics.filter((m) => m.statusCode >= 500).length;
        const uptime =
            totalRequests > 0 ? ((totalRequests - failedRequests) / totalRequests) * 100 : 100;

        const date = new Date(dayStart).toISOString().split('T')[0];

        history.push({
            date,
            uptime,
            totalRequests,
            failedRequests,
        });
    }

    return history;
}

/**
 * Clear all SLA data (for testing only)
 */
export function clearSLA_forTesting(): void {
    requestMetrics.length = 0;
    incidents.length = 0;
    slaBreaches.length = 0;
}

// Helper functions

function calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    if (sortedValues.length === 1) return sortedValues[0];

    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function checkForSLAViolations(metric: RequestMetric): void {
    // Check for slow requests
    if (metric.durationMs > DEFAULT_SLA_TARGETS.p95Latency) {
        slaBreaches.push({
            timestamp: metric.timestamp,
            metric: 'p95Latency',
            expected: DEFAULT_SLA_TARGETS.p95Latency,
            actual: metric.durationMs,
            severity: metric.durationMs > 1000 ? 'critical' : 'warning',
        });
    }

    // Check for errors
    if (metric.statusCode >= 500) {
        const report = getSLAReport(5 * 60 * 1000); // Last 5 minutes
        if (report.errorRate > DEFAULT_SLA_TARGETS.errorRate) {
            slaBreaches.push({
                timestamp: metric.timestamp,
                metric: 'errorRate',
                expected: DEFAULT_SLA_TARGETS.errorRate,
                actual: report.errorRate,
                severity: report.errorRate > 1 ? 'critical' : 'warning',
            });
        }
    }
}

function getServiceStatus(pathPrefix: string): 'operational' | 'degraded' | 'major_outage' {
    const last5min = 5 * 60 * 1000;
    const now = Date.now();
    const cutoff = now - last5min;

    const serviceMetrics = requestMetrics.filter(
        (m) => m.timestamp >= cutoff && m.path.startsWith(pathPrefix)
    );

    if (serviceMetrics.length === 0) {
        return 'operational';
    }

    const failedRequests = serviceMetrics.filter((m) => m.statusCode >= 500).length;
    const errorRate = (failedRequests / serviceMetrics.length) * 100;

    if (errorRate > 50) {
        return 'major_outage';
    }
    if (errorRate > 5) {
        return 'degraded';
    }

    return 'operational';
}

function determineOverallStatus(
    serviceStatuses: Array<'operational' | 'degraded' | 'major_outage'>
): 'operational' | 'degraded' | 'major_outage' {
    if (serviceStatuses.some((s) => s === 'major_outage')) {
        return 'major_outage';
    }
    if (serviceStatuses.some((s) => s === 'degraded')) {
        return 'degraded';
    }
    return 'operational';
}

function generateIncidentId(): string {
    return `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
