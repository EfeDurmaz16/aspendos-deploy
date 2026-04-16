import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware({
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
        ],
    },
});

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$).*)',
    ],
};
