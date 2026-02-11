import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { exportUserMemories } from '@/lib/memory/ingest';

/**
 * GET /api/memory/export - Export all user memories as JSON
 */
export async function GET() {
    const session = await auth();

    if (!session?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const exportData = await exportUserMemories(session.userId);
        return NextResponse.json(exportData);
    } catch (error) {
        console.error('[API /memory/export] Error:', error);
        return NextResponse.json(
            { error: 'Export failed' },
            { status: 500 }
        );
    }
}
