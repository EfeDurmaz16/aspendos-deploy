/**
 * Agent Guard Chain System
 *
 * Composable guard chain for tool execution governance.
 * Adapted from AGIT's guard.rs (Allow/Warn/Block pattern) and
 * SARDIS's policy.py (composable pipeline, fail-closed).
 *
 * Each guard evaluates the tool call context and returns a decision.
 * The chain evaluates guards in order, stopping at the first Block or RequireApproval.
 */

// ============================================
// TYPES
// ============================================

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

// ============================================
// GUARD CHAIN
// ============================================

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

            switch (decision.type) {
                case 'allow':
                    continue;
                case 'warn':
                    warnings.push(`[${guard.name}] ${decision.message}`);
                    continue;
                case 'block':
                    return { decision, guardName: guard.name, warnings, evaluatedGuards };
                case 'require_approval':
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

// ============================================
// BUILT-IN GUARDS
// ============================================

/**
 * Guard 1: Tool Loop Detection (from OpenClaw pattern)
 * Warns at 10 calls, critical warning at 20, blocks at 30.
 */
export class ToolLoopGuard implements ToolGuard {
    name = 'ToolLoopGuard';

    private warnThreshold: number;
    private criticalThreshold: number;
    private blockThreshold: number;

    constructor(options?: { warn?: number; critical?: number; block?: number }) {
        this.warnThreshold = options?.warn ?? 10;
        this.criticalThreshold = options?.critical ?? 20;
        this.blockThreshold = options?.block ?? 30;
    }

    async check(context: GuardContext): Promise<GuardDecision> {
        if (context.toolCallCount >= this.blockThreshold) {
            return {
                type: 'block',
                reason: `Tool call limit exceeded (${context.toolCallCount}/${this.blockThreshold}). Agent may be in an infinite loop.`,
            };
        }

        if (context.toolCallCount >= this.criticalThreshold) {
            return {
                type: 'warn',
                message: `High tool call count (${context.toolCallCount}/${this.blockThreshold}). Possible loop detected.`,
            };
        }

        if (context.toolCallCount >= this.warnThreshold) {
            return {
                type: 'warn',
                message: `Tool call count reaching threshold (${context.toolCallCount}/${this.blockThreshold}).`,
            };
        }

        // Detect ping-pong: same tool called 5+ times in a row
        const recentTools = context.previousActions.slice(-5).map((a) => a.toolName);
        if (recentTools.length >= 5 && recentTools.every((t) => t === context.toolName)) {
            return {
                type: 'warn',
                message: `Same tool "${context.toolName}" called ${recentTools.length}+ times consecutively.`,
            };
        }

        return { type: 'allow' };
    }
}

/**
 * Guard 2: Dangerous Command Detection
 * Blocks tool calls with arguments matching dangerous patterns.
 */
export class DangerousCommandGuard implements ToolGuard {
    name = 'DangerousCommandGuard';

    private patterns: RegExp[] = [
        // File system destructive operations
        /rm\s+(-rf?|--recursive)/i,
        /rmdir/i,
        /del\s+\/[sf]/i,
        // Database destructive operations
        /DROP\s+(TABLE|DATABASE|SCHEMA)/i,
        /TRUNCATE\s+TABLE/i,
        /DELETE\s+FROM\s+\w+\s*$/i, // DELETE without WHERE
        // Network to internal addresses
        /(?:localhost|127\.0\.0\.1|0\.0\.0\.0|::1|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)/i,
        // Credential access
        /\.(env|pem|key|secret|credential)/i,
        // Process manipulation
        /kill\s+-9/i,
        /pkill/i,
    ];

    async check(context: GuardContext): Promise<GuardDecision> {
        const argsStr = JSON.stringify(context.toolArgs);

        for (const pattern of this.patterns) {
            if (pattern.test(argsStr)) {
                return {
                    type: 'require_approval',
                    reason: `Potentially dangerous operation detected in "${context.toolName}": pattern "${pattern.source}" matched.`,
                    blastRadius: {
                        riskLevel: 'high',
                        affectedResources: [context.toolName],
                        estimatedImpact: 'Destructive or sensitive operation detected',
                    },
                };
            }
        }

        return { type: 'allow' };
    }
}

/**
 * Guard 3: Blast Radius Analysis (from AGIT blast_radius.rs)
 * Evaluates how much state a tool call can change.
 */
export class BlastRadiusGuard implements ToolGuard {
    name = 'BlastRadiusGuard';

    // Tools that can affect large amounts of data
    private highImpactTools: Record<string, string> = {
        memory_forget: 'Can delete user memories',
        documentDelete: 'Can delete stored documents',
    };

    async check(context: GuardContext): Promise<GuardDecision> {
        const impact = this.highImpactTools[context.toolName];
        if (!impact) return { type: 'allow' };

        // For delete operations, require approval
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

/**
 * Guard 4: Per-Tool Rate Limiting
 * Prevents a single session from over-using specific tools.
 */
export class RateLimitGuard implements ToolGuard {
    name = 'RateLimitGuard';

    private limits: Record<string, number>;

    constructor(limits?: Record<string, number>) {
        // Default: 50 calls per tool per session
        this.limits = limits ?? {};
    }

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

/**
 * Guard 5: Policy Guard (from SARDIS policy.py)
 * Evaluates user-configurable rules.
 */
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

// ============================================
// DEFAULT GUARD CHAIN FACTORY
// ============================================

/**
 * Create the default guard chain with all built-in guards.
 */
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
