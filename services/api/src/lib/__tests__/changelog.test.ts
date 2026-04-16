import { describe, expect, it } from 'vitest';
import { getChangelog, getLatestVersion } from '../changelog';

describe('changelog', () => {
    describe('getChangelog', () => {
        it('returns entries', () => {
            const entries = getChangelog();

            expect(Array.isArray(entries)).toBe(true);
            expect(entries.length).toBeGreaterThan(0);
        });

        it('filters by type - feature', () => {
            const features = getChangelog('feature');

            expect(Array.isArray(features)).toBe(true);
            for (const entry of features) {
                expect(entry.type).toBe('feature');
            }
        });

        it('filters by type - improvement', () => {
            const improvements = getChangelog('improvement');

            expect(Array.isArray(improvements)).toBe(true);
            for (const entry of improvements) {
                expect(entry.type).toBe('improvement');
            }
        });

        it('filters by type - fix', () => {
            const fixes = getChangelog('fix');

            expect(Array.isArray(fixes)).toBe(true);
            for (const entry of fixes) {
                expect(entry.type).toBe('fix');
            }
        });

        it('filters by type - security', () => {
            const security = getChangelog('security');

            expect(Array.isArray(security)).toBe(true);
            for (const entry of security) {
                expect(entry.type).toBe('security');
            }
        });

        it('respects limit parameter', () => {
            const entries = getChangelog(undefined, 3);

            expect(entries.length).toBeLessThanOrEqual(3);
        });

        it('respects limit with type filter', () => {
            const features = getChangelog('feature', 1);

            expect(features.length).toBeLessThanOrEqual(1);
        });

        it('returns empty array for non-existent type', () => {
            const entries = getChangelog('non_existent_type');

            expect(Array.isArray(entries)).toBe(true);
            expect(entries.length).toBe(0);
        });

        it('changelog entries have required fields', () => {
            const entries = getChangelog();

            for (const entry of entries) {
                expect(entry).toHaveProperty('version');
                expect(entry).toHaveProperty('date');
                expect(entry).toHaveProperty('title');
                expect(entry).toHaveProperty('description');
                expect(entry).toHaveProperty('type');
                expect(entry).toHaveProperty('highlights');

                expect(typeof entry.version).toBe('string');
                expect(typeof entry.date).toBe('string');
                expect(typeof entry.title).toBe('string');
                expect(typeof entry.description).toBe('string');
                expect(typeof entry.type).toBe('string');
                expect(Array.isArray(entry.highlights)).toBe(true);
            }
        });

        it('version strings follow semantic versioning pattern', () => {
            const entries = getChangelog();
            const semverPattern = /^\d+\.\d+\.\d+$/;

            for (const entry of entries) {
                expect(entry.version).toMatch(semverPattern);
            }
        });

        it('date strings are in valid format', () => {
            const entries = getChangelog();
            const datePattern = /^\d{4}-\d{2}-\d{2}$/;

            for (const entry of entries) {
                expect(entry.date).toMatch(datePattern);
            }
        });

        it('highlights are non-empty arrays', () => {
            const entries = getChangelog();

            for (const entry of entries) {
                expect(entry.highlights.length).toBeGreaterThan(0);
                for (const highlight of entry.highlights) {
                    expect(typeof highlight).toBe('string');
                    expect(highlight.length).toBeGreaterThan(0);
                }
            }
        });

        it('types are valid enum values', () => {
            const entries = getChangelog();
            const validTypes = ['feature', 'improvement', 'fix', 'security'];

            for (const entry of entries) {
                expect(validTypes).toContain(entry.type);
            }
        });
    });

    describe('getLatestVersion', () => {
        it('returns version info', () => {
            const latest = getLatestVersion();

            expect(latest).toHaveProperty('version');
            expect(latest).toHaveProperty('date');
            expect(latest).toHaveProperty('title');
        });

        it('returns correct format', () => {
            const latest = getLatestVersion();

            expect(typeof latest.version).toBe('string');
            expect(typeof latest.date).toBe('string');
            expect(typeof latest.title).toBe('string');
        });

        it('returns the first changelog entry', () => {
            const latest = getLatestVersion();
            const allEntries = getChangelog();

            expect(latest.version).toBe(allEntries[0].version);
            expect(latest.date).toBe(allEntries[0].date);
            expect(latest.title).toBe(allEntries[0].title);
        });

        it('version matches semantic versioning pattern', () => {
            const latest = getLatestVersion();
            const semverPattern = /^\d+\.\d+\.\d+$/;

            expect(latest.version).toMatch(semverPattern);
        });

        it('date matches valid date format', () => {
            const latest = getLatestVersion();
            const datePattern = /^\d{4}-\d{2}-\d{2}$/;

            expect(latest.date).toMatch(datePattern);
        });

        it('title is non-empty string', () => {
            const latest = getLatestVersion();

            expect(latest.title.length).toBeGreaterThan(0);
        });
    });
});
