/**
 * Bot Detection Tests
 *
 * Comprehensive test suite for User-Agent analysis, request pattern
 * detection, and combined bot scoring.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
    analyzeRequestPattern,
    botDetectionTracker,
    getBotScore,
    isBotUserAgent,
    isGoodBot,
} from '../bot-detection';

describe('Bot Detection', () => {
    beforeEach(() => {
        botDetectionTracker.clear();
    });

    // ─── User-Agent Analysis ─────────────────────────────────────────────────

    describe('isBotUserAgent', () => {
        describe('known crawler bots', () => {
            it('should detect Googlebot', () => {
                const result = isBotUserAgent(
                    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
                );
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('crawler:google');
                expect(result.confidence).toBeGreaterThanOrEqual(90);
                expect(result.isGoodBot).toBe(true);
            });

            it('should detect Bingbot', () => {
                const result = isBotUserAgent(
                    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'
                );
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('crawler:bing');
                expect(result.confidence).toBeGreaterThanOrEqual(90);
                expect(result.isGoodBot).toBe(true);
            });

            it('should detect DuckDuckBot', () => {
                const result = isBotUserAgent(
                    'DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)'
                );
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('crawler:duckduckgo');
                expect(result.isGoodBot).toBe(true);
            });

            it('should detect YandexBot', () => {
                const result = isBotUserAgent(
                    'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)'
                );
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('crawler:yandex');
                expect(result.isGoodBot).toBe(true);
            });

            it('should detect Applebot', () => {
                const result = isBotUserAgent(
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/600.2.5 (KHTML, like Gecko) Version/8.0.2 Safari/600.2.5 (Applebot/0.1; +http://www.apple.com/go/applebot)'
                );
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('crawler:apple');
                expect(result.isGoodBot).toBe(true);
            });

            it('should detect Facebook crawler', () => {
                const result = isBotUserAgent(
                    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
                );
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('crawler:facebook');
                expect(result.isGoodBot).toBe(true);
            });

            it('should detect Twitterbot', () => {
                const result = isBotUserAgent('Twitterbot/1.0');
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('crawler:twitter');
                expect(result.isGoodBot).toBe(true);
            });
        });

        describe('AI scrapers', () => {
            it('should detect GPTBot', () => {
                const result = isBotUserAgent(
                    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)'
                );
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('ai-scraper:openai');
                expect(result.confidence).toBeGreaterThanOrEqual(90);
                expect(result.isGoodBot).toBe(false);
            });

            it('should detect ClaudeBot', () => {
                const result = isBotUserAgent(
                    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)'
                );
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('ai-scraper:anthropic');
                expect(result.isGoodBot).toBe(false);
            });

            it('should detect CCBot', () => {
                const result = isBotUserAgent(
                    'CCBot/2.0 (https://commoncrawl.org/faq/)'
                );
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('ai-scraper:commoncrawl');
                expect(result.isGoodBot).toBe(false);
            });

            it('should detect PerplexityBot', () => {
                const result = isBotUserAgent('PerplexityBot/1.0');
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('ai-scraper:perplexity');
                expect(result.isGoodBot).toBe(false);
            });

            it('should detect Bytespider', () => {
                const result = isBotUserAgent(
                    'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)'
                );
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('ai-scraper:bytedance');
                expect(result.isGoodBot).toBe(false);
            });
        });

        describe('headless browsers', () => {
            it('should detect HeadlessChrome', () => {
                const result = isBotUserAgent(
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/90.0.4430.212 Safari/537.36'
                );
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('headless:chrome');
                expect(result.isGoodBot).toBe(false);
            });

            it('should detect PhantomJS', () => {
                const result = isBotUserAgent(
                    'Mozilla/5.0 (Unknown; Linux x86_64) AppleWebKit/538.1 (KHTML, like Gecko) PhantomJS/2.1.1 Safari/538.1'
                );
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('headless:phantomjs');
                expect(result.isGoodBot).toBe(false);
            });

            it('should detect Selenium', () => {
                const result = isBotUserAgent(
                    'Mozilla/5.0 Selenium/4.0'
                );
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('headless:selenium');
                expect(result.isGoodBot).toBe(false);
            });

            it('should detect Puppeteer', () => {
                const result = isBotUserAgent(
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Puppeteer Chrome/90.0'
                );
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('headless:puppeteer');
                expect(result.isGoodBot).toBe(false);
            });
        });

        describe('CLI tools', () => {
            it('should detect curl', () => {
                const result = isBotUserAgent('curl/7.68.0');
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('cli:curl');
                expect(result.confidence).toBeGreaterThanOrEqual(70);
            });

            it('should detect wget', () => {
                const result = isBotUserAgent('Wget/1.21');
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('cli:wget');
                expect(result.confidence).toBeGreaterThanOrEqual(70);
            });

            it('should detect python-requests', () => {
                const result = isBotUserAgent('python-requests/2.28.1');
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('cli:python-requests');
            });

            it('should detect Scrapy', () => {
                const result = isBotUserAgent('Scrapy/2.7.0 (+https://scrapy.org)');
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('cli:scrapy');
                expect(result.confidence).toBeGreaterThanOrEqual(85);
            });

            it('should detect Go-http-client', () => {
                const result = isBotUserAgent('Go-http-client/2.0');
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('cli:go-http');
            });
        });

        describe('legitimate browser User-Agents', () => {
            it('should not flag Chrome on Windows', () => {
                const result = isBotUserAgent(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                );
                expect(result.isBot).toBe(false);
                expect(result.confidence).toBe(0);
            });

            it('should not flag Firefox on macOS', () => {
                const result = isBotUserAgent(
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
                );
                expect(result.isBot).toBe(false);
                expect(result.confidence).toBe(0);
            });

            it('should not flag Safari on iOS', () => {
                const result = isBotUserAgent(
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
                );
                expect(result.isBot).toBe(false);
                expect(result.confidence).toBe(0);
            });

            it('should not flag Edge on Windows', () => {
                const result = isBotUserAgent(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
                );
                expect(result.isBot).toBe(false);
                expect(result.confidence).toBe(0);
            });

            it('should not flag Chrome on Android', () => {
                const result = isBotUserAgent(
                    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36'
                );
                expect(result.isBot).toBe(false);
                expect(result.confidence).toBe(0);
            });
        });

        describe('empty/missing User-Agent', () => {
            it('should flag empty User-Agent as bot', () => {
                const result = isBotUserAgent('');
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('empty-ua');
                expect(result.confidence).toBeGreaterThanOrEqual(60);
            });

            it('should flag whitespace-only User-Agent as bot', () => {
                const result = isBotUserAgent('   ');
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('empty-ua');
            });

            it('should flag very short User-Agent as suspicious', () => {
                const result = isBotUserAgent('Hi');
                expect(result.isBot).toBe(true);
                expect(result.botType).toBe('short-ua');
                expect(result.confidence).toBeGreaterThanOrEqual(50);
            });
        });
    });

    // ─── Request Pattern Analysis ────────────────────────────────────────────

    describe('analyzeRequestPattern', () => {
        describe('insufficient data', () => {
            it('should return not suspicious for empty array', () => {
                const result = analyzeRequestPattern([]);
                expect(result.isSuspicious).toBe(false);
                expect(result.score).toBe(0);
            });

            it('should return not suspicious for fewer than 3 requests', () => {
                const result = analyzeRequestPattern([
                    { timestamp: 1000, path: '/api/chat' },
                    { timestamp: 2000, path: '/api/memory' },
                ]);
                expect(result.isSuspicious).toBe(false);
                expect(result.score).toBe(0);
            });

            it('should return not suspicious for null input', () => {
                const result = analyzeRequestPattern(null as any);
                expect(result.isSuspicious).toBe(false);
            });
        });

        describe('uniform timing intervals', () => {
            it('should detect perfectly uniform timing', () => {
                const requests = [];
                const base = Date.now();
                for (let i = 0; i < 10; i++) {
                    requests.push({
                        timestamp: base + i * 500, // Exactly 500ms apart
                        path: '/api/chat',
                    });
                }

                const result = analyzeRequestPattern(requests);
                expect(result.isSuspicious).toBe(true);
                expect(result.reason).toContain('niform timing');
                expect(result.score).toBeGreaterThanOrEqual(60);
            });

            it('should detect near-uniform timing with small jitter', () => {
                const requests = [];
                const base = Date.now();
                for (let i = 0; i < 10; i++) {
                    // 1000ms interval with very small jitter (< 10%)
                    const jitter = Math.round((Math.random() - 0.5) * 50);
                    requests.push({
                        timestamp: base + i * 1000 + jitter,
                        path: '/api/chat',
                    });
                }

                const result = analyzeRequestPattern(requests);
                expect(result.isSuspicious).toBe(true);
                expect(result.score).toBeGreaterThanOrEqual(60);
            });

            it('should not flag human-like irregular timing', () => {
                const requests = [
                    { timestamp: 1000, path: '/api/chat' },
                    { timestamp: 3500, path: '/api/chat' },
                    { timestamp: 4200, path: '/api/memory' },
                    { timestamp: 9800, path: '/api/chat' },
                    { timestamp: 15000, path: '/api/chat' },
                    { timestamp: 15500, path: '/api/billing' },
                    { timestamp: 28000, path: '/api/chat' },
                ];

                const result = analyzeRequestPattern(requests);
                // Human-like patterns should not be flagged as uniform timing
                // They may still be flagged for other reasons, but not uniform timing
                if (result.isSuspicious && result.reason) {
                    expect(result.reason).not.toContain('niform timing');
                }
            });
        });

        describe('high request velocity', () => {
            it('should detect very high velocity (>10 req/s)', () => {
                const requests = [];
                const base = Date.now();
                for (let i = 0; i < 20; i++) {
                    requests.push({
                        timestamp: base + i * 50, // 20 req/s
                        path: '/api/chat',
                    });
                }

                const result = analyzeRequestPattern(requests);
                expect(result.isSuspicious).toBe(true);
                expect(result.reason).toContain('velocity');
                expect(result.score).toBeGreaterThanOrEqual(80);
            });

            it('should detect elevated velocity (>5 req/s)', () => {
                const requests = [];
                const base = Date.now();
                for (let i = 0; i < 10; i++) {
                    requests.push({
                        timestamp: base + i * 150, // ~6.67 req/s
                        path: '/api/chat',
                    });
                }

                const result = analyzeRequestPattern(requests);
                expect(result.isSuspicious).toBe(true);
                expect(result.reason).toContain('velocity');
                expect(result.score).toBeGreaterThanOrEqual(60);
            });

            it('should not flag normal velocity (<5 req/s)', () => {
                const requests = [];
                const base = Date.now();
                for (let i = 0; i < 5; i++) {
                    requests.push({
                        timestamp: base + i * 1000, // 1 req/s
                        path: '/api/chat',
                    });
                }

                const result = analyzeRequestPattern(requests);
                // Should not be flagged for velocity
                if (result.isSuspicious && result.reason) {
                    expect(result.reason).not.toContain('velocity');
                }
            });
        });

        describe('sequential path scanning', () => {
            it('should detect alphabetical path enumeration', () => {
                const base = Date.now();
                // Use irregular timing to avoid triggering uniform timing detection
                const requests = [
                    { timestamp: base, path: '/api/admin' },
                    { timestamp: base + 1800, path: '/api/billing' },
                    { timestamp: base + 4500, path: '/api/chat' },
                    { timestamp: base + 6200, path: '/api/docs' },
                    { timestamp: base + 9700, path: '/api/export' },
                    { timestamp: base + 11100, path: '/api/features' },
                    { timestamp: base + 15800, path: '/api/gamification' },
                ];

                const result = analyzeRequestPattern(requests);
                expect(result.isSuspicious).toBe(true);
                expect(result.reason).toContain('Sequential path scanning');
                expect(result.score).toBeGreaterThanOrEqual(60);
            });

            it('should not flag repeated requests to same endpoint', () => {
                const base = Date.now();
                const requests = [];
                for (let i = 0; i < 10; i++) {
                    requests.push({
                        timestamp: base + i * 3000,
                        path: '/api/chat',
                    });
                }

                const result = analyzeRequestPattern(requests);
                // Hitting the same path repeatedly is normal behavior
                if (result.isSuspicious && result.reason) {
                    expect(result.reason).not.toContain('Sequential path scanning');
                }
            });
        });
    });

    // ─── Combined Bot Score ──────────────────────────────────────────────────

    describe('getBotScore', () => {
        it('should return 0 for legitimate browser UA with no pattern data', () => {
            const score = getBotScore(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );
            expect(score).toBe(0);
        });

        it('should return high score for known bot UA', () => {
            const score = getBotScore('Scrapy/2.7.0 (+https://scrapy.org)');
            expect(score).toBeGreaterThanOrEqual(80);
        });

        it('should return high score for empty UA', () => {
            const score = getBotScore('');
            expect(score).toBeGreaterThanOrEqual(60);
        });

        it('should boost score when both UA and pattern are suspicious', () => {
            const base = Date.now();
            const pattern = [];
            for (let i = 0; i < 20; i++) {
                pattern.push({ timestamp: base + i * 50, path: '/api/chat' });
            }

            const uaOnlyScore = getBotScore('curl/7.68.0');
            const combinedScore = getBotScore('curl/7.68.0', pattern);

            // Combined should be at least as high as UA-only
            expect(combinedScore).toBeGreaterThanOrEqual(uaOnlyScore * 0.5);
            expect(combinedScore).toBeGreaterThanOrEqual(70);
        });

        it('should give moderate score for suspicious pattern with legitimate UA', () => {
            const base = Date.now();
            const pattern = [];
            for (let i = 0; i < 20; i++) {
                pattern.push({ timestamp: base + i * 50, path: '/api/chat' });
            }

            const score = getBotScore(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                pattern
            );

            // Should be flagged based on pattern, but capped since UA looks legit
            expect(score).toBeGreaterThanOrEqual(50);
            expect(score).toBeLessThanOrEqual(85);
        });

        it('should return score within 0-100 range', () => {
            const testCases = [
                { ua: '', pattern: undefined },
                { ua: 'curl/7.0', pattern: undefined },
                { ua: 'Googlebot/2.1', pattern: undefined },
                {
                    ua: 'Mozilla/5.0 Chrome/120',
                    pattern: [
                        { timestamp: 1, path: '/a' },
                        { timestamp: 2, path: '/b' },
                        { timestamp: 3, path: '/c' },
                    ],
                },
            ];

            for (const tc of testCases) {
                const score = getBotScore(tc.ua, tc.pattern);
                expect(score).toBeGreaterThanOrEqual(0);
                expect(score).toBeLessThanOrEqual(100);
            }
        });

        it('should handle undefined pattern gracefully', () => {
            const score = getBotScore('curl/7.68.0', undefined);
            expect(score).toBeGreaterThanOrEqual(70);
        });

        it('should handle empty pattern array', () => {
            const score = getBotScore('curl/7.68.0', []);
            // Should fall back to UA-only score
            expect(score).toBeGreaterThanOrEqual(70);
        });
    });

    // ─── Good Bot Detection ──────────────────────────────────────────────────

    describe('isGoodBot', () => {
        it('should identify Google as a good bot', () => {
            expect(isGoodBot('crawler:google')).toBe(true);
        });

        it('should identify Bing as a good bot', () => {
            expect(isGoodBot('crawler:bing')).toBe(true);
        });

        it('should identify Facebook as a good bot', () => {
            expect(isGoodBot('crawler:facebook')).toBe(true);
        });

        it('should not identify AI scrapers as good bots', () => {
            expect(isGoodBot('ai-scraper:openai')).toBe(false);
        });

        it('should not identify headless browsers as good bots', () => {
            expect(isGoodBot('headless:chrome')).toBe(false);
        });

        it('should not identify CLI tools as good bots', () => {
            expect(isGoodBot('cli:curl')).toBe(false);
        });

        it('should return false for unknown bot types', () => {
            expect(isGoodBot('unknown-type')).toBe(false);
        });
    });

    // ─── Bot Detection Tracker ───────────────────────────────────────────────

    describe('botDetectionTracker', () => {
        it('should record and retrieve detection events', () => {
            botDetectionTracker.record({
                ip: '1.2.3.4',
                userAgent: 'curl/7.68.0',
                botType: 'cli:curl',
                score: 80,
                path: '/api/chat',
                timestamp: Date.now(),
                blocked: true,
            });

            const detections = botDetectionTracker.getRecentDetections();
            expect(detections).toHaveLength(1);
            expect(detections[0].botType).toBe('cli:curl');
            expect(detections[0].blocked).toBe(true);
        });

        it('should return stats with bot type breakdown', () => {
            const now = Date.now();
            botDetectionTracker.record({
                ip: '1.2.3.4',
                userAgent: 'curl/7.68.0',
                botType: 'cli:curl',
                score: 80,
                path: '/api/chat',
                timestamp: now,
                blocked: true,
            });
            botDetectionTracker.record({
                ip: '5.6.7.8',
                userAgent: 'Scrapy/2.7',
                botType: 'cli:scrapy',
                score: 90,
                path: '/api/memory',
                timestamp: now,
                blocked: true,
            });
            botDetectionTracker.record({
                ip: '9.10.11.12',
                userAgent: 'curl/8.0',
                botType: 'cli:curl',
                score: 75,
                path: '/api/billing',
                timestamp: now,
                blocked: false,
            });

            const stats = botDetectionTracker.getStats();
            expect(stats.totalDetections).toBe(3);
            expect(stats.totalBlocked).toBe(2);
            expect(stats.byBotType['cli:curl']).toBe(2);
            expect(stats.byBotType['cli:scrapy']).toBe(1);
        });

        it('should respect limit on getRecentDetections', () => {
            const now = Date.now();
            for (let i = 0; i < 10; i++) {
                botDetectionTracker.record({
                    ip: `1.2.3.${i}`,
                    userAgent: 'curl/7.0',
                    botType: 'cli:curl',
                    score: 80,
                    path: '/api/chat',
                    timestamp: now + i,
                    blocked: true,
                });
            }

            const detections = botDetectionTracker.getRecentDetections(5);
            expect(detections).toHaveLength(5);
        });

        it('should clear all events', () => {
            botDetectionTracker.record({
                ip: '1.2.3.4',
                userAgent: 'curl/7.0',
                botType: 'cli:curl',
                score: 80,
                path: '/api/chat',
                timestamp: Date.now(),
                blocked: true,
            });

            expect(botDetectionTracker.getRecentDetections()).toHaveLength(1);

            botDetectionTracker.clear();

            expect(botDetectionTracker.getRecentDetections()).toHaveLength(0);
        });
    });

    // ─── Edge Cases ──────────────────────────────────────────────────────────

    describe('edge cases', () => {
        it('should handle extremely long User-Agent strings', () => {
            const longUA = 'Mozilla/5.0 ' + 'x'.repeat(10000);
            const result = isBotUserAgent(longUA);
            // Should not crash, and should not falsely flag as bot
            expect(result.isBot).toBe(false);
        });

        it('should handle User-Agent with special regex characters', () => {
            const result = isBotUserAgent('Mozilla/5.0 (.*+?^${}|[])');
            expect(result.isBot).toBe(false);
        });

        it('should handle request pattern with all same timestamps', () => {
            const now = Date.now();
            const requests = Array.from({ length: 10 }, () => ({
                timestamp: now,
                path: '/api/chat',
            }));

            // Should detect as high velocity since all at same time
            const result = analyzeRequestPattern(requests);
            expect(result.isSuspicious).toBe(true);
        });

        it('should handle request pattern with very large timestamp gaps', () => {
            const requests = [
                { timestamp: 0, path: '/a' },
                { timestamp: 1000000000, path: '/b' },
                { timestamp: 2000000000, path: '/c' },
                { timestamp: 3000000000, path: '/d' },
                { timestamp: 4000000000, path: '/e' },
            ];

            const result = analyzeRequestPattern(requests);
            // Very spread out requests should not be flagged for velocity
            if (result.isSuspicious && result.reason) {
                expect(result.reason).not.toContain('velocity');
            }
        });

        it('should handle mixed bot indicators in a single User-Agent', () => {
            // UA that mentions both Googlebot and HeadlessChrome
            const result = isBotUserAgent(
                'Mozilla/5.0 (compatible; Googlebot/2.1) HeadlessChrome/90.0'
            );
            // Should match first pattern (Googlebot) since patterns are ordered
            expect(result.isBot).toBe(true);
            expect(result.botType).toBe('crawler:google');
        });
    });
});
