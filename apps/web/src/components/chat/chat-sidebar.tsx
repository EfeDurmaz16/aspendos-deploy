'use client';

import { Button } from '@/components/ui/button';
import { Plus, ChatCircle, DotsThree, CircleNotch } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';

interface Chat {
    id: string;
    title: string;
    modelPreference: string | null;
    createdAt: string;
    updatedAt: string;
}

interface ChatSidebarProps {
    chats?: Chat[];
    currentChatId?: string;
    onNewChat?: () => void;
    onSelectChat?: (chatId: string) => void;
    isLoading?: boolean;
}

export function ChatSidebar({
    chats = [],
    currentChatId,
    onNewChat,
    onSelectChat,
    isLoading = false,
}: ChatSidebarProps) {
    const { user } = useUser();

    // Group chats by date
    const groupedChats = groupChatsByDate(chats);

    return (
        <div className="h-full flex flex-col bg-zinc-50 dark:bg-black border-r border-zinc-200 dark:border-zinc-900">
            {/* Header */}
            <div className="h-14 flex items-center px-4 border-b border-zinc-200 dark:border-zinc-900">
                <span className="font-serif text-lg font-bold">ASPENDOS</span>
            </div>

            {/* New Chat */}
            <div className="p-3">
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2 bg-white dark:bg-zinc-900 shadow-sm border-zinc-200 dark:border-zinc-800 hover:dark:bg-zinc-800"
                    size="sm"
                    onClick={onNewChat}
                >
                    <Plus /> New Thread
                </Button>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto py-2 px-3 space-y-4">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <CircleNotch className="w-5 h-5 animate-spin text-zinc-400" />
                    </div>
                ) : chats.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400 text-sm">
                        <p>No chats yet</p>
                        <p className="text-xs mt-1">Start a new thread</p>
                    </div>
                ) : (
                    Object.entries(groupedChats).map(([dateGroup, groupChats]) => (
                        <div key={dateGroup}>
                            <h4 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2 px-2">
                                {dateGroup}
                            </h4>
                            <div className="space-y-0.5">
                                {groupChats.map((chat) => (
                                    <SidebarItem
                                        key={chat.id}
                                        label={chat.title || 'Untitled'}
                                        active={chat.id === currentChatId}
                                        onClick={() => onSelectChat?.(chat.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* User Footer */}
            <div className="h-14 border-t border-zinc-200 dark:border-zinc-800 flex items-center px-4 justify-between">
                <div className="flex items-center gap-2">
                    {user?.imageUrl ? (
                        <img
                            src={user.imageUrl}
                            alt={user.firstName || 'User'}
                            className="w-8 h-8 rounded-full"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    )}
                    <div className="text-[13px] font-medium truncate max-w-[120px]">
                        {user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'User'}
                    </div>
                </div>
                <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                    <DotsThree weight="bold" className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

function SidebarItem({
    label,
    active,
    onClick,
}: {
    label: string;
    active?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-left transition-colors',
                active
                    ? 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/50'
            )}
        >
            <ChatCircle
                size={14}
                className={active ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-400'}
            />
            <span className="truncate flex-1">{label}</span>
            {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        </button>
    );
}

// Helper to group chats by date
function groupChatsByDate(chats: Chat[]): Record<string, Chat[]> {
    const groups: Record<string, Chat[]> = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const chat of chats) {
        const chatDate = new Date(chat.updatedAt || chat.createdAt);
        const chatDay = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate());

        let group: string;
        if (chatDay >= today) {
            group = 'Today';
        } else if (chatDay >= yesterday) {
            group = 'Yesterday';
        } else if (chatDay >= lastWeek) {
            group = 'Last 7 Days';
        } else {
            group = 'Older';
        }

        if (!groups[group]) {
            groups[group] = [];
        }
        groups[group].push(chat);
    }

    // Sort groups by recency
    const orderedGroups: Record<string, Chat[]> = {};
    const order = ['Today', 'Yesterday', 'Last 7 Days', 'Older'];
    for (const key of order) {
        if (groups[key]) {
            orderedGroups[key] = groups[key];
        }
    }

    return orderedGroups;
}
