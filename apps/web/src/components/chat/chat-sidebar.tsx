"use client";

import { Button } from "@/components/ui/button";
import { Plus, ChatCircle, Hash, DotsThree } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function ChatSidebar() {
    return (
        <div className="h-full flex flex-col bg-zinc-50 dark:bg-black border-r border-zinc-200 dark:border-zinc-900">
            {/* Header */}
            <div className="h-14 flex items-center px-4 border-b border-zinc-200 dark:border-zinc-900">
                <span className="font-serif text-lg font-bold">ASPENDOS</span>
            </div>

            {/* New Chat */}
            <div className="p-3">
                <Button variant="outline" className="w-full justify-start gap-2 bg-white dark:bg-zinc-900 shadow-sm border-zinc-200 dark:border-zinc-800 hover:dark:bg-zinc-800" size="sm">
                    <Plus /> New Thread
                </Button>
            </div>

            {/* Sections */}
            <div className="flex-1 overflow-y-auto py-2 px-3 space-y-6">

                {/* Recent */}
                <div>
                    <h4 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2 px-2">Today</h4>
                    <div className="space-y-0.5">
                        <SidebarItem label="Marketing Strategy for Q1" active />
                        <SidebarItem label="React Component Patterns" />
                        <SidebarItem label="Comparison: Next.js vs Remix" />
                    </div>
                </div>

                {/* Projects */}
                <div>
                    <h4 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2 px-2">Projects</h4>
                    <div className="space-y-0.5">
                        <SidebarItem icon={<Hash size={14} />} label="Aspendos Launch" />
                        <SidebarItem icon={<Hash size={14} />} label="Personal Blog" />
                    </div>
                </div>

            </div>

            {/* User Footer */}
            <div className="h-14 border-t border-zinc-200 dark:border-zinc-800 flex items-center px-4 justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    <div className="text-[13px] font-medium">Efe Baran</div>
                </div>
                <DotsThree className="text-zinc-400" />
            </div>
        </div>
    );
}

function SidebarItem({ label, active, icon }: { label: string, active?: boolean, icon?: React.ReactNode }) {
    return (
        <button className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-left transition-colors",
            active
                ? "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/50"
        )}>
            {icon || <ChatCircle size={14} className={active ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400"} />}
            <span className="truncate">{label}</span>
            {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        </button>
    )
}
