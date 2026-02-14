import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
    type AspendosExport,
    detectExportFormat,
    importAspendosExport,
    ingestConversations,
    parseChatGPTExport,
    parseClaudeExport,
} from '@/lib/memory/ingest';

/**
 * POST /api/memory/import - Import conversations from ChatGPT, Claude, or Aspendos
 */
export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { data } = body;

        if (!data) {
            return NextResponse.json({ error: 'Data is required' }, { status: 400 });
        }

        // Detect format
        const format = detectExportFormat(data);

        if (format === 'unknown') {
            return NextResponse.json(
                {
                    error: 'Unknown export format. Please upload a ChatGPT, Claude, or Yula export file.',
                },
                { status: 400 }
            );
        }

        let result: { success: number; failed: number };
        let conversationCount = 0;
        let messageCount = 0;

        if (format === 'chatgpt') {
            const parsed = parseChatGPTExport(data);
            conversationCount = parsed.conversations.length;
            messageCount = parsed.messageCount;
            result = await ingestConversations(session.userId, parsed.conversations, 'chatgpt');
        } else if (format === 'claude') {
            const parsed = parseClaudeExport(data);
            conversationCount = parsed.conversations.length;
            messageCount = parsed.messageCount;
            result = await ingestConversations(session.userId, parsed.conversations, 'claude');
        } else if (format === 'aspendos') {
            const exportData = data as AspendosExport;
            conversationCount = exportData.memories.length;
            messageCount = exportData.memories.length;
            result = await importAspendosExport(session.userId, exportData);
        } else {
            return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
        }

        return NextResponse.json({
            format,
            conversationCount,
            messageCount,
            ...result,
        });
    } catch (error) {
        console.error('[API /memory/import] Error:', error);
        return NextResponse.json({ error: 'Import failed' }, { status: 500 });
    }
}
