/**
 * YULA AI Embeddings Module
 *
 * Text embeddings using Vercel AI SDK with OpenAI.
 */

import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

// ============================================
// EMBEDDING OPERATIONS
// ============================================

/**
 * Create embedding for a single text
 */
export async function createEmbedding(text: string): Promise<number[]> {
    const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: text,
    });

    return embedding;
}

/**
 * Create embeddings for multiple texts (batch)
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
    const { embeddings } = await embedMany({
        model: openai.embedding('text-embedding-3-small'),
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
