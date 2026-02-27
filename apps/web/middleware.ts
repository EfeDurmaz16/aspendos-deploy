import { type NextRequest, NextResponse } from 'next/server';

// Define public page routes that don't require authentication
const publicPageRoutes = ['/', '/login', '/signup', '/pricing', '/terms', '/privacy', '/landing', '/yula'];

// Define public API routes (auth endpoints, webhooks, health checks)
const publicApiPrefixes = ['/api/auth/', '/api/webhooks/', '/api/health'];

// Define protected page routes that require authentication
const protectedPagePrefixes = ['/chat', '/memory', '/billing', '/settings', '/analytics'];

// Feature page routes (public)
const publicPagePrefixes = ['/features', '/pricing', '/verify-email', '/forgot-password', '/onboarding', '/import'];

function isPublicPageRoute(pathname: string): boolean {
    if (publicPageRoutes.includes(pathname)) return true;
    return publicPagePrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isPublicApiRoute(pathname: string): boolean {
    return publicApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isProtectedPageRoute(pathname: string): boolean {
    return protectedPagePrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isApiRoute(pathname: string): boolean {
    return pathname.startsWith('/api/');
}

/**
 * Generate a cryptographic nonce for CSP headers (Edge-compatible).
 */
function generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
}

/**
 * Build Content-Security-Policy header with nonce for script-src.
 */
function buildCSP(nonce: string): string {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.yula.dev';
    return [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' https://cdn.onesignal.com`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://cdn.onesignal.com https://*.supabase.co https://avatars.githubusercontent.com",
        "font-src 'self' data:",
        `connect-src 'self' ${apiUrl} https://yula.dev https://www.yula.dev https://onesignal.com https://api.onesignal.com wss://onesignal.com https://*.sentry.io https://*.qdrant.io wss://*.qdrant.io`,
        "frame-src 'self'",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        'upgrade-insecure-requests',
    ].join('; ');
}

/**
 * Lightweight Edge-compatible middleware.
 * Only checks cookie presence - actual session validation happens server-side.
 * This avoids importing Prisma/Better Auth which use Node.js APIs unsupported in Edge Runtime.
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Generate CSP nonce for every request
    const nonce = generateNonce();

    // Helper to create response with CSP headers
    function withCSP(response: NextResponse): NextResponse {
        if (process.env.NODE_ENV === 'production') {
            response.headers.set('Content-Security-Policy', buildCSP(nonce));
        }
        response.headers.set('x-nonce', nonce);
        return response;
    }

    // Allow public page routes
    if (isPublicPageRoute(pathname)) {
        return withCSP(NextResponse.next({ headers: { 'x-nonce': nonce } }));
    }

    // Allow public API routes (auth, webhooks, health)
    if (isPublicApiRoute(pathname)) {
        return NextResponse.next();
    }

    // Check for session cookie (lightweight, no DB call)
    const sessionCookie = request.cookies.get('better-auth.session_token');
    const hasSession = !!sessionCookie?.value;

    // API routes: return 401 if no session cookie
    if (isApiRoute(pathname)) {
        if (!hasSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.next();
    }

    // Protected page routes: redirect to login if no session cookie
    if (isProtectedPageRoute(pathname)) {
        if (!hasSession) {
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            url.searchParams.set('redirect', pathname);
            return NextResponse.redirect(url);
        }
        return withCSP(NextResponse.next({ headers: { 'x-nonce': nonce } }));
    }

    // All other page routes are allowed
    return withCSP(NextResponse.next({ headers: { 'x-nonce': nonce } }));
}

export const config = {
    matcher: [
        // Skip Next.js internals and static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
