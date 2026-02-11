"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { PaperPlaneRight, Paperclip, Microphone } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface PromptInputBoxProps {
    onSubmit: (text: string) => void
    isGenerating?: boolean
    className?: string
}

export function PromptInputBox({ onSubmit, isGenerating, className }: PromptInputBoxProps) {
    const [input, setInput] = useState("")
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const adjustHeight = () => {
        const textarea = textareaRef.current
        if (textarea) {
            textarea.style.height = "auto"
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
        }
    }

    useEffect(() => {
        adjustHeight()
    }, [input])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            if (input.trim() && !isGenerating) {
                onSubmit(input)
                setInput("")
            }
        }
    }

    return (
        <div className={cn("relative w-full max-w-3xl mx-auto", className)}>
            <motion.div
                layout
                className="relative flex flex-col w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all focus-within:shadow-md focus-within:ring-1 focus-within:ring-zinc-200 dark:focus-within:ring-zinc-700 overflow-hidden"
            >
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="How can I help you today?"
                    className="w-full min-h-[60px] max-h-[200px] p-4 bg-transparent resize-none outline-none text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                    rows={1}
                />

                <div className="flex items-center justify-between px-3 pb-3 pt-1">
                    <div className="flex items-center gap-1">
                        <button className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800" title="Attach file">
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800" title="Voice input">
                            <Microphone className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            if (input.trim() && !isGenerating) {
                                onSubmit(input)
                                setInput("")
                            }
                        }}
                        disabled={!input.trim() || isGenerating}
                        className={cn(
                            "flex items-center justify-center p-2 rounded-xl transition-all duration-200",
                            input.trim()
                                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm hover:opacity-90"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                        )}
                    >
                        <PaperPlaneRight weight="fill" className="w-5 h-5" />
                    </button>
                </div>
            </motion.div>

            <div className="text-center mt-3">
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    Aspendos can make mistakes. Consider checking important information.
                </p>
            </div>
        </div>
    )
}
