"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Keyboard, X } from "@phosphor-icons/react"
import { Kbd } from "@/components/ui/kbd"

export function ShortcutsDock() {
    const [isOpen, setIsOpen] = useState(false)

    const shortcuts = [
        { label: "New Chat", keys: ["⌘", "N"] },
        { label: "Toggle Sidebar", keys: ["⌘", "B"] },
        { label: "Toggle Dock", keys: ["⌘", "D"] },
        { label: "Focus Input", keys: ["/"] },
    ]

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xl w-64 mb-2 origin-bottom-right"
                    >
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Keyboard Shortcuts</span>
                            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {shortcuts.map((shortcut) => (
                                <div key={shortcut.label} className="flex items-center justify-between text-sm">
                                    <span className="text-zinc-600 dark:text-zinc-400">{shortcut.label}</span>
                                    <div className="flex gap-1">
                                        {shortcut.keys.map(key => (
                                            <Kbd key={key}>{key}</Kbd>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg hover:shadow-xl hover:scale-105 transition-all text-zinc-600 dark:text-zinc-400"
                title="Keyboard Shortcuts"
            >
                <Keyboard weight="duotone" className="w-5 h-5" />
            </button>
        </div>
    )
}
