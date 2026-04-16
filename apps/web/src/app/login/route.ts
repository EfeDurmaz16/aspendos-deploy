import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const redirectUri = process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI?.trim() || undefined;
    const returnTo = request.nextUrl.searchParams.get('returnTo') || undefined;

    try {
        const signInUrl = await getSignInUrl({ redirectUri, returnTo });
        return NextResponse.redirect(signInUrl);
    } catch (error) {
        console.error('[auth] Failed to generate WorkOS sign-in URL', error);
        return NextResponse.redirect(new URL('/', request.url));
    }
}
