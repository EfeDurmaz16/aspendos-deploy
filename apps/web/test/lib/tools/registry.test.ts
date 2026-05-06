import { describe, expect, it } from 'vitest';
import { allAgentTools, getToolsForTier } from '../../../src/lib/tools';

describe('web agent tool registry governance', () => {
    it('does not expose paid tools below their tier', () => {
        expect(getToolsForTier('free')).not.toHaveProperty('sandbox_runCode');
        expect(getToolsForTier('personal')).not.toHaveProperty('computer_action');
    });

    it('gates computer use before execution instead of calling the raw tool', async () => {
        const tools = getToolsForTier('pro');
        const result = await tools.computer_action.execute({
            action: { action: 'type', text: 'secret' },
        });

        expect(result).toMatchObject({
            success: false,
            status: 'awaiting_approval',
            toolName: 'computer_action',
            class: 'approval_only',
        });
    });

    it('applies the same approval gate to the ungated manifest', async () => {
        const result = await allAgentTools.computer_screenshot.execute({});

        expect(result).toMatchObject({
            success: false,
            status: 'awaiting_approval',
            toolName: 'computer_screenshot',
            class: 'approval_only',
        });
    });
});
