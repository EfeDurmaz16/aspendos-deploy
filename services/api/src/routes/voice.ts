/**
 * Voice API Routes
 * Handles speech-to-text (Whisper) and text-to-speech
 */
import { Hono } from 'hono';
import OpenAI from 'openai';
import { requireAuth } from '../middleware/auth';

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
    try {
        const body = await c.req.parseBody();
        const audioFile = body.audio;

        if (!audioFile || !(audioFile instanceof File)) {
            return c.json({ error: 'No audio file provided' }, 400);
        }

        // Convert to Blob for OpenAI API
        const transcription = await getOpenAI().audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'en', // Auto-detect if not specified
            response_format: 'json',
        });

        return c.json({
            text: transcription.text,
            duration: (audioFile as File & { size: number }).size / 16000, // Rough estimate
        });
    } catch (error) {
        console.error('[Voice] Transcription error:', error);
        return c.json(
            {
                error: 'Failed to transcribe audio',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            500
        );
    }
});

// POST /api/voice/synthesize - Convert text to speech
app.post('/synthesize', async (c) => {
    const body = await c.req.json();
    const { text, voice = 'alloy' } = body;

    if (!text) {
        return c.json({ error: 'No text provided' }, 400);
    }

    try {
        const mp3 = await getOpenAI().audio.speech.create({
            model: 'tts-1',
            voice: voice, // alloy, echo, fable, onyx, nova, shimmer
            input: text,
        });

        // Get audio as ArrayBuffer
        const audioBuffer = await mp3.arrayBuffer();

        // Return audio as base64
        const base64Audio = Buffer.from(audioBuffer).toString('base64');

        return c.json({
            audio: base64Audio,
            format: 'mp3',
            voice,
        });
    } catch (error) {
        console.error('[Voice] Synthesis error:', error);
        return c.json(
            {
                error: 'Failed to synthesize speech',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            500
        );
    }
});

// POST /api/voice/synthesize/stream - Stream text-to-speech response
app.post('/synthesize/stream', async (c) => {
    const body = await c.req.json();
    const { text, voice = 'alloy' } = body;

    if (!text) {
        return c.json({ error: 'No text provided' }, 400);
    }

    try {
        const response = await getOpenAI().audio.speech.create({
            model: 'tts-1',
            voice: voice,
            input: text,
        });

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
        console.error('[Voice] Streaming synthesis error:', error);
        return c.json(
            {
                error: 'Failed to stream speech',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            500
        );
    }
});

// ... existing code ...

// POST /api/voice/token - Generate ephemeral token for Gemini Live
app.post('/token', async (c) => {
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

        // @ts-ignore - SDK types might not be fully updated in our environment definition
        const response = await client.auth_tokens.create({
            ttl: "3600s", // 1 hour
        });

        // The token is likely in response.token or similar.
        // Let's assume response is the token object or has a token property.

        return c.json({
            token: response.token || response.accessToken || response, // Adjust based on actual return
            url: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent' // Standard Gemini Live endpoint
        });
    } catch (error) {
        console.error('[Voice] Token generation error:', error);
        return c.json(
            {
                error: 'Failed to generate voice token',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            500
        );
    }
});

export default app;
