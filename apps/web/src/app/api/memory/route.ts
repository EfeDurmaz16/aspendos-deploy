export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const MEMORY_ROUTE_DISABLED = {
    error: 'Web memory route is not wired to Convex/SuperMemory',
    detail: 'Use the API service memory endpoints until this route is reconnected.',
};

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
        if (!query) {
            return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
        }

        return NextResponse.json(MEMORY_ROUTE_DISABLED, { status: 501 });
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
        const { content } = body;

        if (!content?.trim()) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        return NextResponse.json(MEMORY_ROUTE_DISABLED, { status: 501 });
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
        return NextResponse.json(MEMORY_ROUTE_DISABLED, { status: 501 });
    } catch (error) {
        console.error('[API /memory DELETE] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
