/**
 * Import Embedding Worker
 *
 * Background worker that processes pending import memories by creating
 * embeddings via OpenMemory (Qdrant) and updating the PostgreSQL records.
 *
 * Memories are stored instantly during import with decayScore=0 and
 * source='import_pending' or 'import_extraction_pending'. This worker
 * picks them up and creates embeddings lazily in batches.
 */

import { prisma } from '../lib/prisma';
import * as openMemory from './openmemory.service';

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

/**
 * Process pending import memories for a given user/job.
 * Creates embeddings via OpenMemory and updates the PostgreSQL record.
 */
export async function processImportEmbeddings(
    userId: string,
    jobId: string
): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    // Fetch all pending import memories for this user
    const pendingMemories = await prisma.memory.findMany({
        where: {
            userId,
            decayScore: 0,
            source: { startsWith: 'import' },
            tags: { has: jobId },
        },
        orderBy: { createdAt: 'asc' },
    });

    if (pendingMemories.length === 0) {
        return { processed: 0, failed: 0 };
    }

    console.log(
        `[ImportEmbedding] Processing ${pendingMemories.length} pending memories for job ${jobId}`
    );

    // Process in batches using batch upsert
    for (let i = 0; i < pendingMemories.length; i += BATCH_SIZE) {
        const batch = pendingMemories.slice(i, i + BATCH_SIZE);

        // Batch upsert to Qdrant
        const batchItems = batch.map((memory) => ({
            content: memory.content,
            sector: memory.sector,
            tags: memory.tags,
            metadata: {
                type: memory.type,
                postgresId: memory.id,
            },
        }));

        const batchResult = await openMemory.addMemoriesBatch(batchItems, userId, {
            batchSize: BATCH_SIZE,
            delayMs: 100,
        });

        // Update PostgreSQL records for successful embeddings
        const successIds = batch.slice(0, batchResult.succeeded).map((m) => m.id);
        if (successIds.length > 0) {
            await prisma.memory.updateMany({
                where: { id: { in: successIds } },
                data: {
                    source: 'import_synced',
                    decayScore: 1.0,
                },
            });
        }

        processed += batchResult.succeeded;
        failed += batchResult.failed;

        // Delay between batches to avoid rate limits
        if (i + BATCH_SIZE < pendingMemories.length) {
            await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
        }
    }

    console.log(
        `[ImportEmbedding] Job ${jobId} complete: ${processed} processed, ${failed} failed`
    );

    return { processed, failed };
}
