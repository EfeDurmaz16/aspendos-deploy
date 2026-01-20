'use client';

import { ChatCircle, CircleNotch, DotsThree, Plus, MagnifyingGlass, Star, Trash, Pencil } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { ContextMenuChat } from '@/components/chat/context-menu-chat';
import { toast } from 'sonner';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Chat {
    id: string;
    title: string;
    modelPreference: string | null;
    createdAt: string;
    updatedAt: string;
    isPinned?: boolean;
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
    const [searchQuery, setSearchQuery] = useState('');

    // Filter chats by search
    const filteredChats = chats.filter(chat =>
        chat.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group chats by date
    const groupedChats = groupChatsByDate(filteredChats);

    return (
        <div className="h-full flex flex-col bg-background/95 backdrop-blur-xl">
            {/* Header */}
            <div className="h-14 flex items-center px-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-sm">A</span>
                    </div>
                    <span className="font-semibold text-foreground tracking-tight">Aspendos</span>
                </div>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
                <Button
                    onClick={onNewChat}
                    className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    size="sm"
                >
                    <Plus weight="bold" className="size-4" />
                    New Chat
                </Button>
            </div>

            {/* Search */}
            <div className="px-3 pb-2">
                <div className="relative">
                    <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 text-sm bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring"
                    />
                </div>
            </div>

            {/* Chat List */}
            <ScrollArea className="flex-1">
                <div className="px-2 pb-4 space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <CircleNotch className="size-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : Object.keys(groupedChats).length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <ChatCircle className="size-8 text-muted-foreground/30 mx-auto mb-2" weight="duotone" />
                            <p className="text-xs text-muted-foreground">
                                {searchQuery ? 'No matching chats' : 'No conversations yet'}
                            </p>
                        </div>
                    ) : (
                        Object.entries(groupedChats).map(([dateGroup, groupChats]) => (
                            <div key={dateGroup}>
                                <h4 className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-1.5 px-2">
                                    {dateGroup}
                                </h4>
                                <div className="space-y-0.5">
                                    {groupChats.map((chat) => (
                                        <ContextMenuChat
                                            key={chat.id}
                                            chat={{ id: chat.id, title: chat.title || 'Untitled', isPinned: chat.isPinned }}
                                            onEditTitle={onEditChatTitle || ((id, title) => {
                                                toast.info('Edit title coming soon');
                                            })}
                                            onDelete={onDeleteChat || ((id) => {
                                                toast.info('Delete coming soon');
                                            })}
                                            onOpenInNewTab={(id) => {
                                                window.open(`/chat/${id}`, '_blank');
                                            }}
                                        >
                                            <button
                                                onClick={() => onSelectChat?.(chat.id)}
                                                className={cn(
                                                    'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition-all group',
                                                    chat.id === currentChatId
                                                        ? 'bg-accent text-accent-foreground'
                                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                                )}
                                            >
                                                <ChatCircle
                                                    className={cn(
                                                        'size-4 flex-shrink-0 transition-colors',
                                                        chat.id === currentChatId ? 'text-accent-foreground' : 'text-muted-foreground/60'
                                                    )}
                                                    weight={chat.id === currentChatId ? 'fill' : 'regular'}
                                                />
                                                <span className="truncate flex-1 text-[13px]">{chat.title || 'Untitled'}</span>
                                                {chat.isPinned && (
                                                    <Star className="size-3 text-amber-500" weight="fill" />
                                                )}
                                            </button>
                                        </ContextMenuChat>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* User Footer */}
            <div className="h-14 border-t border-border/50 flex items-center px-3 justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                    {user?.imageUrl ? (
                        <img
                            src={user.imageUrl}
                            alt={user.firstName || 'User'}
                            className="size-8 rounded-full ring-2 ring-background"
                        />
                    ) : (
                        <div className="size-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
                            {user?.firstName?.[0] || 'U'}
                        </div>
                    )}
                    <div className="flex flex-col">
                        <span className="text-sm font-medium truncate max-w-[120px]">
                            {user?.firstName || 'User'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Pro Plan</span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                    <DotsThree className="size-4" weight="bold" />
                </Button>
            </div>
        </div>
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
