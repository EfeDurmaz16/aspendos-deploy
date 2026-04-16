import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearBackups_forTesting,
    getBackupHealth,
    getBackupHistory,
    getLastBackup,
    getRetentionPolicy,
    recordBackup,
    validateBackupRecency,
} from '../db-backup-strategy';

describe('db-backup-strategy', () => {
    beforeEach(() => {
        clearBackups_forTesting();
        vi.restoreAllMocks();
    });

    describe('recordBackup + getBackupHistory', () => {
        it('should record a backup and retrieve it from history', () => {
            const record = recordBackup('full', { sizeBytes: 1024, destination: 's3://backups' });

            expect(record.id).toBeDefined();
            expect(record.type).toBe('full');
            expect(record.timestamp).toBeInstanceOf(Date);
            expect(record.metadata.sizeBytes).toBe(1024);

            const history = getBackupHistory();
            expect(history).toHaveLength(1);
            expect(history[0].id).toBe(record.id);
        });

        it('should return history sorted by most recent first', () => {
            const first = recordBackup('incremental', {});
            const second = recordBackup('full', {});

            // Ensure distinct timestamps for deterministic ordering
            first.timestamp = new Date(Date.now() - 5000);
            second.timestamp = new Date(Date.now());

            const history = getBackupHistory();
            expect(history[0].id).toBe(second.id);
            expect(history[1].id).toBe(first.id);
        });

        it('should respect the limit parameter', () => {
            recordBackup('incremental', {});
            recordBackup('full', {});
            recordBackup('archive', {});

            const limited = getBackupHistory(2);
            expect(limited).toHaveLength(2);
        });

        it('should return all records when no limit is given', () => {
            recordBackup('incremental', {});
            recordBackup('full', {});
            recordBackup('archive', {});

            const all = getBackupHistory();
            expect(all).toHaveLength(3);
        });
    });

    describe('getLastBackup', () => {
        it('should return null when no backups exist', () => {
            expect(getLastBackup()).toBeNull();
            expect(getLastBackup('full')).toBeNull();
        });

        it('should return the most recent backup of any type', () => {
            const older = recordBackup('incremental', {});
            const latest = recordBackup('full', {});

            // Ensure distinct timestamps
            older.timestamp = new Date(Date.now() - 5000);
            latest.timestamp = new Date(Date.now());

            const result = getLastBackup();
            expect(result?.id).toBe(latest.id);
        });

        it('should filter by type when specified', () => {
            const inc = recordBackup('incremental', {});
            recordBackup('full', {});

            const result = getLastBackup('incremental');
            expect(result?.id).toBe(inc.id);
            expect(result?.type).toBe('incremental');
        });

        it('should return the most recent of a given type', () => {
            const first = recordBackup('full', { notes: 'first' });
            const second = recordBackup('full', { notes: 'second' });

            // Ensure distinct timestamps
            first.timestamp = new Date(Date.now() - 5000);
            second.timestamp = new Date(Date.now());

            const result = getLastBackup('full');
            expect(result?.id).toBe(second.id);
            expect(result?.metadata.notes).toBe('second');
        });
    });

    describe('validateBackupRecency', () => {
        it('should report all false when no backups exist', () => {
            const recency = validateBackupRecency();
            expect(recency.fullCurrent).toBe(false);
            expect(recency.incrementalCurrent).toBe(false);
            expect(recency.archiveCurrent).toBe(false);
        });

        it('should report current when backups are fresh', () => {
            recordBackup('incremental', {});
            recordBackup('full', {});
            recordBackup('archive', {});

            const recency = validateBackupRecency();
            expect(recency.incrementalCurrent).toBe(true);
            expect(recency.fullCurrent).toBe(true);
            expect(recency.archiveCurrent).toBe(true);
        });

        it('should report stale when incremental is older than 1 hour', () => {
            // Record an incremental backup in the past
            const record = recordBackup('incremental', {});
            record.timestamp = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

            // Record a fresh full backup
            recordBackup('full', {});

            const recency = validateBackupRecency();
            expect(recency.incrementalCurrent).toBe(false);
            expect(recency.fullCurrent).toBe(true);
        });

        it('should report stale when full backup is older than 24 hours', () => {
            recordBackup('incremental', {});

            const fullRecord = recordBackup('full', {});
            fullRecord.timestamp = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

            const recency = validateBackupRecency();
            expect(recency.incrementalCurrent).toBe(true);
            expect(recency.fullCurrent).toBe(false);
        });
    });

    describe('getBackupHealth', () => {
        it('should return CRITICAL when no backups exist', () => {
            const health = getBackupHealth();
            expect(health.status).toBe('CRITICAL');
        });

        it('should return OK when full and incremental are current', () => {
            recordBackup('incremental', {});
            recordBackup('full', {});

            const health = getBackupHealth();
            expect(health.status).toBe('OK');
        });

        it('should return STALE when only full is current but incremental is missing', () => {
            recordBackup('full', {});

            const health = getBackupHealth();
            expect(health.status).toBe('STALE');
        });

        it('should return CRITICAL when full backup is stale', () => {
            recordBackup('incremental', {});

            const fullRecord = recordBackup('full', {});
            fullRecord.timestamp = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

            const health = getBackupHealth();
            expect(health.status).toBe('CRITICAL');
        });

        it('should transition OK -> STALE -> CRITICAL as backups age', () => {
            // Start with fresh backups: OK
            const inc = recordBackup('incremental', {});
            const full = recordBackup('full', {});

            expect(getBackupHealth().status).toBe('OK');

            // Age the incremental past 1 hour: STALE
            inc.timestamp = new Date(Date.now() - 2 * 60 * 60 * 1000);
            expect(getBackupHealth().status).toBe('STALE');

            // Age the full past 24 hours: CRITICAL
            full.timestamp = new Date(Date.now() - 25 * 60 * 60 * 1000);
            expect(getBackupHealth().status).toBe('CRITICAL');
        });

        it('should include schedule information in health response', () => {
            const health = getBackupHealth();
            expect(health.schedule).toBeDefined();
            expect(health.schedule.incremental).toBe('hourly');
            expect(health.schedule.full).toBe('daily');
            expect(health.schedule.archive).toBe('weekly');
        });
    });

    describe('getRetentionPolicy', () => {
        it('should return correct retention periods', () => {
            const policy = getRetentionPolicy();
            expect(policy.incremental.days).toBe(7);
            expect(policy.full.days).toBe(30);
            expect(policy.archive.days).toBe(365);
        });

        it('should return a copy that does not mutate the original', () => {
            const policy1 = getRetentionPolicy();
            policy1.incremental.days = 999;

            const policy2 = getRetentionPolicy();
            expect(policy2.incremental.days).toBe(7);
        });
    });

    describe('clearBackups_forTesting', () => {
        it('should reset all backup state', () => {
            recordBackup('full', {});
            recordBackup('incremental', {});
            expect(getBackupHistory()).toHaveLength(2);

            clearBackups_forTesting();
            expect(getBackupHistory()).toHaveLength(0);
            expect(getLastBackup()).toBeNull();
        });
    });
});
