import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

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

export default clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
        await auth.protect();
    }
});

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$).*)',
    ],
};
