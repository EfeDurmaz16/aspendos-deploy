'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Upload,
    FileText,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
} from 'lucide-react';

/**
 * YULA OS Import Uploader Component
 * Design System v2.0 - Monolith Aesthetic
 *
 * Feature color: Electric Blue (#2563EB)
 * Supports: ChatGPT JSON export, Claude JSON export
 */

export type ImportSource = 'CHATGPT' | 'CLAUDE' | 'UNKNOWN';

export interface UploadedFile {
    file: File;
    id: string;
    source: ImportSource;
    status: 'pending' | 'validating' | 'valid' | 'invalid';
    error?: string;
    conversationCount?: number;
}

interface ImportUploaderProps {
    onFilesSelected: (files: UploadedFile[]) => void;
    onFileRemove: (fileId: string) => void;
    files: UploadedFile[];
    isUploading?: boolean;
    maxFiles?: number;
    className?: string;
}

const ACCEPTED_TYPES = ['.json', '.zip'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function detectSource(fileName: string): ImportSource {
    const lower = fileName.toLowerCase();
    if (lower.includes('chatgpt') || lower.includes('conversations')) {
        return 'CHATGPT';
    }
    if (lower.includes('claude')) {
        return 'CLAUDE';
    }
    return 'UNKNOWN';
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImportUploader({
    onFilesSelected,
    onFileRemove,
    files,
    isUploading = false,
    maxFiles = 5,
    className,
}: ImportUploaderProps) {
    const [isDragging, setIsDragging] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDragOver = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = React.useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);

            const droppedFiles = Array.from(e.dataTransfer.files);
            processFiles(droppedFiles);
        },
        [processFiles]
    );

    const handleFileSelect = React.useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
            processFiles(selectedFiles);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        },
        [processFiles]
    );

    const processFiles = React.useCallback(
        (newFiles: File[]) => {
            const remainingSlots = maxFiles - files.length;
            const filesToProcess = newFiles.slice(0, remainingSlots);

            const processedFiles: UploadedFile[] = filesToProcess
                .filter((file) => {
                    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
                    return ACCEPTED_TYPES.includes(ext) && file.size <= MAX_FILE_SIZE;
                })
                .map((file) => ({
                    file,
                    id: `${file.name}-${crypto.randomUUID()}`,
                    source: detectSource(file.name),
                    status: 'pending' as const,
                }));

            if (processedFiles.length > 0) {
                onFilesSelected(processedFiles);
            }
        },
        [files, maxFiles, onFilesSelected]
    );

    const canAddMore = files.length < maxFiles;

    return (
        <div className={cn('space-y-4', className)}>
            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => canAddMore && fileInputRef.current?.click()}
                className={cn(
                    'relative rounded-[12px] border-2 border-dashed p-8 transition-all duration-200 cursor-pointer',
                    'flex flex-col items-center justify-center text-center',
                    isDragging
                        ? 'border-feature-import bg-feature-import/5'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-feature-import/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50',
                    !canAddMore && 'opacity-50 cursor-not-allowed'
                )}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES.join(',')}
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={!canAddMore || isUploading}
                />

                <motion.div
                    initial={false}
                    animate={{ scale: isDragging ? 1.1 : 1 }}
                    className={cn(
                        'w-14 h-14 rounded-full flex items-center justify-center mb-4',
                        isDragging
                            ? 'bg-feature-import text-white'
                            : 'bg-feature-import/10 text-feature-import'
                    )}
                >
                    <Upload className="w-6 h-6" />
                </motion.div>

                <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    {isDragging ? 'Drop files here' : 'Upload your chat history'}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                    Drag and drop or click to browse
                </p>

                <div className="flex items-center gap-4 text-xs text-zinc-400 dark:text-zinc-500">
                    <span>JSON or ZIP files</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    <span>Max {formatFileSize(MAX_FILE_SIZE)}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    <span>Up to {maxFiles} files</span>
                </div>
            </div>

            {/* Supported Sources */}
            <div className="flex items-center justify-center gap-6 py-2">
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-emerald-600">G</span>
                    </div>
                    <span>ChatGPT</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <div className="w-6 h-6 rounded bg-orange-500/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-orange-600">C</span>
                    </div>
                    <span>Claude</span>
                </div>
            </div>

            {/* File List */}
            <AnimatePresence mode="popLayout">
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                    >
                        {files.map((uploadedFile) => (
                            <FileItem
                                key={uploadedFile.id}
                                file={uploadedFile}
                                onRemove={() => onFileRemove(uploadedFile.id)}
                                isUploading={isUploading}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface FileItemProps {
    file: UploadedFile;
    onRemove: () => void;
    isUploading: boolean;
}

function FileItem({ file, onRemove, isUploading }: FileItemProps) {
    const sourceColors = {
        CHATGPT: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        CLAUDE: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
        UNKNOWN: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
    };

    const statusIcons = {
        pending: null,
        validating: <Loader2 className="w-4 h-4 animate-spin text-feature-import" />,
        valid: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        invalid: <AlertCircle className="w-4 h-4 text-rose-500" />,
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className={cn(
                'flex items-center gap-3 p-3 rounded-[8px] border bg-white dark:bg-zinc-900/50',
                file.status === 'invalid'
                    ? 'border-rose-200 dark:border-rose-900/50'
                    : 'border-zinc-200 dark:border-zinc-800'
            )}
        >
            {/* File Icon */}
            <div className={cn('w-10 h-10 rounded-[6px] flex items-center justify-center', sourceColors[file.source])}>
                <FileText className="w-5 h-5" />
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {file.file.name}
                    </p>
                    <span className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded',
                        sourceColors[file.source]
                    )}>
                        {file.source}
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatFileSize(file.file.size)}
                    </span>
                    {file.conversationCount !== undefined && (
                        <>
                            <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                {file.conversationCount} conversations
                            </span>
                        </>
                    )}
                    {file.error && (
                        <span className="text-xs text-rose-500">{file.error}</span>
                    )}
                </div>
            </div>

            {/* Status/Actions */}
            <div className="flex items-center gap-2">
                {statusIcons[file.status]}
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onRemove}
                    disabled={isUploading}
                    className="opacity-50 hover:opacity-100"
                >
                    <X className="w-4 h-4" />
                    <span className="sr-only">Remove file</span>
                </Button>
            </div>
        </motion.div>
    );
}

export default ImportUploader;
