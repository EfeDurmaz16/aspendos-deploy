/**
 * Service Worker - Serwist PWA Configuration
 *
 * Handles:
 * - Static asset caching
 * - API response caching with TTL
 * - Offline fallback
 * - Background sync for failed requests
 */

import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist, StaleWhileRevalidate } from 'serwist';

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: typeof globalThis & {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    skipWaiting(): Promise<void>;
    clients: { claim(): Promise<void> };
};

// Initialize Serwist with precache manifest
const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: [
        // Static assets - Cache First (long-term)
        {
            matcher: /\.(?:js|css|woff2?|ttf|otf|eot)$/i,
            handler: new CacheFirst({
                cacheName: 'static-assets',
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 100,
                        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                    }),
                ],
            }),
        },
        // Images - Cache First with expiration
        {
            matcher: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: new CacheFirst({
                cacheName: 'images',
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 50,
                        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                    }),
                ],
            }),
        },
        // API calls - Network First (fresh data preferred)
        {
            matcher: /\/api\//i,
            handler: new NetworkFirst({
                cacheName: 'api-cache',
                networkTimeoutSeconds: 10,
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 50,
                        maxAgeSeconds: 60 * 5, // 5 minutes
                    }),
                ],
            }),
        },
        // Chat data - Stale While Revalidate (show cached, update in background)
        {
            matcher: /\/api\/chat/i,
            handler: new StaleWhileRevalidate({
                cacheName: 'chat-cache',
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 30,
                        maxAgeSeconds: 60 * 60, // 1 hour
                    }),
                ],
            }),
        },
        // External resources
        {
            matcher: /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)/i,
            handler: new CacheFirst({
                cacheName: 'google-fonts',
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 20,
                        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                    }),
                ],
            }),
        },
    ],
});

// Handle offline fallback
serwist.addEventListeners();

// Listen for messages from the app
self.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Background sync for failed requests (when back online)
// Note: SyncEvent types may not be available in all TypeScript configurations
self.addEventListener('sync', (event: Event & { tag?: string; waitUntil?: (promise: Promise<void>) => void }) => {
    if (event.tag === 'sync-pending-requests' && event.waitUntil) {
        event.waitUntil(syncPendingRequests());
    }
});

async function syncPendingRequests() {
    // Get pending requests from IndexedDB and retry them
    console.log('[SW] Syncing pending requests...');
    // Implementation will be added with offline storage
}
