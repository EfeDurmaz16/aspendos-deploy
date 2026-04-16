/**
 * Cron Scheduler Tests
 */

import { describe, expect, it } from 'vitest';
import { getNextCronRun } from '../scheduler.service';

describe('getNextCronRun', () => {
    it('returns null for invalid cron expressions', () => {
        expect(getNextCronRun('')).toBeNull();
        expect(getNextCronRun('invalid')).toBeNull();
        expect(getNextCronRun('* *')).toBeNull(); // Too few fields
    });

    it('parses "every minute" (* * * * *)', () => {
        const now = new Date('2026-03-23T10:30:00Z');
        const next = getNextCronRun('* * * * *', now);
        expect(next).not.toBeNull();
        expect(next!.getMinutes()).toBe(31);
    });

    it('parses specific minute (30 * * * *)', () => {
        const now = new Date('2026-03-23T10:00:00Z');
        const next = getNextCronRun('30 * * * *', now);
        expect(next).not.toBeNull();
        expect(next!.getMinutes()).toBe(30);
    });

    it('parses specific hour (0 9 * * *)', () => {
        const now = new Date('2026-03-23T08:00:00Z');
        const next = getNextCronRun('0 9 * * *', now);
        expect(next).not.toBeNull();
        expect(next!.getHours()).toBe(9);
        expect(next!.getMinutes()).toBe(0);
    });

    it('parses weekdays only (0 9 * * 1-5)', () => {
        // 2026-03-23 is a Monday
        const monday = new Date('2026-03-23T08:00:00Z');
        const next = getNextCronRun('0 9 * * 1-5', monday);
        expect(next).not.toBeNull();
        expect(next!.getHours()).toBe(9);
        // Should be same day (Monday) at 9am
        expect(next!.getDay()).toBeGreaterThanOrEqual(1);
        expect(next!.getDay()).toBeLessThanOrEqual(5);
    });

    it('parses step values (*/15 * * * *)', () => {
        const now = new Date('2026-03-23T10:02:00Z');
        const next = getNextCronRun('*/15 * * * *', now);
        expect(next).not.toBeNull();
        expect(next!.getMinutes() % 15).toBe(0);
    });

    it('parses comma-separated values (0 9,17 * * *)', () => {
        const now = new Date('2026-03-23T10:00:00Z');
        const next = getNextCronRun('0 9,17 * * *', now);
        expect(next).not.toBeNull();
        expect([9, 17]).toContain(next!.getHours());
    });
});
