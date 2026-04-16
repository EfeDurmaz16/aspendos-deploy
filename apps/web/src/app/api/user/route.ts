export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';

/**
 * GET /api/user
 * Returns the current user from WorkOS session
 */
export async function GET() {
    try {
        const { user } = await withAuth();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePictureUrl: user.profilePictureUrl,
            },
        });
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
