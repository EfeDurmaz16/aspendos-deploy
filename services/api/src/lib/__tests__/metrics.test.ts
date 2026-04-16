import { beforeEach, describe, expect, it } from 'vitest';
import {
    AI_DURATION_BUCKETS,
    decrementGauge,
    getCounter,
    getGauge,
    getMetricsText,
    HTTP_DURATION_BUCKETS,
    incrementCounter,
    incrementGauge,
    observeHistogram,
    resetMetrics,
    SIZE_BUCKETS,
    setGauge,
} from '../metrics';

describe('Metrics', () => {
    beforeEach(() => {
        resetMetrics();
    });

    describe('Counter', () => {
        it('should increment counter without labels', () => {
            incrementCounter('test_counter');
            expect(getCounter('test_counter')).toBe(1);

            incrementCounter('test_counter');
            expect(getCounter('test_counter')).toBe(2);
        });

        it('should increment counter with custom value', () => {
            incrementCounter('test_counter', {}, 5);
            expect(getCounter('test_counter')).toBe(5);

            incrementCounter('test_counter', {}, 3);
            expect(getCounter('test_counter')).toBe(8);
        });

        it('should increment counter with labels', () => {
            incrementCounter('http_requests_total', { method: 'GET', status: '200' });
            incrementCounter('http_requests_total', { method: 'POST', status: '201' });
            incrementCounter('http_requests_total', { method: 'GET', status: '200' });

            expect(getCounter('http_requests_total', { method: 'GET', status: '200' })).toBe(2);
            expect(getCounter('http_requests_total', { method: 'POST', status: '201' })).toBe(1);
        });

        it('should handle multiple counters independently', () => {
            incrementCounter('counter_a', {}, 10);
            incrementCounter('counter_b', {}, 20);

            expect(getCounter('counter_a')).toBe(10);
            expect(getCounter('counter_b')).toBe(20);
        });

        it('should return 0 for non-existent counter', () => {
            expect(getCounter('non_existent')).toBe(0);
            expect(getCounter('counter', { label: 'value' })).toBe(0);
        });
    });

    describe('Histogram', () => {
        it('should observe values in histogram', () => {
            observeHistogram('request_duration', 0.5);
            observeHistogram('request_duration', 1.5);
            observeHistogram('request_duration', 0.1);

            const output = getMetricsText();
            expect(output).toContain('request_duration_count 3');
            expect(output).toContain('request_duration_sum 2.1');
        });

        it('should bucket values correctly', () => {
            const buckets = [0.1, 0.5, 1.0, 5.0];
            observeHistogram('test_histogram', 0.05, {}, buckets);
            observeHistogram('test_histogram', 0.3, {}, buckets);
            observeHistogram('test_histogram', 0.8, {}, buckets);
            observeHistogram('test_histogram', 3.0, {}, buckets);

            const output = getMetricsText();
            expect(output).toContain('test_histogram_bucket{le="0.1"} 1');
            expect(output).toContain('test_histogram_bucket{le="0.5"} 2');
            expect(output).toContain('test_histogram_bucket{le="1"} 3');
            expect(output).toContain('test_histogram_bucket{le="5"} 4');
            expect(output).toContain('test_histogram_bucket{le="+Inf"} 4');
        });

        it('should handle labeled histograms', () => {
            observeHistogram('http_request_duration_seconds', 0.5, { method: 'GET' });
            observeHistogram('http_request_duration_seconds', 1.0, { method: 'GET' });
            observeHistogram('http_request_duration_seconds', 2.0, { method: 'POST' });

            const output = getMetricsText();
            expect(output).toContain('method="GET"');
            expect(output).toContain('method="POST"');
            expect(output).toContain('http_request_duration_seconds_count{method="GET"} 2');
            expect(output).toContain('http_request_duration_seconds_count{method="POST"} 1');
        });

        it('should use default HTTP duration buckets', () => {
            observeHistogram('http_request_duration_seconds', 0.05);

            const output = getMetricsText();
            for (const bucket of HTTP_DURATION_BUCKETS) {
                expect(output).toContain(`le="${bucket}"`);
            }
        });

        it('should handle custom buckets', () => {
            const customBuckets = [10, 100, 1000];
            observeHistogram('custom_metric', 50, {}, customBuckets);

            const output = getMetricsText();
            expect(output).toContain('le="10"');
            expect(output).toContain('le="100"');
            expect(output).toContain('le="1000"');
        });
    });

    describe('Gauge', () => {
        it('should set gauge value', () => {
            setGauge('active_connections', 42);
            expect(getGauge('active_connections')).toBe(42);

            setGauge('active_connections', 100);
            expect(getGauge('active_connections')).toBe(100);
        });

        it('should set gauge with labels', () => {
            setGauge('memory_usage', 1024, { instance: 'server1' });
            setGauge('memory_usage', 2048, { instance: 'server2' });

            expect(getGauge('memory_usage', { instance: 'server1' })).toBe(1024);
            expect(getGauge('memory_usage', { instance: 'server2' })).toBe(2048);
        });

        it('should increment gauge', () => {
            setGauge('total_memory', 1000);
            incrementGauge('total_memory', 500);
            expect(getGauge('total_memory')).toBe(1500);

            incrementGauge('total_memory', 200);
            expect(getGauge('total_memory')).toBe(1700);
        });

        it('should decrement gauge', () => {
            setGauge('total_memory', 1000);
            decrementGauge('total_memory', 300);
            expect(getGauge('total_memory')).toBe(700);

            decrementGauge('total_memory', 100);
            expect(getGauge('total_memory')).toBe(600);
        });

        it('should handle negative gauge values', () => {
            setGauge('temperature', -10);
            expect(getGauge('temperature')).toBe(-10);

            incrementGauge('temperature', 5);
            expect(getGauge('temperature')).toBe(-5);
        });

        it('should increment/decrement gauge with labels', () => {
            setGauge('queue_size', 0, { queue: 'email' });
            incrementGauge('queue_size', 5, { queue: 'email' });
            expect(getGauge('queue_size', { queue: 'email' })).toBe(5);

            decrementGauge('queue_size', 2, { queue: 'email' });
            expect(getGauge('queue_size', { queue: 'email' })).toBe(3);
        });

        it('should return 0 for non-existent gauge', () => {
            expect(getGauge('non_existent')).toBe(0);
            expect(getGauge('gauge', { label: 'value' })).toBe(0);
        });
    });

    describe('Prometheus Text Format', () => {
        it('should generate valid Prometheus format', () => {
            incrementCounter('test_counter', { status: 'ok' });
            setGauge('test_gauge', 42);

            const output = getMetricsText();

            expect(output).toContain('# HELP test_counter');
            expect(output).toContain('# TYPE test_counter counter');
            expect(output).toContain('test_counter{status="ok"} 1');

            expect(output).toContain('# HELP test_gauge');
            expect(output).toContain('# TYPE test_gauge gauge');
            expect(output).toContain('test_gauge 42');
        });

        it('should include histogram metadata', () => {
            observeHistogram('request_duration', 0.5);

            const output = getMetricsText();
            expect(output).toContain('# HELP request_duration');
            expect(output).toContain('# TYPE request_duration histogram');
            expect(output).toContain('request_duration_bucket');
            expect(output).toContain('request_duration_sum');
            expect(output).toContain('request_duration_count');
        });

        it('should sort labels consistently', () => {
            incrementCounter('test', { z: 'last', a: 'first', m: 'middle' });

            const output = getMetricsText();
            expect(output).toContain('a="first",m="middle",z="last"');
        });

        it('should handle empty metrics', () => {
            const output = getMetricsText();
            expect(output).toBe('\n');
        });

        it('should end with newline', () => {
            incrementCounter('test');
            const output = getMetricsText();
            expect(output.endsWith('\n')).toBe(true);
        });
    });

    describe('Label Handling', () => {
        it('should differentiate metrics by labels', () => {
            incrementCounter('requests', { path: '/api/chat', status: '200' });
            incrementCounter('requests', { path: '/api/chat', status: '500' });
            incrementCounter('requests', { path: '/api/memory', status: '200' });

            expect(getCounter('requests', { path: '/api/chat', status: '200' })).toBe(1);
            expect(getCounter('requests', { path: '/api/chat', status: '500' })).toBe(1);
            expect(getCounter('requests', { path: '/api/memory', status: '200' })).toBe(1);
        });

        it('should handle labels with special characters', () => {
            incrementCounter('test', { path: '/api/chat/:id', method: 'GET' });
            const output = getMetricsText();
            expect(output).toContain('method="GET",path="/api/chat/:id"');
        });

        it('should handle empty label values', () => {
            incrementCounter('test', { key: '' });
            expect(getCounter('test', { key: '' })).toBe(1);
        });
    });

    describe('Reset Metrics', () => {
        it('should reset all metrics', () => {
            incrementCounter('counter_1', {}, 10);
            setGauge('gauge_1', 100);
            observeHistogram('histogram_1', 5);

            resetMetrics();

            expect(getCounter('counter_1')).toBe(0);
            expect(getGauge('gauge_1')).toBe(0);
            expect(getMetricsText()).toBe('\n');
        });

        it('should allow new metrics after reset', () => {
            incrementCounter('test', {}, 5);
            resetMetrics();
            incrementCounter('test', {}, 3);

            expect(getCounter('test')).toBe(3);
        });
    });

    describe('Bucket Constants', () => {
        it('should export HTTP duration buckets', () => {
            expect(HTTP_DURATION_BUCKETS).toBeInstanceOf(Array);
            expect(HTTP_DURATION_BUCKETS.length).toBeGreaterThan(0);
            expect(HTTP_DURATION_BUCKETS[0]).toBeLessThan(HTTP_DURATION_BUCKETS[1]);
        });

        it('should export size buckets', () => {
            expect(SIZE_BUCKETS).toBeInstanceOf(Array);
            expect(SIZE_BUCKETS.length).toBeGreaterThan(0);
            expect(SIZE_BUCKETS[0]).toBeLessThan(SIZE_BUCKETS[1]);
        });

        it('should export AI duration buckets', () => {
            expect(AI_DURATION_BUCKETS).toBeInstanceOf(Array);
            expect(AI_DURATION_BUCKETS.length).toBeGreaterThan(0);
            expect(AI_DURATION_BUCKETS[0]).toBeLessThan(AI_DURATION_BUCKETS[1]);
        });
    });

    describe('Business Metrics Scenarios', () => {
        it('should track AI requests', () => {
            incrementCounter('ai_requests_total', {
                provider: 'openai',
                model: 'gpt-4o',
                status: 'success',
            });
            incrementCounter('ai_requests_total', {
                provider: 'anthropic',
                model: 'claude-3-5-haiku',
                status: 'success',
            });
            incrementCounter('ai_requests_total', {
                provider: 'openai',
                model: 'gpt-4o',
                status: 'error',
            });

            expect(
                getCounter('ai_requests_total', {
                    provider: 'openai',
                    model: 'gpt-4o',
                    status: 'success',
                })
            ).toBe(1);
            expect(
                getCounter('ai_requests_total', {
                    provider: 'openai',
                    model: 'gpt-4o',
                    status: 'error',
                })
            ).toBe(1);
        });

        it('should track token usage', () => {
            incrementCounter(
                'ai_tokens_used_total',
                { provider: 'openai', model: 'gpt-4o', type: 'input' },
                1000
            );
            incrementCounter(
                'ai_tokens_used_total',
                { provider: 'openai', model: 'gpt-4o', type: 'output' },
                500
            );

            expect(
                getCounter('ai_tokens_used_total', {
                    provider: 'openai',
                    model: 'gpt-4o',
                    type: 'input',
                })
            ).toBe(1000);
            expect(
                getCounter('ai_tokens_used_total', {
                    provider: 'openai',
                    model: 'gpt-4o',
                    type: 'output',
                })
            ).toBe(500);
        });

        it('should track rate limit hits', () => {
            incrementCounter('rate_limit_hits_total', { tier: 'FREE', endpoint: '/api/chat' });
            incrementCounter('rate_limit_hits_total', { tier: 'FREE', endpoint: '/api/chat' });
            incrementCounter('rate_limit_hits_total', { tier: 'PRO', endpoint: '/api/council' });

            expect(
                getCounter('rate_limit_hits_total', { tier: 'FREE', endpoint: '/api/chat' })
            ).toBe(2);
            expect(
                getCounter('rate_limit_hits_total', { tier: 'PRO', endpoint: '/api/council' })
            ).toBe(1);
        });

        it('should track active users gauge', () => {
            setGauge('active_users_gauge', 0);
            incrementGauge('active_users_gauge', 1);
            incrementGauge('active_users_gauge', 1);
            decrementGauge('active_users_gauge', 1);

            expect(getGauge('active_users_gauge')).toBe(1);
        });

        it('should track memory operations', () => {
            incrementCounter('memory_operations_total', { operation: 'store' }, 10);
            incrementCounter('memory_operations_total', { operation: 'search' }, 50);
            incrementCounter('memory_operations_total', { operation: 'delete' }, 2);

            expect(getCounter('memory_operations_total', { operation: 'store' })).toBe(10);
            expect(getCounter('memory_operations_total', { operation: 'search' })).toBe(50);
            expect(getCounter('memory_operations_total', { operation: 'delete' })).toBe(2);
        });

        it('should track chat messages', () => {
            incrementCounter('chat_messages_total', { role: 'user' }, 100);
            incrementCounter('chat_messages_total', { role: 'assistant' }, 100);

            expect(getCounter('chat_messages_total', { role: 'user' })).toBe(100);
            expect(getCounter('chat_messages_total', { role: 'assistant' })).toBe(100);
        });

        it('should track AI costs', () => {
            setGauge('ai_cost_total', 0.05, { provider: 'openai', model: 'gpt-4o' });
            incrementGauge('ai_cost_total', 0.02, { provider: 'openai', model: 'gpt-4o' });

            expect(getGauge('ai_cost_total', { provider: 'openai', model: 'gpt-4o' })).toBeCloseTo(
                0.07,
                2
            );
        });
    });
});
