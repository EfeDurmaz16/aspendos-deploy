/**
 * Scheduler Service Tests
 *
 * Tests for time parsing, task creation, and task retrieval logic.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { parseTimeExpression, formatScheduledTime } from '../services/scheduler.service';

describe('Scheduler Service', () => {
    describe('parseTimeExpression', () => {
        const baseDate = new Date('2024-01-15T10:00:00Z');

        it('should parse "tomorrow" to next day at 9 AM', () => {
            const result = parseTimeExpression('tomorrow', baseDate);
            expect(result).not.toBeNull();
            expect(result?.getDate()).toBe(16);
            expect(result?.getHours()).toBe(9);
        });

        it('should parse "next week" to 7 days ahead', () => {
            const result = parseTimeExpression('next week', baseDate);
            expect(result).not.toBeNull();
            expect(result?.getDate()).toBe(22);
        });

        it('should parse "in 3 days"', () => {
            const result = parseTimeExpression('in 3 days', baseDate);
            expect(result).not.toBeNull();
            expect(result?.getDate()).toBe(18);
        });

        it('should parse "in 2 weeks"', () => {
            const result = parseTimeExpression('in 2 weeks', baseDate);
            expect(result).not.toBeNull();
            expect(result?.getDate()).toBe(29);
        });

        it('should parse "in 5 hours"', () => {
            const result = parseTimeExpression('in 5 hours', baseDate);
            expect(result).not.toBeNull();
            expect(result?.getHours()).toBe(15); // 10 + 5 = 15
        });

        it('should parse "in 30 minutes"', () => {
            const result = parseTimeExpression('in 30 minutes', baseDate);
            expect(result).not.toBeNull();
            expect(result?.getMinutes()).toBe(30);
        });

        it('should parse "3 days from now"', () => {
            const result = parseTimeExpression('3 days from now', baseDate);
            expect(result).not.toBeNull();
            expect(result?.getDate()).toBe(18);
        });

        it('should parse "1 week" shorthand', () => {
            const result = parseTimeExpression('1 week', baseDate);
            expect(result).not.toBeNull();
            expect(result?.getDate()).toBe(22);
        });

        it('should parse ISO date format', () => {
            const result = parseTimeExpression('2024-02-01T14:30:00Z', baseDate);
            expect(result).not.toBeNull();
            expect(result?.getDate()).toBe(1);
            expect(result?.getMonth()).toBe(1); // February (0-indexed)
        });

        it('should return null for unrecognized format', () => {
            const result = parseTimeExpression('invalid time', baseDate);
            expect(result).toBeNull();
        });

        it('should be case-insensitive', () => {
            const result1 = parseTimeExpression('TOMORROW', baseDate);
            const result2 = parseTimeExpression('Tomorrow', baseDate);
            const result3 = parseTimeExpression('tomorrow', baseDate);
            expect(result1).not.toBeNull();
            expect(result2).not.toBeNull();
            expect(result3).not.toBeNull();
            expect(result1?.getTime()).toBe(result2?.getTime());
            expect(result2?.getTime()).toBe(result3?.getTime());
        });

        it('should handle plural and singular units', () => {
            const result1 = parseTimeExpression('in 1 day', baseDate);
            const result2 = parseTimeExpression('in 1 days', baseDate);
            expect(result1).not.toBeNull();
            expect(result2).not.toBeNull();
            expect(result1?.getDate()).toBe(result2?.getDate());
        });
    });

    describe('formatScheduledTime', () => {
        it('should format minutes correctly', () => {
            const now = new Date();
            const future = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
            const result = formatScheduledTime(future);
            expect(result).toContain('30 minute');
        });

        it('should format hours correctly', () => {
            const now = new Date();
            const future = new Date(now.getTime() + 5 * 60 * 60 * 1000); // 5 hours
            const result = formatScheduledTime(future);
            expect(result).toContain('5 hour');
        });

        it('should format tomorrow correctly', () => {
            const now = new Date();
            const future = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25 hours
            const result = formatScheduledTime(future);
            expect(result).toBe('tomorrow');
        });

        it('should format days correctly', () => {
            const now = new Date();
            const future = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
            const result = formatScheduledTime(future);
            expect(result).toContain('3 days');
        });

        it('should format week+ dates with full date', () => {
            const now = new Date();
            const future = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days
            const result = formatScheduledTime(future);
            // Should contain weekday and month abbreviations
            expect(result.length).toBeGreaterThan(10);
        });
    });
});
