import { type NextRequest, NextResponse } from 'next/server';
import { authInstance } from '@/lib/auth';

// Define public page routes that don't require authentication
const publicPageRoutes = ['/', '/login', '/signup', '/pricing', '/terms', '/privacy', '/landing', '/yula'];

// Define public API routes (auth endpoints, webhooks, health checks)
const publicApiPrefixes = ['/api/auth/', '/api/webhooks/', '/api/health'];

// Define protected page routes that require authentication
const protectedPagePrefixes = ['/chat', '/memory', '/billing', '/settings', '/analytics'];

function isPublicPageRoute(pathname: string): boolean {
    // Check exact public page routes
    return publicPageRoutes.includes(pathname);
}

function isPublicApiRoute(pathname: string): boolean {
    // Check public API prefixes
    return publicApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isProtectedPageRoute(pathname: string): boolean {
    return protectedPagePrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isApiRoute(pathname: string): boolean {
    return pathname.startsWith('/api/');
}

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

    // DEFAULT-DENY for all /api/* routes (unless explicitly allowed above)
    if (isApiRoute(pathname)) {
        try {
            const session = await authInstance.api.getSession({
                headers: request.headers,
            });

            if (!session?.user) {
                // Return 401 Unauthorized for API routes
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 }
                );
            }

            // Session valid, allow access
            return NextResponse.next();
        } catch (error) {
            console.error('API auth verification error:', error);
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }
    }

    // For protected page routes, verify session and redirect to login
    if (isProtectedPageRoute(pathname)) {
        try {
            const session = await authInstance.api.getSession({
                headers: request.headers,
            });

            if (!session?.user) {
                // Redirect to login with return URL
                const url = request.nextUrl.clone();
                url.pathname = '/login';
                url.searchParams.set('redirect', pathname);
                return NextResponse.redirect(url);
            }

            // Session valid, allow access
            return NextResponse.next();
        } catch (error) {
            console.error('Session verification error:', error);
            // On error, redirect to login
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            url.searchParams.set('redirect', pathname);
            return NextResponse.redirect(url);
        }
    }

    // All other page routes are allowed (e.g., /about, /demo, etc.)
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
