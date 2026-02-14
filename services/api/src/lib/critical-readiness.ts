import { ScheduledTaskStatus, prisma } from '@aspendos/db';
import { COUNCIL_PERSONAS } from '../services/council.service';
import * as openMemory from '../services/openmemory.service';
import { parseTimeExpression } from '../services/scheduler.service';
import { breakers } from './circuit-breaker';

type CheckStatus = 'ready' | 'degraded' | 'blocked';

interface CapabilityReport {
    status: CheckStatus;
    details: Record<string, unknown>;
}

export interface CriticalReadinessReport {
    status: CheckStatus;
    productionReady: boolean;
    timestamp: string;
    capabilities: {
        sharedMemory: CapabilityReport;
        proactiveCallback: CapabilityReport;
        council: CapabilityReport;
    };
    blockingIssues: string[];
    warnings: string[];
}

function deriveOverallStatus(statuses: CheckStatus[]): CheckStatus {
    if (statuses.includes('blocked')) return 'blocked';
    if (statuses.includes('degraded')) return 'degraded';
    return 'ready';
}

export async function checkCriticalReadiness(): Promise<CriticalReadinessReport> {
    const blockingIssues: string[] = [];
    const warnings: string[] = [];

    // 1) Shared memory readiness
    let sharedMemoryStatus: CheckStatus = 'ready';
    let memoryCount = 0;
    let memorySearchProbe = false;

    try {
        memoryCount = await prisma.memory.count();
    } catch (error) {
        sharedMemoryStatus = 'blocked';
        blockingIssues.push(
            `Memory table check failed: ${error instanceof Error ? error.message : 'unknown error'}`
        );
    }

    try {
        await openMemory.searchMemories('readiness probe', 'system-readiness', { limit: 1 });
        memorySearchProbe = true;
    } catch (error) {
        sharedMemoryStatus = 'blocked';
        blockingIssues.push(
            `Memory search probe failed: ${error instanceof Error ? error.message : 'unknown error'}`
        );
    }

    const qdrantState = breakers.qdrant.getState().state;
    const memoryFallbackMode = qdrantState === 'OPEN';
    if (sharedMemoryStatus !== 'blocked' && memoryFallbackMode) {
        sharedMemoryStatus = 'degraded';
        warnings.push('Shared memory is running in fallback mode (vector store circuit is OPEN).');
    }

    // 2) Proactive callback readiness (PAC / scheduler)
    let pacStatus: CheckStatus = 'ready';
    let pendingTasks = 0;
    let schedulerParserHealthy = false;
    const cronSecretConfigured = Boolean(process.env.CRON_SECRET);

    try {
        pendingTasks = await prisma.scheduledTask.count({
            where: { status: ScheduledTaskStatus.PENDING },
        });
    } catch (error) {
        pacStatus = 'blocked';
        blockingIssues.push(
            `Scheduled task table check failed: ${error instanceof Error ? error.message : 'unknown error'}`
        );
    }

    try {
        schedulerParserHealthy = !!parseTimeExpression('in 1 hour');
        if (!schedulerParserHealthy) {
            pacStatus = 'blocked';
            blockingIssues.push('Scheduler parser failed probe expression: "in 1 hour".');
        }
    } catch (error) {
        pacStatus = 'blocked';
        blockingIssues.push(
            `Scheduler parser probe threw: ${error instanceof Error ? error.message : 'unknown error'}`
        );
    }

    if (pacStatus !== 'blocked' && !cronSecretConfigured) {
        pacStatus = 'degraded';
        warnings.push('CRON_SECRET is missing. PAC execution endpoints are not secured for production.');
    }

    // 3) Council readiness
    let councilStatus: CheckStatus = 'ready';
    let councilSessionCount = 0;
    const personaEntries = Object.entries(COUNCIL_PERSONAS);
    const personaCount = personaEntries.length;
    const modelIds = personaEntries
        .map(([, persona]) => persona.modelId)
        .filter((modelId) => Boolean(modelId));
    const uniqueModelCount = new Set(modelIds).size;

    if (personaCount < 2) {
        councilStatus = 'blocked';
        blockingIssues.push('Council persona configuration is invalid: fewer than 2 personas.');
    }

    if (uniqueModelCount < 2) {
        councilStatus = 'blocked';
        blockingIssues.push('Council model configuration is invalid: fewer than 2 distinct models.');
    }

    try {
        councilSessionCount = await prisma.councilSession.count();
    } catch (error) {
        councilStatus = 'blocked';
        blockingIssues.push(
            `Council session table check failed: ${error instanceof Error ? error.message : 'unknown error'}`
        );
    }

    const statuses: CheckStatus[] = [sharedMemoryStatus, pacStatus, councilStatus];
    const status = deriveOverallStatus(statuses);

    return {
        status,
        productionReady: status === 'ready',
        timestamp: new Date().toISOString(),
        capabilities: {
            sharedMemory: {
                status: sharedMemoryStatus,
                details: {
                    memoryCount,
                    memorySearchProbe,
                    qdrantCircuit: qdrantState,
                    fallbackMode: memoryFallbackMode,
                    sharedContextEnabled: true,
                },
            },
            proactiveCallback: {
                status: pacStatus,
                details: {
                    pendingTasks,
                    schedulerParserHealthy,
                    cronSecretConfigured,
                },
            },
            council: {
                status: councilStatus,
                details: {
                    personaCount,
                    distinctModelCount: uniqueModelCount,
                    councilSessionCount,
                    parallelFanoutEnabled: personaCount > 1,
                },
            },
        },
        blockingIssues,
        warnings,
    };
}
