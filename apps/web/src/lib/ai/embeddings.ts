/**
 * YULA AI Embeddings Module
 *
 * Text embeddings using Vercel AI Gateway.
 */

import { gateway } from 'ai';
import { embed, embedMany } from 'ai';

// ============================================
// EMBEDDING OPERATIONS
// ============================================

/**
 * Create embedding for a single text
 */
export async function createEmbedding(text: string): Promise<number[]> {
    const { embedding } = await embed({
        model: gateway.textEmbeddingModel('openai/text-embedding-3-small'),
        value: text,
    });

    return embedding;
}

/**
 * Create embeddings for multiple texts (batch)
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
    const { embeddings } = await embedMany({
        model: gateway.textEmbeddingModel('openai/text-embedding-3-small'),
        values: texts,
    });

    return embeddings;
}

/**
 * Get embedding dimension size (for Qdrant collection setup)
 */
export function getEmbeddingDimension(): number {
    // text-embedding-3-small produces 1536-dimensional vectors
    return 1536;
}
