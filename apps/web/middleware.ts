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
 * Lightweight Edge-compatible middleware.
 * Only checks cookie presence - actual session validation happens server-side.
 * This avoids importing Prisma/Better Auth which use Node.js APIs unsupported in Edge Runtime.
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public page routes
    if (isPublicPageRoute(pathname)) {
        return NextResponse.next();
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
        return NextResponse.next();
    }

    // All other page routes are allowed
    return NextResponse.next();
}

export const config = {
    matcher: [
        // Skip Next.js internals and static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
