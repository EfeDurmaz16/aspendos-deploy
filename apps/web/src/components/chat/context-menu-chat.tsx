'use client';

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Edit, Trash2, Pin, PinOff, MessageSquare } from 'lucide-react';

interface ContextMenuChatProps {
    children: React.ReactNode;
    chat: {
        id: string;
        title: string;
        isPinned?: boolean;
    };
    onEditTitle?: (chatId: string, currentTitle: string) => void;
    onDelete?: (chatId: string) => void;
    onTogglePin?: (chatId: string) => void;
    onOpenInNewTab?: (chatId: string) => void;
}

export function ContextMenuChat({
    children,
    chat,
    onEditTitle,
    onDelete,
    onTogglePin,
    onOpenInNewTab,
}: ContextMenuChatProps) {
    return (
        <ContextMenu>
            <ContextMenuTrigger className="block w-full">{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-48">
                {onEditTitle && (
                    <ContextMenuItem onClick={() => onEditTitle(chat.id, chat.title)}>
                        <Edit className="size-4 mr-2" />
                        Edit title
                    </ContextMenuItem>
                )}

                {onTogglePin && (
                    <ContextMenuItem onClick={() => onTogglePin(chat.id)}>
                        {chat.isPinned ? (
                            <>
                                <PinOff className="size-4 mr-2" />
                                Unpin
                            </>
                        ) : (
                            <>
                                <Pin className="size-4 mr-2" />
                                Pin
                            </>
                        )}
                    </ContextMenuItem>
                )}

                {onOpenInNewTab && (
                    <ContextMenuItem onClick={() => onOpenInNewTab(chat.id)}>
                        <MessageSquare className="size-4 mr-2" />
                        Open in new tab
                    </ContextMenuItem>
                )}

                {onDelete && (
                    <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                            onClick={() => onDelete(chat.id)}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="size-4 mr-2" />
                            Delete chat
                        </ContextMenuItem>
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}
