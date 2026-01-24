/**
 * Import API Routes
 *
 * Handles importing chat history from ChatGPT and Claude exports.
 */
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import * as importService from '../services/import.service';

const app = new Hono();

// All routes require authentication
app.use('*', requireAuth);

/**
 * POST /api/import/jobs - Create a new import job and parse file
 *
 * Accepts JSON body with:
 * - source: 'CHATGPT' | 'CLAUDE'
 * - fileName: string
 * - fileSize: number
 * - content: parsed JSON from the export file
 */
app.post('/jobs', async (c) => {
    const userId = c.get('userId')!;
    const body = await c.req.json();

    const { source, fileName, fileSize, content } = body;

    if (!source || !['CHATGPT', 'CLAUDE'].includes(source)) {
        return c.json({ error: 'Invalid source. Must be CHATGPT or CLAUDE' }, 400);
    }

    if (!content) {
        return c.json({ error: 'content is required' }, 400);
    }

    try {
        // Create job
        const job = await importService.createImportJob(
            userId,
            source,
            fileName || 'unknown',
            fileSize || 0
        );

        // Parse content based on source
        let conversations: importService.ParsedConversation[];
        try {
            if (source === 'CHATGPT') {
                conversations = importService.parseChatGPTExport(content);
            } else {
                conversations = importService.parseClaudeExport(content);
            }
        } catch (parseError) {
            await importService.updateImportJobStatus(job.id, 'FAILED', 'Failed to parse file');
            return c.json({ error: 'Failed to parse file format' }, 400);
        }

        if (conversations.length === 0) {
            await importService.updateImportJobStatus(job.id, 'FAILED', 'No conversations found');
            return c.json({ error: 'No conversations found in file' }, 400);
        }

        // Store entities for preview
        await importService.storeImportEntities(job.id, conversations);

        // Return job with preview data
        const jobWithEntities = await importService.getImportJob(job.id, userId);

        return c.json({
            job: {
                id: jobWithEntities!.id,
                source: jobWithEntities!.source,
                status: jobWithEntities!.status,
                totalItems: jobWithEntities!.totalItems,
                fileName: jobWithEntities!.fileName,
            },
            preview: jobWithEntities!.entities.map((e) => ({
                id: e.id,
                externalId: e.externalId,
                title: e.title,
                messageCount: (e.content as { messages: unknown[] })?.messages?.length || 0,
                source: (e.content as { source: string })?.source,
                createdAt: (e.content as { createdAt: string })?.createdAt,
                updatedAt: (e.content as { updatedAt: string })?.updatedAt,
                selected: e.selected,
            })),
        }, 201);
    } catch (error) {
        console.error('Import job creation failed:', error);
        return c.json({ error: 'Failed to create import job' }, 500);
    }
});

/**
 * GET /api/import/jobs - List import jobs
 */
app.get('/jobs', async (c) => {
    const userId = c.get('userId')!;
    const limit = parseInt(c.req.query('limit') || '20', 10);

    const jobs = await importService.listImportJobs(userId, limit);

    return c.json({
        jobs: jobs.map((j) => ({
            id: j.id,
            source: j.source,
            status: j.status,
            fileName: j.fileName,
            totalItems: j.totalItems,
            importedItems: j.importedItems,
            createdAt: j.createdAt,
            completedAt: j.completedAt,
        })),
    });
});

/**
 * GET /api/import/jobs/:id - Get import job details
 */
app.get('/jobs/:id', async (c) => {
    const userId = c.get('userId')!;
    const jobId = c.req.param('id');

    const job = await importService.getImportJob(jobId, userId);

    if (!job) {
        return c.json({ error: 'Import job not found' }, 404);
    }

    return c.json({
        job: {
            id: job.id,
            source: job.source,
            status: job.status,
            fileName: job.fileName,
            fileSize: job.fileSize,
            totalItems: job.totalItems,
            importedItems: job.importedItems,
            error: job.error,
            createdAt: job.createdAt,
            completedAt: job.completedAt,
        },
        entities: job.entities.map((e) => ({
            id: e.id,
            externalId: e.externalId,
            title: e.title,
            selected: e.selected,
            imported: e.imported,
        })),
    });
});

/**
 * PATCH /api/import/jobs/:id/entities/:entityId - Update entity selection
 */
app.patch('/jobs/:id/entities/:entityId', async (c) => {
    const userId = c.get('userId')!;
    const jobId = c.req.param('id');
    const entityId = c.req.param('entityId');
    const body = await c.req.json();

    // Verify job belongs to user
    const job = await importService.getImportJob(jobId, userId);
    if (!job) {
        return c.json({ error: 'Import job not found' }, 404);
    }

    if (typeof body.selected !== 'boolean') {
        return c.json({ error: 'selected must be a boolean' }, 400);
    }

    await importService.updateEntitySelection(entityId, body.selected);

    return c.json({ success: true });
});

/**
 * POST /api/import/jobs/:id/entities/bulk-select - Bulk update entity selection
 */
app.post('/jobs/:id/entities/bulk-select', async (c) => {
    const userId = c.get('userId')!;
    const jobId = c.req.param('id');
    const body = await c.req.json();

    // Verify job belongs to user
    const job = await importService.getImportJob(jobId, userId);
    if (!job) {
        return c.json({ error: 'Import job not found' }, 404);
    }

    const { entityIds, selected } = body;

    if (!Array.isArray(entityIds) || typeof selected !== 'boolean') {
        return c.json({ error: 'entityIds array and selected boolean are required' }, 400);
    }

    for (const entityId of entityIds) {
        await importService.updateEntitySelection(entityId, selected);
    }

    return c.json({ success: true, updated: entityIds.length });
});

/**
 * POST /api/import/jobs/:id/execute - Execute import for selected entities
 */
app.post('/jobs/:id/execute', async (c) => {
    const userId = c.get('userId')!;
    const jobId = c.req.param('id');

    // Verify job belongs to user
    const job = await importService.getImportJob(jobId, userId);
    if (!job) {
        return c.json({ error: 'Import job not found' }, 404);
    }

    if (job.status === 'COMPLETED') {
        return c.json({ error: 'Import job already completed' }, 400);
    }

    if (job.status === 'PROCESSING') {
        return c.json({ error: 'Import job already in progress' }, 400);
    }

    try {
        const result = await importService.executeImport(jobId, userId);

        return c.json({
            success: true,
            result: {
                total: result.total,
                imported: result.imported,
                failed: result.failed,
            },
        });
    } catch (error) {
        console.error('Import execution failed:', error);
        return c.json({ error: 'Import execution failed' }, 500);
    }
});

/**
 * GET /api/import/stats - Get import statistics
 */
app.get('/stats', async (c) => {
    const userId = c.get('userId')!;
    const stats = await importService.getImportStats(userId);
    return c.json(stats);
});

export default app;
