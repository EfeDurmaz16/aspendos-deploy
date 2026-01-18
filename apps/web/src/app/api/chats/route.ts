import { prisma } from '@aspendos/db';
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * GET /api/chats - List user's chats
 * POST /api/chats - Create new chat
 */

export async function GET(req: NextRequest) {
    const session = await auth();

    if (!session?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const cursor = searchParams.get('cursor');
        const archived = searchParams.get('archived') === 'true';

        const chats = await prisma.chat.findMany({
            where: {
                userId: session.userId,
                isArchived: archived,
            },
            take: limit + 1,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: { select: { messages: true } },
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                    select: { content: true, createdAt: true },
                },
            },
        });

        let nextCursor: string | undefined;
        if (chats.length > limit) {
            const nextItem = chats.pop();
            nextCursor = nextItem?.id;
        }

        return NextResponse.json({
            chats: chats.map((chat) => ({
                id: chat.id,
                title: chat.title,
                description: chat.description,
                messageCount: chat._count.messages,
                lastMessage: chat.messages[0]?.content?.slice(0, 100),
                lastMessageAt: chat.messages[0]?.createdAt,
                createdAt: chat.createdAt,
                updatedAt: chat.updatedAt,
            })),
            nextCursor,
        });
    } catch (error) {
        console.error('[API /chats GET] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { title = 'New Chat', modelPreference } = body;

        const chat = await prisma.chat.create({
            data: {
                userId: session.userId,
                title,
                modelPreference,
            },
        });

        return NextResponse.json(
            {
                id: chat.id,
                title: chat.title,
                createdAt: chat.createdAt,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('[API /chats POST] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
