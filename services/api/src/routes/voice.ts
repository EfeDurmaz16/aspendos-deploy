/**
 * Voice API Routes
 * Handles speech-to-text (Whisper) and text-to-speech
 */
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import OpenAI from 'openai';

const app = new Hono();

// Apply auth middleware to all routes
app.use('*', requireAuth);

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/voice/transcribe - Transcribe audio to text
app.post('/transcribe', async (c) => {
    try {
        const body = await c.req.parseBody();
        const audioFile = body['audio'];

        if (!audioFile || !(audioFile instanceof File)) {
            return c.json({ error: 'No audio file provided' }, 400);
        }

        // Convert to Blob for OpenAI API
        const transcription = await openai.audio.transcriptions.create({
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
        return c.json({
            error: 'Failed to transcribe audio',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
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
        const mp3 = await openai.audio.speech.create({
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
        return c.json({
            error: 'Failed to synthesize speech',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
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
        const response = await openai.audio.speech.create({
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
        return c.json({
            error: 'Failed to stream speech',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});

export default app;
