/**
 * Memory Agent Service
 *
 * Agentic Decision Layer for intelligent memory usage.
 * Implements Phase 2 of Aspendos Memory System.
 *
 * Features:
 * - Query classification (7 types)
 * - Memory usage decision (matrix + LLM fallback via Groq)
 * - Sector selection (5 sectors)
 * - Self-reflection on response quality
 * - Memory consolidation pipeline (dedup + decay)
 */

import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import * as openMemory from './openmemory.service';

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
    private groq = createGroq({ apiKey: process.env.GROQ_API_KEY || '' });

    constructor(_llmEndpoint?: string) {
        // Groq initialized for fast LLM-based routing decisions
    }

    /**
     * Classify query type using LLM when pattern matching fails.
     * Uses Groq Llama for sub-100ms inference.
     */
    async classifyWithLLM(query: string): Promise<{ type: QueryType; confidence: number; useMemory: boolean; sectors: MemorySector[] }> {
        try {
            const { text } = await generateText({
                model: this.groq('llama-3.1-8b-instant'),
                maxTokens: 100,
                temperature: 0,
                prompt: `Classify this user query into exactly one category and decide if the user's personal memory/history would help answer it better.

Categories: general_knowledge, technical_advice, debugging, personal_reflection, code_review, learning, creative

Query: "${query.slice(0, 300)}"

Respond in JSON only: {"type":"<category>","useMemory":true/false,"sectors":["semantic"|"episodic"|"procedural"|"emotional"|"reflective"]}`,
            });

            const parsed = JSON.parse(text.trim());
            const validTypes = Object.values(QueryType).filter(t => t !== 'unknown');
            const type = validTypes.includes(parsed.type) ? parsed.type as QueryType : QueryType.UNKNOWN;
            const validSectors: MemorySector[] = ['episodic', 'semantic', 'procedural', 'emotional', 'reflective'];
            const sectors = Array.isArray(parsed.sectors)
                ? (parsed.sectors as string[]).filter((s): s is MemorySector => validSectors.includes(s as MemorySector)).slice(0, 3)
                : SECTOR_MAP[type];

            return {
                type,
                confidence: type !== QueryType.UNKNOWN ? 0.85 : 0.5,
                useMemory: parsed.useMemory !== false,
                sectors,
            };
        } catch {
            // LLM call failed - fall back to safe defaults
            return {
                type: QueryType.UNKNOWN,
                confidence: 0.4,
                useMemory: true,
                sectors: ['semantic', 'procedural'],
            };
        }
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
        _userId: string,
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

        // If matrix says null (unknown), ask LLM for intelligent classification
        if (useMemory === null) {
            const llmResult = await this.classifyWithLLM(query);
            return {
                useMemory: llmResult.useMemory,
                reasoning: `LLM classified as '${llmResult.type}' (confidence: ${llmResult.confidence})`,
                sectors: llmResult.sectors,
                threshold: 0.7,
                cost: 0.0001, // ~100 tokens on Groq Llama = negligible
                queryType: llmResult.type,
                confidence: llmResult.confidence,
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
     * Multi-signal quality scoring that learns what works.
     */
    async reflectOnResponse(query: string, response: string, memoryUsed: boolean): Promise<ReflectionResult & { qualityScore: number }> {
        // Signal 1: Length adequacy
        const lengthScore = Math.min(response.length / 300, 1.0); // 300 chars = full score

        // Signal 2: Keyword relevance
        const relevanceScore = this.computeRelevanceScore(query, response);

        // Signal 3: Specificity (does it contain concrete details vs vague filler?)
        const specificityScore = this.computeSpecificityScore(response);

        // Signal 4: Memory utilization (if memory was used, was it reflected?)
        const memoryScore = memoryUsed ? this.computeMemoryUtilization(query, response) : 0.8;

        // Weighted composite
        const qualityScore = Math.round(
            (lengthScore * 0.15 + relevanceScore * 0.35 + specificityScore * 0.25 + memoryScore * 0.25) * 100
        );

        const satisfied = qualityScore >= 50;

        let retryStrategy: string | null = null;
        if (!satisfied) {
            if (relevanceScore < 0.3) {
                retryStrategy = memoryUsed ? 'Try without memory context' : 'Try with memory context';
            } else if (specificityScore < 0.3) {
                retryStrategy = 'Request more specific, actionable response';
            } else if (lengthScore < 0.3) {
                retryStrategy = 'Request more detailed response';
            }
        }

        return {
            satisfied,
            reasoning: `Quality score: ${qualityScore}/100 (relevance=${Math.round(relevanceScore * 100)}, specificity=${Math.round(specificityScore * 100)}, memory=${Math.round(memoryScore * 100)})`,
            retryStrategy,
            qualityScore,
        };
    }

    /**
     * Compute relevance score using keyword overlap with TF weighting.
     */
    private computeRelevanceScore(query: string, response: string): number {
        const queryWords = query.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        if (queryWords.length === 0) return 0.5;

        const responseText = response.toLowerCase();
        let matchedWeight = 0;
        let totalWeight = 0;

        for (const word of queryWords) {
            // Longer words are more informative (TF-IDF proxy)
            const weight = Math.min(word.length / 5, 1.5);
            totalWeight += weight;
            if (responseText.includes(word)) {
                matchedWeight += weight;
            }
        }

        return totalWeight > 0 ? matchedWeight / totalWeight : 0.5;
    }

    /**
     * Compute specificity: penalize vague/generic responses.
     */
    private computeSpecificityScore(response: string): number {
        const vagueMarkers = [
            'it depends', 'generally speaking', 'in general',
            'there are many', 'you could try', 'some people',
            'it varies', 'that\'s a good question',
        ];

        const specificMarkers = [
            /\d+/, // numbers
            /```/, // code blocks
            /step \d|first,|second,|third,/i, // ordered steps
            /https?:\/\//, // urls
            /\b(because|since|therefore|specifically)\b/i, // causal reasoning
        ];

        const responseLower = response.toLowerCase();
        let vagueCount = 0;
        for (const marker of vagueMarkers) {
            if (responseLower.includes(marker)) vagueCount++;
        }

        let specificCount = 0;
        for (const marker of specificMarkers) {
            if (marker instanceof RegExp ? marker.test(response) : response.includes(marker)) {
                specificCount++;
            }
        }

        const vagueRatio = vagueCount / vagueMarkers.length;
        const specificRatio = specificCount / specificMarkers.length;

        return Math.max(0, Math.min(1, 0.5 + specificRatio * 0.5 - vagueRatio * 0.5));
    }

    /**
     * Check if memory context was actually used in the response.
     */
    private computeMemoryUtilization(query: string, response: string): number {
        // Check for personal context indicators in response
        const personalIndicators = [
            /\b(you mentioned|you previously|as you said|your|based on our)\b/i,
            /\b(last time|earlier|remember|previously discussed)\b/i,
            /\b(your preference|your style|your approach)\b/i,
        ];

        let matches = 0;
        for (const pattern of personalIndicators) {
            if (pattern.test(response)) matches++;
        }

        // At least 1 indicator = good utilization
        return Math.min(matches / 2, 1.0);
    }
}

// ============================================
// MEMORY CONSOLIDATION PIPELINE
// ============================================

export interface ConsolidationResult {
    merged: number;
    decayed: number;
    preserved: number;
}

/**
 * Memory consolidation pipeline.
 * 1. Dedup: Merge memories with high semantic similarity
 * 2. Decay: Reduce salience of old, unreinforced memories
 * 3. Preserve: Pin important memories from deletion
 *
 * This is a key moat differentiator - competitors store memories,
 * we intelligently consolidate them like human memory does.
 */
export async function consolidateMemories(
    userId: string,
    memories: Array<{ id: string; content: string; sector?: string; salience?: number; createdAt?: string }>,
    options?: { decayRate?: number; similarityThreshold?: number; maxAge?: number }
): Promise<ConsolidationResult> {
    const decayRate = options?.decayRate ?? 0.05; // 5% daily decay
    const similarityThreshold = options?.similarityThreshold ?? 0.85;
    const maxAgeDays = options?.maxAge ?? 90; // 90 days max for unreinforced

    let merged = 0;
    let decayed = 0;
    let preserved = 0;

    const now = Date.now();

    // Phase 1: Group memories by sector for efficient comparison
    const bySector = new Map<string, typeof memories>();
    for (const mem of memories) {
        const sector = mem.sector || 'semantic';
        if (!bySector.has(sector)) bySector.set(sector, []);
        bySector.get(sector)!.push(mem);
    }

    // Phase 2: Find duplicates using word-level Jaccard similarity
    const toMerge: Array<{ keep: string; remove: string }> = [];

    for (const [, sectorMemories] of bySector) {
        for (let i = 0; i < sectorMemories.length; i++) {
            for (let j = i + 1; j < sectorMemories.length; j++) {
                const similarity = jaccardSimilarity(
                    sectorMemories[i].content,
                    sectorMemories[j].content
                );
                if (similarity >= similarityThreshold) {
                    // Keep the one with higher salience
                    const keepI = (sectorMemories[i].salience || 0) >= (sectorMemories[j].salience || 0);
                    toMerge.push({
                        keep: keepI ? sectorMemories[i].id : sectorMemories[j].id,
                        remove: keepI ? sectorMemories[j].id : sectorMemories[i].id,
                    });
                }
            }
        }
    }
    merged = toMerge.length;

    // Phase 3: Apply temporal decay
    const toDecay: Array<{ id: string; newSalience: number }> = [];
    for (const mem of memories) {
        if (!mem.createdAt) continue;
        const ageMs = now - new Date(mem.createdAt).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);

        if (ageDays > maxAgeDays && (mem.salience || 0) < 0.3) {
            // Mark for decay (will be cleaned up by background job)
            toDecay.push({ id: mem.id, newSalience: 0 });
            decayed++;
        } else if (ageDays > 7) {
            // Apply gradual decay
            const decayFactor = Math.max(0.1, 1 - (decayRate * ageDays / 30));
            const newSalience = (mem.salience || 0.5) * decayFactor;
            if (newSalience < (mem.salience || 0.5)) {
                toDecay.push({ id: mem.id, newSalience });
                decayed++;
            }
        } else {
            preserved++;
        }
    }

    preserved = memories.length - merged - decayed;

    // Execute mutations: delete merged duplicates
    const removedIds = new Set(toMerge.map(m => m.remove));
    for (const id of removedIds) {
        try {
            await openMemory.deleteMemory(id);
        } catch {
            // Continue if individual delete fails
        }
    }

    // Execute mutations: update salience for decayed memories
    for (const { id, newSalience } of toDecay) {
        if (removedIds.has(id)) continue; // Already removed
        try {
            if (newSalience <= 0) {
                await openMemory.deleteMemory(id);
            } else {
                await openMemory.updateMemory(id, '', {
                    metadata: { salience: newSalience },
                });
            }
        } catch {
            // Continue if individual update fails
        }
    }

    return { merged, decayed, preserved };
}

/**
 * Word-level Jaccard similarity for deduplication.
 * Fast O(n) comparison without embedding calls.
 */
function jaccardSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 2));

    if (wordsA.size === 0 && wordsB.size === 0) return 1;
    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersection = 0;
    for (const word of wordsA) {
        if (wordsB.has(word)) intersection++;
    }

    const union = wordsA.size + wordsB.size - intersection;
    return union > 0 ? intersection / union : 0;
}

// ============================================
// AUTO-EXTRACTION: Learn from conversations
// ============================================

/**
 * Extract memorable facts from a chat exchange.
 * Runs after each conversation turn to automatically build the user's memory.
 * This is a core moat: competitors require manual memory management,
 * we learn passively from every conversation.
 */
export async function extractMemoriesFromExchange(
    userId: string,
    userMessage: string,
    assistantResponse: string,
): Promise<{ extracted: string[]; sector: string }[]> {
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY || '' });

    // Skip extraction for very short exchanges
    if (userMessage.length < 20 && assistantResponse.length < 50) return [];

    try {
        const { text } = await generateText({
            model: groq('llama-3.1-8b-instant'),
            maxTokens: 300,
            temperature: 0,
            prompt: `Extract personal facts, preferences, or skills from this conversation exchange. Only extract information about the USER, not general facts.

User: "${userMessage.slice(0, 500)}"
Assistant: "${assistantResponse.slice(0, 500)}"

If there are memorable facts about the user, respond with JSON array:
[{"fact":"<concise fact about the user>","sector":"semantic|episodic|procedural|emotional"}]

If nothing memorable, respond with: []

Examples of extractable facts:
- "User prefers TypeScript over JavaScript" (semantic)
- "User is building a startup in healthcare" (semantic)
- "User felt frustrated about deployment issues" (emotional)
- "User's workflow: writes tests before implementation" (procedural)

JSON only:`,
        });

        const parsed = JSON.parse(text.trim());
        if (!Array.isArray(parsed) || parsed.length === 0) return [];

        const results: { extracted: string[]; sector: string }[] = [];
        const validSectors = ['semantic', 'episodic', 'procedural', 'emotional'];

        for (const item of parsed.slice(0, 3)) { // Max 3 facts per exchange
            if (!item.fact || typeof item.fact !== 'string') continue;
            if (item.fact.length < 5 || item.fact.length > 500) continue;

            const sector = validSectors.includes(item.sector) ? item.sector : 'semantic';

            // Store via OpenMemory
            try {
                await openMemory.addMemory(item.fact, userId, {
                    sector,
                    metadata: { source: 'auto_extract', confidence: 0.7 },
                });
                results.push({ extracted: [item.fact], sector });
            } catch {
                // Non-blocking
            }
        }

        return results;
    } catch {
        return []; // Extraction is best-effort, never blocks the response
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
