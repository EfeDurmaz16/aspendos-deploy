const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export const bot = {
    webhooks: {
        slack: async (req: Request) => proxyWebhook('slack', req),
        telegram: async (req: Request) => proxyWebhook('telegram', req),
        discord: async (req: Request) => proxyWebhook('discord', req),
        whatsapp: async (req: Request) => proxyWebhook('whatsapp', req),
    },
};

async function proxyWebhook(platform: string, req: Request): Promise<Response> {
    try {
        const body = await req.text();
        const headers: Record<string, string> = {};
        req.headers.forEach((value, key) => {
            headers[key] = value;
        });

        const response = await fetch(`${API_URL}/webhooks/${platform}`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': req.headers.get('Content-Type') || 'application/json' },
            body,
        });

        return new Response(await response.text(), {
            status: response.status,
            headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
        });
    } catch {
        return new Response(JSON.stringify({ error: 'Webhook proxy failed' }), { status: 502 });
    }
}
