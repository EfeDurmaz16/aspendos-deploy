'use client';

import { Microphone, Paperclip, PaperPlaneRight } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ModePicker, type YulaMode } from './model-picker';

interface PromptInputBoxProps {
    onSubmit: (text: string, mode?: YulaMode) => void;
    isGenerating?: boolean;
    className?: string;
}

export function PromptInputBox({ onSubmit, isGenerating, className }: PromptInputBoxProps) {
    const [input, setInput] = useState('');
    const [mode, setMode] = useState<YulaMode>('auto');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() && !isGenerating) {
                onSubmit(input, mode);
                setInput('');
            }
        }
    };

    return (
        <div className={cn('relative w-full max-w-3xl mx-auto', className)}>
            <motion.div
                layout
                className="relative flex flex-col w-full bg-background rounded-2xl border border-border shadow-sm transition-all focus-within:shadow-md focus-within:ring-1 focus-within:ring-ring overflow-hidden"
            >
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="How can I help you today?"
                    className="w-full min-h-[60px] max-h-[200px] p-4 bg-transparent resize-none outline-none text-base text-foreground placeholder:text-muted-foreground"
                    rows={1}
                />

                <div className="flex items-center justify-between px-3 pb-3 pt-1">
                    <div className="flex items-center gap-1">
                        <ModePicker selectedMode={mode} onSelectMode={setMode} />
                        <button
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                            title="Attach file"
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <button
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                            title="Voice input"
                        >
                            <Microphone className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            if (input.trim() && !isGenerating) {
                                onSubmit(input, mode);
                                setInput('');
                            }
                        }}
                        disabled={!input.trim() || isGenerating}
                        className={cn(
                            'flex items-center justify-center p-2 rounded-xl transition-all duration-200',
                            input.trim()
                                ? 'bg-foreground text-background shadow-sm hover:opacity-90'
                                : 'bg-muted text-muted-foreground cursor-not-allowed'
                        )}
                    >
                        <PaperPlaneRight weight="fill" className="w-5 h-5" />
                    </button>
                </div>
            </motion.div>

            <div className="text-center mt-3">
                <p className="text-xs text-muted-foreground">
                    YULA can make mistakes. Consider checking important information.
                </p>
            </div>
        </div>
    );
}
