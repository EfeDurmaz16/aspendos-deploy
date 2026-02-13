/**
 * Database Backup Strategy Tracker
 *
 * Tracks and manages database backup metadata for monitoring and admin visibility.
 * Backup execution is external (pg_dump, WAL archiving, etc.) - this module
 * maintains an in-memory catalog of backup events for health checks and auditing.
 */

export type BackupType = 'incremental' | 'full' | 'archive';
export type BackupHealthStatus = 'OK' | 'STALE' | 'CRITICAL';

export interface BackupMetadata {
    sizeBytes?: number;
    durationMs?: number;
    destination?: string;
    notes?: string;
}

export interface BackupRecord {
    id: string;
    type: BackupType;
    timestamp: Date;
    metadata: BackupMetadata;
}

export interface RetentionPolicy {
    incremental: { days: number };
    full: { days: number };
    archive: { days: number };
}

export interface BackupSchedule {
    incremental: string;
    full: string;
    archive: string;
}

// Retention configuration
const RETENTION_POLICY: RetentionPolicy = {
    incremental: { days: 7 },
    full: { days: 30 },
    archive: { days: 365 },
};

// Expected backup schedule
const BACKUP_SCHEDULE: BackupSchedule = {
    incremental: 'hourly',
    full: 'daily',
    archive: 'weekly',
};

// In-memory backup registry
let backupRegistry: BackupRecord[] = [];

/**
 * Record a completed backup event in the catalog.
 */
export function recordBackup(type: BackupType, metadata: BackupMetadata = {}): BackupRecord {
    const record: BackupRecord = {
        id: crypto.randomUUID(),
        type,
        timestamp: new Date(),
        metadata,
    };
    backupRegistry.push(record);
    return record;
}

/**
 * Return recent backup history, optionally limited.
 */
export function getBackupHistory(limit?: number): BackupRecord[] {
    const sorted = [...backupRegistry].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Return the most recent backup, optionally filtered by type.
 */
export function getLastBackup(type?: BackupType): BackupRecord | null {
    const filtered = type
        ? backupRegistry.filter((r) => r.type === type)
        : backupRegistry;
    if (filtered.length === 0) return null;
    return filtered.reduce((latest, current) =>
        current.timestamp.getTime() > latest.timestamp.getTime() ? current : latest
    );
}

/**
 * Validate whether backups are current based on expected schedules.
 * Full backups should be less than 24 hours old, incrementals less than 1 hour.
 */
export function validateBackupRecency(): {
    fullCurrent: boolean;
    incrementalCurrent: boolean;
    archiveCurrent: boolean;
} {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    const TWENTY_FOUR_HOURS = 24 * ONE_HOUR;
    const SEVEN_DAYS = 7 * TWENTY_FOUR_HOURS;

    const lastIncremental = getLastBackup('incremental');
    const lastFull = getLastBackup('full');
    const lastArchive = getLastBackup('archive');

    return {
        incrementalCurrent: lastIncremental
            ? now - lastIncremental.timestamp.getTime() < ONE_HOUR
            : false,
        fullCurrent: lastFull
            ? now - lastFull.timestamp.getTime() < TWENTY_FOUR_HOURS
            : false,
        archiveCurrent: lastArchive
            ? now - lastArchive.timestamp.getTime() < SEVEN_DAYS
            : false,
    };
}

/**
 * Return overall backup health status.
 * - OK: Full and incremental backups are current
 * - STALE: Incremental is missing but full is current
 * - CRITICAL: Full backup is missing or no backups at all
 */
export function getBackupHealth(): {
    status: BackupHealthStatus;
    recency: ReturnType<typeof validateBackupRecency>;
    schedule: BackupSchedule;
} {
    const recency = validateBackupRecency();

    let status: BackupHealthStatus;
    if (recency.fullCurrent && recency.incrementalCurrent) {
        status = 'OK';
    } else if (recency.fullCurrent) {
        status = 'STALE';
    } else {
        status = 'CRITICAL';
    }

    return { status, recency, schedule: BACKUP_SCHEDULE };
}

/**
 * Return the configured retention policy (deep copy to prevent mutation).
 */
export function getRetentionPolicy(): RetentionPolicy {
    return {
        incremental: { ...RETENTION_POLICY.incremental },
        full: { ...RETENTION_POLICY.full },
        archive: { ...RETENTION_POLICY.archive },
    };
}

/**
 * Reset the backup registry. For testing only.
 */
export function clearBackups_forTesting(): void {
    backupRegistry = [];
}
