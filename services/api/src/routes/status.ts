/**
 * Status and SLA monitoring routes
 */
import { Hono } from 'hono';
import { getSLAReport, getStatusPageData } from '../lib/sla-monitor';

const statusRoutes = new Hono();

// GET /status/sla - Get SLA report
statusRoutes.get('/sla', (c) => {
    const periodHours = parseInt(c.req.query('periodHours') || '24', 10);
    const periodMs = periodHours * 60 * 60 * 1000;

    const report = getSLAReport(periodMs);

    return c.json({
        period: {
            hours: periodHours,
            ms: periodMs,
        },
        metrics: report,
        slaTargets: {
            uptime: 99.9,
            p95Latency: 500,
            errorRate: 0.1,
        },
        withinSLA: {
            uptime: report.uptime >= 99.9,
            p95Latency: report.p95Latency <= 500,
            errorRate: report.errorRate <= 0.1,
            overall: report.uptime >= 99.9 && report.p95Latency <= 500 && report.errorRate <= 0.1,
        },
    });
});

// GET /status - Public status page data
statusRoutes.get('/', (c) => {
    const statusData = getStatusPageData();

    return c.json({
        ...statusData,
        timestamp: new Date().toISOString(),
    });
});

export default statusRoutes;
