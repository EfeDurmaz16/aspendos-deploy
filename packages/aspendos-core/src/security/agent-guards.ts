export type GuardDecision =
    | { type: 'allow' }
    | { type: 'warn'; message: string }
    | { type: 'block'; reason: string }
    | { type: 'require_approval'; reason: string; blastRadius?: BlastRadiusReport };

export interface BlastRadiusReport {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    affectedResources: string[];
    estimatedImpact: string;
}

export interface GuardContext {
    toolName: string;
    toolArgs: Record<string, unknown>;
    userId: string;
    sessionId: string;
    agentId?: string;
    toolCallCount: number;
    toolCallCountByName: Record<string, number>;
    previousActions: Array<{ toolName: string; success: boolean; timestamp: number }>;
}

export interface ToolGuard {
    name: string;
    check(context: GuardContext): Promise<GuardDecision>;
}

export interface GuardChainResult {
    decision: GuardDecision;
    guardName: string;
    warnings: string[];
    evaluatedGuards: string[];
}

export class GuardChain {
    private guards: ToolGuard[] = [];

    add(guard: ToolGuard): this {
        this.guards.push(guard);
        return this;
    }

    async evaluate(context: GuardContext): Promise<GuardChainResult> {
        const warnings: string[] = [];
        const evaluatedGuards: string[] = [];

        for (const guard of this.guards) {
            evaluatedGuards.push(guard.name);
            const decision = await guard.check(context);

            if (decision.type === 'warn') {
                warnings.push(`[${guard.name}] ${decision.message}`);
                continue;
            }
            if (decision.type === 'block' || decision.type === 'require_approval') {
                return { decision, guardName: guard.name, warnings, evaluatedGuards };
            }
        }

        return {
            decision: { type: 'allow' },
            guardName: 'chain',
            warnings,
            evaluatedGuards,
        };
    }
}

export class ToolLoopGuard implements ToolGuard {
    name = 'ToolLoopGuard';

    constructor(
        private thresholds: { warn: number; critical: number; block: number } = {
            warn: 10,
            critical: 20,
            block: 30,
        }
    ) {}

    async check(context: GuardContext): Promise<GuardDecision> {
        if (context.toolCallCount >= this.thresholds.block) {
            return {
                type: 'block',
                reason: `Tool call limit exceeded (${context.toolCallCount}/${this.thresholds.block}). Agent may be in an infinite loop.`,
            };
        }

        if (context.toolCallCount >= this.thresholds.critical) {
            return {
                type: 'warn',
                message: `High tool call count (${context.toolCallCount}/${this.thresholds.block}). Possible loop detected.`,
            };
        }

        if (context.toolCallCount >= this.thresholds.warn) {
            return {
                type: 'warn',
                message: `Tool call count reaching threshold (${context.toolCallCount}/${this.thresholds.block}).`,
            };
        }

        const recentTools = context.previousActions.slice(-5).map((action) => action.toolName);
        if (recentTools.length >= 5 && recentTools.every((tool) => tool === context.toolName)) {
            return {
                type: 'warn',
                message: `Same tool "${context.toolName}" called ${recentTools.length}+ times consecutively.`,
            };
        }

        return { type: 'allow' };
    }
}

export class DangerousCommandGuard implements ToolGuard {
    name = 'DangerousCommandGuard';

    private patterns: RegExp[] = [
        /rm\s+(-rf?|--recursive)/i,
        /rmdir/i,
        /del\s+\/[sf]/i,
        /DROP\s+(TABLE|DATABASE|SCHEMA)/i,
        /TRUNCATE\s+TABLE/i,
        /DELETE\s+FROM\s+\w+\s*$/i,
        /(?:localhost|127\.0\.0\.1|0\.0\.0\.0|::1|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)/i,
        /\.(env|pem|key|secret|credential)/i,
        /kill\s+-9/i,
        /pkill/i,
    ];

    async check(context: GuardContext): Promise<GuardDecision> {
        const argsStr = JSON.stringify(context.toolArgs);

        for (const pattern of this.patterns) {
            if (pattern.test(argsStr)) {
                return {
                    type: 'block',
                    reason: `Potentially dangerous operation detected in "${context.toolName}": pattern "${pattern.source}" matched.`,
                };
            }
        }

        return { type: 'allow' };
    }
}

export class BlastRadiusGuard implements ToolGuard {
    name = 'BlastRadiusGuard';

    private highImpactTools: Record<string, string> = {
        documentDelete: 'Can delete stored documents',
        memory_forget: 'Can delete user memories',
    };

    async check(context: GuardContext): Promise<GuardDecision> {
        const impact = this.highImpactTools[context.toolName];
        if (!impact) return { type: 'allow' };

        return {
            type: 'require_approval',
            reason: `Tool "${context.toolName}" has high blast radius: ${impact}`,
            blastRadius: {
                riskLevel: 'medium',
                affectedResources: [context.toolName],
                estimatedImpact: impact,
            },
        };
    }
}

export class RateLimitGuard implements ToolGuard {
    name = 'RateLimitGuard';

    constructor(private limits: Record<string, number> = {}) {}

    async check(context: GuardContext): Promise<GuardDecision> {
        const toolCount = context.toolCallCountByName[context.toolName] || 0;
        const limit = this.limits[context.toolName] ?? 50;

        if (toolCount >= limit) {
            return {
                type: 'block',
                reason: `Tool "${context.toolName}" rate limit exceeded (${toolCount}/${limit} per session).`,
            };
        }

        return { type: 'allow' };
    }
}

export class PolicyGuard implements ToolGuard {
    name = 'PolicyGuard';

    private blockedTools: Set<string>;

    constructor(options?: { blockedTools?: string[] }) {
        this.blockedTools = new Set(options?.blockedTools ?? []);
    }

    async check(context: GuardContext): Promise<GuardDecision> {
        if (this.blockedTools.has(context.toolName)) {
            return {
                type: 'block',
                reason: `Tool "${context.toolName}" is blocked by policy.`,
            };
        }

        return { type: 'allow' };
    }
}

export function createDefaultGuardChain(options?: {
    blockedTools?: string[];
    toolRateLimits?: Record<string, number>;
}): GuardChain {
    return new GuardChain()
        .add(new ToolLoopGuard())
        .add(new DangerousCommandGuard())
        .add(new BlastRadiusGuard())
        .add(new RateLimitGuard(options?.toolRateLimits))
        .add(new PolicyGuard({ blockedTools: options?.blockedTools }));
}
