'use client';

import { ChatCircle, CircleNotch, DotsThree, Plus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { ContextMenuChat } from '@/components/chat/context-menu-chat';
import { toast } from 'sonner';

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
    onEditChatTitle?: (chatId: string, title: string) => void;
    onDeleteChat?: (chatId: string) => void;
    isLoading?: boolean;
}

export function ChatSidebar({
    chats = [],
    currentChatId,
    onNewChat,
    onSelectChat,
    onEditChatTitle,
    onDeleteChat,
    isLoading = false,
}: ChatSidebarProps) {
    const { user } = useUser();

    // Group chats by date
    const groupedChats = groupChatsByDate(chats);

    return (

        <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950/50 border-r border-border/40 relative">
            {/* Header */}
            <div className="h-14 flex items-center px-4 border-b border-border/40">
                <span className="font-serif text-lg font-semibold tracking-tight text-foreground/90">
                    Aspendos
                </span>
            </div>

            {/* New Chat */}
            <div className="p-3">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 bg-background border border-border/50 shadow-sm hover:bg-muted/50 transition-all text-muted-foreground hover:text-foreground"
                    size="sm"
                    onClick={onNewChat}
                >
                    <Plus weight="bold" /> New Thread
                </Button>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto py-2 px-3 space-y-4 scrollbar-hide">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <CircleNotch className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                ) : chats.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground/50 text-xs">
                        <p>No history</p>
                    </div>
                ) : (
                    Object.entries(groupedChats).map(([dateGroup, groupChats]) => (
                        <div key={dateGroup}>
                            <h4 className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-2 px-2">
                                {dateGroup}
                            </h4>
                            <div className="space-y-0.5">
                                {groupChats.map((chat) => (
                                    <ContextMenuChat
                                        key={chat.id}
                                        chat={{ id: chat.id, title: chat.title || 'Untitled' }}
                                        onEditTitle={onEditChatTitle || ((id, title) => {
                                            toast.info('Edit title feature coming soon');
                                        })}
                                        onDelete={onDeleteChat || ((id) => {
                                            toast.info('Delete feature coming soon');
                                        })}
                                        onOpenInNewTab={(id) => {
                                            window.open(`/chat/${id}`, '_blank');
                                        }}
                                    >
                                        <SidebarItem
                                            label={chat.title || 'Untitled'}
                                            active={chat.id === currentChatId}
                                            onClick={() => onSelectChat?.(chat.id)}
                                        />
                                    </ContextMenuChat>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* User Footer */}
            <div className="h-14 border-t border-border/40 flex items-center px-4 justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2">
                    {user?.imageUrl ? (
                        <img
                            src={user.imageUrl}
                            alt={user.firstName || 'User'}
                            className="w-7 h-7 rounded-full ring-1 ring-border/50"
                        />
                    ) : (
                        <div className="w-7 h-7 rounded-full bg-muted" />
                    )}
                    <div className="text-[13px] font-medium truncate max-w-[120px] text-foreground/80">
                        {user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'User'}
                    </div>
                </div>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <DotsThree weight="bold" className="w-4 h-4" />
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
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-left transition-all group',
                active
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 hover:text-foreground'
            )}
        >
            <ChatCircle
                size={16}
                weight={active ? 'fill' : 'regular'}
                className={cn(
                    'flex-shrink-0 transition-colors',
                    active
                        ? 'text-foreground'
                        : 'text-muted-foreground/70 group-hover:text-foreground'
                )}
            />
            <span className="truncate flex-1">{label}</span>
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
