import type { NextConfig } from 'next';

// Note: Serwist PWA is disabled in development
// Enable in production by uncommenting the withSerwist wrapper below

const nextConfig: NextConfig = {
    // Standalone disabled — Vercel doesn't need it, and it adds ~10min to builds
    // Re-enable only for Docker deployments: output: 'standalone',

    // Strict mode for React
    reactStrictMode: true,

    // Skip type checking during build (pre-existing TS issues)
    typescript: {
        ignoreBuildErrors: true,
    },

    // Skip ESLint during build
    eslint: {
        ignoreDuringBuilds: true,
    },

    // Optimize images
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '*.supabase.co' },
            { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
        ],
        formats: ['image/avif', 'image/webp'],
    },

    // OpenTelemetry must be external (not bundled by Turbopack)
    // Prisma + pg removed in Phase A Day 1 package purge (commit f3a9e42)
    serverExternalPackages: ['@opentelemetry/api'],

    // Experimental features
    experimental: {
        clientTraceMetadata: ['baggage', 'sentry-trace'],
        // Tree-shake barrel imports - biggest dev compile speedup
        optimizePackageImports: [
            '@phosphor-icons/react',
            'framer-motion',
            '@radix-ui/react-icons',
            'lucide-react',
        ],
    },

    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    // Security headers
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(self), geolocation=()',
                    },
                    // CSP is now handled by middleware with per-request nonce (see middleware.ts)
                ],
            },
        ];
    },
};

// Sentry removed in Phase A Day 0 (Tier 1.1) — @sentry/nextjs blocked Next.js 16
// upgrade via OpenTelemetry version conflicts. Day 14 task 14.6 will re-evaluate
// adding back if @sentry/nextjs@10.45.0+ is Next 16 compatible. See plan at
// ~/.claude/plans/golden-spinning-stallman.md
export default nextConfig;
