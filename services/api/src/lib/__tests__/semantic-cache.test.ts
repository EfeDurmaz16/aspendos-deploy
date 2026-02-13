import { beforeEach, describe, expect, it, vi } from 'vitest';
import { semanticCache } from '../semantic-cache';

describe('SemanticCache', () => {
    beforeEach(() => {
        semanticCache.clearCache_forTesting();
        vi.useFakeTimers();
    });

    describe('normalizeQuery', () => {
        it('should lowercase query', () => {
            const result = semanticCache.normalizeQuery('Hello World');
            expect(result).toBe('hello world');
        });

        it('should remove extra whitespace', () => {
            const result = semanticCache.normalizeQuery('hello    world   test');
            expect(result).toBe('hello test world');
        });

        it('should remove punctuation', () => {
            const result = semanticCache.normalizeQuery("What's the weather, today?!");
            expect(result).toBe('the today weather whats');
        });

        it('should sort words alphabetically', () => {
            const result = semanticCache.normalizeQuery('zebra apple banana');
            expect(result).toBe('apple banana zebra');
        });

        it('should handle empty string', () => {
            const result = semanticCache.normalizeQuery('');
            expect(result).toBe('');
        });

        it('should normalize complex query', () => {
            const result = semanticCache.normalizeQuery(
                "  What's   the BEST way to learn JavaScript?!  "
            );
            expect(result).toBe('best javascript learn the to way whats');
        });
    });

    describe('getCacheKey', () => {
        it('should generate consistent hash for same input', () => {
            const key1 = semanticCache.getCacheKey('test query', 'gpt-4');
            const key2 = semanticCache.getCacheKey('test query', 'gpt-4');
            expect(key1).toBe(key2);
        });

        it('should generate different hash for different queries', () => {
            const key1 = semanticCache.getCacheKey('test query', 'gpt-4');
            const key2 = semanticCache.getCacheKey('other query', 'gpt-4');
            expect(key1).not.toBe(key2);
        });

        it('should generate different hash for different models', () => {
            const key1 = semanticCache.getCacheKey('test query', 'gpt-4');
            const key2 = semanticCache.getCacheKey('test query', 'claude-3');
            expect(key1).not.toBe(key2);
        });

        it('should generate SHA-256 hash', () => {
            const key = semanticCache.getCacheKey('test', 'model');
            expect(key).toHaveLength(64); // SHA-256 produces 64 hex characters
        });
    });

    describe('cacheResponse', () => {
        it('should store response in cache', () => {
            semanticCache.cacheResponse('What is AI?', 'gpt-4', 'AI is artificial intelligence');

            const result = semanticCache.lookupCache('What is AI?', 'gpt-4');
            expect(result.hit).toBe(true);
            expect(result.response).toBe('AI is artificial intelligence');
        });

        it('should store with metadata', () => {
            semanticCache.cacheResponse('test query', 'gpt-4', 'response', {
                inputTokens: 10,
                outputTokens: 20,
                costSaved: 0.001,
            });

            const result = semanticCache.lookupCache('test query', 'gpt-4');
            expect(result.hit).toBe(true);
            expect(result.costSaved).toBe(0.001);
        });

        it('should handle semantically similar queries', () => {
            semanticCache.cacheResponse('Hello world', 'gpt-4', 'response1');

            // Different case, extra whitespace, punctuation
            const result = semanticCache.lookupCache('  HELLO   WORLD!  ', 'gpt-4');
            expect(result.hit).toBe(true);
            expect(result.response).toBe('response1');
        });

        it('should handle word order differences', () => {
            semanticCache.cacheResponse('apple banana cherry', 'gpt-4', 'fruits');

            const result = semanticCache.lookupCache('cherry apple banana', 'gpt-4');
            expect(result.hit).toBe(true);
            expect(result.response).toBe('fruits');
        });
    });

    describe('lookupCache', () => {
        it('should return cache miss for non-existent query', () => {
            const result = semanticCache.lookupCache('non-existent query', 'gpt-4');
            expect(result.hit).toBe(false);
            expect(result.response).toBeUndefined();
        });

        it('should increment hit count on cache hit', () => {
            semanticCache.cacheResponse('test', 'gpt-4', 'response');

            semanticCache.lookupCache('test', 'gpt-4');
            semanticCache.lookupCache('test', 'gpt-4');

            const stats = semanticCache.getCacheStats();
            expect(stats.totalHits).toBe(2);
        });

        it('should update last accessed time on hit', () => {
            const startTime = Date.now();
            vi.setSystemTime(startTime);

            semanticCache.cacheResponse('test', 'gpt-4', 'response');

            vi.setSystemTime(startTime + 30000); // 30 seconds later

            const result = semanticCache.lookupCache('test', 'gpt-4');
            expect(result.hit).toBe(true);
        });

        it('should track total misses', () => {
            semanticCache.lookupCache('miss1', 'gpt-4');
            semanticCache.lookupCache('miss2', 'gpt-4');

            const stats = semanticCache.getCacheStats();
            expect(stats.totalMisses).toBe(2);
        });

        it('should distinguish between different models', () => {
            semanticCache.cacheResponse('test', 'gpt-4', 'response1');
            semanticCache.cacheResponse('test', 'claude-3', 'response2');

            const result1 = semanticCache.lookupCache('test', 'gpt-4');
            const result2 = semanticCache.lookupCache('test', 'claude-3');

            expect(result1.response).toBe('response1');
            expect(result2.response).toBe('response2');
        });
    });

    describe('TTL expiration', () => {
        it('should return miss for expired entries', () => {
            const startTime = Date.now();
            vi.setSystemTime(startTime);

            semanticCache.cacheResponse('test', 'gpt-4', 'response');

            // Fast forward past TTL (1 hour)
            vi.setSystemTime(startTime + 61 * 60 * 1000);

            const result = semanticCache.lookupCache('test', 'gpt-4');
            expect(result.hit).toBe(false);
        });

        it('should return hit for non-expired entries', () => {
            const startTime = Date.now();
            vi.setSystemTime(startTime);

            semanticCache.cacheResponse('test', 'gpt-4', 'response');

            // Fast forward 30 minutes (within TTL)
            vi.setSystemTime(startTime + 30 * 60 * 1000);

            const result = semanticCache.lookupCache('test', 'gpt-4');
            expect(result.hit).toBe(true);
        });
    });

    describe('evictStale', () => {
        it('should remove expired entries', () => {
            const startTime = Date.now();
            vi.setSystemTime(startTime);

            semanticCache.cacheResponse('test1', 'gpt-4', 'response1');
            semanticCache.cacheResponse('test2', 'gpt-4', 'response2');

            // Fast forward past TTL
            vi.setSystemTime(startTime + 61 * 60 * 1000);

            const evicted = semanticCache.evictStale();
            expect(evicted).toBe(2);

            const stats = semanticCache.getCacheStats();
            expect(stats.totalEntries).toBe(0);
        });

        it('should keep non-expired entries', () => {
            const startTime = Date.now();
            vi.setSystemTime(startTime);

            semanticCache.cacheResponse('test1', 'gpt-4', 'response1');

            vi.setSystemTime(startTime + 30 * 60 * 1000); // 30 minutes

            semanticCache.cacheResponse('test2', 'gpt-4', 'response2');

            // Fast forward to 61 minutes (test1 expired, test2 not)
            vi.setSystemTime(startTime + 61 * 60 * 1000);

            const evicted = semanticCache.evictStale();
            expect(evicted).toBe(1);

            const stats = semanticCache.getCacheStats();
            expect(stats.totalEntries).toBe(1);
        });
    });

    describe('LRU eviction', () => {
        it('should evict least recently used when cache is full', () => {
            // Fill cache to max size (5000)
            for (let i = 0; i < 5000; i++) {
                semanticCache.cacheResponse(`query${i}`, 'gpt-4', `response${i}`);
            }

            // Add one more - should evict the first one
            semanticCache.cacheResponse('new query', 'gpt-4', 'new response');

            const stats = semanticCache.getCacheStats();
            expect(stats.totalEntries).toBe(5000);

            // First query should be evicted
            const result = semanticCache.lookupCache('query0', 'gpt-4');
            expect(result.hit).toBe(false);

            // New query should be in cache
            const newResult = semanticCache.lookupCache('new query', 'gpt-4');
            expect(newResult.hit).toBe(true);
        });

        it('should update access order on cache hit', () => {
            semanticCache.cacheResponse('oldest', 'gpt-4', 'response0');
            semanticCache.cacheResponse('middle', 'gpt-4', 'response1');
            semanticCache.cacheResponse('newest', 'gpt-4', 'response2');

            // Access oldest to move it to end of LRU
            semanticCache.lookupCache('oldest', 'gpt-4');

            // Now LRU order is: middle (oldest), newest, oldest (newest)
            // Fill cache to capacity (4997 more entries)
            for (let i = 0; i < 4997; i++) {
                semanticCache.cacheResponse(`filler${i}`, 'gpt-4', `response${i}`);
            }

            // Add one more - should evict 'middle' (least recently used)
            semanticCache.cacheResponse('final', 'gpt-4', 'final response');

            // middle should be evicted
            const resultMiddle = semanticCache.lookupCache('middle', 'gpt-4');
            expect(resultMiddle.hit).toBe(false);

            // oldest should still be in cache (was accessed)
            const resultOldest = semanticCache.lookupCache('oldest', 'gpt-4');
            expect(resultOldest.hit).toBe(true);
        });
    });

    describe('getCacheStats', () => {
        it('should return correct stats', () => {
            semanticCache.cacheResponse('test1', 'gpt-4', 'response1', {
                costSaved: 0.001,
            });
            semanticCache.cacheResponse('test2', 'gpt-4', 'response2', {
                costSaved: 0.002,
            });

            semanticCache.lookupCache('test1', 'gpt-4'); // hit
            semanticCache.lookupCache('test1', 'gpt-4'); // hit
            semanticCache.lookupCache('test3', 'gpt-4'); // miss

            const stats = semanticCache.getCacheStats();

            expect(stats.totalEntries).toBe(2);
            expect(stats.totalHits).toBe(2);
            expect(stats.totalMisses).toBe(1);
            expect(stats.hitRate).toBeCloseTo(2 / 3);
            expect(stats.estimatedCostSaved).toBeCloseTo(0.002); // 2 hits * 0.001
        });

        it('should return top queries sorted by hits', () => {
            semanticCache.cacheResponse('query1', 'gpt-4', 'response1');
            semanticCache.cacheResponse('query2', 'gpt-4', 'response2');
            semanticCache.cacheResponse('query3', 'gpt-4', 'response3');

            // Create different hit counts
            semanticCache.lookupCache('query2', 'gpt-4');
            semanticCache.lookupCache('query2', 'gpt-4');
            semanticCache.lookupCache('query2', 'gpt-4'); // 3 hits

            semanticCache.lookupCache('query1', 'gpt-4'); // 1 hit

            const stats = semanticCache.getCacheStats();

            expect(stats.topQueries[0].query).toBe('query2');
            expect(stats.topQueries[0].hits).toBe(3);
            expect(stats.topQueries[1].query).toBe('query1');
            expect(stats.topQueries[1].hits).toBe(1);
        });

        it('should handle empty cache', () => {
            const stats = semanticCache.getCacheStats();

            expect(stats.totalEntries).toBe(0);
            expect(stats.hitRate).toBe(0);
            expect(stats.totalHits).toBe(0);
            expect(stats.totalMisses).toBe(0);
            expect(stats.estimatedCostSaved).toBe(0);
            expect(stats.topQueries).toHaveLength(0);
        });
    });

    describe('getCostSavings', () => {
        it('should calculate total cost savings', () => {
            semanticCache.cacheResponse('test1', 'gpt-4', 'response1', {
                costSaved: 0.01,
            });
            semanticCache.cacheResponse('test2', 'gpt-4', 'response2', {
                costSaved: 0.02,
            });

            semanticCache.lookupCache('test1', 'gpt-4'); // 1 hit * 0.01
            semanticCache.lookupCache('test2', 'gpt-4');
            semanticCache.lookupCache('test2', 'gpt-4'); // 2 hits * 0.02

            const savings = semanticCache.getCostSavings();
            expect(savings).toBeCloseTo(0.05); // 0.01 + 0.04
        });

        it('should filter by period', () => {
            const startTime = Date.now();
            vi.setSystemTime(startTime);

            semanticCache.cacheResponse('test1', 'gpt-4', 'response1', {
                costSaved: 0.01,
            });
            semanticCache.lookupCache('test1', 'gpt-4');

            // Move forward 2 hours
            vi.setSystemTime(startTime + 2 * 60 * 60 * 1000);

            semanticCache.cacheResponse('test2', 'gpt-4', 'response2', {
                costSaved: 0.02,
            });
            semanticCache.lookupCache('test2', 'gpt-4');

            // Get savings for last 1 hour (should only include test2)
            const savings = semanticCache.getCostSavings(60 * 60 * 1000);
            expect(savings).toBeCloseTo(0.02);
        });

        it('should handle entries without cost metadata', () => {
            semanticCache.cacheResponse('test', 'gpt-4', 'response');
            semanticCache.lookupCache('test', 'gpt-4');

            const savings = semanticCache.getCostSavings();
            expect(savings).toBe(0);
        });
    });

    describe('invalidateForModel', () => {
        it('should clear all entries for specific model', () => {
            semanticCache.cacheResponse('test1', 'gpt-4', 'response1');
            semanticCache.cacheResponse('test2', 'gpt-4', 'response2');
            semanticCache.cacheResponse('test3', 'claude-3', 'response3');

            const invalidated = semanticCache.invalidateForModel('gpt-4');
            expect(invalidated).toBe(2);

            const stats = semanticCache.getCacheStats();
            expect(stats.totalEntries).toBe(1);

            // claude-3 entry should remain
            const result = semanticCache.lookupCache('test3', 'claude-3');
            expect(result.hit).toBe(true);
        });

        it('should return 0 for non-existent model', () => {
            semanticCache.cacheResponse('test', 'gpt-4', 'response');

            const invalidated = semanticCache.invalidateForModel('non-existent');
            expect(invalidated).toBe(0);

            const stats = semanticCache.getCacheStats();
            expect(stats.totalEntries).toBe(1);
        });
    });

    describe('getTopCachedQueries', () => {
        it('should return top queries by hit count', () => {
            semanticCache.cacheResponse('query1', 'gpt-4', 'response1', {
                costSaved: 0.01,
            });
            semanticCache.cacheResponse('query2', 'gpt-4', 'response2', {
                costSaved: 0.02,
            });
            semanticCache.cacheResponse('query3', 'gpt-4', 'response3', {
                costSaved: 0.03,
            });

            // Create hit counts: query2 = 5, query3 = 2, query1 = 1
            for (let i = 0; i < 5; i++) {
                semanticCache.lookupCache('query2', 'gpt-4');
            }
            for (let i = 0; i < 2; i++) {
                semanticCache.lookupCache('query3', 'gpt-4');
            }
            semanticCache.lookupCache('query1', 'gpt-4');

            const top = semanticCache.getTopCachedQueries(2);

            expect(top).toHaveLength(2);
            expect(top[0].query).toBe('query2');
            expect(top[0].hits).toBe(5);
            expect(top[0].costSaved).toBeCloseTo(0.1); // 5 * 0.02
            expect(top[1].query).toBe('query3');
            expect(top[1].hits).toBe(2);
        });

        it('should default to 10 results', () => {
            for (let i = 0; i < 15; i++) {
                semanticCache.cacheResponse(`query${i}`, 'gpt-4', `response${i}`);
                semanticCache.lookupCache(`query${i}`, 'gpt-4');
            }

            const top = semanticCache.getTopCachedQueries();
            expect(top).toHaveLength(10);
        });

        it('should return empty array for empty cache', () => {
            const top = semanticCache.getTopCachedQueries();
            expect(top).toHaveLength(0);
        });
    });

    describe('concurrent access', () => {
        it('should handle multiple lookups for same query', () => {
            semanticCache.cacheResponse('test', 'gpt-4', 'response');

            const results = [
                semanticCache.lookupCache('test', 'gpt-4'),
                semanticCache.lookupCache('test', 'gpt-4'),
                semanticCache.lookupCache('test', 'gpt-4'),
            ];

            expect(results.every((r) => r.hit)).toBe(true);
            expect(results.every((r) => r.response === 'response')).toBe(true);

            const stats = semanticCache.getCacheStats();
            expect(stats.totalHits).toBe(3);
        });

        it('should handle cache and lookup operations', () => {
            semanticCache.cacheResponse('query1', 'gpt-4', 'response1');

            const result1 = semanticCache.lookupCache('query1', 'gpt-4');
            expect(result1.hit).toBe(true);

            semanticCache.cacheResponse('query2', 'gpt-4', 'response2');

            const result2 = semanticCache.lookupCache('query2', 'gpt-4');
            expect(result2.hit).toBe(true);

            const stats = semanticCache.getCacheStats();
            expect(stats.totalEntries).toBe(2);
        });
    });

    describe('edge cases', () => {
        it('should handle empty query', () => {
            semanticCache.cacheResponse('', 'gpt-4', 'empty response');

            const result = semanticCache.lookupCache('', 'gpt-4');
            expect(result.hit).toBe(true);
        });

        it('should handle very long query', () => {
            const longQuery = 'word '.repeat(1000);
            semanticCache.cacheResponse(longQuery, 'gpt-4', 'long response');

            const result = semanticCache.lookupCache(longQuery, 'gpt-4');
            expect(result.hit).toBe(true);
        });

        it('should handle special characters', () => {
            semanticCache.cacheResponse('@#$%^&*()', 'gpt-4', 'special response');

            const result = semanticCache.lookupCache('@#$%^&*()', 'gpt-4');
            expect(result.hit).toBe(true);
        });

        it('should handle unicode characters', () => {
            semanticCache.cacheResponse('你好世界', 'gpt-4', 'unicode response');

            const result = semanticCache.lookupCache('你好世界', 'gpt-4');
            expect(result.hit).toBe(true);
        });

        it('should overwrite existing cache entry', () => {
            semanticCache.cacheResponse('test', 'gpt-4', 'response1');
            semanticCache.cacheResponse('test', 'gpt-4', 'response2');

            const result = semanticCache.lookupCache('test', 'gpt-4');
            expect(result.response).toBe('response2');

            const stats = semanticCache.getCacheStats();
            expect(stats.totalEntries).toBe(1);
        });
    });
});
