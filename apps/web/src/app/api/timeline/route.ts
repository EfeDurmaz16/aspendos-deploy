import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json(
        {
            error: 'Timeline API is not wired to authenticated Convex commit history yet',
            commits: null,
        },
        { status: 501 }
    );
}
