/**
 * Bot Detection Library
 *
 * Analyzes User-Agent strings and request patterns to detect bots,
 * scrapers, and automated traffic. Returns confidence scores for
 * integration with rate limiting and access control.
 *
 * No external dependencies - pure pattern matching and heuristics.
 */

// ─── Known Bot Patterns ──────────────────────────────────────────────────────

interface BotPattern {
    pattern: RegExp;
    type: string;
    /** Whether this bot is considered "good" (e.g. search engine crawlers) */
    isGoodBot: boolean;
    /** Base confidence that a match indicates bot traffic (0-100) */
    confidence: number;
}

const BOT_PATTERNS: BotPattern[] = [
    // Search engine crawlers (good bots)
    { pattern: /Googlebot/i, type: 'crawler:google', isGoodBot: true, confidence: 95 },
    { pattern: /Bingbot/i, type: 'crawler:bing', isGoodBot: true, confidence: 95 },
    { pattern: /Slurp/i, type: 'crawler:yahoo', isGoodBot: true, confidence: 90 },
    { pattern: /DuckDuckBot/i, type: 'crawler:duckduckgo', isGoodBot: true, confidence: 90 },
    { pattern: /Baiduspider/i, type: 'crawler:baidu', isGoodBot: true, confidence: 90 },
    { pattern: /YandexBot/i, type: 'crawler:yandex', isGoodBot: true, confidence: 90 },
    { pattern: /facebot|facebookexternalhit/i, type: 'crawler:facebook', isGoodBot: true, confidence: 85 },
    { pattern: /Twitterbot/i, type: 'crawler:twitter', isGoodBot: true, confidence: 85 },
    { pattern: /LinkedInBot/i, type: 'crawler:linkedin', isGoodBot: true, confidence: 85 },
    { pattern: /Applebot/i, type: 'crawler:apple', isGoodBot: true, confidence: 90 },

    // AI scrapers / LLM data collectors
    { pattern: /GPTBot/i, type: 'ai-scraper:openai', isGoodBot: false, confidence: 95 },
    { pattern: /ChatGPT-User/i, type: 'ai-scraper:chatgpt', isGoodBot: false, confidence: 90 },
    { pattern: /ClaudeBot/i, type: 'ai-scraper:anthropic', isGoodBot: false, confidence: 95 },
    { pattern: /Claude-Web/i, type: 'ai-scraper:anthropic-web', isGoodBot: false, confidence: 90 },
    { pattern: /CCBot/i, type: 'ai-scraper:commoncrawl', isGoodBot: false, confidence: 90 },
    { pattern: /Google-Extended/i, type: 'ai-scraper:google-ai', isGoodBot: false, confidence: 90 },
    { pattern: /anthropic-ai/i, type: 'ai-scraper:anthropic', isGoodBot: false, confidence: 90 },
    { pattern: /cohere-ai/i, type: 'ai-scraper:cohere', isGoodBot: false, confidence: 90 },
    { pattern: /PerplexityBot/i, type: 'ai-scraper:perplexity', isGoodBot: false, confidence: 90 },
    { pattern: /Bytespider/i, type: 'ai-scraper:bytedance', isGoodBot: false, confidence: 90 },

    // Headless browsers
    { pattern: /HeadlessChrome/i, type: 'headless:chrome', isGoodBot: false, confidence: 90 },
    { pattern: /PhantomJS/i, type: 'headless:phantomjs', isGoodBot: false, confidence: 95 },
    { pattern: /Selenium/i, type: 'headless:selenium', isGoodBot: false, confidence: 90 },
    { pattern: /Puppeteer/i, type: 'headless:puppeteer', isGoodBot: false, confidence: 90 },
    { pattern: /Playwright/i, type: 'headless:playwright', isGoodBot: false, confidence: 85 },
    { pattern: /webdriver/i, type: 'headless:webdriver', isGoodBot: false, confidence: 85 },

    // CLI tools
    { pattern: /^curl\//i, type: 'cli:curl', isGoodBot: false, confidence: 80 },
    { pattern: /^wget\//i, type: 'cli:wget', isGoodBot: false, confidence: 80 },
    { pattern: /^httpie\//i, type: 'cli:httpie', isGoodBot: false, confidence: 75 },
    { pattern: /^python-requests/i, type: 'cli:python-requests', isGoodBot: false, confidence: 70 },
    { pattern: /^axios\//i, type: 'cli:axios', isGoodBot: false, confidence: 60 },
    { pattern: /^node-fetch/i, type: 'cli:node-fetch', isGoodBot: false, confidence: 60 },
    { pattern: /^Go-http-client/i, type: 'cli:go-http', isGoodBot: false, confidence: 65 },
    { pattern: /^Java\//i, type: 'cli:java', isGoodBot: false, confidence: 65 },
    { pattern: /^libwww-perl/i, type: 'cli:perl', isGoodBot: false, confidence: 75 },
    { pattern: /^Scrapy/i, type: 'cli:scrapy', isGoodBot: false, confidence: 90 },

    // Generic bot indicators
    { pattern: /bot\b/i, type: 'generic:bot', isGoodBot: false, confidence: 60 },
    { pattern: /spider/i, type: 'generic:spider', isGoodBot: false, confidence: 60 },
    { pattern: /crawl/i, type: 'generic:crawler', isGoodBot: false, confidence: 55 },
    { pattern: /scraper/i, type: 'generic:scraper', isGoodBot: false, confidence: 70 },
];

/** Known good bots that are allowed on public endpoints */
const GOOD_BOT_TYPES = new Set(
    BOT_PATTERNS.filter((p) => p.isGoodBot).map((p) => p.type)
);

// ─── User-Agent Analysis ─────────────────────────────────────────────────────

export interface BotUserAgentResult {
    isBot: boolean;
    botType?: string;
    confidence: number;
    isGoodBot?: boolean;
}

/**
 * Analyze a User-Agent string for known bot patterns.
 *
 * Returns whether the UA matches a known bot, the bot type,
 * and a confidence score (0-100).
 */
export function isBotUserAgent(ua: string): BotUserAgentResult {
    // Empty or missing User-Agent is suspicious
    if (!ua || ua.trim().length === 0) {
        return {
            isBot: true,
            botType: 'empty-ua',
            confidence: 70,
            isGoodBot: false,
        };
    }

    // Very short User-Agent strings are suspicious
    if (ua.trim().length < 8) {
        return {
            isBot: true,
            botType: 'short-ua',
            confidence: 60,
            isGoodBot: false,
        };
    }

    // Check against known bot patterns (first match wins, ordered by specificity)
    for (const botPattern of BOT_PATTERNS) {
        if (botPattern.pattern.test(ua)) {
            return {
                isBot: true,
                botType: botPattern.type,
                confidence: botPattern.confidence,
                isGoodBot: botPattern.isGoodBot,
            };
        }
    }

    // Not a known bot
    return {
        isBot: false,
        confidence: 0,
    };
}

// ─── Request Pattern Analysis ────────────────────────────────────────────────

export interface RequestPatternResult {
    isSuspicious: boolean;
    reason?: string;
    /** Score contribution from pattern analysis (0-100) */
    score: number;
}

/**
 * Analyze a sequence of requests for bot-like patterns.
 *
 * Detects:
 * - Uniform timing intervals (machine-like regularity)
 * - Sequential path scanning (alphabetical or incremental path enumeration)
 * - High request velocity (too many requests in a short window)
 */
export function analyzeRequestPattern(
    requests: { timestamp: number; path: string }[]
): RequestPatternResult {
    if (!requests || requests.length < 3) {
        return { isSuspicious: false, score: 0 };
    }

    // Sort by timestamp ascending
    const sorted = [...requests].sort((a, b) => a.timestamp - b.timestamp);

    // ── High Request Velocity ────────────────────────────────────────────
    const timeWindowMs = sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
    const requestsPerSecond = timeWindowMs > 0 ? (sorted.length / timeWindowMs) * 1000 : sorted.length;

    // More than 10 requests per second is very suspicious
    if (requestsPerSecond > 10) {
        return {
            isSuspicious: true,
            reason: `High request velocity: ${requestsPerSecond.toFixed(1)} req/s`,
            score: 90,
        };
    }

    // More than 5 requests per second is moderately suspicious
    if (requestsPerSecond > 5) {
        return {
            isSuspicious: true,
            reason: `Elevated request velocity: ${requestsPerSecond.toFixed(1)} req/s`,
            score: 70,
        };
    }

    // ── Uniform Timing Intervals ─────────────────────────────────────────
    if (sorted.length >= 5) {
        const intervals: number[] = [];
        for (let i = 1; i < sorted.length; i++) {
            intervals.push(sorted[i].timestamp - sorted[i - 1].timestamp);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

        if (avgInterval > 0) {
            // Calculate coefficient of variation (stddev / mean)
            const variance =
                intervals.reduce((sum, interval) => sum + (interval - avgInterval) ** 2, 0) /
                intervals.length;
            const stddev = Math.sqrt(variance);
            const cv = stddev / avgInterval;

            // Very low coefficient of variation means machine-like regularity
            // Human requests have high variability (cv typically > 0.5)
            if (cv < 0.1 && avgInterval < 5000) {
                return {
                    isSuspicious: true,
                    reason: `Uniform timing intervals (cv=${cv.toFixed(3)}, avg=${avgInterval.toFixed(0)}ms)`,
                    score: 85,
                };
            }

            if (cv < 0.2 && avgInterval < 2000) {
                return {
                    isSuspicious: true,
                    reason: `Near-uniform timing intervals (cv=${cv.toFixed(3)}, avg=${avgInterval.toFixed(0)}ms)`,
                    score: 65,
                };
            }
        }
    }

    // ── Sequential Path Scanning ─────────────────────────────────────────
    if (sorted.length >= 5) {
        const uniquePaths = [...new Set(sorted.map((r) => r.path))];

        // If most requests hit different paths, check for sequential scanning
        if (uniquePaths.length >= sorted.length * 0.7) {
            const sortedPaths = [...uniquePaths].sort();

            // Check if paths are alphabetically ordered in the request sequence
            const requestPaths = sorted.map((r) => r.path);
            let sequentialCount = 0;
            for (let i = 1; i < requestPaths.length; i++) {
                if (requestPaths[i] >= requestPaths[i - 1]) {
                    sequentialCount++;
                }
            }

            const sequentialRatio = sequentialCount / (requestPaths.length - 1);

            // High sequential ratio with many unique paths indicates scanning
            if (sequentialRatio > 0.85 && uniquePaths.length >= 5) {
                return {
                    isSuspicious: true,
                    reason: `Sequential path scanning detected (${uniquePaths.length} unique paths, ${(sequentialRatio * 100).toFixed(0)}% sequential)`,
                    score: 75,
                };
            }
        }
    }

    return { isSuspicious: false, score: 0 };
}

// ─── Combined Bot Score ──────────────────────────────────────────────────────

/**
 * Calculate a combined bot score from User-Agent analysis and optional request patterns.
 *
 * Returns a score from 0 to 100 where:
 * - 0-20: Almost certainly human
 * - 21-50: Likely human, minor signals
 * - 51-70: Suspicious, may be automated
 * - 71-80: Likely bot
 * - 81-100: Almost certainly bot
 */
export function getBotScore(
    ua: string,
    requestPattern?: { timestamp: number; path: string }[]
): number {
    const uaResult = isBotUserAgent(ua);
    const patternResult = requestPattern ? analyzeRequestPattern(requestPattern) : null;

    let score = 0;

    // UA-based score (weighted at 60% of total when both signals available)
    if (uaResult.isBot) {
        score = uaResult.confidence;
    }

    // Pattern-based score (can boost UA score or stand alone)
    if (patternResult && patternResult.isSuspicious) {
        if (uaResult.isBot) {
            // Both signals: weighted combination
            score = Math.min(100, Math.round(uaResult.confidence * 0.6 + patternResult.score * 0.4));
        } else {
            // Only pattern signal: use pattern score directly but cap lower
            // since UA looks legitimate
            score = Math.min(85, patternResult.score);
        }
    }

    return Math.max(0, Math.min(100, score));
}

// ─── Bot Detection Tracker (in-memory) ───────────────────────────────────────

export interface BotDetectionEvent {
    ip: string;
    userAgent: string;
    botType: string;
    score: number;
    path: string;
    timestamp: number;
    blocked: boolean;
}

class BotDetectionTracker {
    private events: BotDetectionEvent[] = [];
    private readonly maxEvents = 10000;
    private readonly retentionMs = 24 * 60 * 60 * 1000; // 24 hours
    private cleanupIntervalId?: ReturnType<typeof setInterval>;

    constructor() {
        // Auto-cleanup every 30 minutes
        this.cleanupIntervalId = setInterval(() => this.cleanup(), 30 * 60 * 1000);
    }

    record(event: BotDetectionEvent): void {
        this.events.push(event);

        // Inline cleanup if events grow too large
        if (this.events.length > this.maxEvents) {
            this.cleanup();
        }
    }

    getRecentDetections(limit = 100): BotDetectionEvent[] {
        return this.events
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    getStats(): {
        totalDetections: number;
        totalBlocked: number;
        byBotType: Record<string, number>;
        last24Hours: number;
    } {
        const now = Date.now();
        const cutoff = now - this.retentionMs;
        const recent = this.events.filter((e) => e.timestamp >= cutoff);

        const byBotType: Record<string, number> = {};
        let totalBlocked = 0;

        for (const event of recent) {
            byBotType[event.botType] = (byBotType[event.botType] || 0) + 1;
            if (event.blocked) totalBlocked++;
        }

        return {
            totalDetections: recent.length,
            totalBlocked,
            byBotType,
            last24Hours: recent.length,
        };
    }

    private cleanup(): void {
        const cutoff = Date.now() - this.retentionMs;
        this.events = this.events.filter((e) => e.timestamp >= cutoff);
    }

    clear(): void {
        this.events = [];
    }

    destroy(): void {
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
            this.cleanupIntervalId = undefined;
        }
    }
}

/** Singleton tracker for bot detection events */
export const botDetectionTracker = new BotDetectionTracker();

/** Check if a bot type is considered a "good" bot (allowed on public endpoints) */
export function isGoodBot(botType: string): boolean {
    return GOOD_BOT_TYPES.has(botType);
}
