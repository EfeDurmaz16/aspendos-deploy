import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    await req.text();
    return NextResponse.json(
        {
            error: 'Clerk webhooks are retired',
            code: 'CLERK_WEBHOOK_RETIRED',
            provider: 'workos',
            owner: 'apps/web/src/app/callback/route.ts',
        },
        { status: 410 }
    );
}
