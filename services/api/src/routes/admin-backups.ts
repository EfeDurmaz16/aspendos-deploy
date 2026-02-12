/**
 * Admin Backup Management Routes
 *
 * Endpoints for viewing backup history, health status, and recording
 * backup events from external backup scripts (pg_dump, WAL archiving, etc.).
 */

import { Hono } from 'hono';
import {
    getBackupHealth,
    getBackupHistory,
    getRetentionPolicy,
    recordBackup,
    type BackupType,
} from '../lib/db-backup-strategy';

const app = new Hono();

const VALID_BACKUP_TYPES: BackupType[] = ['incremental', 'full', 'archive'];

/**
 * GET /backups - List backup history (paginated)
 */
app.get('/', (c) => {
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10)));
    const history = getBackupHistory(limit);
    return c.json({ backups: history, count: history.length });
});

/**
 * GET /backups/health - Backup health status
 */
app.get('/health', (c) => {
    const health = getBackupHealth();
    return c.json(health);
});

/**
 * GET /backups/retention-policy - Current retention configuration
 */
app.get('/retention-policy', (c) => {
    return c.json({ retentionPolicy: getRetentionPolicy() });
});

/**
 * POST /backups/record - Manually record a backup event
 * Used by external backup scripts to register completed backups.
 */
app.post('/record', async (c) => {
    const body = await c.req.json();
    const { type, metadata } = body;

    if (!type || !VALID_BACKUP_TYPES.includes(type)) {
        return c.json(
            { error: `Invalid backup type. Must be one of: ${VALID_BACKUP_TYPES.join(', ')}` },
            400
        );
    }

    const record = recordBackup(type, metadata || {});
    return c.json({ success: true, backup: record });
});

export default app;
