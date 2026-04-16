/**
 * GET /api/tools — List available tools for a user's tier
 *
 * Query params:
 *   ?tier=free|personal|pro|enterprise (default: free)
 *
 * Returns the tool manifest showing which tool groups are available,
 * their reversibility classification, and lock reasons if any.
 */

import type { NextRequest } from 'next/server';
import { getToolManifest, type UserTier } from '@/lib/tools';

const VALID_TIERS: UserTier[] = ['free', 'personal', 'pro', 'enterprise'];

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tierParam = searchParams.get('tier') ?? 'free';

    if (!VALID_TIERS.includes(tierParam as UserTier)) {
        return Response.json(
            { error: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}` },
            { status: 400 }
        );
    }

    const tier = tierParam as UserTier;
    const manifest = getToolManifest(tier);

    return Response.json({
        tier,
        tool_groups: manifest,
        total_tools: manifest.reduce((sum, group) => sum + group.tools.length, 0),
        available_tools: manifest
            .filter((g) => g.available)
            .reduce((sum, group) => sum + group.tools.length, 0),
    });
}
