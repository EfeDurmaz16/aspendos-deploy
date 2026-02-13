/**
 * Audit Store Tests
 *
 * Comprehensive test suite for the in-memory audit store with ring buffer.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { auditStore } from '../audit-store';
import type { AuditEntry } from '../audit-store';

describe('AuditStore', () => {
    beforeEach(() => {
        auditStore.clearAudit_forTesting();
    });

    afterEach(() => {
        auditStore.clearAudit_forTesting();
    });

    describe('recordAudit', () => {
        it('should record a basic audit entry', () => {
            auditStore.recordAudit({
                userId: 'user-1',
                action: 'POST /api/chat',
                resource: 'chat',
                method: 'POST',
                path: '/api/chat',
            });

            const entries = auditStore.getAuditLog();
            expect(entries).toHaveLength(1);
            expect(entries[0]).toMatchObject({
                userId: 'user-1',
                action: 'POST /api/chat',
                resource: 'chat',
                method: 'POST',
                path: '/api/chat',
            });
            expect(entries[0].id).toBeDefined();
            expect(entries[0].timestamp).toBeInstanceOf(Date);
        });

        it('should record entries with optional fields', () => {
            auditStore.recordAudit({
                userId: 'user-1',
                action: 'POST /api/chat',
                resource: 'chat',
                method: 'POST',
                path: '/api/chat',
                statusCode: 201,
                ip: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
                duration: 150,
                requestId: 'req-123',
            });

            const entries = auditStore.getAuditLog();
            expect(entries[0]).toMatchObject({
                statusCode: 201,
                ip: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
                duration: 150,
                requestId: 'req-123',
            });
        });

        it('should handle null userId', () => {
            auditStore.recordAudit({
                userId: null,
                action: 'POST /api/auth/login',
                resource: 'auth',
                method: 'POST',
                path: '/api/auth/login',
            });

            const entries = auditStore.getAuditLog();
            expect(entries[0].userId).toBeNull();
        });

        it('should assign unique IDs to each entry', () => {
            auditStore.recordAudit({
                userId: 'user-1',
                action: 'POST /api/chat',
                resource: 'chat',
                method: 'POST',
                path: '/api/chat',
            });

            auditStore.recordAudit({
                userId: 'user-1',
                action: 'DELETE /api/chat/123',
                resource: 'chat',
                method: 'DELETE',
                path: '/api/chat/123',
            });

            const entries = auditStore.getAuditLog();
            expect(entries[0].id).not.toEqual(entries[1].id);
        });
    });

    describe('getAuditLog - filtering', () => {
        beforeEach(() => {
            // Populate with test data
            auditStore.recordAudit({
                userId: 'user-1',
                action: 'POST /api/chat',
                resource: 'chat',
                method: 'POST',
                path: '/api/chat',
            });

            auditStore.recordAudit({
                userId: 'user-2',
                action: 'DELETE /api/memory/456',
                resource: 'memory',
                method: 'DELETE',
                path: '/api/memory/456',
            });

            auditStore.recordAudit({
                userId: 'user-1',
                action: 'PATCH /api/chat/123',
                resource: 'chat',
                method: 'PATCH',
                path: '/api/chat/123',
            });
        });

        it('should return all entries without filters', () => {
            const entries = auditStore.getAuditLog();
            expect(entries).toHaveLength(3);
        });

        it('should filter by userId', () => {
            const entries = auditStore.getAuditLog({ userId: 'user-1' });
            expect(entries).toHaveLength(2);
            expect(entries.every((e) => e.userId === 'user-1')).toBe(true);
        });

        it('should filter by action', () => {
            const entries = auditStore.getAuditLog({ action: 'POST /api/chat' });
            expect(entries).toHaveLength(1);
            expect(entries[0].action).toBe('POST /api/chat');
        });

        it('should filter by resource', () => {
            const entries = auditStore.getAuditLog({ resource: 'chat' });
            expect(entries).toHaveLength(2);
            expect(entries.every((e) => e.resource === 'chat')).toBe(true);
        });

        it('should filter by date range', () => {
            const now = new Date();
            const future = new Date(now.getTime() + 1000);

            const entries = auditStore.getAuditLog({
                fromDate: new Date(0),
                toDate: future,
            });
            expect(entries).toHaveLength(3);

            const noEntries = auditStore.getAuditLog({
                fromDate: future,
            });
            expect(noEntries).toHaveLength(0);
        });

        it('should combine multiple filters', () => {
            const entries = auditStore.getAuditLog({
                userId: 'user-1',
                resource: 'chat',
            });
            expect(entries).toHaveLength(2);
            expect(entries.every((e) => e.userId === 'user-1' && e.resource === 'chat')).toBe(true);
        });
    });

    describe('getAuditLog - pagination', () => {
        beforeEach(() => {
            // Create 100 entries
            for (let i = 0; i < 100; i++) {
                auditStore.recordAudit({
                    userId: `user-${i % 10}`,
                    action: `POST /api/resource/${i}`,
                    resource: 'test',
                    method: 'POST',
                    path: `/api/resource/${i}`,
                });
            }
        });

        it('should apply default limit of 50', () => {
            const entries = auditStore.getAuditLog();
            expect(entries).toHaveLength(50);
        });

        it('should apply custom limit', () => {
            const entries = auditStore.getAuditLog({ limit: 10 });
            expect(entries).toHaveLength(10);
        });

        it('should apply offset', () => {
            const firstPage = auditStore.getAuditLog({ limit: 10, offset: 0 });
            const secondPage = auditStore.getAuditLog({ limit: 10, offset: 10 });

            expect(firstPage).toHaveLength(10);
            expect(secondPage).toHaveLength(10);
            expect(firstPage[0].id).not.toEqual(secondPage[0].id);
        });

        it('should return newest entries first', () => {
            const entries = auditStore.getAuditLog({ limit: 100 });

            // Verify descending order
            for (let i = 1; i < entries.length; i++) {
                expect(entries[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
                    entries[i].timestamp.getTime()
                );
            }
        });
    });

    describe('getAuditStats', () => {
        beforeEach(() => {
            auditStore.recordAudit({
                userId: 'user-1',
                action: 'POST /api/chat',
                resource: 'chat',
                method: 'POST',
                path: '/api/chat',
            });

            auditStore.recordAudit({
                userId: 'user-1',
                action: 'POST /api/chat',
                resource: 'chat',
                method: 'POST',
                path: '/api/chat',
            });

            auditStore.recordAudit({
                userId: 'user-2',
                action: 'DELETE /api/memory/456',
                resource: 'memory',
                method: 'DELETE',
                path: '/api/memory/456',
            });
        });

        it('should return total entry count', () => {
            const stats = auditStore.getAuditStats();
            expect(stats.totalEntries).toBe(3);
        });

        it('should count entries by action', () => {
            const stats = auditStore.getAuditStats();
            expect(stats.entriesByAction['POST /api/chat']).toBe(2);
            expect(stats.entriesByAction['DELETE /api/memory/456']).toBe(1);
        });

        it('should count entries by resource', () => {
            const stats = auditStore.getAuditStats();
            expect(stats.entriesByResource.chat).toBe(2);
            expect(stats.entriesByResource.memory).toBe(1);
        });

        it('should count unique users', () => {
            const stats = auditStore.getAuditStats();
            expect(stats.uniqueUsers).toBe(2);
        });

        it('should track oldest and newest entries', () => {
            const stats = auditStore.getAuditStats();
            expect(stats.oldestEntry).toBeInstanceOf(Date);
            expect(stats.newestEntry).toBeInstanceOf(Date);
            expect(stats.newestEntry!.getTime()).toBeGreaterThanOrEqual(
                stats.oldestEntry!.getTime()
            );
        });

        it('should exclude null userIds from unique user count', () => {
            auditStore.recordAudit({
                userId: null,
                action: 'POST /api/auth/login',
                resource: 'auth',
                method: 'POST',
                path: '/api/auth/login',
            });

            const stats = auditStore.getAuditStats();
            expect(stats.uniqueUsers).toBe(2); // Still 2, not 3
        });
    });

    describe('exportAudit', () => {
        beforeEach(() => {
            auditStore.recordAudit({
                userId: 'user-1',
                action: 'POST /api/chat',
                resource: 'chat',
                method: 'POST',
                path: '/api/chat',
            });

            auditStore.recordAudit({
                userId: 'user-2',
                action: 'DELETE /api/memory/456',
                resource: 'memory',
                method: 'DELETE',
                path: '/api/memory/456',
            });

            auditStore.recordAudit({
                userId: 'user-1',
                action: 'PATCH /api/chat/123',
                resource: 'chat',
                method: 'PATCH',
                path: '/api/chat/123',
            });
        });

        it('should export all entries for a user', () => {
            const exported = auditStore.exportAudit('user-1');
            expect(exported).toHaveLength(2);
            expect(exported.every((e) => e.userId === 'user-1')).toBe(true);
        });

        it('should return entries in descending order', () => {
            const exported = auditStore.exportAudit('user-1');
            expect(exported[0].timestamp.getTime()).toBeGreaterThanOrEqual(
                exported[1].timestamp.getTime()
            );
        });

        it('should return empty array for non-existent user', () => {
            const exported = auditStore.exportAudit('non-existent');
            expect(exported).toHaveLength(0);
        });
    });

    describe('getCount', () => {
        beforeEach(() => {
            for (let i = 0; i < 25; i++) {
                auditStore.recordAudit({
                    userId: 'user-1',
                    action: 'POST /api/chat',
                    resource: 'chat',
                    method: 'POST',
                    path: '/api/chat',
                });
            }

            for (let i = 0; i < 15; i++) {
                auditStore.recordAudit({
                    userId: 'user-2',
                    action: 'DELETE /api/memory/456',
                    resource: 'memory',
                    method: 'DELETE',
                    path: '/api/memory/456',
                });
            }
        });

        it('should return total count without filters', () => {
            const count = auditStore.getCount();
            expect(count).toBe(40);
        });

        it('should return filtered count', () => {
            const count = auditStore.getCount({ userId: 'user-1' });
            expect(count).toBe(25);

            const count2 = auditStore.getCount({ resource: 'memory' });
            expect(count2).toBe(15);
        });
    });

    describe('ring buffer behavior', () => {
        it('should overwrite oldest entries when buffer is full', () => {
            // Fill buffer with 10,000 entries
            for (let i = 0; i < 10_000; i++) {
                auditStore.recordAudit({
                    userId: `user-${i}`,
                    action: `POST /api/resource/${i}`,
                    resource: 'test',
                    method: 'POST',
                    path: `/api/resource/${i}`,
                });
            }

            const stats1 = auditStore.getAuditStats();
            expect(stats1.totalEntries).toBe(10_000);

            // Add one more entry, should overwrite the oldest
            auditStore.recordAudit({
                userId: 'new-user',
                action: 'POST /api/new',
                resource: 'new',
                method: 'POST',
                path: '/api/new',
            });

            const stats2 = auditStore.getAuditStats();
            expect(stats2.totalEntries).toBe(10_000); // Still 10,000, not 10,001

            // Verify the new entry exists
            const entries = auditStore.getAuditLog({ userId: 'new-user' });
            expect(entries).toHaveLength(1);

            // Verify the oldest entry (user-0) is gone
            const oldEntries = auditStore.getAuditLog({ userId: 'user-0' });
            expect(oldEntries).toHaveLength(0);
        });

        it('should maintain correct count after multiple overwrites', () => {
            // Fill buffer
            for (let i = 0; i < 10_000; i++) {
                auditStore.recordAudit({
                    userId: 'user-1',
                    action: `POST /api/resource/${i}`,
                    resource: 'test',
                    method: 'POST',
                    path: `/api/resource/${i}`,
                });
            }

            // Add 100 more (should overwrite oldest 100)
            for (let i = 0; i < 100; i++) {
                auditStore.recordAudit({
                    userId: 'user-2',
                    action: `POST /api/new/${i}`,
                    resource: 'new',
                    method: 'POST',
                    path: `/api/new/${i}`,
                });
            }

            const stats = auditStore.getAuditStats();
            expect(stats.totalEntries).toBe(10_000);
            expect(stats.uniqueUsers).toBe(2);
        });
    });

    describe('clearAudit_forTesting', () => {
        it('should clear all entries', () => {
            auditStore.recordAudit({
                userId: 'user-1',
                action: 'POST /api/chat',
                resource: 'chat',
                method: 'POST',
                path: '/api/chat',
            });

            expect(auditStore.getAuditLog()).toHaveLength(1);

            auditStore.clearAudit_forTesting();

            expect(auditStore.getAuditLog()).toHaveLength(0);
            expect(auditStore.getAuditStats().totalEntries).toBe(0);
        });

        it('should reset ring buffer state', () => {
            // Fill buffer
            for (let i = 0; i < 10_000; i++) {
                auditStore.recordAudit({
                    userId: 'user-1',
                    action: `POST /api/resource/${i}`,
                    resource: 'test',
                    method: 'POST',
                    path: `/api/resource/${i}`,
                });
            }

            auditStore.clearAudit_forTesting();

            // Add one entry
            auditStore.recordAudit({
                userId: 'user-1',
                action: 'POST /api/chat',
                resource: 'chat',
                method: 'POST',
                path: '/api/chat',
            });

            expect(auditStore.getAuditStats().totalEntries).toBe(1);
        });
    });
});
