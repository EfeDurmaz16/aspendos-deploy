import { type NextRequest, NextResponse } from 'next/server';

// WorkOS AuthKit middleware — gracefully skip if env vars are missing
export default async function middleware(request: NextRequest) {
    // Skip auth in middleware if WorkOS is not configured
    if (
        !process.env.WORKOS_CLIENT_ID ||
        !process.env.WORKOS_API_KEY ||
        !process.env.WORKOS_COOKIE_PASSWORD
    ) {
        return NextResponse.next();
    }

    try {
        const { authkitMiddleware } = await import('@workos-inc/authkit-nextjs');
        const handler = authkitMiddleware({
            middlewareAuth: {
                enabled: true,
                unauthenticatedPaths: [
                    '/',
                    '/login(.*)',
                    '/signup(.*)',
                    '/callback',
                    '/pricing',
                    '/privacy',
                    '/terms',
                    '/compare(.*)',
                    '/features(.*)',
                    '/api/health',
                    '/api/billing/webhook',
                    '/api/webhooks(.*)',
                    '/api/auth(.*)',
                    '/api/tools',
                    '/opengraph-image',
                    '/twitter-image',
                    '/sitemap.xml',
                    '/robots.txt',
                    '/offline',
                    '/forgot-password',
                    '/reset-password',
                    '/verify-email',
                ],
            },
        });
        return handler(request, {} as any);
    } catch (error) {
        console.error('[middleware] AuthKit error:', error);
        return NextResponse.next();
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
    ],
};
