import { useRef, useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface UseGeminiLiveOptions {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onMessage?: (text: string) => void;
    onError?: (error: Error) => void;
}

export function useGeminiLive(options: UseGeminiLiveOptions = {}) {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    // SDK and Connection refs
    const socketRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Audio Playback Queue
    const audioQueueRef = useRef<ArrayBuffer[]>([]);
    const isPlayingRef = useRef(false);
    const nextPlayTimeRef = useRef(0);

    // Voice minute tracking
    const voiceStartTimeRef = useRef<number | null>(null);

    const disconnect = useCallback(() => {
        // Track voice minutes used
        if (voiceStartTimeRef.current) {
            const durationMs = Date.now() - voiceStartTimeRef.current;
            const durationMinutes = Math.ceil(durationMs / 60000);
            voiceStartTimeRef.current = null;

            // Decrement voice minutes (fire-and-forget)
            void fetch('/api/billing/voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ minutesUsed: durationMinutes }),
            }).catch(console.error);
        }

        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        setIsConnected(false);
        setIsRecording(false);
        options.onDisconnect?.();
    }, [options]);

    const playNextChunk = useCallback(() => {
        if (!audioContextRef.current || audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            return;
        }

        isPlayingRef.current = true;
        const chunk = audioQueueRef.current.shift()!;

        audioContextRef.current.decodeAudioData(chunk, (buffer) => {
            const source = audioContextRef.current!.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextRef.current!.destination);

            const currentTime = audioContextRef.current!.currentTime;
            const startTime = Math.max(currentTime, nextPlayTimeRef.current);

            source.start(startTime);
            nextPlayTimeRef.current = startTime + buffer.duration;

            source.onended = () => {
                playNextChunk();
            };
        }, (err) => {
            console.error('Error decoding audio chunk', err);
            playNextChunk();
        });
    }, []);

    const queueAudio = useCallback((arrayBuffer: ArrayBuffer) => {
        audioQueueRef.current.push(arrayBuffer);
        if (!isPlayingRef.current) {
            playNextChunk();
        }
    }, [playNextChunk]);

    const connect = useCallback(async () => {
        if (isConnecting || isConnected) return;

        try {
            setIsConnecting(true);

            // 1. Get Ephemeral Token
            // Note: In real setup, ensure credentials are sent if behind auth
            const tokenRes = await fetch(`${API_BASE}/api/voice/token`, { method: 'POST', credentials: 'include' });
            if (!tokenRes.ok) throw new Error('Failed to get voice token');

            const { token, url } = await tokenRes.json();

            // 2. Setup Audio Context
            type WebkitWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
            const AudioContextCtor =
                window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
            if (!AudioContextCtor) throw new Error('AudioContext not supported');

            const audioContext = new AudioContextCtor({ sampleRate: 16000 });
            audioContextRef.current = audioContext;
            await audioContext.resume();

            // 3. Setup WebSocket
            const wsUrl = new URL(url);
            wsUrl.searchParams.set('access_token', token);
            const ws = new WebSocket(wsUrl.toString());

            ws.onopen = async () => {
                setIsConnected(true);
                setIsConnecting(false);

                // Start tracking voice minutes
                voiceStartTimeRef.current = Date.now();

                options.onConnect?.();

                // Send initial config if needed (JSON)
                ws.send(JSON.stringify({
                    setup: {
                        model: "models/gemini-pro-vision", // or gemini-1.5-pro
                        generation_config: { response_modalities: ["AUDIO"] }
                    }
                }));

                // Start Recording
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            channelCount: 1,
                            sampleRate: 16000
                        }
                    });
                    streamRef.current = stream;

                    // Use AudioWorklet or ScriptProcessor to get raw PCM
                    // For simplicity in this demo, using ScriptProcessor (deprecated but works) or just createScriptProcessor
                    const source = audioContext.createMediaStreamSource(stream);
                    const processor = audioContext.createScriptProcessor(4096, 1, 1);

                    source.connect(processor);
                    processor.connect(audioContext.destination);

                    processor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        // Convert float32 to int16 PCM (often required) or base64
                        // Gemini usually expects Base64 encoded PCM in JSON wrapper

                        // Simple downsampling/conversion logic here if needed
                        // For now assuming raw floats or sending base64
                        const pcmData = new Int16Array(inputData.length);
                        for (let i = 0; i < inputData.length; i++) {
                            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                        }

                        // Convert to blob/buffer and send
                        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));

                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                realtime_input: {
                                    media_chunks: [{
                                        mime_type: "audio/pcm",
                                        data: base64Audio
                                    }]
                                }
                            }));
                        }
                    };

                    sourceNodeRef.current = source;
                    setIsRecording(true);
                } catch (err) {
                    console.error('Mic error', err);
                    disconnect();
                }
            };

            type GeminiWsMessage = {
                serverContent?: {
                    modelTurn?: {
                        parts?: Array<{
                            inlineData?: { data: string };
                        }>;
                    };
                };
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data) as GeminiWsMessage;
                // Handle response (audio chunks)
                // Likely data.serverContent.modelTurn.parts[0].inlineData
                const parts = data.serverContent?.modelTurn?.parts;
                if (parts?.length) {
                    for (const part of parts) {
                        if (part.inlineData) {
                            // Decode base64 audio
                            const binaryString = atob(part.inlineData.data);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            queueAudio(bytes.buffer);
                        }
                    }
                }
            };

            ws.onerror = (err) => {
                console.error('WS Error', err);
                options.onError?.(new Error('WebSocket error'));
                disconnect();
            };

            ws.onclose = () => {
                disconnect();
            };

            socketRef.current = ws;

        } catch (err) {
            console.error(err);
            setIsConnecting(false);
            options.onError?.(err instanceof Error ? err : new Error('Connection failed'));
        }
    }, [options, disconnect, isConnecting, isConnected, queueAudio]); // dependencies

    return {
        connect,
        disconnect,
        isConnected,
        isConnecting,
        isRecording
    };
}
