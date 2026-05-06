import type { ToolExecutionOptions } from 'ai';
import { describe, expect, it } from 'vitest';
import { assertToolOwner, getToolOwnerKey } from '../../../src/lib/tools/execution-context';

function options(context: ToolExecutionOptions['experimental_context']): ToolExecutionOptions {
    return {
        toolCallId: 'test-tool-call',
        messages: [],
        experimental_context: context,
    };
}

describe('tool execution owner context', () => {
    it('requires both user and session context', () => {
        expect(() => getToolOwnerKey(undefined)).toThrow(/user context required/);
        expect(() => getToolOwnerKey(options({ sessionId: 'session-1' }))).toThrow(
            /user context required/
        );
        expect(() => getToolOwnerKey(options({ userId: 'user-1' }))).toThrow(
            /session context required/
        );
    });

    it('creates a strict user and session owner key', () => {
        expect(getToolOwnerKey(options({ userId: ' user-1 ', sessionId: ' session-1 ' }))).toBe(
            'user-1:session-1'
        );
    });

    it('rejects wrong user or session owners', () => {
        const ownerOptions = options({ userId: 'user-1', sessionId: 'session-1' });

        expect(() => assertToolOwner('user-1:session-1', ownerOptions)).not.toThrow();
        expect(() => assertToolOwner('user-2:session-1', ownerOptions)).toThrow(
            /does not belong/
        );
        expect(() => assertToolOwner('user-1:session-2', ownerOptions)).toThrow(
            /does not belong/
        );
    });
});
