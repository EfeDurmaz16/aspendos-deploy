"use client";

import { cn } from "@/lib/utils";
import { Brain, PushPin, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function MemoryPanel() {
    return (
        <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800">
            <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <Brain size={18} weight="duotone" />
                    <span className="font-serif font-medium">Memory Context</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                    <X size={16} />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Active Memories */}
                <div className="space-y-3">
                    <SectionHeader title="Active Context" />
                    <MemoryItem
                        title="Project: Aspendos Launch"
                        desc="SaaS platform, Feb 14 launch date, Memory-first OS."
                        active
                    />
                    <MemoryItem
                        title="User Role"
                        desc="Developer, Prefers TypeScript and Shadcn."
                    />
                </div>

                {/* Related */}
                <div className="space-y-3">
                    <SectionHeader title="Relevant Knowledge" />
                    <MemoryItem
                        title="Linear Design System"
                        desc="Preference for 'dense' layouts and no gradients."
                    />
                </div>

            </div>
        </div>
    );
}

function SectionHeader({ title }: { title: string }) {
    return (
        <h4 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">{title}</h4>
    )
}

function MemoryItem({ title, desc, active }: { title: string, desc: string, active?: boolean }) {
    return (
        <div className={cn(
            "p-3 rounded-lg border text-left transition-all group cursor-pointer",
            active
                ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 shadow-sm"
                : "bg-transparent border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900 border-dashed border-zinc-200 dark:border-zinc-800"
        )}>
            <div className="flex items-start justify-between mb-1">
                <span className={cn("text-[13px] font-medium", active ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-600 dark:text-zinc-400")}>{title}</span>
                <PushPin size={12} className={cn("opacity-0 group-hover:opacity-100 transition-opacity", active ? "text-emerald-500 opacity-100" : "text-zinc-400")} weight={active ? "fill" : "regular"} />
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400 line-clamp-3">{desc}</p>
        </div>
    )
}
