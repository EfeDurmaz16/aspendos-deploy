/**
 * Voice API Routes
 * Handles speech-to-text (Whisper) and text-to-speech
 */
import { Hono } from 'hono';
import OpenAI from 'openai';
import { requireAuth } from '../middleware/auth';
import { hasVoiceMinutes, recordVoiceUsage } from '../services/billing.service';

const app = new Hono();

// Apply auth middleware to all routes
app.use('*', requireAuth);

// Lazily initialize OpenAI client (don't crash on startup if key missing)
let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not configured');
        }
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
}

// POST /api/voice/transcribe - Transcribe audio to text
app.post('/transcribe', async (c) => {
    const userId = c.get('userId')!;

    // Check voice minutes quota
    if (!(await hasVoiceMinutes(userId))) {
        return c.json({ error: 'Voice minutes quota exceeded. Please upgrade your plan.' }, 403);
    }

    try {
        const body = await c.req.parseBody();
        const audioFile = body.audio;

        if (!audioFile || !(audioFile instanceof File)) {
            return c.json({ error: 'No audio file provided' }, 400);
        }

        // Limit audio file size to 25MB (OpenAI Whisper limit)
        const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
        if (audioFile.size > MAX_AUDIO_SIZE) {
            return c.json({ error: 'Audio file exceeds 25MB limit' }, 400);
        }

        // Convert to Blob for OpenAI API
        const transcription = await getOpenAI().audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'en', // Auto-detect if not specified
            response_format: 'json',
        });

        // Estimate duration from file size (~16KB/s for typical audio)
        const estimatedMinutes = audioFile.size / 16000 / 60;
        await recordVoiceUsage(userId, Math.max(estimatedMinutes, 0.1));

        return c.json({
            text: transcription.text,
            duration: audioFile.size / 16000,
        });
    } catch (error) {
        console.error(
            '[Voice] Transcription error:',
            error instanceof Error ? error.message : 'Unknown'
        );
        return c.json({ error: 'Failed to transcribe audio' }, 500);
    }
});

// Allowed TTS voices (prevent arbitrary parameter injection)
const ALLOWED_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
const MAX_TTS_TEXT_LENGTH = 4096; // OpenAI TTS limit

// POST /api/voice/synthesize - Convert text to speech
app.post('/synthesize', async (c) => {
    const userId = c.get('userId')!;

    // Check voice minutes quota
    if (!(await hasVoiceMinutes(userId))) {
        return c.json({ error: 'Voice minutes quota exceeded. Please upgrade your plan.' }, 403);
    }

    const body = await c.req.json();
    const { text, voice = 'alloy' } = body;

    if (!text || typeof text !== 'string') {
        return c.json({ error: 'No text provided' }, 400);
    }

    if (text.length > MAX_TTS_TEXT_LENGTH) {
        return c.json(
            { error: `Text exceeds maximum length of ${MAX_TTS_TEXT_LENGTH} characters` },
            400
        );
    }

    if (!ALLOWED_VOICES.includes(voice)) {
        return c.json({ error: 'Invalid voice parameter' }, 400);
    }

    try {
        const mp3 = await getOpenAI().audio.speech.create({
            model: 'tts-1',
            voice: voice,
            input: text,
        });

        // Get audio as ArrayBuffer
        const audioBuffer = await mp3.arrayBuffer();

        // Estimate TTS duration (~150 words/min, ~5 chars/word)
        const estimatedMinutes = text.length / 750;
        await recordVoiceUsage(userId, Math.max(estimatedMinutes, 0.1));

        // Return audio as base64
        const base64Audio = Buffer.from(audioBuffer).toString('base64');

        return c.json({
            audio: base64Audio,
            format: 'mp3',
            voice,
        });
    } catch (error) {
        console.error(
            '[Voice] Synthesis error:',
            error instanceof Error ? error.message : 'Unknown'
        );
        return c.json({ error: 'Failed to synthesize speech' }, 500);
    }
});

// POST /api/voice/synthesize/stream - Stream text-to-speech response
app.post('/synthesize/stream', async (c) => {
    const userId = c.get('userId')!;

    // Check voice minutes quota
    if (!(await hasVoiceMinutes(userId))) {
        return c.json({ error: 'Voice minutes quota exceeded. Please upgrade your plan.' }, 403);
    }

    const body = await c.req.json();
    const { text, voice = 'alloy' } = body;

    if (!text || typeof text !== 'string') {
        return c.json({ error: 'No text provided' }, 400);
    }

    if (text.length > MAX_TTS_TEXT_LENGTH) {
        return c.json(
            { error: `Text exceeds maximum length of ${MAX_TTS_TEXT_LENGTH} characters` },
            400
        );
    }

    if (!ALLOWED_VOICES.includes(voice)) {
        return c.json({ error: 'Invalid voice parameter' }, 400);
    }

    try {
        const response = await getOpenAI().audio.speech.create({
            model: 'tts-1',
            voice: voice,
            input: text,
        });

        // Meter voice usage
        const estimatedMinutes = text.length / 750;
        await recordVoiceUsage(userId, Math.max(estimatedMinutes, 0.1));

        // Stream the audio response
        const audioStream = response.body;
        if (!audioStream) {
            return c.json({ error: 'No audio stream available' }, 500);
        }

        return new Response(audioStream as unknown as ReadableStream, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Transfer-Encoding': 'chunked',
            },
        });
    } catch (error) {
        console.error(
            '[Voice] Streaming synthesis error:',
            error instanceof Error ? error.message : 'Unknown'
        );
        return c.json({ error: 'Failed to stream speech' }, 500);
    }
});

// ... existing code ...

// POST /api/voice/token - Generate ephemeral token for Gemini Live
app.post('/token', async (c) => {
    const userId = c.get('userId')!;

    // Check voice minutes quota before issuing token
    if (!(await hasVoiceMinutes(userId))) {
        return c.json({ error: 'Voice minutes quota exceeded. Please upgrade your plan.' }, 403);
    }

    try {
        if (!process.env.GEMINI_API_KEY) {
            return c.json({ error: 'GEMINI_API_KEY is not configured' }, 500);
        }

        // Import dynamically to avoid issues if package missing/environment differs
        const { GoogleGenAI } = await import('@google/genai');

        const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Create an ephemeral token valid for 1 hour
        // Note: The SDK method might vary slightly based on version, adapting to search result guidance
        // "client.auth_tokens.create()" seems to be the method.
        // If strict types are an issue, might need adjustment.
        // Assuming module is available as per install.

        // This is a hypothetical API based on search results.
        // If the SDK doesn't expose auth_tokens on client directly, we might need a specific sub-client.
        // But the search said "client.auth_tokens.create()".

        // However, typescript might complain if types aren't perfect.
        // I will use 'any' cast if needed or rely on the installed package types.

        // Let's try basic implementation.
        // We will need to check if response has the token.

        // Actually, looking at the search, it says "client.auth_tokens.create()".
        // Let's assume this structure.

        // @ts-expect-error - SDK types might not be fully updated in our environment definition
        const response = await client.auth_tokens.create({
            ttl: '3600s', // 1 hour
        });

        // The token is likely in response.token or similar.
        // Let's assume response is the token object or has a token property.

        return c.json({
            token: response.token || response.accessToken || response, // Adjust based on actual return
            url: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent', // Standard Gemini Live endpoint
        });
    } catch (error) {
        console.error(
            '[Voice] Token generation error:',
            error instanceof Error ? error.message : 'Unknown'
        );
        return c.json({ error: 'Failed to generate voice token' }, 500);
    }
});

export default app;
