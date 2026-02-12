/**
 * GDPR Compliance Routes
 * Provides endpoints for data export, account deletion, data summary, and anonymization.
 *
 * GDPR Articles covered:
 * - Art. 15: Right of Access (data summary)
 * - Art. 17: Right to Erasure (deletion with grace period)
 * - Art. 20: Data Portability (async export)
 */

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import * as userDeletionService from '../services/user-deletion.service';

type Variables = {
    userId: string | null;
};

const app = new Hono<{ Variables: Variables }>();

// ─── Export Rate Limiter (1 per hour per user) ───────────────────────────────

const exportRateLimiter = new Map<string, number>();

// Clean up expired entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, ts] of exportRateLimiter.entries()) {
        if (now - ts > 60 * 60 * 1000) {
            exportRateLimiter.delete(key);
        }
    }
}, 10 * 60_000);

const EXPORT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

// ─── POST /api/compliance/export ─────────────────────────────────────────────
// Request an async data export. Returns a job ID to poll.

app.post('/export', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    // Rate limit: 1 export request per hour
    const lastExport = exportRateLimiter.get(userId) || 0;
    if (Date.now() - lastExport < EXPORT_COOLDOWN_MS) {
        const retryAfterSec = Math.ceil((EXPORT_COOLDOWN_MS - (Date.now() - lastExport)) / 1000);
        c.header('Retry-After', String(retryAfterSec));
        return c.json(
            {
                error: 'Export rate limited. You can request one export per hour.',
                retryAfter: retryAfterSec,
            },
            429
        );
    }

    exportRateLimiter.set(userId, Date.now());

    const result = userDeletionService.queueExportJob(userId);

    return c.json(result, 202);
});

// ─── GET /api/compliance/export/:jobId ───────────────────────────────────────
// Check the status of an export job.

app.get('/export/:jobId', requireAuth, async (c) => {
    const userId = c.get('userId')!;
    const jobId = c.req.param('jobId');

    // Verify the job belongs to this user
    const owner = userDeletionService.getExportJobOwner(jobId);
    if (!owner) {
        return c.json({ error: 'Export job not found' }, 404);
    }
    if (owner !== userId) {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    const status = userDeletionService.getExportJobStatus(jobId);
    if (!status) {
        return c.json({ error: 'Export job not found' }, 404);
    }

    return c.json(status);
});

// ─── POST /api/compliance/delete-account ─────────────────────────────────────
// Schedule account deletion with a 7-day grace period.

app.post('/delete-account', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    let body: { confirm?: boolean; reason?: string };
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (body.confirm !== true) {
        return c.json(
            {
                error: 'Confirmation required. Send { "confirm": true } to proceed.',
            },
            400
        );
    }

    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : undefined;

    const result = await userDeletionService.scheduleAccountDeletion(userId, reason);

    return c.json({
        scheduledDeletionDate: result.scheduledDate.toISOString(),
        cancellationToken: result.cancellationToken,
        message:
            'Your account is scheduled for deletion. You can cancel within 7 days using the cancellation token.',
    });
});

// ─── POST /api/compliance/cancel-deletion ────────────────────────────────────
// Cancel a pending account deletion using the cancellation token.

app.post('/cancel-deletion', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    let body: { cancellationToken?: string };
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body.cancellationToken || typeof body.cancellationToken !== 'string') {
        return c.json({ error: 'cancellationToken is required' }, 400);
    }

    const cancelled = await userDeletionService.cancelDeletion(userId, body.cancellationToken);

    if (!cancelled) {
        return c.json(
            { error: 'No pending deletion found or invalid cancellation token' },
            404
        );
    }

    return c.json({
        success: true,
        message: 'Account deletion has been cancelled.',
    });
});

// ─── GET /api/compliance/data-summary ────────────────────────────────────────
// Returns a summary of all stored data for the authenticated user.

app.get('/data-summary', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    const summary = await userDeletionService.getDataSummary(userId);

    return c.json(summary);
});

// ─── POST /api/compliance/anonymize ──────────────────────────────────────────
// Anonymize the user account: strip PII but keep aggregate data.

app.post('/anonymize', requireAuth, async (c) => {
    const userId = c.get('userId')!;

    let body: { confirm?: boolean };
    try {
        body = await c.req.json();
    } catch {
        body = {};
    }

    if (body.confirm !== true) {
        return c.json(
            {
                error: 'Confirmation required. Send { "confirm": true } to proceed.',
            },
            400
        );
    }

    await userDeletionService.anonymizeUser(userId);

    return c.json({
        success: true,
        message:
            'Your account has been anonymized. All personally identifiable information has been removed.',
    });
});

/**
 * Clear export rate limiter (for testing only).
 */
export function clearExportRateLimiter_forTesting(): void {
    exportRateLimiter.clear();
}

export default app;
