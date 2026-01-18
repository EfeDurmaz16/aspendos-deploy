/**
 * Memory Agent Service
 *
 * Agentic Decision Layer for intelligent memory usage.
 * Implements Phase 2 of Aspendos Memory System.
 *
 * Features:
 * - Query classification (7 types)
 * - Memory usage decision (matrix + LLM fallback)
 * - Sector selection (5 sectors)
 * - Self-reflection on response quality
 */

// ============================================
// TYPES
// ============================================

export enum QueryType {
    GENERAL_KNOWLEDGE = 'general_knowledge', // "What is React?"
    TECHNICAL_ADVICE = 'technical_advice', // "How should I architect this?"
    DEBUGGING = 'debugging', // "Help debug this error"
    PERSONAL_REFLECTION = 'personal_reflection', // "Why do I feel stuck?"
    CODE_REVIEW = 'code_review', // "Review my code"
    LEARNING = 'learning', // "How to learn X?"
    CREATIVE = 'creative', // "Design ideas?"
    UNKNOWN = 'unknown',
}

export type MemorySector = 'episodic' | 'semantic' | 'procedural' | 'emotional' | 'reflective';

export interface MemoryDecision {
    useMemory: boolean;
    reasoning: string;
    sectors: MemorySector[];
    threshold: number;
    cost: number;
    queryType: QueryType;
    confidence: number;
}

export interface ReflectionResult {
    satisfied: boolean;
    reasoning: string;
    retryStrategy: string | null;
}

// ============================================
// DECISION MATRIX
// ============================================

/**
 * Maps query types to memory usage decisions.
 * true = use memory, false = skip memory, null = ask LLM
 */
const DECISION_MATRIX: Record<QueryType, boolean | null> = {
    [QueryType.GENERAL_KNOWLEDGE]: false, // Facts, no personalization needed
    [QueryType.TECHNICAL_ADVICE]: true, // Needs user's approach/style
    [QueryType.DEBUGGING]: true, // Needs user's tools/patterns
    [QueryType.PERSONAL_REFLECTION]: true, // Needs user's feelings/history
    [QueryType.CODE_REVIEW]: true, // Needs user's preferences
    [QueryType.LEARNING]: true, // Needs user's current skills
    [QueryType.CREATIVE]: true, // Needs user's style
    [QueryType.UNKNOWN]: null, // Let LLM decide
};

/**
 * Sector relevance by query type.
 * Ordered by priority (first = most relevant).
 */
const SECTOR_MAP: Record<QueryType, MemorySector[]> = {
    [QueryType.GENERAL_KNOWLEDGE]: [],
    [QueryType.TECHNICAL_ADVICE]: ['semantic', 'procedural'],
    [QueryType.DEBUGGING]: ['procedural', 'episodic'],
    [QueryType.PERSONAL_REFLECTION]: ['emotional', 'reflective', 'episodic'],
    [QueryType.CODE_REVIEW]: ['procedural', 'semantic'],
    [QueryType.LEARNING]: ['semantic', 'episodic', 'reflective'],
    [QueryType.CREATIVE]: ['reflective', 'emotional', 'semantic'],
    [QueryType.UNKNOWN]: ['semantic', 'procedural'],
};

// ============================================
// CLASSIFICATION KEYWORDS
// ============================================

const CLASSIFICATION_PATTERNS: { pattern: RegExp; type: QueryType }[] = [
    // General knowledge patterns
    {
        pattern: /^(what is|what are|who is|how does|when did|where is)\b/i,
        type: QueryType.GENERAL_KNOWLEDGE,
    },
    {
        pattern: /\b(explain|define|describe)\s+(what|how|the)\b/i,
        type: QueryType.GENERAL_KNOWLEDGE,
    },

    // Technical advice patterns
    {
        pattern: /\b(should i|how should|what approach|best way to|recommend|architect)/i,
        type: QueryType.TECHNICAL_ADVICE,
    },
    {
        pattern: /\b(design|structure|organize|implement)\s+(my|the|this|a)\b/i,
        type: QueryType.TECHNICAL_ADVICE,
    },

    // Debugging patterns
    {
        pattern: /\b(debug|error|fix|broken|not working|crash|bug|issue)/i,
        type: QueryType.DEBUGGING,
    },
    { pattern: /\b(why (isn't|doesn't|won't|can't)|troubleshoot)/i, type: QueryType.DEBUGGING },

    // Personal reflection patterns
    {
        pattern: /\b(feel|feeling|stuck|frustrated|overwhelmed|motivated|inspired)/i,
        type: QueryType.PERSONAL_REFLECTION,
    },
    {
        pattern: /\b(why (do i|am i)|how (do i|can i) (stay|get|feel))/i,
        type: QueryType.PERSONAL_REFLECTION,
    },

    // Code review patterns
    {
        pattern: /\b(review|check|look at|critique)\s+(my|this|the)\s*(code|implementation)/i,
        type: QueryType.CODE_REVIEW,
    },

    // Learning patterns
    {
        pattern: /\b(learn|study|master|understand|get better at|improve)/i,
        type: QueryType.LEARNING,
    },
    { pattern: /\b(tutorial|resources|course|where (to|can i) learn)/i, type: QueryType.LEARNING },

    // Creative patterns
    { pattern: /\b(idea|brainstorm|creative|design|imagine|suggest)/i, type: QueryType.CREATIVE },
];

// ============================================
// MEMORY DECISION AGENT
// ============================================

export class MemoryDecisionAgent {
    private llmEndpoint: string;

    constructor(llmEndpoint?: string) {
        this.llmEndpoint = llmEndpoint || process.env.AGENTS_URL || 'http://localhost:8082';
    }

    /**
     * Classify the query type using pattern matching.
     * Fast heuristic approach - no LLM call needed.
     */
    classifyQuery(query: string): QueryType {
        const queryLower = query.toLowerCase().trim();

        // Check for personal context indicators
        const hasPersonalContext = /\b(my|me|i|we|our|mine)\b/i.test(query);

        // Match against patterns
        for (const { pattern, type } of CLASSIFICATION_PATTERNS) {
            if (pattern.test(queryLower)) {
                // Override general knowledge if personal context detected
                if (type === QueryType.GENERAL_KNOWLEDGE && hasPersonalContext) {
                    return QueryType.PERSONAL_REFLECTION;
                }
                return type;
            }
        }

        // Default to unknown for complex queries
        return QueryType.UNKNOWN;
    }

    /**
     * Core decision: Should we use user's memories?
     * Uses decision matrix for known types, can call LLM for UNKNOWN.
     */
    async decideMemoryUsage(
        userId: string,
        query: string,
        queryType?: QueryType
    ): Promise<MemoryDecision> {
        // Classify if not provided
        const type = queryType || this.classifyQuery(query);

        // Get decision from matrix
        const useMemory = DECISION_MATRIX[type];

        // If matrix says no, return early
        if (useMemory === false) {
            return {
                useMemory: false,
                reasoning: `Query type '${type}' is general knowledge - no personalization needed`,
                sectors: [],
                threshold: 0,
                cost: 0,
                queryType: type,
                confidence: 1.0,
            };
        }

        // If matrix says null (unknown), ask LLM
        if (useMemory === null) {
            // For now, default to using memory for unknown queries
            // In production, would call LLM here
            return {
                useMemory: true,
                reasoning: `Query type unknown, defaulting to memory usage for safety`,
                sectors: SECTOR_MAP[type],
                threshold: 0.7,
                cost: 0.0001,
                queryType: type,
                confidence: 0.6,
            };
        }

        // Matrix says use memory
        const sectors = this.selectSectors(query, type);

        return {
            useMemory: true,
            reasoning: `Query type '${type}' benefits from personalization`,
            sectors,
            threshold: 0.75,
            cost: 0,
            queryType: type,
            confidence: 0.9,
        };
    }

    /**
     * Select which memory sectors are most relevant for this query.
     */
    selectSectors(query: string, queryType: QueryType): MemorySector[] {
        const baseSectors = SECTOR_MAP[queryType] || ['semantic', 'procedural'];

        // Additional sector detection based on query content
        const queryLower = query.toLowerCase();
        const additionalSectors: MemorySector[] = [];

        if (/\b(yesterday|last week|recently|before|earlier|remember when)\b/i.test(queryLower)) {
            if (!baseSectors.includes('episodic')) {
                additionalSectors.push('episodic');
            }
        }

        if (/\b(feel|emotion|happy|sad|stressed|excited)\b/i.test(queryLower)) {
            if (!baseSectors.includes('emotional')) {
                additionalSectors.push('emotional');
            }
        }

        if (/\b(how do i|my process|my workflow|step by step)\b/i.test(queryLower)) {
            if (!baseSectors.includes('procedural')) {
                additionalSectors.push('procedural');
            }
        }

        // Combine and limit to 3 sectors max
        return [...baseSectors, ...additionalSectors].slice(0, 3);
    }

    /**
     * Self-reflection: Is the response good enough?
     * For now returns a simple check, can be enhanced with LLM.
     */
    reflectOnResponse(query: string, response: string, memoryUsed: boolean): ReflectionResult {
        // Basic quality checks
        const responseLength = response.length;
        const hasContent = responseLength > 50;
        const isRelevant = this.checkRelevance(query, response);

        if (!hasContent) {
            return {
                satisfied: false,
                reasoning: 'Response is too short',
                retryStrategy: 'Request more detailed response',
            };
        }

        if (!isRelevant) {
            return {
                satisfied: false,
                reasoning: 'Response may not address the query directly',
                retryStrategy: memoryUsed
                    ? 'Try without memory context'
                    : 'Try with memory context',
            };
        }

        return {
            satisfied: true,
            reasoning: 'Response appears adequate',
            retryStrategy: null,
        };
    }

    /**
     * Simple relevance check using keyword overlap.
     */
    private checkRelevance(query: string, response: string): boolean {
        const queryWords = new Set(
            query
                .toLowerCase()
                .split(/\W+/)
                .filter((w) => w.length > 3)
        );
        const responseWords = new Set(
            response
                .toLowerCase()
                .split(/\W+/)
                .filter((w) => w.length > 3)
        );

        let overlap = 0;
        for (const word of queryWords) {
            if (responseWords.has(word)) {
                overlap++;
            }
        }

        // At least 30% keyword overlap or response is long enough
        return overlap >= queryWords.size * 0.3 || response.length > 500;
    }
}

// Singleton instance
let agentInstance: MemoryDecisionAgent | null = null;

export function getMemoryAgent(): MemoryDecisionAgent {
    if (!agentInstance) {
        agentInstance = new MemoryDecisionAgent();
    }
    return agentInstance;
}
