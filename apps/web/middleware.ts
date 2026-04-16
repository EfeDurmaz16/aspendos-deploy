import { NextResponse } from 'next/server';

// Auth is handled at the route level via withAuth() — no middleware auth gate.
// This middleware only sets security headers.
export function middleware() {
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
    ],
};
