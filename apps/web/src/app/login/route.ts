import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const signInUrl = await getSignInUrl();
        return NextResponse.redirect(signInUrl);
    } catch (error) {
        console.error('[auth] Failed to generate sign-in URL', error);
        return NextResponse.redirect(new URL('/', request.url));
    }
}
