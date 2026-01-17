'use client'

import { useState, useRef, useCallback, KeyboardEvent } from 'react'

// ============================================
// TYPES
// ============================================

interface ChatInputProps {
    onSend: (message: string) => void
    disabled?: boolean
    placeholder?: string
    maxLength?: number
}

// ============================================
// COMPONENT
// ============================================

/**
 * ChatInput - Text input with multiline support and send on Enter
 */
export function ChatInput({
    onSend,
    disabled = false,
    placeholder = 'Send a message...',
    maxLength = 10000,
}: ChatInputProps) {
    const [value, setValue] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Auto-resize textarea
    const adjustHeight = useCallback(() => {
        const textarea = textareaRef.current
        if (!textarea) return
        textarea.style.height = 'auto'
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }, [])

    // Handle submit
    const handleSubmit = useCallback(() => {
        const trimmed = value.trim()
        if (!trimmed || disabled) return

        onSend(trimmed)
        setValue('')

        // Reset height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
        }
    }, [value, disabled, onSend])

    // Handle key press
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
            }
        },
        [handleSubmit]
    )

    return (
        <div className="relative">
            <div className="flex items-end gap-2 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value)
                        adjustHeight()
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    maxLength={maxLength}
                    rows={1}
                    className="flex-1 resize-none bg-transparent outline-none text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 min-h-[40px] max-h-[200px] px-2 py-2"
                />

                <button
                    onClick={handleSubmit}
                    disabled={disabled || !value.trim()}
                    className="p-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </div>

            {/* Character count */}
            {value.length > maxLength * 0.8 && (
                <div className="absolute right-2 -bottom-6 text-xs text-zinc-400">
                    {value.length}/{maxLength}
                </div>
            )}
        </div>
    )
}

export default ChatInput
