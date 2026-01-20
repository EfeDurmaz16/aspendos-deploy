/**
 * Tests for Scheduler Service
 */
import { describe, expect, it } from 'vitest';
import { formatScheduledTime, parseTimeExpression } from '../services/scheduler.service';

describe('Scheduler Service', () => {
    describe('parseTimeExpression', () => {
        const baseDate = new Date('2024-01-15T10:30:00Z');

        describe('absolute time patterns', () => {
            it('should parse ISO date format', () => {
                const result = parseTimeExpression('2024-12-25T15:00', baseDate);
                expect(result).toBeInstanceOf(Date);
                expect(result?.toISOString()).toContain('2024-12-25');
            });

            it('should parse ISO date without time', () => {
                const result = parseTimeExpression('2024-12-25', baseDate);
                expect(result).toBeInstanceOf(Date);
                expect(result?.toISOString()).toContain('2024-12-25');
            });
        });

        describe('relative time patterns - tomorrow', () => {
            it('should parse "tomorrow"', () => {
                const result = parseTimeExpression('tomorrow', baseDate);
                expect(result).toBeInstanceOf(Date);
                expect(result?.getDate()).toBe(16); // baseDate + 1 day
                expect(result?.getHours()).toBe(9); // Default to 9 AM
            });

            it('should parse "TOMORROW" (case insensitive)', () => {
                const result = parseTimeExpression('TOMORROW', baseDate);
                expect(result).toBeInstanceOf(Date);
                expect(result?.getDate()).toBe(16);
            });
        });

        describe('relative time patterns - next week', () => {
            it('should parse "next week"', () => {
                const result = parseTimeExpression('next week', baseDate);
                expect(result).toBeInstanceOf(Date);
                expect(result?.getDate()).toBe(22); // baseDate + 7 days
                expect(result?.getHours()).toBe(9);
            });
        });

        describe('relative time patterns - "in X unit"', () => {
            it('should parse "in 3 days"', () => {
                const result = parseTimeExpression('in 3 days', baseDate);
                expect(result).toBeInstanceOf(Date);
                expect(result?.getDate()).toBe(18); // baseDate + 3 days
            });

            it('should parse "in 1 day"', () => {
                const result = parseTimeExpression('in 1 day', baseDate);
                expect(result).toBeInstanceOf(Date);
                expect(result?.getDate()).toBe(16);
            });

            it('should parse "in 2 weeks"', () => {
                const result = parseTimeExpression('in 2 weeks', baseDate);
                expect(result).toBeInstanceOf(Date);
                expect(result?.getDate()).toBe(29); // baseDate + 14 days
            });

            it('should parse "in 5 hours"', () => {
                const result = parseTimeExpression('in 5 hours', baseDate);
                expect(result).toBeInstanceOf(Date);
                expect(result?.getHours()).toBe(15); // 10 + 5 hours
            });

            it('should parse "in 30 minutes"', () => {
                const result = parseTimeExpression('in 30 minutes', baseDate);
                expect(result).toBeInstanceOf(Date);
                expect(result?.getMinutes()).toBe(0); // 30 + 30 minutes = 1 hour
                expect(result?.getHours()).toBe(11);
            });
        });

        describe('relative time patterns - "X unit from now"', () => {
            it('should parse "7 days from now"', () => {
                const result = parseTimeExpression('7 days from now', baseDate);
                expect(result).toBeInstanceOf(Date);
                expect(result?.getDate()).toBe(22);
            });

            it('should parse "2 weeks from now"', () => {
                const result = parseTimeExpression('2 weeks from now', baseDate);
                expect(result).toBeInstanceOf(Date);
                expect(result?.getDate()).toBe(29);
            });
        });

        describe('relative time patterns - "X unit" shorthand', () => {
            it('should parse "1 week"', () => {
                const result = parseTimeExpression('1 week', baseDate);
                expect(result).toBeInstanceOf(Date);
                expect(result?.getDate()).toBe(22);
            });

            it('should parse "3 days"', () => {
                const result = parseTimeExpression('3 days', baseDate);
                expect(result).toBeInstanceOf(Date);
                expect(result?.getDate()).toBe(18);
            });

            it('should parse "2 hours"', () => {
                const result = parseTimeExpression('2 hours', baseDate);
                expect(result).toBeInstanceOf(Date);
                expect(result?.getHours()).toBe(12);
            });
        });

        describe('invalid inputs', () => {
            it('should return null for unrecognized pattern', () => {
                const result = parseTimeExpression('some random text', baseDate);
                expect(result).toBeNull();
            });

            it('should return null for empty string', () => {
                const result = parseTimeExpression('', baseDate);
                expect(result).toBeNull();
            });

            it('should return null for gibberish', () => {
                const result = parseTimeExpression('asdfghjkl', baseDate);
                expect(result).toBeNull();
            });
        });

        describe('edge cases', () => {
            it('should handle month boundaries', () => {
                const endOfMonth = new Date('2024-01-30T10:00:00Z');
                const result = parseTimeExpression('in 5 days', endOfMonth);
                expect(result?.getMonth()).toBe(1); // February (0-indexed)
                expect(result?.getDate()).toBe(4);
            });

            it('should handle year boundaries', () => {
                const endOfYear = new Date('2024-12-30T10:00:00Z');
                const result = parseTimeExpression('in 5 days', endOfYear);
                expect(result?.getFullYear()).toBe(2025);
                expect(result?.getMonth()).toBe(0); // January
            });
        });
    });

    describe('formatScheduledTime', () => {
        it('should format minutes', () => {
            const now = new Date();
            const future = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
            const result = formatScheduledTime(future);
            expect(result).toMatch(/in \d+ minutes?/);
        });

        it('should format hours', () => {
            const now = new Date();
            const future = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours
            const result = formatScheduledTime(future);
            expect(result).toMatch(/in \d+ hours?/);
        });

        it('should format days', () => {
            const now = new Date();
            const future = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days
            const result = formatScheduledTime(future);
            expect(result).toMatch(/in \d+ days?/);
        });
    });
});
