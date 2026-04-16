/**
 * Import Embedding Worker
 *
 * Background worker that processes pending import memories by creating
 * embeddings via SuperMemory and updating the Convex records.
 *
 * Memories are stored instantly during import via Convex memories table.
 * This worker picks them up and creates embeddings lazily in batches.
 */

import { getConvexClient, api } from '../lib/convex';
import * as openMemory from './memory-router.service';

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

/**
 * Process pending import memories for a given user/job.
 * Creates embeddings via SuperMemory and updates the Convex record.
 */
export async function processImportEmbeddings(
    userId: string,
    jobId: string
): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    try {
        const client = getConvexClient();

        // Fetch all memories for this user from Convex
        const allMemories = await client.query(api.memories.listByUser, {
            user_id: userId as any,
            limit: 500,
        });

        // Filter to pending import memories (source starts with 'import')
        const pendingMemories = allMemories.filter(
            (m) => m.source && m.source.startsWith('import') && m.source !== 'import_synced'
        );

        if (pendingMemories.length === 0) {
            return { processed: 0, failed: 0 };
        }

        console.log(
            `[ImportEmbedding] Processing ${pendingMemories.length} pending memories for job ${jobId}`
        );

        // Process in batches using batch upsert
        for (let i = 0; i < pendingMemories.length; i += BATCH_SIZE) {
            const batch = pendingMemories.slice(i, i + BATCH_SIZE);

            // Batch upsert to SuperMemory
            const batchItems = batch.map((memory) => ({
                content: memory.content_preview || '',
                sector: 'episodic',
                tags: ['imported', jobId],
                metadata: {
                    type: 'context',
                    convexId: memory._id,
                },
            }));

            const batchResult = await openMemory.addMemoriesBatch(batchItems, userId, {
                batchSize: BATCH_SIZE,
                delayMs: 100,
            });

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
    } catch (error) {
        console.error('[ImportEmbedding] processImportEmbeddings failed:', error);
        return { processed, failed };
    }
}
