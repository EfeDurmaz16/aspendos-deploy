'use client';

import { Brain, Copy, Edit, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface ContextMenuMemoryProps {
    children: React.ReactNode;
    memory: {
        id: string;
        content: string;
        type?: string;
        tags?: string[];
    };
    onView?: (memory: { id: string; content: string }) => void;
    onEdit?: (memory: { id: string; content: string }) => void;
    onDelete?: (memoryId: string) => void;
}

export function ContextMenuMemory({
    children,
    memory,
    onView,
    onEdit,
    onDelete,
}: ContextMenuMemoryProps) {
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(memory.content);
            toast.success('Memory copied to clipboard');
        } catch {
            toast.error('Failed to copy');
        }
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger className="block w-full">{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-48">
                {onView && (
                    <ContextMenuItem onClick={() => onView(memory)}>
                        <Eye className="size-4 mr-2" />
                        View details
                    </ContextMenuItem>
                )}

                <ContextMenuItem onClick={handleCopy}>
                    <Copy className="size-4 mr-2" />
                    Copy content
                </ContextMenuItem>

                {onEdit && (
                    <ContextMenuItem onClick={() => onEdit(memory)}>
                        <Edit className="size-4 mr-2" />
                        Edit memory
                    </ContextMenuItem>
                )}

                <ContextMenuItem disabled>
                    <Brain className="size-4 mr-2" />
                    {memory.type || 'Auto-detected'}
                </ContextMenuItem>

                {onDelete && (
                    <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                            onClick={() => onDelete(memory.id)}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="size-4 mr-2" />
                            Delete memory
                        </ContextMenuItem>
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}
