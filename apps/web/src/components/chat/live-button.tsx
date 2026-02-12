'use client';

import { CircleNotch, Headphones, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGeminiLive } from '@/hooks/use-gemini-live';
import { cn } from '@/lib/utils'; // Ensure utils exist

interface LiveButtonProps {
    className?: string;
}

export function LiveButton({ className }: LiveButtonProps) {
    const [isActive, setIsActive] = useState(false);

    const { connect, disconnect, isConnected, isConnecting } = useGeminiLive({
        onConnect: () => setIsActive(true),
        onDisconnect: () => setIsActive(false),
        onError: (err) => {
            console.error('Live Error:', err);
            setIsActive(false);
        },
    });

    const toggleLive = () => {
        if (isActive) {
            disconnect();
        } else {
            connect();
        }
    };

    return (
        <div className={cn('relative', className)}>
            <Button
                variant={isActive ? 'primary' : 'ghost'}
                size="icon"
                onClick={toggleLive}
                disabled={isConnecting}
                className={cn(
                    'h-8 w-8 transition-all rounded-lg',
                    isActive
                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    isConnecting && 'opacity-70 cursor-wait'
                )}
                title={isActive ? 'End Voice Chat' : 'Start Voice Chat'}
            >
                {isConnecting ? (
                    <CircleNotch className="w-4 h-4 animate-spin" />
                ) : isActive ? (
                    <X weight="bold" className="w-4 h-4" />
                ) : (
                    <Headphones weight="duotone" className="w-4 h-4" />
                )}
            </Button>

            {/* Visualizer / Status Indicator (when active) */}
            {isActive && isConnected && (
                <div className="absolute top-1/2 left-full ml-3 -translate-y-1/2 flex items-center gap-2 bg-background border border-border px-3 py-1.5 rounded-full shadow-lg pointer-events-none whitespace-nowrap z-50 animate-in fade-in slide-in-from-left-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span className="text-xs font-medium">Live</span>
                    {/* Add a fake waveform or visualizer here if desired */}
                    <div className="flex gap-0.5 items-center h-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="w-0.5 bg-foreground/30 rounded-full animate-pulse"
                                style={{
                                    height: `${Math.random() * 100}%`,
                                    animationDelay: `${i * 0.1}s`,
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
