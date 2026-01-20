'use client';

import { useState, useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Shortcut {
    keys: string[];
    description: string;
}

const shortcuts: Shortcut[] = [
    { keys: ['⌘', 'N'], description: 'New chat' },
    { keys: ['⌘', 'B'], description: 'Toggle sidebar' },
    { keys: ['⌘', 'K'], description: 'Command palette' },
    { keys: ['⌘', '/'], description: 'Focus input' },
    { keys: ['⌘', '↵'], description: 'Send message' },
    { keys: ['Esc'], description: 'Stop generation' },
    { keys: ['⌘', '⇧', 'C'], description: 'Copy last response' },
    { keys: ['↑'], description: 'Edit last message' },
];

export function KeyboardShortcuts() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMac, setIsMac] = useState(true);

    useEffect(() => {
        setIsMac(navigator.platform.toLowerCase().includes('mac'));
    }, []);

    // Map ⌘ to Ctrl on Windows/Linux
    const formatKeys = (keys: string[]) => {
        return keys.map((key) => {
            if (key === '⌘' && !isMac) return 'Ctrl';
            return key;
        });
    };

    return (
        <>
            {/* Toggle Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'fixed bottom-4 right-4 z-50 size-10 rounded-full shadow-lg',
                    'bg-background/80 backdrop-blur border border-border',
                    'hover:bg-accent hover:text-accent-foreground',
                    isOpen && 'bg-accent'
                )}
                aria-label="Keyboard shortcuts"
            >
                <Keyboard className="size-4" />
            </Button>

            {/* Shortcuts Panel */}
            {isOpen && (
                <div
                    className={cn(
                        'fixed bottom-16 right-4 z-50 w-72 rounded-lg shadow-xl',
                        'bg-background/95 backdrop-blur border border-border',
                        'animate-in fade-in slide-in-from-bottom-2 duration-200'
                    )}
                >
                    <div className="flex items-center justify-between p-3 border-b border-border">
                        <span className="text-sm font-medium">Keyboard Shortcuts</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsOpen(false)}
                            className="size-6"
                        >
                            <X className="size-3" />
                        </Button>
                    </div>
                    <div className="p-2 max-h-80 overflow-y-auto">
                        {shortcuts.map((shortcut, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between py-2 px-2 rounded hover:bg-accent/50"
                            >
                                <span className="text-sm text-muted-foreground">
                                    {shortcut.description}
                                </span>
                                <div className="flex items-center gap-1">
                                    {formatKeys(shortcut.keys).map((key, i) => (
                                        <kbd
                                            key={i}
                                            className={cn(
                                                'px-1.5 py-0.5 text-xs font-mono rounded',
                                                'bg-muted border border-border',
                                                'text-muted-foreground'
                                            )}
                                        >
                                            {key}
                                        </kbd>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
