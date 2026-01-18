'use client';

import { CircleNotch, Pause, Play, SpeakerHigh, Stop } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const VOICES = [
    { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
    { id: 'echo', name: 'Echo', description: 'Warm and conversational' },
    { id: 'fable', name: 'Fable', description: 'British and expressive' },
    { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
    { id: 'nova', name: 'Nova', description: 'Friendly and upbeat' },
    { id: 'shimmer', name: 'Shimmer', description: 'Clear and gentle' },
] as const;

type VoiceId = (typeof VOICES)[number]['id'];

interface AudioPlayerProps {
    text: string;
    className?: string;
}

export function AudioPlayer({ text, className }: AudioPlayerProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState<VoiceId>('alloy');
    const [error, setError] = useState<string | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioUrlRef = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        };
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const handleEnded = () => setIsPlaying(false);
        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
    }, []);

    const handlePlay = useCallback(async () => {
        setError(null);

        if (audioRef.current && audioUrlRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE}/api/voice/synthesize`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice: selectedVoice }),
            });

            if (!response.ok) throw new Error('Failed to synthesize speech');

            const data = await response.json();
            const audioBytes = atob(data.audio);
            const audioArray = new Uint8Array(audioBytes.length);
            for (let i = 0; i < audioBytes.length; i++) {
                audioArray[i] = audioBytes.charCodeAt(i);
            }
            const audioBlob = new Blob([audioArray], { type: 'audio/mp3' });

            if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = URL.createObjectURL(audioBlob);

            if (!audioRef.current) audioRef.current = new Audio();
            audioRef.current.src = audioUrlRef.current;
            await audioRef.current.play();
            setIsPlaying(true);
        } catch (err) {
            console.error('TTS error:', err);
            setError('Failed to play audio');
        } finally {
            setIsLoading(false);
        }
    }, [text, selectedVoice]);

    const handlePause = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    }, []);

    const handleStop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    }, []);

    const handleVoiceChange = (voice: VoiceId) => {
        setSelectedVoice(voice);
        if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
        }
        if (audioRef.current) audioRef.current.src = '';
        setIsPlaying(false);
    };

    return (
        <div className={cn('flex items-center gap-1', className)}>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={isPlaying ? handlePause : handlePlay}
                disabled={isLoading || !text}
                className="h-7 w-7"
                title={isPlaying ? 'Pause' : 'Play'}
            >
                {isLoading ? (
                    <CircleNotch className="w-3.5 h-3.5 animate-spin" />
                ) : isPlaying ? (
                    <Pause weight="fill" className="w-3.5 h-3.5" />
                ) : (
                    <Play weight="fill" className="w-3.5 h-3.5" />
                )}
            </Button>

            {isPlaying && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleStop}
                    className="h-7 w-7"
                    title="Stop"
                >
                    <Stop weight="fill" className="w-3.5 h-3.5" />
                </Button>
            )}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        title="Select voice"
                    >
                        <SpeakerHigh className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">
                            {VOICES.find((v) => v.id === selectedVoice)?.name}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    {VOICES.map((voice) => (
                        <DropdownMenuItem
                            key={voice.id}
                            onClick={() => handleVoiceChange(voice.id)}
                            className="flex flex-col items-start cursor-pointer"
                        >
                            <span
                                className={cn(
                                    'text-sm font-medium',
                                    selectedVoice === voice.id && 'text-emerald-500'
                                )}
                            >
                                {voice.name}
                            </span>
                            <span className="text-xs text-zinc-400">{voice.description}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
    );
}

export default AudioPlayer;
