/**
 * Chaos Testing Framework for Resilience Verification
 *
 * Provides fault injection capabilities to test system resilience:
 * - Latency injection
 * - Error simulation
 * - Timeout forcing
 * - Resource exhaustion
 * - Network partitions
 * - Data corruption
 */

export type FaultType =
    | 'latency'
    | 'error'
    | 'timeout'
    | 'resource_exhaustion'
    | 'network_partition'
    | 'data_corruption';

export type FaultTarget =
    | 'database'
    | 'cache'
    | 'ai_provider'
    | 'memory_store'
    | 'webhook'
    | 'auth_service';

export interface LatencyConfig {
    minMs: number;
    maxMs: number;
}

export interface ErrorConfig {
    errorRate: number; // 0-1
    errorType?: string;
}

export interface TimeoutConfig {
    timeoutMs: number;
}

export interface ResourceExhaustionConfig {
    utilizationPercent: number; // 0-100
}

export type FaultConfig =
    | LatencyConfig
    | ErrorConfig
    | TimeoutConfig
    | ResourceExhaustionConfig
    | Record<string, unknown>;

export interface Fault {
    id: string;
    target: FaultTarget;
    type: FaultType;
    config: FaultConfig;
    injectedAt: number;
}

export interface RecoveryEvent {
    target: FaultTarget;
    recoveryTimeMs: number;
    timestamp: number;
}

export interface ResilienceTestResult {
    scenarioName: string;
    passed: boolean;
    duration: number;
    errors: string[];
    metrics: Record<string, unknown>;
}

// In-memory storage
const faults = new Map<string, Fault>();
let recoveryEvents: RecoveryEvent[] = [];
let resilienceTestResults: ResilienceTestResult[] = [];
let faultCounter = 0;

/**
 * Generate unique fault ID
 */
function generateFaultId(): string {
    return `fault_${++faultCounter}`;
}

/**
 * Inject a fault into the system
 */
export function injectFault(
    target: FaultTarget,
    faultType: FaultType,
    config: FaultConfig = {}
): string {
    const faultId = generateFaultId();
    const fault: Fault = {
        id: faultId,
        target,
        type: faultType,
        config,
        injectedAt: Date.now(),
    };
    faults.set(faultId, fault);
    return faultId;
}

/**
 * Remove a specific fault
 */
export function removeFault(faultId: string): boolean {
    return faults.delete(faultId);
}

/**
 * Remove all active faults
 */
export function removeAllFaults(): void {
    faults.clear();
}

/**
 * Get all active faults
 */
export function getActiveFaults(): Fault[] {
    return Array.from(faults.values());
}

/**
 * Check if a target has any active faults
 */
export function isFaultActive(target: FaultTarget): boolean {
    return Array.from(faults.values()).some((fault) => fault.target === target);
}

/**
 * Get fault configuration for a specific target
 */
export function getFaultConfig(target: FaultTarget): FaultConfig | null {
    const fault = Array.from(faults.values()).find((f) => f.target === target);
    return fault ? fault.config : null;
}

/**
 * Simulate random latency on a target
 */
export function simulateLatency(target: FaultTarget, minMs: number, maxMs: number): string {
    return injectFault(target, 'latency', { minMs, maxMs });
}

/**
 * Simulate random errors at a given rate
 */
export function simulateError(target: FaultTarget, errorRate: number, errorType?: string): string {
    return injectFault(target, 'error', { errorRate, errorType });
}

/**
 * Force timeouts on a target
 */
export function simulateTimeout(target: FaultTarget, timeoutMs: number): string {
    return injectFault(target, 'timeout', { timeoutMs });
}

/**
 * Simulate resource exhaustion
 */
export function simulateResourceExhaustion(
    target: FaultTarget,
    utilizationPercent: number
): string {
    return injectFault(target, 'resource_exhaustion', { utilizationPercent });
}

/**
 * Run a resilience test scenario
 */
export async function runResilienceTest(
    scenarioName: string,
    testFn: () => Promise<void>
): Promise<ResilienceTestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let passed = false;

    try {
        await testFn();
        passed = true;
    } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
    }

    const duration = Date.now() - startTime;
    const result: ResilienceTestResult = {
        scenarioName,
        passed,
        duration,
        errors,
        metrics: {
            activeFaults: getActiveFaults().length,
            recoveryEvents: recoveryEvents.length,
        },
    };

    resilienceTestResults.push(result);
    return result;
}

/**
 * Get aggregate resilience report
 */
export function getResilienceReport(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageDuration: number;
    resilienceScore: number;
} {
    const totalTests = resilienceTestResults.length;
    const passedTests = resilienceTestResults.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;
    const averageDuration =
        totalTests > 0
            ? resilienceTestResults.reduce((sum, r) => sum + r.duration, 0) / totalTests
            : 0;

    return {
        totalTests,
        passedTests,
        failedTests,
        averageDuration,
        resilienceScore: getResilienceScore(),
    };
}

/**
 * Measure time to recover after fault removal
 */
export function getRecoveryTime(target: FaultTarget): number | null {
    const targetEvents = recoveryEvents.filter((e) => e.target === target);
    if (targetEvents.length === 0) return null;

    // Return most recent recovery time
    return targetEvents[targetEvents.length - 1].recoveryTimeMs;
}

/**
 * Record a recovery event
 */
export function recordRecovery(target: FaultTarget, recoveryTimeMs: number): void {
    recoveryEvents.push({
        target,
        recoveryTimeMs,
        timestamp: Date.now(),
    });
}

/**
 * Calculate overall resilience score (0-100)
 * Based on:
 * - Test pass rate (40%)
 * - Recovery times (30%)
 * - Error handling coverage (30%)
 */
export function getResilienceScore(): number {
    if (resilienceTestResults.length === 0) return 100;

    // Test pass rate component (40 points)
    const passRate =
        resilienceTestResults.filter((r) => r.passed).length / resilienceTestResults.length;
    const passRateScore = passRate * 40;

    // Recovery time component (30 points)
    // Faster recovery = higher score
    // Target: < 1000ms = full points, > 5000ms = 0 points
    let recoveryScore = 30;
    if (recoveryEvents.length > 0) {
        const avgRecoveryTime =
            recoveryEvents.reduce((sum, e) => sum + e.recoveryTimeMs, 0) / recoveryEvents.length;
        if (avgRecoveryTime < 1000) {
            recoveryScore = 30;
        } else if (avgRecoveryTime > 5000) {
            recoveryScore = 0;
        } else {
            // Linear scale between 1000-5000ms
            recoveryScore = 30 * (1 - (avgRecoveryTime - 1000) / 4000);
        }
    }

    // Error handling coverage component (30 points)
    // More unique fault types tested = better coverage
    const uniqueFaultTypes = new Set(
        resilienceTestResults.flatMap((_r) => getActiveFaults().map((f) => f.type))
    ).size;
    const maxFaultTypes = 6; // total fault types available
    const coverageScore = (uniqueFaultTypes / maxFaultTypes) * 30;

    return Math.round(passRateScore + recoveryScore + coverageScore);
}

/**
 * Clear all chaos state (for testing)
 */
export function clearChaos_forTesting(): void {
    faults.clear();
    recoveryEvents = [];
    resilienceTestResults = [];
    faultCounter = 0;
}
