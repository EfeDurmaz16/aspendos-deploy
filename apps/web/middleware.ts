import { type NextRequest, NextResponse } from 'next/server';
import { authInstance } from '@/lib/auth';

// Define public routes that don't require authentication
const publicRoutes = ['/', '/login', '/signup', '/pricing', '/terms', '/privacy'];

// Define public API routes (auth endpoints, webhooks, health checks)
const publicApiPrefixes = ['/api/auth/', '/api/webhooks/', '/api/health'];

// Define protected routes that require authentication
const protectedPrefixes = ['/chat', '/memory', '/billing', '/settings'];

function isPublicRoute(pathname: string): boolean {
    // Check exact public routes
    if (publicRoutes.includes(pathname)) {
        return true;
    }

    // Check public API prefixes
    if (publicApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
        return true;
    }

    return false;
}

function isProtectedRoute(pathname: string): boolean {
    return protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public routes
    if (isPublicRoute(pathname)) {
        return NextResponse.next();
    }

    // For protected routes, verify session
    if (isProtectedRoute(pathname)) {
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

    // All other routes are allowed
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
