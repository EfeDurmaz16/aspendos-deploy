import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearSLA_forTesting,
    getEndpointSLA,
    getSLABreaches,
    getSLAReport,
    getStatusPageData,
    getUptimeHistory,
    isWithinSLA,
    recordIncident,
    recordRequest,
    resolveIncident,
} from '../sla-monitor';

describe('SLA Monitor', () => {
    beforeEach(() => {
        clearSLA_forTesting();
    });

    describe('recordRequest', () => {
        it('should record a successful request', () => {
            recordRequest('/chat', 'POST', 200, 150);
            const report = getSLAReport();

            expect(report.totalRequests).toBe(1);
            expect(report.successfulRequests).toBe(1);
            expect(report.failedRequests).toBe(0);
        });

        it('should record a failed request', () => {
            recordRequest('/chat', 'POST', 500, 250);
            const report = getSLAReport();

            expect(report.totalRequests).toBe(1);
            expect(report.successfulRequests).toBe(0);
            expect(report.failedRequests).toBe(1);
        });

        it('should record multiple requests', () => {
            recordRequest('/chat', 'POST', 200, 100);
            recordRequest('/memory', 'GET', 200, 50);
            recordRequest('/billing', 'GET', 500, 300);

            const report = getSLAReport();
            expect(report.totalRequests).toBe(3);
            expect(report.successfulRequests).toBe(2);
            expect(report.failedRequests).toBe(1);
        });

        it('should track slow requests', () => {
            recordRequest('/chat', 'POST', 200, 1500);
            recordRequest('/chat', 'POST', 200, 500);

            const report = getSLAReport();
            expect(report.slowRequests).toBe(1);
        });
    });

    describe('getSLAReport', () => {
        it('should return default report with no data', () => {
            const report = getSLAReport();

            expect(report.uptime).toBe(100);
            expect(report.p50Latency).toBe(0);
            expect(report.p95Latency).toBe(0);
            expect(report.p99Latency).toBe(0);
            expect(report.errorRate).toBe(0);
            expect(report.totalRequests).toBe(0);
        });

        it('should calculate uptime correctly', () => {
            // 9 successful, 1 failed = 90% uptime
            for (let i = 0; i < 9; i++) {
                recordRequest('/chat', 'POST', 200, 100);
            }
            recordRequest('/chat', 'POST', 500, 100);

            const report = getSLAReport();
            expect(report.uptime).toBe(90);
            expect(report.errorRate).toBe(10);
        });

        it('should calculate latency percentiles correctly', () => {
            const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

            for (const latency of latencies) {
                recordRequest('/chat', 'POST', 200, latency);
            }

            const report = getSLAReport();
            expect(report.p50Latency).toBe(55); // Interpolated between 50 and 60
            expect(report.p95Latency).toBe(95.5); // Interpolated between 90 and 100
            expect(report.p99Latency).toBe(99.1); // Interpolated between 90 and 100
        });

        it('should handle single request percentiles', () => {
            recordRequest('/chat', 'POST', 200, 123);

            const report = getSLAReport();
            expect(report.p50Latency).toBe(123);
            expect(report.p95Latency).toBe(123);
            expect(report.p99Latency).toBe(123);
        });

        it('should count slow requests correctly', () => {
            recordRequest('/chat', 'POST', 200, 500);
            recordRequest('/chat', 'POST', 200, 1001);
            recordRequest('/chat', 'POST', 200, 1500);
            recordRequest('/chat', 'POST', 200, 999);

            const report = getSLAReport();
            expect(report.slowRequests).toBe(2);
        });

        it('should handle 100% error rate', () => {
            recordRequest('/chat', 'POST', 500, 100);
            recordRequest('/chat', 'POST', 503, 100);

            const report = getSLAReport();
            expect(report.uptime).toBe(0);
            expect(report.errorRate).toBe(100);
            expect(report.successfulRequests).toBe(0);
            expect(report.failedRequests).toBe(2);
        });
    });

    describe('getEndpointSLA', () => {
        it('should return report for specific endpoint', () => {
            recordRequest('/chat', 'POST', 200, 100);
            recordRequest('/chat', 'POST', 500, 200);
            recordRequest('/memory', 'GET', 200, 50);

            const chatReport = getEndpointSLA('/chat');
            expect(chatReport.totalRequests).toBe(2);
            expect(chatReport.uptime).toBe(50);

            const memoryReport = getEndpointSLA('/memory');
            expect(memoryReport.totalRequests).toBe(1);
            expect(memoryReport.uptime).toBe(100);
        });

        it('should return default report for non-existent endpoint', () => {
            recordRequest('/chat', 'POST', 200, 100);

            const report = getEndpointSLA('/nonexistent');
            expect(report.totalRequests).toBe(0);
            expect(report.uptime).toBe(100);
        });

        it('should calculate endpoint-specific percentiles', () => {
            recordRequest('/chat', 'POST', 200, 100);
            recordRequest('/chat', 'POST', 200, 200);
            recordRequest('/memory', 'GET', 200, 500);

            const chatReport = getEndpointSLA('/chat');
            expect(chatReport.p50Latency).toBe(150);
        });
    });

    describe('isWithinSLA', () => {
        it('should return true when all metrics meet default targets', () => {
            // 100% uptime, low latency, no errors
            for (let i = 0; i < 100; i++) {
                recordRequest('/chat', 'POST', 200, 100);
            }

            expect(isWithinSLA()).toBe(true);
        });

        it('should return false when uptime below target', () => {
            // 98% uptime (below 99.9%)
            for (let i = 0; i < 98; i++) {
                recordRequest('/chat', 'POST', 200, 100);
            }
            recordRequest('/chat', 'POST', 500, 100);
            recordRequest('/chat', 'POST', 500, 100);

            expect(isWithinSLA()).toBe(false);
        });

        it('should return false when p95 latency above target', () => {
            // Most requests fast, but 95th percentile too high
            for (let i = 0; i < 90; i++) {
                recordRequest('/chat', 'POST', 200, 100);
            }
            for (let i = 0; i < 10; i++) {
                recordRequest('/chat', 'POST', 200, 1000);
            }

            expect(isWithinSLA()).toBe(false);
        });

        it('should accept custom SLA targets', () => {
            recordRequest('/chat', 'POST', 200, 600);
            recordRequest('/chat', 'POST', 200, 700);

            // Default p95 target (500ms) would fail, but custom target passes
            expect(isWithinSLA({ p95Latency: 800 })).toBe(true);
            expect(isWithinSLA({ p95Latency: 500 })).toBe(false);
        });

        it('should return false when error rate above target', () => {
            // 1% error rate (above 0.1% target)
            for (let i = 0; i < 99; i++) {
                recordRequest('/chat', 'POST', 200, 100);
            }
            recordRequest('/chat', 'POST', 500, 100);

            expect(isWithinSLA()).toBe(false);
        });
    });

    describe('getSLABreaches', () => {
        it('should return empty array with no breaches', () => {
            recordRequest('/chat', 'POST', 200, 100);

            const breaches = getSLABreaches();
            expect(breaches).toHaveLength(0);
        });

        it('should record breach for slow request', () => {
            recordRequest('/chat', 'POST', 200, 1500);

            const breaches = getSLABreaches();
            expect(breaches.length).toBeGreaterThan(0);
            expect(breaches[0].metric).toBe('p95Latency');
            expect(breaches[0].severity).toBe('critical');
        });

        it('should record breach for high error rate', () => {
            // Create high error rate
            for (let i = 0; i < 5; i++) {
                recordRequest('/chat', 'POST', 500, 100);
            }

            const breaches = getSLABreaches();
            const errorBreaches = breaches.filter((b) => b.metric === 'errorRate');
            expect(errorBreaches.length).toBeGreaterThan(0);
        });
    });

    describe('getStatusPageData', () => {
        it('should return operational status with no issues', () => {
            recordRequest('/chat', 'POST', 200, 100);
            recordRequest('/memory', 'GET', 200, 50);

            const status = getStatusPageData();
            expect(status.status).toBe('operational');
            expect(status.services.chat).toBe('operational');
            expect(status.services.memory).toBe('operational');
            expect(status.incidents).toHaveLength(0);
        });

        it('should detect degraded service', () => {
            // Create 10% error rate for chat (degraded threshold)
            for (let i = 0; i < 9; i++) {
                recordRequest('/chat', 'POST', 200, 100);
            }
            recordRequest('/chat', 'POST', 500, 100);

            const status = getStatusPageData();
            expect(status.services.chat).toBe('degraded');
            expect(status.status).toBe('degraded');
        });

        it('should detect major outage', () => {
            // Create 60% error rate (major outage threshold)
            for (let i = 0; i < 4; i++) {
                recordRequest('/chat', 'POST', 200, 100);
            }
            for (let i = 0; i < 6; i++) {
                recordRequest('/chat', 'POST', 500, 100);
            }

            const status = getStatusPageData();
            expect(status.services.chat).toBe('major_outage');
            expect(status.status).toBe('major_outage');
        });

        it('should include recent incidents', () => {
            const incidentId = recordIncident('chat', 'high', 'API timeout issues');

            const status = getStatusPageData();
            expect(status.incidents).toHaveLength(1);
            expect(status.incidents[0].id).toBe(incidentId);
            expect(status.incidents[0].service).toBe('chat');
        });

        it('should not include resolved incidents', () => {
            const incidentId = recordIncident('chat', 'high', 'API timeout issues');
            resolveIncident(incidentId);

            const status = getStatusPageData();
            expect(status.incidents).toHaveLength(0);
        });
    });

    describe('recordIncident', () => {
        it('should create incident with all details', () => {
            const incidentId = recordIncident('chat', 'critical', 'Database connection lost');

            expect(incidentId).toMatch(/^inc_/);

            const status = getStatusPageData();
            const incident = status.incidents.find((inc) => inc.id === incidentId);

            expect(incident).toBeDefined();
            expect(incident?.service).toBe('chat');
            expect(incident?.severity).toBe('critical');
            expect(incident?.description).toBe('Database connection lost');
            expect(incident?.resolvedAt).toBeUndefined();
        });

        it('should create unique incident IDs', () => {
            const id1 = recordIncident('chat', 'low', 'Issue 1');
            const id2 = recordIncident('memory', 'high', 'Issue 2');

            expect(id1).not.toBe(id2);
        });
    });

    describe('resolveIncident', () => {
        it('should mark incident as resolved', () => {
            const incidentId = recordIncident('chat', 'medium', 'Slow responses');

            const resolved = resolveIncident(incidentId);
            expect(resolved).toBe(true);

            const status = getStatusPageData();
            expect(status.incidents).toHaveLength(0);
        });

        it('should return false for non-existent incident', () => {
            const resolved = resolveIncident('inc_nonexistent');
            expect(resolved).toBe(false);
        });
    });

    describe('getUptimeHistory', () => {
        it('should return 7 days by default', () => {
            const history = getUptimeHistory();
            expect(history).toHaveLength(7);
        });

        it('should return 100% uptime for days with no requests', () => {
            const history = getUptimeHistory(3);

            for (const day of history) {
                expect(day.uptime).toBe(100);
                expect(day.totalRequests).toBe(0);
            }
        });

        it('should calculate daily uptime correctly', () => {
            recordRequest('/chat', 'POST', 200, 100);
            recordRequest('/chat', 'POST', 200, 100);
            recordRequest('/chat', 'POST', 500, 100);

            const history = getUptimeHistory(1);
            expect(history[0].totalRequests).toBe(3);
            expect(history[0].failedRequests).toBe(1);
            expect(history[0].uptime).toBeCloseTo(66.67, 1);
        });

        it('should format dates correctly', () => {
            const history = getUptimeHistory(1);
            expect(history[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('should support custom number of days', () => {
            const history = getUptimeHistory(14);
            expect(history).toHaveLength(14);
        });
    });

    describe('clearSLA_forTesting', () => {
        it('should clear all metrics', () => {
            recordRequest('/chat', 'POST', 200, 100);
            recordIncident('chat', 'low', 'Test incident');

            clearSLA_forTesting();

            const report = getSLAReport();
            expect(report.totalRequests).toBe(0);

            const status = getStatusPageData();
            expect(status.incidents).toHaveLength(0);

            const breaches = getSLABreaches();
            expect(breaches).toHaveLength(0);
        });
    });
});
