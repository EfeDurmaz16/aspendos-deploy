'use client';

import {
    Brain,
    ChatCircle,
    DownloadSimple,
    Gear,
    MagnifyingGlass,
    Moon,
    Plus,
    Star,
    Sun,
    UsersThree,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LogoMark } from '@/components/brand/logo';
import { ContextMenuChat } from '@/components/chat/context-menu-chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useUser } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface Chat {
    id: string;
    title: string;
    modelPreference: string | null;
    createdAt: string;
    updatedAt: string;
    isPinned?: boolean;
}

interface IconRailProps {
    currentChatId?: string;
    onNewChat?: () => void;
    onSelectChat?: (chatId: string) => void;
}

export function IconRail({ currentChatId, onNewChat, onSelectChat }: IconRailProps) {
    const { user } = useUser();
    const { signOut } = useAuth();
    const { isLoaded, isSignedIn } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();

    const [chats, setChats] = useState<Chat[]>([]);
    const [chatPanelOpen, setChatPanelOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [settingsOpen, setSettingsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const railRef = useRef<HTMLDivElement>(null);

    // Load chats
    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;
        const loadChats = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/chat`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setChats(data.chats || []);
                }
            } catch {
                /* silent */
            }
        };
        loadChats();
    }, [isLoaded, isSignedIn]);

    // Close panel on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (
                chatPanelOpen &&
                panelRef.current &&
                !panelRef.current.contains(e.target as Node) &&
                railRef.current &&
                !railRef.current.contains(e.target as Node)
            ) {
                setChatPanelOpen(false);
            }
            if (
                settingsOpen &&
                panelRef.current &&
                !panelRef.current.contains(e.target as Node) &&
                railRef.current &&
                !railRef.current.contains(e.target as Node)
            ) {
                setSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [chatPanelOpen, settingsOpen]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey && e.key === 'b') {
                e.preventDefault();
                setChatPanelOpen((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const filteredChats = chats.filter((c) =>
        c.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const groupedChats = groupChatsByDate(filteredChats);

    const handleSelectChat = useCallback(
        (id: string) => {
            onSelectChat?.(id);
            setChatPanelOpen(false);
        },
        [onSelectChat]
    );

    const isActive = (path: string) => pathname?.startsWith(path);

    return (
        <>
            {/* Icon Rail */}
            <div
                ref={railRef}
                className="h-full w-[52px] flex-shrink-0 flex flex-col items-center border-r border-border bg-background py-3 gap-1 z-50"
            >
                {/* Logo */}
                <button
                    type="button"
                    onClick={() => {
                        onNewChat?.();
                        setChatPanelOpen(false);
                    }}
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-transform hover:scale-105 active:scale-95 text-foreground"
                    aria-label="New chat"
                >
                    <LogoMark size={28} />
                </button>

                {/* New Chat */}
                <RailButton
                    icon={<Plus size={18} weight="bold" />}
                    label="New chat"
                    onClick={() => {
                        onNewChat?.();
                        setChatPanelOpen(false);
                    }}
                />

                {/* Chat History */}
                <RailButton
                    icon={<ChatCircle size={18} weight={chatPanelOpen ? 'fill' : 'regular'} />}
                    label="Chats"
                    active={chatPanelOpen || isActive('/chat')}
                    onClick={() => {
                        setChatPanelOpen(!chatPanelOpen);
                        setSettingsOpen(false);
                    }}
                />

                {/* Council */}
                <RailButton
                    icon={
                        <UsersThree size={18} weight={isActive('/council') ? 'fill' : 'regular'} />
                    }
                    label="Council"
                    active={isActive('/council')}
                    onClick={() => {
                        router.push('/council');
                        setChatPanelOpen(false);
                    }}
                />

                {/* Memory */}
                <RailButton
                    icon={<Brain size={18} weight={isActive('/memory') ? 'fill' : 'regular'} />}
                    label="Memory"
                    active={isActive('/memory')}
                    onClick={() => {
                        router.push('/memory');
                        setChatPanelOpen(false);
                    }}
                />

                {/* Import */}
                <RailButton
                    icon={
                        <DownloadSimple
                            size={18}
                            weight={isActive('/import') ? 'fill' : 'regular'}
                        />
                    }
                    label="Import"
                    active={isActive('/import')}
                    onClick={() => {
                        router.push('/import');
                        setChatPanelOpen(false);
                    }}
                />

                {/* Spacer */}
                <div className="flex-1" />

                {/* Theme Toggle */}
                <RailButton
                    icon={theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                />

                {/* Settings */}
                <RailButton
                    icon={<Gear size={18} />}
                    label="Settings"
                    onClick={() => {
                        router.push('/settings');
                        setChatPanelOpen(false);
                    }}
                />

                {/* User Avatar */}
                <button
                    type="button"
                    onClick={() => {
                        setSettingsOpen(!settingsOpen);
                        setChatPanelOpen(false);
                    }}
                    className="mt-1 w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-border transition-all"
                >
                    {user?.imageUrl ? (
                        <img
                            src={user.imageUrl}
                            alt={user.firstName || 'User'}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                            {user?.firstName?.[0] || 'U'}
                        </div>
                    )}
                </button>
            </div>

            {/* Expandable Chat List Panel */}
            <AnimatePresence>
                {chatPanelOpen && (
                    <motion.div
                        ref={panelRef}
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 260, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full border-r border-border bg-background overflow-hidden z-40 flex-shrink-0"
                    >
                        <div className="w-[260px] h-full flex flex-col">
                            {/* Search */}
                            <div className="p-3 pb-2">
                                <div className="relative">
                                    <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                                    <input
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-8 pl-8 pr-3 text-sm bg-muted/60 border-0 rounded-lg placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                </div>
                            </div>

                            {/* Chat List */}
                            <ScrollArea className="flex-1">
                                <div className="px-2 pb-3 space-y-4">
                                    {Object.keys(groupedChats).length === 0 ? (
                                        <div className="text-center py-8 px-4">
                                            <p className="text-xs text-muted-foreground">
                                                {searchQuery
                                                    ? 'No matches'
                                                    : 'No conversations yet'}
                                            </p>
                                        </div>
                                    ) : (
                                        Object.entries(groupedChats).map(
                                            ([dateGroup, groupChats]) => (
                                                <div key={dateGroup}>
                                                    <h4 className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-1 px-2">
                                                        {dateGroup}
                                                    </h4>
                                                    <div className="space-y-px">
                                                        {groupChats.map((chat) => (
                                                            <ContextMenuChat
                                                                key={chat.id}
                                                                chat={{
                                                                    id: chat.id,
                                                                    title: chat.title || 'Untitled',
                                                                    isPinned: chat.isPinned,
                                                                }}
                                                                onOpenInNewTab={(id) => {
                                                                    window.open(
                                                                        `/chat/${id}`,
                                                                        '_blank'
                                                                    );
                                                                }}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleSelectChat(chat.id)
                                                                    }
                                                                    className={cn(
                                                                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors text-sm',
                                                                        chat.id === currentChatId
                                                                            ? 'bg-muted text-foreground'
                                                                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                                                    )}
                                                                >
                                                                    <span className="truncate flex-1 text-[13px]">
                                                                        {chat.title || 'Untitled'}
                                                                    </span>
                                                                    {chat.isPinned && (
                                                                        <Star
                                                                            className="size-3 text-muted-foreground/50"
                                                                            weight="fill"
                                                                        />
                                                                    )}
                                                                </button>
                                                            </ContextMenuChat>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        )
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Settings Panel */}
            <AnimatePresence>
                {settingsOpen && (
                    <motion.div
                        ref={panelRef}
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 220, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full border-r border-border bg-background overflow-hidden z-40 flex-shrink-0"
                    >
                        <div className="w-[220px] h-full flex flex-col p-3">
                            <div className="flex items-center gap-2 mb-4 px-1">
                                {user?.imageUrl ? (
                                    <img
                                        src={user.imageUrl}
                                        alt=""
                                        className="size-8 rounded-full"
                                    />
                                ) : (
                                    <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                                        {user?.firstName?.[0] || 'U'}
                                    </div>
                                )}
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium truncate">
                                        {user?.firstName || 'User'}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground truncate">
                                        {user?.primaryEmailAddress?.emailAddress || ''}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-px">
                                <SettingsItem
                                    label="Settings"
                                    onClick={() => {
                                        router.push('/settings');
                                        setSettingsOpen(false);
                                    }}
                                />
                                <SettingsItem
                                    label="Billing"
                                    onClick={() => {
                                        router.push('/billing');
                                        setSettingsOpen(false);
                                    }}
                                />
                                <div className="h-px bg-border my-2" />
                                <SettingsItem
                                    label="Sign out"
                                    onClick={async () => {
                                        await signOut();
                                        router.push('/landing');
                                    }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

function RailButton({
    icon,
    label,
    active,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                active
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
        >
            {icon}
        </button>
    );
}

function SettingsItem({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
            {label}
        </button>
    );
}

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
        if (chatDay >= today) group = 'Today';
        else if (chatDay >= yesterday) group = 'Yesterday';
        else if (chatDay >= lastWeek) group = 'Last 7 days';
        else group = 'Older';

        if (!groups[group]) groups[group] = [];
        groups[group].push(chat);
    }

    const orderedGroups: Record<string, Chat[]> = {};
    for (const key of ['Today', 'Yesterday', 'Last 7 days', 'Older']) {
        if (groups[key]) orderedGroups[key] = groups[key];
    }
    return orderedGroups;
}
