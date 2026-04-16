import { computeScore, type GaiaResult, type GaiaTask, runGaiaTask } from './gaia';

const GAIA_LEVEL1_SAMPLE: GaiaTask[] = [
    { id: 'g1', level: 1, question: 'What is the capital of France?', expected_answer: 'Paris' },
    { id: 'g2', level: 1, question: 'What is 7 * 8?', expected_answer: '56' },
    {
        id: 'g3',
        level: 1,
        question: 'Who wrote Romeo and Juliet?',
        expected_answer: 'William Shakespeare',
    },
    {
        id: 'g4',
        level: 1,
        question: 'What is the chemical symbol for gold?',
        expected_answer: 'Au',
    },
    { id: 'g5', level: 1, question: 'How many continents are there?', expected_answer: '7' },
    { id: 'g6', level: 1, question: 'What year did World War II end?', expected_answer: '1945' },
    { id: 'g7', level: 1, question: 'What is the square root of 144?', expected_answer: '12' },
    {
        id: 'g8',
        level: 1,
        question: 'Who painted the Mona Lisa?',
        expected_answer: 'Leonardo da Vinci',
    },
    {
        id: 'g9',
        level: 1,
        question: 'What is the largest planet in our solar system?',
        expected_answer: 'Jupiter',
    },
    {
        id: 'g10',
        level: 1,
        question: 'What is the boiling point of water in Celsius?',
        expected_answer: '100',
    },
];

async function main() {
    const model = process.argv[2] || 'anthropic/claude-sonnet-4.6';
    const concurrency = Number.parseInt(process.argv[3] || '3', 10);

    console.log(`\n=== GAIA Level-1 Evaluation ===`);
    console.log(`Model: ${model}`);
    console.log(`Tasks: ${GAIA_LEVEL1_SAMPLE.length}`);
    console.log(`Concurrency: ${concurrency}\n`);

    const results: GaiaResult[] = [];

    for (let i = 0; i < GAIA_LEVEL1_SAMPLE.length; i += concurrency) {
        const batch = GAIA_LEVEL1_SAMPLE.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map((task) => runGaiaTask(task, model)));

        for (const r of batchResults) {
            results.push(r);
            const icon = r.correct ? '✅' : '❌';
            console.log(`${icon} [${r.taskId}] ${r.question}`);
            if (!r.correct) {
                console.log(`   Expected: ${r.expectedAnswer}`);
                console.log(`   Got: ${r.actualAnswer}`);
            }
        }
    }

    const score = computeScore(results);
    console.log(`\n=== Results ===`);
    console.log(
        `Accuracy: ${(score.accuracy * 100).toFixed(1)}% (${score.correct}/${score.total})`
    );
    console.log(`Avg Latency: ${score.avgLatencyMs.toFixed(0)}ms`);
    console.log(`Total Tokens: ${score.totalTokens}`);

    const outputPath = `services/eval/results-${Date.now()}.json`;
    await Bun.write(outputPath, JSON.stringify({ model, score, results }, null, 2));
    console.log(`\nResults saved to: ${outputPath}`);
}

main().catch(console.error);
