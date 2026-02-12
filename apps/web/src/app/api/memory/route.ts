import { type NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createEmbedding } from '@/lib/ai';
import { auth } from '@/lib/auth';
import { deleteUserMemories, searchMemories, storeMemory } from '@/lib/services/qdrant';

/**
 * GET /api/memory?q=query - Search user memories
 * POST /api/memory - Store new memory
 * DELETE /api/memory - Clear all memories
 */

export async function GET(req: NextRequest) {
    const session = await auth();

    if (!session?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const type = searchParams.get('type') as 'context' | 'preference' | 'insight' | undefined;

        if (!query) {
            return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
        }

        const queryEmbedding = await createEmbedding(query);
        const memories = await searchMemories(session.userId, queryEmbedding, limit, type);

        return NextResponse.json({ memories });
    } catch (error) {
        console.error('[API /memory GET] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { content, type = 'context', conversationId, metadata } = body;

        if (!content?.trim()) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const embedding = await createEmbedding(content);
        const memoryId = uuidv4();

        await storeMemory({
            id: memoryId,
            vector: embedding,
            userId: session.userId,
            content,
            type,
            conversationId,
            metadata,
        });

        return NextResponse.json(
            { id: memoryId, message: 'Memory stored successfully' },
            { status: 201 }
        );
    } catch (error) {
        console.error('[API /memory POST] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE() {
    const session = await auth();

    if (!session?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await deleteUserMemories(session.userId);
        return NextResponse.json({ message: 'All memories cleared' });
    } catch (error) {
        console.error('[API /memory DELETE] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
