import { beforeEach, describe, expect, it } from 'vitest';
import { useYulaStore } from '@/stores/yula-store';

describe('useYulaStore', () => {
    beforeEach(() => {
        localStorage.clear();
        useYulaStore.getState().reset();
    });

    it('opens and closes omnibar', () => {
        const store = useYulaStore.getState();

        store.openOmnibar();
        expect(useYulaStore.getState().omnibar.isOpen).toBe(true);

        store.setOmnibarQuery('memory');
        expect(useYulaStore.getState().omnibar.query).toBe('memory');

        store.closeOmnibar();
        expect(useYulaStore.getState().omnibar.isOpen).toBe(false);
        expect(useYulaStore.getState().omnibar.query).toBe('');
    });

    it('manages PAC items', () => {
        const store = useYulaStore.getState();

        store.addPACItem({
            type: 'reminder',
            title: 'Follow up',
            description: 'Ping team',
            scheduledFor: new Date(),
        });

        const first = useYulaStore.getState().pac.items[0];
        expect(first).toBeDefined();
        expect(first.status).toBe('pending');

        store.approvePACItem(first.id);
        expect(useYulaStore.getState().pac.items[0].status).toBe('approved');

        const snoozeUntil = new Date(Date.now() + 60_000);
        store.snoozePACItem(first.id, snoozeUntil);
        expect(useYulaStore.getState().pac.items[0].status).toBe('snoozed');

        store.removePACItem(first.id);
        expect(useYulaStore.getState().pac.items).toHaveLength(0);
    });

    it('runs council deliberation flow', () => {
        const store = useYulaStore.getState();

        store.startCouncilDeliberation();
        expect(useYulaStore.getState().council.isActive).toBe(true);
        expect(useYulaStore.getState().council.isDeliberating).toBe(true);

        store.addCouncilThought({
            persona: 'logic',
            thought: 'Use safer default',
            confidence: 0.8,
            timestamp: new Date(),
        });
        expect(useYulaStore.getState().council.thoughts).toHaveLength(1);

        store.setCouncilVerdict({
            recommendation: 'Proceed with fallback',
            confidence: 0.9,
            reasoning: 'Best tradeoff',
            contributions: {
                logic: 'Risk reduced',
                creative: 'Could A/B test',
                prudent: 'Low blast radius',
                'devils-advocate': 'Watch latency',
            },
        });

        expect(useYulaStore.getState().council.isDeliberating).toBe(false);
        expect(useYulaStore.getState().council.verdict?.recommendation).toContain('fallback');

        store.resetCouncil();
        expect(useYulaStore.getState().council.isActive).toBe(false);
    });

    it('manages memory graph nodes and edges', () => {
        const store = useYulaStore.getState();

        store.addMemoryNode({
            id: 'node-1',
            label: 'Project Alpha',
            category: 'project',
        });
        store.addMemoryNode({
            id: 'node-2',
            label: 'Alice',
            category: 'person',
        });
        store.addMemoryEdge({
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
            relationship: 'owner',
        });

        const { memoryGraph } = useYulaStore.getState();
        expect(memoryGraph.nodes).toHaveLength(2);
        expect(memoryGraph.edges).toHaveLength(1);

        store.selectMemoryNode('node-1');
        expect(useYulaStore.getState().memoryGraph.selectedNodeId).toBe('node-1');
    });

    it('updates settings', () => {
        const store = useYulaStore.getState();

        expect(useYulaStore.getState().settings.engineMode).toBe('speed');
        store.toggleEngineMode();
        expect(useYulaStore.getState().settings.engineMode).toBe('deep');

        store.markWelcomeSeen();
        expect(useYulaStore.getState().settings.hasSeenWelcome).toBe(true);
    });
});
