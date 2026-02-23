import { toNextJsHandler } from 'better-auth/next-js';
import { authInstance } from '@/lib/auth';

const handler = toNextJsHandler(authInstance);

// Intercept responses to replace empty 500s with proper JSON errors
async function safeHandler(req: Request) {
    try {
        const method = req.method === 'GET' ? handler.GET : handler.POST;
        if (!method) {
            return Response.json({ error: 'Method not allowed' }, { status: 405 });
        }
        const response = await method(req);

        // If Better Auth returned a 500 with empty body, replace with useful message
        if (response.status >= 500) {
            const body = await response.clone().text();
            if (!body || body === 'null' || body === '{}') {
                console.error('[Auth] Server error with empty body on:', req.url);
                return Response.json(
                    {
                        message: 'Service temporarily unavailable. Please try again in a moment.',
                        status: 500,
                    },
                    { status: 500 }
                );
            }
        }

        return response;
    } catch (err) {
        console.error('[Auth] Unhandled error:', err);
        return Response.json(
            {
                message: 'Service temporarily unavailable. Please try again in a moment.',
                status: 500,
            },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    return safeHandler(req);
}

export async function POST(req: Request) {
    return safeHandler(req);
}
