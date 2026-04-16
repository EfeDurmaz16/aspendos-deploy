import type { ReversibilityMetadata, ToolDefinition } from '../reversibility/types';

class ToolRegistry {
    private tools = new Map<string, ToolDefinition>();

    register(tool: ToolDefinition): void {
        this.tools.set(tool.name, tool);
    }

    get(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    has(name: string): boolean {
        return this.tools.has(name);
    }

    classify(name: string, args: unknown): ReversibilityMetadata {
        const tool = this.tools.get(name);
        if (!tool) {
            return {
                reversibility_class: 'irreversible_blocked',
                approval_required: true,
                rollback_strategy: { kind: 'none' },
                human_explanation: `Unknown tool "${name}" — blocked by default (fail-closed)`,
            };
        }
        return tool.classify(args);
    }

    list(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    names(): string[] {
        return Array.from(this.tools.keys());
    }
}

export const registry = new ToolRegistry();
