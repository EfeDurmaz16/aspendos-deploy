import { getSignUpUrl } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const signUpUrl = await getSignUpUrl();
        return NextResponse.redirect(signUpUrl);
    } catch (error) {
        console.error('[auth] Failed to generate sign-up URL', error);
        return NextResponse.redirect(new URL('/', request.url));
    }
}
