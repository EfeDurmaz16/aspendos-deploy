import { generateText } from 'ai';
import { gateway } from 'ai';

export interface GaiaTask {
    id: string;
    question: string;
    expected_answer: string;
    level: 1 | 2 | 3;
    tools_required?: string[];
}

export interface GaiaResult {
    taskId: string;
    question: string;
    expectedAnswer: string;
    actualAnswer: string;
    correct: boolean;
    latencyMs: number;
    model: string;
    tokensUsed: number;
}

export async function runGaiaTask(
    task: GaiaTask,
    model = 'anthropic/claude-sonnet-4.6'
): Promise<GaiaResult> {
    const start = Date.now();

    const result = await generateText({
        model: gateway(model),
        system: `You are a helpful assistant. Answer the question as concisely as possible. Give ONLY the answer, no explanation.`,
        prompt: task.question,
        maxRetries: 1,
    });

    const latencyMs = Date.now() - start;
    const actual = result.text.trim();
    const expected = task.expected_answer.trim();

    const correct = normalizeAnswer(actual) === normalizeAnswer(expected);

    return {
        taskId: task.id,
        question: task.question,
        expectedAnswer: expected,
        actualAnswer: actual,
        correct,
        latencyMs,
        model,
        tokensUsed: result.usage?.totalTokens ?? 0,
    };
}

function normalizeAnswer(answer: string): string {
    return answer
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function computeScore(results: GaiaResult[]): {
    total: number;
    correct: number;
    accuracy: number;
    avgLatencyMs: number;
    totalTokens: number;
} {
    const correct = results.filter((r) => r.correct).length;
    return {
        total: results.length,
        correct,
        accuracy: results.length > 0 ? correct / results.length : 0,
        avgLatencyMs: results.reduce((sum, r) => sum + r.latencyMs, 0) / (results.length || 1),
        totalTokens: results.reduce((sum, r) => sum + r.tokensUsed, 0),
    };
}
