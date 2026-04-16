import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function middleware(request: NextRequest) {
    // Skip Clerk middleware if not configured
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
        return NextResponse.next();
    }

    const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server');

    const isPublicRoute = createRouteMatcher([
        '/',
        '/login(.*)',
        '/signup(.*)',
        '/pricing',
        '/privacy',
        '/terms',
        '/compare(.*)',
        '/features(.*)',
        '/landing(.*)',
        '/api/health',
        '/api/billing/webhook',
        '/api/webhooks(.*)',
        '/api/tools',
        '/api/bot(.*)',
        '/opengraph-image',
        '/twitter-image',
        '/sitemap.xml',
        '/robots.txt',
        '/offline',
        '/forgot-password',
        '/reset-password',
        '/verify-email',
    ]);

    const handler = clerkMiddleware(async (auth, req) => {
        if (!isPublicRoute(req)) {
            await auth.protect();
        }
    });

    return handler(request, {} as any);
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$).*)',
    ],
};
