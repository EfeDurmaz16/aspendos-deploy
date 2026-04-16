import { handleAuth } from '@workos-inc/authkit-nextjs';

// WorkOS AuthKit handles all auth routes:
// GET /api/auth/callback — OAuth callback
// GET /api/auth/logout — Sign out
export const GET = handleAuth();
export const POST = handleAuth();
