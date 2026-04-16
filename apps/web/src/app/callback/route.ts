import { NextResponse } from 'next/server';

// Clerk handles auth callbacks internally — this route redirects to chat
export async function GET() {
    return NextResponse.redirect(
        new URL('/chat', process.env.NEXT_PUBLIC_APP_URL || 'https://yula.dev')
    );
}
