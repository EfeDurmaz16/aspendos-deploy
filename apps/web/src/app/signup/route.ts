import { getSignUpUrl } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const redirectUri = process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI?.trim() || undefined;
    const returnTo = request.nextUrl.searchParams.get('returnTo') || undefined;

    try {
        const signUpUrl = await getSignUpUrl({ redirectUri, returnTo });
        return NextResponse.redirect(signUpUrl);
    } catch (error) {
        console.error('[auth] Failed to generate WorkOS sign-up URL', error);
        return NextResponse.redirect(new URL('/', request.url));
    }
}
