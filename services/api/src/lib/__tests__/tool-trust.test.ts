/**
 * Tool Trust Scoring Tests
 */

import { describe, expect, it } from 'vitest';
import { applyMCPDepthDecay, requiresApproval, TrustLevel } from '../tool-trust';

describe('TrustLevel', () => {
    it('has correct numeric values', () => {
        expect(TrustLevel.NONE).toBe(0);
        expect(TrustLevel.LOW).toBe(25);
        expect(TrustLevel.MEDIUM).toBe(50);
        expect(TrustLevel.HIGH).toBe(75);
        expect(TrustLevel.ABSOLUTE).toBe(100);
    });
});

describe('applyMCPDepthDecay', () => {
    it('returns base trust at depth 0', () => {
        expect(applyMCPDepthDecay(100, 0)).toBe(100);
    });

    it('decays by 0.85 per hop', () => {
        expect(applyMCPDepthDecay(100, 1)).toBe(85);
        expect(applyMCPDepthDecay(100, 2)).toBe(72);
        expect(applyMCPDepthDecay(100, 3)).toBe(61);
    });

    it('approaches zero at deep depths', () => {
        expect(applyMCPDepthDecay(100, 10)).toBeLessThan(20);
    });
});

describe('requiresApproval', () => {
    it('never requires approval for ABSOLUTE trust', () => {
        expect(requiresApproval(TrustLevel.ABSOLUTE, false)).toBe(false);
        expect(requiresApproval(TrustLevel.ABSOLUTE, true)).toBe(false);
    });

    it('does not require approval for HIGH trust on non-sensitive ops', () => {
        expect(requiresApproval(TrustLevel.HIGH, false)).toBe(false);
    });

    it('requires approval for LOW trust', () => {
        expect(requiresApproval(TrustLevel.LOW, false)).toBe(true);
    });

    it('requires approval for NONE trust', () => {
        expect(requiresApproval(TrustLevel.NONE, false)).toBe(true);
        expect(requiresApproval(TrustLevel.NONE, true)).toBe(true);
    });
});
