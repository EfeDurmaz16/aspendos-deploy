/**
 * Voice Routes Tests
 *
 * Tests for voice transcription (Whisper) and text-to-speech endpoints.
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the auth lib that requireAuth depends on
vi.mock('../../lib/auth', () => ({
    auth: {
        api: {
            getSession: vi.fn(),
        },
    },
}));

import { auth } from '../../lib/auth';
const mockAuth = auth as any;

// Mock billing service
vi.mock('../../services/billing.service', () => ({
    hasVoiceMinutes: vi.fn(),
    recordVoiceUsage: vi.fn(),
}));

import { hasVoiceMinutes, recordVoiceUsage } from '../../services/billing.service';
const mockHasVoiceMinutes = hasVoiceMinutes as any;
const mockRecordVoiceUsage = recordVoiceUsage as any;

// Mock OpenAI
vi.mock('openai', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            audio: {
                transcriptions: {
                    create: vi.fn(),
                },
                speech: {
                    create: vi.fn(),
                },
            },
        })),
    };
});


import voiceRoutes from '../voice';

function createTestApp() {
    const app = new Hono();
    app.route('/voice', voiceRoutes);
    return app;
}


describe('Voice Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.OPENAI_API_KEY = 'test-key';
        // Reset to default authenticated behavior
        mockAuth.api.getSession.mockResolvedValue({
            user: { id: 'test-user-1', email: 'test@yula.dev', name: 'Test User' },
            session: { id: 'sess-1', expiresAt: new Date(Date.now() + 86400000) },
        });
        mockHasVoiceMinutes.mockResolvedValue(true);
        mockRecordVoiceUsage.mockResolvedValue(undefined);
    });

    describe('POST /voice/transcribe', () => {
        it('should return 401 when user is not authenticated', async () => {
            mockAuth.api.getSession.mockResolvedValueOnce(null);
            const app = createTestApp();

            const formData = new FormData();
            formData.append('audio', new File(['audio-data'], 'test.wav', { type: 'audio/wav' }));

            const res = await app.request('/voice/transcribe', {
                method: 'POST',
                body: formData,
            });

            expect(res.status).toBe(401);
        });

        it('should return 403 when voice minutes quota is exceeded', async () => {
            mockHasVoiceMinutes.mockResolvedValue(false);
            const app = createTestApp();

            const formData = new FormData();
            formData.append('audio', new File(['audio-data'], 'test.wav', { type: 'audio/wav' }));

            const res = await app.request('/voice/transcribe', {
                method: 'POST',
                body: formData,
            });

            expect(res.status).toBe(403);
            const body = await res.json();
            expect(body.error).toContain('Voice minutes quota exceeded');
        });

        it('should return 400 when no audio file is provided', async () => {
            const app = createTestApp();

            const formData = new FormData();
            // No audio file attached

            const res = await app.request('/voice/transcribe', {
                method: 'POST',
                body: formData,
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('No audio file provided');
        });

        it('should return 400 when audio file exceeds 25MB', async () => {
            const app = createTestApp();

            // Create a file larger than 25MB
            const largeBuffer = new ArrayBuffer(26 * 1024 * 1024);
            const largeFile = new File([largeBuffer], 'large.wav', { type: 'audio/wav' });

            const formData = new FormData();
            formData.append('audio', largeFile);

            const res = await app.request('/voice/transcribe', {
                method: 'POST',
                body: formData,
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toContain('25MB limit');
        });
    });

    describe('POST /voice/synthesize', () => {
        it('should return 401 when user is not authenticated', async () => {
            mockAuth.api.getSession.mockResolvedValueOnce(null);
            const app = createTestApp();

            const res = await app.request('/voice/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'Hello world' }),
            });

            expect(res.status).toBe(401);
        });

        it('should return 403 when voice minutes quota is exceeded', async () => {
            mockHasVoiceMinutes.mockResolvedValue(false);
            const app = createTestApp();

            const res = await app.request('/voice/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'Hello world' }),
            });

            expect(res.status).toBe(403);
            const body = await res.json();
            expect(body.error).toContain('Voice minutes quota exceeded');
        });

        it('should return 400 when text is missing', async () => {
            const app = createTestApp();

            const res = await app.request('/voice/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('No text provided');
        });

        it('should return 400 when text is not a string', async () => {
            const app = createTestApp();

            const res = await app.request('/voice/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 12345 }),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('No text provided');
        });

        it('should return 400 when text exceeds 4096 characters', async () => {
            const app = createTestApp();
            const longText = 'a'.repeat(4097);

            const res = await app.request('/voice/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: longText }),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toContain('maximum length');
        });

        it('should return 400 when voice parameter is invalid', async () => {
            const app = createTestApp();

            const res = await app.request('/voice/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'Hello', voice: 'invalid-voice' }),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('Invalid voice parameter');
        });

        it('should accept all valid voice parameters', async () => {
            const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

            for (const voice of validVoices) {
                const isValid = validVoices.includes(voice);
                expect(isValid).toBe(true);
            }
        });
    });

    describe('POST /voice/synthesize/stream', () => {
        it('should return 400 when text is missing', async () => {
            const app = createTestApp();

            const res = await app.request('/voice/synthesize/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('No text provided');
        });

        it('should return 400 for invalid voice on streaming endpoint', async () => {
            const app = createTestApp();

            const res = await app.request('/voice/synthesize/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'Hello', voice: 'bad-voice' }),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('Invalid voice parameter');
        });

        it('should return 403 when voice minutes quota is exceeded for streaming', async () => {
            mockHasVoiceMinutes.mockResolvedValue(false);
            const app = createTestApp();

            const res = await app.request('/voice/synthesize/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'Hello' }),
            });

            expect(res.status).toBe(403);
        });
    });

    describe('POST /voice/token', () => {
        it('should return 403 when voice minutes quota is exceeded', async () => {
            mockHasVoiceMinutes.mockResolvedValue(false);
            const app = createTestApp();

            const res = await app.request('/voice/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(403);
            const body = await res.json();
            expect(body.error).toContain('Voice minutes quota exceeded');
        });

        it('should return 500 when GEMINI_API_KEY is not configured', async () => {
            delete process.env.GEMINI_API_KEY;
            const app = createTestApp();

            const res = await app.request('/voice/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body.error).toContain('GEMINI_API_KEY');
        });
    });
});
