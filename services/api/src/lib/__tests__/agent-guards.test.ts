/**
 * Agent Guard Chain Tests
 */

import { describe, expect, it } from 'vitest';
import {
    BlastRadiusGuard,
    createDefaultGuardChain,
    DangerousCommandGuard,
    GuardChain,
    type GuardContext,
    PolicyGuard,
    RateLimitGuard,
    ToolLoopGuard,
} from '../agent-guards';

function makeContext(overrides: Partial<GuardContext> = {}): GuardContext {
    return {
        toolName: 'test_tool',
        toolArgs: {},
        userId: 'user-1',
        sessionId: 'session-1',
        toolCallCount: 0,
        toolCallCountByName: {},
        previousActions: [],
        ...overrides,
    };
}

describe('ToolLoopGuard', () => {
    const guard = new ToolLoopGuard({ warn: 3, critical: 6, block: 10 });

    it('allows calls below threshold', async () => {
        const result = await guard.check(makeContext({ toolCallCount: 2 }));
        expect(result.type).toBe('allow');
    });

    it('warns at warn threshold', async () => {
        const result = await guard.check(makeContext({ toolCallCount: 3 }));
        expect(result.type).toBe('warn');
    });

    it('warns at critical threshold', async () => {
        const result = await guard.check(makeContext({ toolCallCount: 6 }));
        expect(result.type).toBe('warn');
    });

    it('blocks at block threshold', async () => {
        const result = await guard.check(makeContext({ toolCallCount: 10 }));
        expect(result.type).toBe('block');
    });

    it('detects ping-pong pattern', async () => {
        const result = await guard.check(
            makeContext({
                toolName: 'search',
                previousActions: Array.from({ length: 5 }, () => ({
                    toolName: 'search',
                    success: true,
                    timestamp: Date.now(),
                })),
            })
        );
        expect(result.type).toBe('warn');
        expect(result.message).toContain('consecutively');
    });
});

describe('DangerousCommandGuard', () => {
    const guard = new DangerousCommandGuard();

    it('allows safe operations', async () => {
        const result = await guard.check(makeContext({ toolArgs: { query: 'hello world' } }));
        expect(result.type).toBe('allow');
    });

    it('requires approval for rm -rf', async () => {
        const result = await guard.check(makeContext({ toolArgs: { command: 'rm -rf /' } }));
        expect(result.type).toBe('require_approval');
    });

    it('requires approval for DROP TABLE', async () => {
        const result = await guard.check(makeContext({ toolArgs: { sql: 'DROP TABLE users' } }));
        expect(result.type).toBe('require_approval');
    });

    it('requires approval for .env file access', async () => {
        const result = await guard.check(makeContext({ toolArgs: { path: '/app/.env' } }));
        expect(result.type).toBe('require_approval');
    });

    it('requires approval for localhost access', async () => {
        const result = await guard.check(
            makeContext({ toolArgs: { url: 'http://localhost:3000' } })
        );
        expect(result.type).toBe('require_approval');
    });
});

describe('BlastRadiusGuard', () => {
    const guard = new BlastRadiusGuard();

    it('allows non-destructive tools', async () => {
        const result = await guard.check(makeContext({ toolName: 'memory_search' }));
        expect(result.type).toBe('allow');
    });

    it('requires approval for memory_forget', async () => {
        const result = await guard.check(makeContext({ toolName: 'memory_forget' }));
        expect(result.type).toBe('require_approval');
    });
});

describe('RateLimitGuard', () => {
    const guard = new RateLimitGuard({ search: 5 });

    it('allows calls within limit', async () => {
        const result = await guard.check(
            makeContext({ toolName: 'search', toolCallCountByName: { search: 3 } })
        );
        expect(result.type).toBe('allow');
    });

    it('blocks calls exceeding limit', async () => {
        const result = await guard.check(
            makeContext({ toolName: 'search', toolCallCountByName: { search: 5 } })
        );
        expect(result.type).toBe('block');
    });
});

describe('PolicyGuard', () => {
    const guard = new PolicyGuard({ blockedTools: ['dangerous_tool'] });

    it('allows non-blocked tools', async () => {
        const result = await guard.check(makeContext({ toolName: 'safe_tool' }));
        expect(result.type).toBe('allow');
    });

    it('blocks blocked tools', async () => {
        const result = await guard.check(makeContext({ toolName: 'dangerous_tool' }));
        expect(result.type).toBe('block');
    });
});

describe('GuardChain', () => {
    it('returns allow when all guards pass', async () => {
        const chain = new GuardChain().add(new ToolLoopGuard()).add(new PolicyGuard());

        const result = await chain.evaluate(makeContext());
        expect(result.decision.type).toBe('allow');
        expect(result.evaluatedGuards).toEqual(['ToolLoopGuard', 'PolicyGuard']);
    });

    it('stops at first block', async () => {
        const chain = new GuardChain()
            .add(new PolicyGuard({ blockedTools: ['bad'] }))
            .add(new ToolLoopGuard());

        const result = await chain.evaluate(makeContext({ toolName: 'bad' }));
        expect(result.decision.type).toBe('block');
        expect(result.guardName).toBe('PolicyGuard');
        expect(result.evaluatedGuards).toEqual(['PolicyGuard']);
    });

    it('collects warnings from passing guards', async () => {
        const chain = new GuardChain()
            .add(new ToolLoopGuard({ warn: 1, critical: 5, block: 10 }))
            .add(new PolicyGuard());

        const result = await chain.evaluate(makeContext({ toolCallCount: 2 }));
        expect(result.decision.type).toBe('allow');
        expect(result.warnings.length).toBe(1);
        expect(result.warnings[0]).toContain('ToolLoopGuard');
    });

    it('createDefaultGuardChain returns a working chain', async () => {
        const chain = createDefaultGuardChain();
        const result = await chain.evaluate(makeContext());
        expect(result.decision.type).toBe('allow');
        expect(result.evaluatedGuards.length).toBe(5);
    });
});
