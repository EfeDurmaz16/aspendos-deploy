import { describe, expect, it } from 'vitest';
import { getVersionInfo } from '../api-version';

describe('api-version', () => {
    describe('getVersionInfo', () => {
        it('returns correct format', () => {
            const versionInfo = getVersionInfo();

            expect(versionInfo).toHaveProperty('current');
            expect(versionInfo).toHaveProperty('minimum');
            expect(versionInfo).toHaveProperty('deprecated');
        });

        it('current version is a string', () => {
            const versionInfo = getVersionInfo();

            expect(typeof versionInfo.current).toBe('string');
            expect(versionInfo.current.length).toBeGreaterThan(0);
        });

        it('minimum version is a string', () => {
            const versionInfo = getVersionInfo();

            expect(typeof versionInfo.minimum).toBe('string');
            expect(versionInfo.minimum.length).toBeGreaterThan(0);
        });

        it('deprecated is an array', () => {
            const versionInfo = getVersionInfo();

            expect(Array.isArray(versionInfo.deprecated)).toBe(true);
        });

        it('version strings match semver pattern', () => {
            const versionInfo = getVersionInfo();
            const semverPattern = /^\d+\.\d+\.\d+$/;

            expect(versionInfo.current).toMatch(semverPattern);
            expect(versionInfo.minimum).toMatch(semverPattern);
        });

        it('current version is valid semver', () => {
            const versionInfo = getVersionInfo();
            const parts = versionInfo.current.split('.');

            expect(parts.length).toBe(3);
            expect(Number.parseInt(parts[0])).toBeGreaterThanOrEqual(0);
            expect(Number.parseInt(parts[1])).toBeGreaterThanOrEqual(0);
            expect(Number.parseInt(parts[2])).toBeGreaterThanOrEqual(0);
        });

        it('minimum version is valid semver', () => {
            const versionInfo = getVersionInfo();
            const parts = versionInfo.minimum.split('.');

            expect(parts.length).toBe(3);
            expect(Number.parseInt(parts[0])).toBeGreaterThanOrEqual(0);
            expect(Number.parseInt(parts[1])).toBeGreaterThanOrEqual(0);
            expect(Number.parseInt(parts[2])).toBeGreaterThanOrEqual(0);
        });

        it('returns consistent results on multiple calls', () => {
            const info1 = getVersionInfo();
            const info2 = getVersionInfo();

            expect(info1.current).toBe(info2.current);
            expect(info1.minimum).toBe(info2.minimum);
            expect(info1.deprecated).toEqual(info2.deprecated);
        });
    });
});
