'use client';

import { Copy, Edit, Forward, RefreshCw, Reply, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface ContextMenuMessageProps {
    children: React.ReactNode;
    message: {
        id: string;
        content: string;
        role: 'user' | 'assistant';
    };
    onReply?: (message: { id: string; content: string }) => void;
    onEdit?: (message: { id: string; content: string }) => void;
    onRegenerate?: (messageId: string) => void;
    onForward?: (message: { id: string; content: string }) => void;
    onDelete?: (messageId: string) => void;
}

export function ContextMenuMessage({
    children,
    message,
    onReply,
    onEdit,
    onRegenerate,
    onForward,
    onDelete,
}: ContextMenuMessageProps) {
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            toast.success('Copied to clipboard');
        } catch {
            toast.error('Failed to copy');
        }
    };

    const isUserMessage = message.role === 'user';
    const isAssistantMessage = message.role === 'assistant';

    return (
        <ContextMenu>
            <ContextMenuTrigger className="block w-full">{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-48">
                <ContextMenuItem onClick={handleCopy}>
                    <Copy className="size-4 mr-2" />
                    Copy text
                </ContextMenuItem>

                {onReply && (
                    <ContextMenuItem onClick={() => onReply(message)}>
                        <Reply className="size-4 mr-2" />
                        Reply
                    </ContextMenuItem>
                )}

                {isUserMessage && onEdit && (
                    <ContextMenuItem onClick={() => onEdit(message)}>
                        <Edit className="size-4 mr-2" />
                        Edit message
                    </ContextMenuItem>
                )}

                {isAssistantMessage && onRegenerate && (
                    <ContextMenuItem onClick={() => onRegenerate(message.id)}>
                        <RefreshCw className="size-4 mr-2" />
                        Regenerate
                    </ContextMenuItem>
                )}

                {onForward && (
                    <ContextMenuItem onClick={() => onForward(message)}>
                        <Forward className="size-4 mr-2" />
                        Forward to new chat
                    </ContextMenuItem>
                )}

                {onDelete && (
                    <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                            onClick={() => onDelete(message.id)}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="size-4 mr-2" />
                            Delete
                        </ContextMenuItem>
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}
