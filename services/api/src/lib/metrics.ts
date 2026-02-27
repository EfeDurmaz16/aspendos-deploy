/**
 * Prometheus-compatible metrics collector
 * Lightweight in-memory metrics with Prometheus text exposition format
 */

interface Counter {
    value: number;
    labels: Map<string, number>;
}

interface Histogram {
    count: number;
    sum: number;
    buckets: Map<number, number>;
    labels: Map<string, { count: number; sum: number; buckets: Map<number, number> }>;
}

interface Gauge {
    value: number;
    labels: Map<string, number>;
}

// Prometheus standard buckets for HTTP request duration (in seconds)
const HTTP_DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

// Buckets for request/response sizes (in bytes)
const SIZE_BUCKETS = [100, 1000, 10000, 100000, 1000000, 10000000];

// Buckets for AI request duration (in seconds)
const AI_DURATION_BUCKETS = [0.1, 0.5, 1, 2, 5, 10, 30, 60];

class MetricsCollector {
    private counters = new Map<string, Counter>();
    private histograms = new Map<string, Histogram>();
    private gauges = new Map<string, Gauge>();

    /**
     * Increment a counter metric
     */
    incrementCounter(name: string, labels: Record<string, string> = {}, value = 1): void {
        if (!this.counters.has(name)) {
            this.counters.set(name, { value: 0, labels: new Map() });
        }

        const counter = this.counters.get(name)!;

        if (Object.keys(labels).length === 0) {
            counter.value += value;
        } else {
            const labelKey = this.serializeLabels(labels);
            const current = counter.labels.get(labelKey) || 0;
            counter.labels.set(labelKey, current + value);
        }
    }

    /**
     * Observe a value in a histogram
     */
    observeHistogram(
        name: string,
        value: number,
        labels: Record<string, string> = {},
        buckets: number[] = HTTP_DURATION_BUCKETS
    ): void {
        if (!this.histograms.has(name)) {
            this.histograms.set(name, {
                count: 0,
                sum: 0,
                buckets: new Map(buckets.map((b) => [b, 0])),
                labels: new Map(),
            });
        }

        const histogram = this.histograms.get(name)!;

        if (Object.keys(labels).length === 0) {
            histogram.count++;
            histogram.sum += value;

            for (const bucket of buckets) {
                if (value <= bucket) {
                    histogram.buckets.set(bucket, (histogram.buckets.get(bucket) || 0) + 1);
                }
            }
        } else {
            const labelKey = this.serializeLabels(labels);
            let labeledMetric = histogram.labels.get(labelKey);

            if (!labeledMetric) {
                labeledMetric = {
                    count: 0,
                    sum: 0,
                    buckets: new Map(buckets.map((b) => [b, 0])),
                };
                histogram.labels.set(labelKey, labeledMetric);
            }

            labeledMetric.count++;
            labeledMetric.sum += value;

            for (const bucket of buckets) {
                if (value <= bucket) {
                    labeledMetric.buckets.set(bucket, (labeledMetric.buckets.get(bucket) || 0) + 1);
                }
            }
        }
    }

    /**
     * Set a gauge metric value
     */
    setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
        if (!this.gauges.has(name)) {
            this.gauges.set(name, { value: 0, labels: new Map() });
        }

        const gauge = this.gauges.get(name)!;

        if (Object.keys(labels).length === 0) {
            gauge.value = value;
        } else {
            const labelKey = this.serializeLabels(labels);
            gauge.labels.set(labelKey, value);
        }
    }

    /**
     * Increment a gauge metric (for gauges that accumulate)
     */
    incrementGauge(name: string, value: number, labels: Record<string, string> = {}): void {
        if (!this.gauges.has(name)) {
            this.gauges.set(name, { value: 0, labels: new Map() });
        }

        const gauge = this.gauges.get(name)!;

        if (Object.keys(labels).length === 0) {
            gauge.value += value;
        } else {
            const labelKey = this.serializeLabels(labels);
            const current = gauge.labels.get(labelKey) || 0;
            gauge.labels.set(labelKey, current + value);
        }
    }

    /**
     * Decrement a gauge metric
     */
    decrementGauge(name: string, value: number, labels: Record<string, string> = {}): void {
        this.incrementGauge(name, -value, labels);
    }

    /**
     * Get current value of a counter
     */
    getCounter(name: string, labels: Record<string, string> = {}): number {
        const counter = this.counters.get(name);
        if (!counter) return 0;

        if (Object.keys(labels).length === 0) {
            return counter.value;
        }

        const labelKey = this.serializeLabels(labels);
        return counter.labels.get(labelKey) || 0;
    }

    /**
     * Get current value of a gauge
     */
    getGauge(name: string, labels: Record<string, string> = {}): number {
        const gauge = this.gauges.get(name);
        if (!gauge) return 0;

        if (Object.keys(labels).length === 0) {
            return gauge.value;
        }

        const labelKey = this.serializeLabels(labels);
        return gauge.labels.get(labelKey) || 0;
    }

    /**
     * Reset all metrics (useful for testing)
     */
    reset(): void {
        this.counters.clear();
        this.histograms.clear();
        this.gauges.clear();
    }

    /**
     * Garbage collect stale label combinations to prevent unbounded memory growth.
     * Removes label entries with zero values from counters and gauges,
     * and caps the maximum number of unique label combinations per metric.
     */
    gc(maxLabelsPerMetric = 500): { pruned: number } {
        let pruned = 0;

        for (const [, counter] of this.counters) {
            // Prune zero-value labels
            for (const [labelKey, value] of counter.labels) {
                if (value === 0) {
                    counter.labels.delete(labelKey);
                    pruned++;
                }
            }
            // Cap labels
            if (counter.labels.size > maxLabelsPerMetric) {
                const entries = Array.from(counter.labels.entries())
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, maxLabelsPerMetric);
                pruned += counter.labels.size - entries.length;
                counter.labels = new Map(entries);
            }
        }

        for (const [, gauge] of this.gauges) {
            for (const [labelKey, value] of gauge.labels) {
                if (value === 0) {
                    gauge.labels.delete(labelKey);
                    pruned++;
                }
            }
            if (gauge.labels.size > maxLabelsPerMetric) {
                const entries = Array.from(gauge.labels.entries())
                    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                    .slice(0, maxLabelsPerMetric);
                pruned += gauge.labels.size - entries.length;
                gauge.labels = new Map(entries);
            }
        }

        for (const [, histogram] of this.histograms) {
            if (histogram.labels.size > maxLabelsPerMetric) {
                const entries = Array.from(histogram.labels.entries())
                    .sort(([, a], [, b]) => b.count - a.count)
                    .slice(0, maxLabelsPerMetric);
                pruned += histogram.labels.size - entries.length;
                histogram.labels = new Map(entries);
            }
        }

        return { pruned };
    }

    /**
     * Serialize label object to a consistent string key
     */
    private serializeLabels(labels: Record<string, string>): string {
        return Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
    }

    /**
     * Parse serialized labels back to object
     */
    private parseLabels(serialized: string): Record<string, string> {
        if (!serialized) return {};

        const labels: Record<string, string> = {};
        const pairs = serialized.split(',');

        for (const pair of pairs) {
            const match = pair.match(/^(.+)="(.+)"$/);
            if (match) {
                labels[match[1]] = match[2];
            }
        }

        return labels;
    }

    /**
     * Generate Prometheus text exposition format
     */
    getMetricsText(): string {
        const lines: string[] = [];

        // Counters
        const counterEntries = Array.from(this.counters.entries());
        for (const [name, counter] of counterEntries) {
            lines.push(`# HELP ${name} Total count of ${name}`);
            lines.push(`# TYPE ${name} counter`);

            if (counter.value > 0) {
                lines.push(`${name} ${counter.value}`);
            }

            const counterLabelEntries = Array.from(counter.labels.entries());
            for (const [labelKey, value] of counterLabelEntries) {
                lines.push(`${name}{${labelKey}} ${value}`);
            }
        }

        // Histograms
        const histogramEntries = Array.from(this.histograms.entries());
        for (const [name, histogram] of histogramEntries) {
            lines.push(`# HELP ${name} Histogram of ${name}`);
            lines.push(`# TYPE ${name} histogram`);

            // No-label histograms
            if (histogram.count > 0) {
                const bucketEntries = Array.from(histogram.buckets.entries());
                for (const [bucket, count] of bucketEntries) {
                    lines.push(`${name}_bucket{le="${bucket}"} ${count}`);
                }
                lines.push(`${name}_bucket{le="+Inf"} ${histogram.count}`);
                lines.push(`${name}_sum ${histogram.sum}`);
                lines.push(`${name}_count ${histogram.count}`);
            }

            // Labeled histograms
            const labelEntries = Array.from(histogram.labels.entries());
            for (const [labelKey, metric] of labelEntries) {
                const metricBucketEntries = Array.from(metric.buckets.entries());
                for (const [bucket, count] of metricBucketEntries) {
                    lines.push(`${name}_bucket{${labelKey},le="${bucket}"} ${count}`);
                }
                lines.push(`${name}_bucket{${labelKey},le="+Inf"} ${metric.count}`);
                lines.push(`${name}_sum{${labelKey}} ${metric.sum}`);
                lines.push(`${name}_count{${labelKey}} ${metric.count}`);
            }
        }

        // Gauges
        const gaugeEntries = Array.from(this.gauges.entries());
        for (const [name, gauge] of gaugeEntries) {
            lines.push(`# HELP ${name} Current value of ${name}`);
            lines.push(`# TYPE ${name} gauge`);

            if (gauge.value !== 0 || gauge.labels.size === 0) {
                lines.push(`${name} ${gauge.value}`);
            }

            const gaugeLabelEntries = Array.from(gauge.labels.entries());
            for (const [labelKey, value] of gaugeLabelEntries) {
                lines.push(`${name}{${labelKey}} ${value}`);
            }
        }

        return lines.join('\n') + '\n';
    }
}

// Global metrics instance
const metrics = new MetricsCollector();

// Periodic garbage collection every 5 minutes to prevent unbounded memory growth
const GC_INTERVAL_MS = 5 * 60 * 1000;
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
    setInterval(() => {
        const { pruned } = metrics.gc();
        if (pruned > 0) {
            console.log(`[Metrics] GC pruned ${pruned} stale label combinations`);
        }
    }, GC_INTERVAL_MS);
}

// Exported functions
export function incrementCounter(
    name: string,
    labels: Record<string, string> = {},
    value = 1
): void {
    metrics.incrementCounter(name, labels, value);
}

export function observeHistogram(
    name: string,
    value: number,
    labels: Record<string, string> = {},
    buckets?: number[]
): void {
    metrics.observeHistogram(name, value, labels, buckets);
}

export function setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    metrics.setGauge(name, value, labels);
}

export function incrementGauge(
    name: string,
    value: number,
    labels: Record<string, string> = {}
): void {
    metrics.incrementGauge(name, value, labels);
}

export function decrementGauge(
    name: string,
    value: number,
    labels: Record<string, string> = {}
): void {
    metrics.decrementGauge(name, value, labels);
}

export function getCounter(name: string, labels: Record<string, string> = {}): number {
    return metrics.getCounter(name, labels);
}

export function getGauge(name: string, labels: Record<string, string> = {}): number {
    return metrics.getGauge(name, labels);
}

export function getMetricsText(): string {
    return metrics.getMetricsText();
}

export function resetMetrics(): void {
    metrics.reset();
}

// Export bucket constants for use in other modules
export { HTTP_DURATION_BUCKETS, SIZE_BUCKETS, AI_DURATION_BUCKETS };
