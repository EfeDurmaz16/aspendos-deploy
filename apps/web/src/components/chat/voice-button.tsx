'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Microphone, Stop, CircleNotch } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface VoiceButtonProps {
    onTranscription: (text: string) => void;
    disabled?: boolean;
    className?: string;
}

// Silence detection settings
const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION_MS = 2000; // Stop after 2 seconds of silence

export function VoiceButton({
    onTranscription,
    disabled = false,
    className,
}: VoiceButtonProps) {
    // Better Auth uses cookies - getToken removed
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const silenceStartRef = useRef<number | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    // Monitor for silence
    const checkSilence = useCallback(() => {
        if (!analyserRef.current || !isRecording) return;

        const analyser = analyserRef.current;
        const dataArray = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(dataArray);

        // Calculate RMS (root mean square) for volume level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const value = (dataArray[i] - 128) / 128;
            sum += value * value;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        // Check if silent
        if (rms < SILENCE_THRESHOLD) {
            if (!silenceStartRef.current) {
                silenceStartRef.current = Date.now();
            } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION_MS) {
                // Auto-stop after silence duration
                stopRecording();
                return;
            }
        } else {
            silenceStartRef.current = null;
        }

        animationFrameRef.current = requestAnimationFrame(checkSilence);
    }, [isRecording]);

    // Start recording
    const startRecording = useCallback(async () => {
        try {
            setError(null);
            audioChunksRef.current = [];

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Set up audio context for silence detection
            audioContextRef.current = new AudioContext();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 2048;
            source.connect(analyserRef.current);

            // Create MediaRecorder
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus',
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // Stop all tracks
                stream.getTracks().forEach((track) => track.stop());

                // Process the audio
                if (audioChunksRef.current.length > 0) {
                    await processAudio();
                }
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start(100); // Collect data every 100ms
            setIsRecording(true);

            // Start silence detection
            silenceStartRef.current = null;
            animationFrameRef.current = requestAnimationFrame(checkSilence);
        } catch (err) {
            console.error('Failed to start recording:', err);
            setError('Failed to access microphone');
        }
    }, [checkSilence]);

    // Stop recording
    const stopRecording = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        setIsRecording(false);
    }, []);

    // Process recorded audio
    const processAudio = async () => {
        setIsProcessing(true);

        try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

            // Create form data
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            // Send to API for transcription
            const token = await getToken();
            const response = await fetch(`${API_BASE}/api/voice/transcribe`, {
                method: 'POST',
                headers: {
                    /* credentials: include handles auth */,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Transcription failed');
            }

            const data = await response.json();

            if (data.text) {
                onTranscription(data.text);
            }
        } catch (err) {
            console.error('Transcription error:', err);
            setError('Failed to transcribe audio');
        } finally {
            setIsProcessing(false);
        }
    };

    // Toggle recording
    const handleClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <div className="relative">
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClick}
                disabled={disabled || isProcessing}
                className={cn(
                    'h-8 w-8 transition-all',
                    isRecording && 'bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-500',
                    className
                )}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
            >
                {isProcessing ? (
                    <CircleNotch className="w-4 h-4 animate-spin" />
                ) : isRecording ? (
                    <Stop weight="fill" className="w-4 h-4" />
                ) : (
                    <Microphone weight="duotone" className="w-4 h-4" />
                )}
            </Button>

            {/* Recording indicator */}
            {isRecording && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
            )}

            {/* Error tooltip */}
            {error && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-red-500 bg-red-50 dark:bg-red-950/50 rounded whitespace-nowrap">
                    {error}
                </div>
            )}
        </div>
    );
}

export default VoiceButton;
