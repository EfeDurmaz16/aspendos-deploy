/**
 * Steel.dev Browser Tools — Cloud browser sessions for AI agents
 *
 * Reversibility: compensatable (sessions can be released/closed)
 * Tier: Personal+
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { ReversibilityClass, RollbackStrategy } from '@/lib/reversibility/types';

// ── Metadata ────────────────────────────────────────────────────
export const BROWSER_TOOL_META = {
    reversibility_class: 'compensatable' as ReversibilityClass,
    tier_minimum: 'personal',
    rollback_strategy: {
        kind: 'compensation' as const,
        compensate_tool: 'browser_closeSession',
        compensate_args: {},
    } satisfies RollbackStrategy,
};

// ── Session cache ───────────────────────────────────────────────
const sessionCache = new Map<string, { client: any; session: any }>();

async function getSteelClient() {
    const Steel = (await import('steel-sdk')).default;
    const apiKey = process.env.STEEL_API_KEY;
    if (!apiKey) {
        throw new Error('STEEL_API_KEY not configured');
    }
    return new Steel({ steelAPIKey: apiKey });
}

// ── Tool: createSession ─────────────────────────────────────────
export const createSession = tool({
    description:
        'Create a new Steel cloud browser session. Returns a sessionId for subsequent browser operations. The session runs a full Chrome browser in the cloud.',
    inputSchema: z.object({
        useProxy: z.boolean().optional().describe('Enable proxy for IP rotation. Default false.'),
        solveCaptcha: z
            .boolean()
            .optional()
            .describe('Enable automatic CAPTCHA solving. Default false.'),
        timeout: z
            .number()
            .optional()
            .describe('Session timeout in milliseconds. Default 300000 (5 min).'),
    }),
    execute: async ({ useProxy, solveCaptcha, timeout }) => {
        try {
            const client = await getSteelClient();
            const opts: Record<string, unknown> = {};
            if (useProxy !== undefined) opts.useProxy = useProxy;
            if (solveCaptcha !== undefined) opts.solveCaptcha = solveCaptcha;
            if (timeout !== undefined) opts.timeout = timeout;

            const session = await client.sessions.create(opts);
            sessionCache.set(session.id, { client, session });

            return {
                success: true,
                sessionId: session.id,
                viewerUrl: session.sessionViewerUrl ?? null,
                note: 'Browser session created. Use this sessionId for navigate, screenshot, extractContent, click.',
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create browser session',
            };
        }
    },
});

// ── Tool: navigate ──────────────────────────────────────────────
export const navigate = tool({
    description: 'Navigate the Steel browser to a URL. Waits for the page to load.',
    inputSchema: z.object({
        sessionId: z.string().describe('Session ID from createSession'),
        url: z.string().url().describe('URL to navigate to'),
        waitFor: z
            .number()
            .optional()
            .describe('Additional wait time in ms after page load. Default 0.'),
    }),
    execute: async ({ sessionId, url, waitFor }) => {
        try {
            const cached = sessionCache.get(sessionId);
            if (!cached) {
                return { success: false, error: 'Session not found. Create a session first.' };
            }

            // Steel SDK scrape endpoint navigates and returns page content
            const result = await cached.client.scrape({
                url,
                sessionId,
                waitFor: waitFor ?? 0,
            });

            return {
                success: true,
                url,
                title: result.title ?? null,
                statusCode: result.statusCode ?? null,
                contentLength: result.content?.length ?? 0,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Navigation failed',
            };
        }
    },
});

// ── Tool: screenshot ────────────────────────────────────────────
export const screenshot = tool({
    description:
        'Take a screenshot of the current page in the Steel browser session. Returns a base64-encoded PNG image.',
    inputSchema: z.object({
        sessionId: z.string().describe('Session ID from createSession'),
        fullPage: z
            .boolean()
            .optional()
            .describe('Capture full scrollable page. Default false (viewport only).'),
    }),
    execute: async ({ sessionId, fullPage }) => {
        try {
            const cached = sessionCache.get(sessionId);
            if (!cached) {
                return { success: false, error: 'Session not found. Create a session first.' };
            }

            const result = await cached.client.screenshot({
                sessionId,
                fullPage: fullPage ?? false,
            });

            return {
                success: true,
                // Return the screenshot data (base64 PNG)
                imageBase64: result.base64 ?? result.image ?? null,
                format: 'png',
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Screenshot failed',
            };
        }
    },
});

// ── Tool: extractContent ────────────────────────────────────────
export const extractContent = tool({
    description:
        'Extract the text content or structured data from the current page in the Steel browser. Returns markdown-formatted content.',
    inputSchema: z.object({
        sessionId: z.string().describe('Session ID from createSession'),
        url: z.string().url().describe('URL to scrape and extract content from'),
        format: z
            .enum(['markdown', 'html', 'text'])
            .optional()
            .describe('Output format. Default "markdown".'),
    }),
    execute: async ({ sessionId, url, format }) => {
        try {
            const cached = sessionCache.get(sessionId);
            if (!cached) {
                return { success: false, error: 'Session not found. Create a session first.' };
            }

            const result = await cached.client.scrape({
                url,
                sessionId,
                format: format ?? 'markdown',
            });

            return {
                success: true,
                content: result.content ?? '',
                title: result.title ?? null,
                url: result.url ?? url,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Content extraction failed',
            };
        }
    },
});

// ── Tool: click ─────────────────────────────────────────────────
export const click = tool({
    description:
        'Perform a click action on an element in the Steel browser session using a CSS selector.',
    inputSchema: z.object({
        sessionId: z.string().describe('Session ID from createSession'),
        selector: z
            .string()
            .describe('CSS selector of the element to click (e.g. "button.submit", "#login-btn")'),
    }),
    execute: async ({ sessionId, selector }) => {
        try {
            const cached = sessionCache.get(sessionId);
            if (!cached) {
                return { success: false, error: 'Session not found. Create a session first.' };
            }

            // Use Steel's action API to perform click
            const result = await cached.client.actions.click({
                sessionId,
                selector,
            });

            return {
                success: true,
                selector,
                clicked: true,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Click action failed',
            };
        }
    },
});

// ── Tool: closeSession ──────────────────────────────────────────
export const closeSession = tool({
    description: 'Release and close a Steel browser session. Frees cloud resources.',
    inputSchema: z.object({
        sessionId: z.string().describe('Session ID to release'),
    }),
    execute: async ({ sessionId }) => {
        try {
            const cached = sessionCache.get(sessionId);
            if (!cached) {
                return { success: false, error: 'Session not found or already released.' };
            }

            await cached.client.sessions.release(sessionId);
            sessionCache.delete(sessionId);

            return { success: true, sessionId, note: 'Session released.' };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to release session',
            };
        }
    },
});

// ── Convenience: all browser tools as a record ──────────────────
export const browserTools = {
    browser_createSession: createSession,
    browser_navigate: navigate,
    browser_screenshot: screenshot,
    browser_extractContent: extractContent,
    browser_click: click,
    browser_closeSession: closeSession,
} as const;
