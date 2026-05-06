import { beforeEach, describe, expect, it, vi } from 'vitest';

const undoMocks = vi.hoisted(() => ({
    dispatchReverse: vi.fn(),
    historyForUser: vi.fn(),
}));

vi.mock('../agit', () => ({
    getAgit: vi.fn(() => ({
        historyForUser: undoMocks.historyForUser,
    })),
}));

vi.mock('../../reversibility/dispatch', () => ({
    dispatchReverse: undoMocks.dispatchReverse,
}));

import { handleUndoCommand } from '../undo';

describe('undo command audit metadata', () => {
    beforeEach(() => {
        undoMocks.historyForUser.mockReset();
        undoMocks.dispatchReverse.mockReset();
    });

    it('dispatches reversal to the tool recorded in AGIT history', async () => {
        undoMocks.historyForUser.mockResolvedValueOnce([
            {
                hash: 'commit-1',
                toolName: 'browser.click',
                reversibilityClass: 'compensatable',
                rollbackStrategy: { kind: 'compensation', compensate_tool: 'browser.back' },
                humanExplanation: 'Undo browser click',
            },
        ]);
        undoMocks.dispatchReverse.mockResolvedValueOnce({
            success: true,
            message: 'Reversed click',
        });

        await expect(handleUndoCommand('user-1')).resolves.toEqual({
            success: true,
            message: 'Reversed click',
            commitHash: 'commit-1',
            toolName: 'browser.click',
        });

        expect(undoMocks.dispatchReverse).toHaveBeenCalledWith(
            'browser.click',
            {
                reversibility_class: 'compensatable',
                approval_required: false,
                rollback_strategy: { kind: 'compensation', compensate_tool: 'browser.back' },
                human_explanation: 'Undo browser click',
            },
            {
                userId: 'user-1',
                commitHash: 'commit-1',
            }
        );
    });

    it('refuses to undo commits without rollback metadata', async () => {
        undoMocks.historyForUser.mockResolvedValueOnce([{ hash: 'legacy-commit' }]);

        await expect(handleUndoCommand('user-1')).resolves.toEqual({
            success: false,
            message: 'Last action is missing rollback metadata and cannot be safely undone.',
            commitHash: 'legacy-commit',
        });
        expect(undoMocks.dispatchReverse).not.toHaveBeenCalled();
    });
});
