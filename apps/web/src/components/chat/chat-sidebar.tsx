'use client';

import {
    Brain,
    ChatCircle,
    CircleNotch,
    DotsThree,
    Gear,
    MagnifyingGlass,
    Plus,
    Star,
    UsersThree,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ContextMenuChat } from '@/components/chat/context-menu-chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

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
    const pathname = usePathname();
    const [searchQuery, setSearchQuery] = useState('');

    // Filter chats by search
    const filteredChats = chats.filter((chat) =>
        chat.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group chats by date
    const groupedChats = groupChatsByDate(filteredChats);

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="h-14 flex items-center px-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                        <span className="text-background font-bold text-sm">Y</span>
                    </div>
                    <span className="font-semibold text-foreground tracking-tight">YULA</span>
                </div>
            </div>

            {/* New Chat Button */}
            <div className="p-4 pb-2">
                <Button
                    onClick={onNewChat}
                    className="w-full justify-start gap-2.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm h-11 rounded-xl text-sm"
                >
                    <Plus weight="bold" className="size-5" />
                    New Chat
                </Button>
            </div>

            {/* Navigation */}
            <nav className="px-4 pb-2 space-y-1">
                <Link
                    href="/council"
                    className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors',
                        pathname?.startsWith('/council')
                            ? 'bg-muted text-foreground font-medium'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                >
                    <UsersThree className="size-4" />
                    Council
                </Link>
                <Link
                    href="/memory"
                    className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors',
                        pathname?.startsWith('/memory')
                            ? 'bg-muted text-foreground font-medium'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                >
                    <Brain className="size-4" />
                    Memory
                </Link>
            </nav>

            {/* Search */}
            <div className="px-4 pb-4">
                <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-11 pl-10 text-sm bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring rounded-xl"
                    />
                </div>
            </div>

            {/* Chat List */}
            <ScrollArea className="flex-1">
                <div className="px-3 pb-4 space-y-5">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <CircleNotch className="size-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : Object.keys(groupedChats).length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <ChatCircle
                                className="size-10 text-muted-foreground/30 mx-auto mb-3"
                                weight="duotone"
                            />
                            <p className="text-sm text-muted-foreground">
                                {searchQuery ? 'No matching chats' : 'No conversations yet'}
                            </p>
                        </div>
                    ) : (
                        Object.entries(groupedChats).map(([dateGroup, groupChats]) => (
                            <div key={dateGroup}>
                                <h4 className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2 px-2">
                                    {dateGroup}
                                </h4>
                                <div className="space-y-1">
                                    {groupChats.map((chat) => (
                                        <ContextMenuChat
                                            key={chat.id}
                                            chat={{
                                                id: chat.id,
                                                title: chat.title || 'Untitled',
                                                isPinned: chat.isPinned,
                                            }}
                                            onEditTitle={onEditChatTitle}
                                            onDelete={onDeleteChat}
                                            onOpenInNewTab={(id) => {
                                                window.open(`/chat/${id}`, '_blank');
                                            }}
                                        >
                                            <button
                                                onClick={() => onSelectChat?.(chat.id)}
                                                className={cn(
                                                    'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors group',
                                                    chat.id === currentChatId
                                                        ? 'bg-muted text-foreground font-medium'
                                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                                )}
                                            >
                                                <ChatCircle
                                                    className={cn(
                                                        'size-5 flex-shrink-0 transition-colors',
                                                        chat.id === currentChatId
                                                            ? 'text-foreground'
                                                            : 'text-muted-foreground/60'
                                                    )}
                                                    weight={
                                                        chat.id === currentChatId
                                                            ? 'fill'
                                                            : 'regular'
                                                    }
                                                />
                                                <span className="truncate flex-1 text-sm">
                                                    {chat.title || 'Untitled'}
                                                </span>
                                                {chat.isPinned && (
                                                    <Star
                                                        className="size-3 text-amber-500"
                                                        weight="fill"
                                                    />
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
            <div className="h-14 border-t border-border flex items-center px-3 justify-between">
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
