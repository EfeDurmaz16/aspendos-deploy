import { type NextRequest, NextResponse } from 'next/server';

const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/pricing',
    '/terms',
    '/privacy',
    '/landing',
    '/yula',
    '/callback',
    '/features',
    '/verify-email',
    '/forgot-password',
    '/onboarding',
    '/import',
    '/compare',
];

const publicApiPrefixes = ['/api/auth/', '/api/webhooks/', '/api/health', '/api/verify/'];

function isPublic(pathname: string): boolean {
    if (publicRoutes.includes(pathname)) return true;
    if (publicRoutes.some((r) => pathname.startsWith(`${r}/`))) return true;
    if (publicApiPrefixes.some((p) => pathname.startsWith(p))) return true;
    return false;
}

function generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
}

function buildCSP(nonce: string): string {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.yula.dev';
    return [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}'`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://*.supabase.co https://avatars.githubusercontent.com",
        "font-src 'self' data:",
        `connect-src 'self' ${apiUrl} https://yula.dev https://www.yula.dev https://us.i.posthog.com`,
        "frame-src 'self'",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        'upgrade-insecure-requests',
    ].join('; ');
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const nonce = generateNonce();

    function withCSP(response: NextResponse): NextResponse {
        if (process.env.NODE_ENV === 'production') {
            response.headers.set('Content-Security-Policy', buildCSP(nonce));
        }
        response.headers.set('x-nonce', nonce);
        return response;
    }

    if (isPublic(pathname)) {
        return withCSP(NextResponse.next({ headers: { 'x-nonce': nonce } }));
    }

    if (process.env.WORKOS_CLIENT_ID && process.env.WORKOS_API_KEY) {
        const sessionCookie = request.cookies.get('wos-session');
        if (!sessionCookie?.value) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('returnTo', pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return withCSP(NextResponse.next({ headers: { 'x-nonce': nonce } }));
}

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};
