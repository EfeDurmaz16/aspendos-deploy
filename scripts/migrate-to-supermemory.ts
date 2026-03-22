#!/usr/bin/env bun
/**
 * SuperMemory Migration Script
 *
 * Migrates existing user memories from PostgreSQL to SuperMemory.
 * PostgreSQL remains the source of truth throughout the migration.
 *
 * Usage:
 *   bun run scripts/migrate-to-supermemory.ts [--dry-run] [--user-id <id>] [--batch-size <n>]
 *
 * Requirements:
 *   - SUPERMEMORY_API_KEY env var must be set
 *   - DATABASE_URL env var must be set
 *   - SuperMemory account with sufficient quota
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// CONFIG
// ============================================

const MEMORY_BATCH_SIZE = 100; // SuperMemory /v4/memories supports 1-100 per call
const DELAY_BETWEEN_BATCHES_MS = 500;
const SUPERMEMORY_API_URL = 'https://api.supermemory.ai';

interface MigrationOptions {
    dryRun: boolean;
    userId?: string;
    batchSize: number;
}

interface MigrationStats {
    totalUsers: number;
    totalMemories: number;
    migrated: number;
    skipped: number;
    failed: number;
    errors: string[];
}

// ============================================
// SUPERMEMORY API CALLS
// ============================================

const apiKey = process.env.SUPERMEMORY_API_KEY;

async function smCreateMemories(
    containerTag: string,
    memories: Array<{ content: string; metadata?: Record<string, unknown> }>
): Promise<{ success: boolean; error?: string }> {
    if (!apiKey) throw new Error('SUPERMEMORY_API_KEY not set');

    const response = await fetch(`${SUPERMEMORY_API_URL}/v4/memories`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            memories: memories.map((m) => ({
                content: m.content,
                metadata: m.metadata,
            })),
            containerTags: [containerTag],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    return { success: true };
}

async function smAddDocumentsBatch(
    containerTag: string,
    documents: Array<{ content: string; metadata?: Record<string, unknown> }>
): Promise<{ success: boolean; error?: string }> {
    if (!apiKey) throw new Error('SUPERMEMORY_API_KEY not set');

    const response = await fetch(`${SUPERMEMORY_API_URL}/v3/documents/batch`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            documents: documents.map((d) => ({
                content: d.content,
                metadata: d.metadata,
            })),
            containerTags: [containerTag],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    return { success: true };
}

// ============================================
// MIGRATION LOGIC
// ============================================

async function migrateUser(
    userId: string,
    stats: MigrationStats,
    options: MigrationOptions
): Promise<void> {
    const containerTag = `user_${userId}`;

    // Get all active memories for this user
    const memories = await prisma.memory.findMany({
        where: {
            userId,
            isActive: true,
            source: { notIn: ['supermemory_migrated'] }, // Skip already migrated
        },
        orderBy: { createdAt: 'asc' },
    });

    if (memories.length === 0) {
        console.log(`  [${userId}] No memories to migrate`);
        return;
    }

    console.log(`  [${userId}] Found ${memories.length} memories to migrate`);
    stats.totalMemories += memories.length;

    // Process in batches
    for (let i = 0; i < memories.length; i += options.batchSize) {
        const batch = memories.slice(i, i + options.batchSize);
        const batchNum = Math.floor(i / options.batchSize) + 1;
        const totalBatches = Math.ceil(memories.length / options.batchSize);

        console.log(`  [${userId}] Batch ${batchNum}/${totalBatches} (${batch.length} memories)`);

        if (options.dryRun) {
            stats.migrated += batch.length;
            continue;
        }

        // Prepare memories for SuperMemory
        const smMemories = batch.map((m) => ({
            content: m.content,
            metadata: {
                sector: m.sector || 'semantic',
                originalId: m.id,
                confidence: m.confidence,
                source: 'migration',
                tags: m.tags,
                createdAt: m.createdAt.toISOString(),
            },
        }));

        // Try /v4/memories first (for extracted facts), fall back to /v3/documents/batch
        const result =
            batch.length <= 100
                ? await smCreateMemories(containerTag, smMemories)
                : await smAddDocumentsBatch(containerTag, smMemories);

        if (result.success) {
            // Mark as migrated in PostgreSQL
            const ids = batch.map((m) => m.id);
            await prisma.memory.updateMany({
                where: { id: { in: ids } },
                data: { source: 'supermemory_migrated' },
            });
            stats.migrated += batch.length;
        } else {
            const errorMsg = `[${userId}] Batch ${batchNum} failed: ${result.error}`;
            console.error(`  ${errorMsg}`);
            stats.failed += batch.length;
            stats.errors.push(errorMsg);
        }

        // Delay between batches to avoid rate limits
        if (i + options.batchSize < memories.length) {
            await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
        }
    }
}

async function migrate(options: MigrationOptions): Promise<MigrationStats> {
    const stats: MigrationStats = {
        totalUsers: 0,
        totalMemories: 0,
        migrated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
    };

    console.log('=== SuperMemory Migration ===');
    console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Batch size: ${options.batchSize}`);
    if (options.userId) console.log(`User filter: ${options.userId}`);
    console.log('');

    // Get users with active memories
    const userFilter = options.userId ? { userId: options.userId } : {};
    const usersWithMemories = await prisma.memory.groupBy({
        by: ['userId'],
        where: {
            isActive: true,
            source: { notIn: ['supermemory_migrated'] },
            ...userFilter,
        },
        _count: { id: true },
    });

    stats.totalUsers = usersWithMemories.length;
    console.log(`Found ${stats.totalUsers} users with unmigrated memories\n`);

    for (const userGroup of usersWithMemories) {
        try {
            await migrateUser(userGroup.userId, stats, options);
        } catch (error) {
            const errorMsg = `User ${userGroup.userId} failed: ${error instanceof Error ? error.message : 'Unknown'}`;
            console.error(`  ${errorMsg}`);
            stats.errors.push(errorMsg);
        }
    }

    return stats;
}

// ============================================
// CLI ENTRY POINT
// ============================================

async function main() {
    const args = process.argv.slice(2);
    const options: MigrationOptions = {
        dryRun: args.includes('--dry-run'),
        batchSize: MEMORY_BATCH_SIZE,
    };

    const userIdIdx = args.indexOf('--user-id');
    if (userIdIdx !== -1 && args[userIdIdx + 1]) {
        options.userId = args[userIdIdx + 1];
    }

    const batchIdx = args.indexOf('--batch-size');
    if (batchIdx !== -1 && args[batchIdx + 1]) {
        options.batchSize = Math.min(
            100,
            Math.max(1, parseInt(args[batchIdx + 1], 10) || MEMORY_BATCH_SIZE)
        );
    }

    if (!options.dryRun && !apiKey) {
        console.error('ERROR: SUPERMEMORY_API_KEY is required for live migration.');
        console.error('Use --dry-run to simulate without an API key.');
        process.exit(1);
    }

    try {
        const stats = await migrate(options);

        console.log('\n=== Migration Summary ===');
        console.log(`Users processed: ${stats.totalUsers}`);
        console.log(`Total memories:  ${stats.totalMemories}`);
        console.log(`Migrated:        ${stats.migrated}`);
        console.log(`Failed:          ${stats.failed}`);
        console.log(`Skipped:         ${stats.skipped}`);

        if (stats.errors.length > 0) {
            console.log(`\nErrors (${stats.errors.length}):`);
            for (const err of stats.errors.slice(0, 20)) {
                console.log(`  - ${err}`);
            }
            if (stats.errors.length > 20) {
                console.log(`  ... and ${stats.errors.length - 20} more`);
            }
        }

        if (options.dryRun) {
            console.log('\n[DRY RUN] No changes were made. Run without --dry-run to migrate.');
        }
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
