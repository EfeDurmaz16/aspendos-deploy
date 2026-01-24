import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yula.dev';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',
                    '/chat/*',      // Individual chat pages are private
                    '/billing',     // Billing is private
                    '/analytics',   // Analytics is private
                    '/onboarding',  // Onboarding is private
                ],
            },
            {
                // Allow AI crawlers for GEO (Generative Engine Optimization)
                userAgent: [
                    'GPTBot',
                    'ChatGPT-User',
                    'Google-Extended',
                    'Anthropic-AI',
                    'Claude-Web',
                    'CCBot',
                    'PerplexityBot',
                ],
                allow: [
                    '/',
                    '/pricing',
                    '/signup',
                    '/login',
                ],
                disallow: [
                    '/api/',
                    '/chat/',
                    '/billing',
                    '/analytics',
                ],
            },
        ],
        sitemap: `${BASE_URL}/sitemap.xml`,
        // GEO optimization files
        host: BASE_URL,
    };
}

// Note: llms.txt and ai.txt are served as static files from /public
// - https://yula.dev/llms.txt - AI crawler instructions
// - https://yula.dev/ai.txt - Structured AI metadata
