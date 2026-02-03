'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Download,
    Eye,
    Loader2,
    Upload,
} from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ImportPreview, type ParsedConversation } from './import-preview';
import { ImportUploader, type UploadedFile } from './import-uploader';

/**
 * YULA OS Import Flow Component
 * Design System v2.0 - Monolith Aesthetic
 *
 * Feature color: Electric Blue (#2563EB)
 * Multi-step import wizard
 */

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

interface ImportFlowProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface ImportProgress {
    current: number;
    total: number;
    currentTitle?: string;
}

export function ImportFlow({ open, onOpenChange }: ImportFlowProps) {
    const [step, setStep] = React.useState<ImportStep>('upload');
    const [files, setFiles] = React.useState<UploadedFile[]>([]);
    const [conversations, setConversations] = React.useState<ParsedConversation[]>([]);
    const [progress, setProgress] = React.useState<ImportProgress>({ current: 0, total: 0 });
    const [error, setError] = React.useState<string | null>(null);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [jobId, setJobId] = React.useState<string | null>(null);

    const handleFilesSelected = React.useCallback((newFiles: UploadedFile[]) => {
        setFiles((prev) => [...prev, ...newFiles]);
        setError(null);
    }, []);

    const handleFileRemove = React.useCallback((fileId: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
    }, []);

    const handleParseFiles = React.useCallback(async () => {
        setIsProcessing(true);
        setError(null);

        try {
            // Update file statuses to validating
            setFiles((prev) => prev.map((f) => ({ ...f, status: 'validating' as const })));

            const parsedConversations: ParsedConversation[] = [];

            for (const uploadedFile of files) {
                try {
                    const content = await uploadedFile.file.text();
                    const json = JSON.parse(content);

                    // Parse based on source
                    const convs = parseConversations(json, uploadedFile.source, uploadedFile.id);
                    parsedConversations.push(...convs);

                    // Update file status
                    setFiles((prev) =>
                        prev.map((f) =>
                            f.id === uploadedFile.id
                                ? {
                                      ...f,
                                      status: 'valid' as const,
                                      conversationCount: convs.length,
                                  }
                                : f
                        )
                    );
                } catch (_parseError) {
                    setFiles((prev) =>
                        prev.map((f) =>
                            f.id === uploadedFile.id
                                ? {
                                      ...f,
                                      status: 'invalid' as const,
                                      error: 'Failed to parse file',
                                  }
                                : f
                        )
                    );
                }
            }

            if (parsedConversations.length > 0) {
                setConversations(parsedConversations);

                // Create backend import job
                try {
                    const firstFile = files[0];
                    const content = await firstFile.file.text();
                    const json = JSON.parse(content);

                    const response = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/import/jobs`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                                source:
                                    firstFile.source === 'UNKNOWN' ? 'CHATGPT' : firstFile.source,
                                fileName: firstFile.file.name,
                                fileSize: firstFile.file.size,
                                content: json,
                            }),
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        setJobId(data.job.id);
                    }
                } catch (err) {
                    console.error('Failed to create import job:', err);
                    // Continue with client-side preview even if backend fails
                }

                setStep('preview');
            } else {
                setError('No conversations found in the uploaded files');
            }
        } catch (_err) {
            setError('Failed to process files. Please check the format.');
        } finally {
            setIsProcessing(false);
        }
    }, [files]);

    const handleSelectionChange = React.useCallback((id: string, selected: boolean) => {
        setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, selected } : c)));
    }, []);

    const handleSelectAll = React.useCallback(() => {
        setConversations((prev) => prev.map((c) => ({ ...c, selected: true })));
    }, []);

    const handleDeselectAll = React.useCallback(() => {
        setConversations((prev) => prev.map((c) => ({ ...c, selected: false })));
    }, []);

    const handleImport = React.useCallback(async () => {
        setStep('importing');
        const selectedConvs = conversations.filter((c) => c.selected);
        setProgress({ current: 0, total: selectedConvs.length });

        try {
            if (jobId) {
                // Use backend API
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || ''}/api/import/jobs/${jobId}/execute`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            selectedIds: conversations.filter(e => e.selected).map(e => e.id),
                        }),
                    }
                );

                if (!response.ok) {
                    throw new Error('Import failed');
                }

                const data = await response.json();
                setProgress({
                    current: data.result.imported,
                    total: data.result.total,
                });
            } else {
                // Fallback: simulate if no backend job
                for (let i = 0; i < selectedConvs.length; i++) {
                    setProgress({
                        current: i + 1,
                        total: selectedConvs.length,
                        currentTitle: selectedConvs[i].title,
                    });
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
            }

            setStep('complete');
        } catch (_err) {
            setError('Import failed. Please try again.');
            setStep('preview');
        }
    }, [conversations, jobId]);

    const handleClose = React.useCallback(() => {
        onOpenChange(false);
        // Reset state after animation
        setTimeout(() => {
            setStep('upload');
            setFiles([]);
            setConversations([]);
            setProgress({ current: 0, total: 0 });
            setError(null);
            setJobId(null);
        }, 300);
    }, [onOpenChange]);

    const handleBack = React.useCallback(() => {
        if (step === 'preview') {
            setStep('upload');
            setConversations([]);
        }
    }, [step]);

    const steps = [
        { id: 'upload', label: 'Upload', icon: Upload },
        { id: 'preview', label: 'Preview', icon: Eye },
        { id: 'importing', label: 'Import', icon: Download },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-[6px] bg-feature-import/10 flex items-center justify-center">
                            <Download className="w-4 h-4 text-feature-import" />
                        </div>
                        Import Chat History
                    </DialogTitle>
                    <DialogDescription>
                        Bring your conversations from ChatGPT or Claude into YULA
                    </DialogDescription>
                </DialogHeader>

                {/* Step Indicator */}
                {step !== 'complete' && (
                    <div className="flex items-center gap-2 py-4 border-b border-zinc-200 dark:border-zinc-800">
                        {steps.map((s, i) => {
                            const Icon = s.icon;
                            const isActive = s.id === step;
                            const isPast = steps.findIndex((x) => x.id === step) > i;

                            return (
                                <React.Fragment key={s.id}>
                                    <div
                                        className={cn(
                                            'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors',
                                            isActive
                                                ? 'bg-feature-import text-white'
                                                : isPast
                                                  ? 'bg-feature-import/10 text-feature-import'
                                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="font-medium">{s.label}</span>
                                    </div>
                                    {i < steps.length - 1 && (
                                        <div
                                            className={cn(
                                                'flex-1 h-0.5 rounded',
                                                isPast
                                                    ? 'bg-feature-import'
                                                    : 'bg-zinc-200 dark:bg-zinc-800'
                                            )}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-hidden py-4">
                    <AnimatePresence mode="wait">
                        {step === 'upload' && (
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <ImportUploader
                                    files={files}
                                    onFilesSelected={handleFilesSelected}
                                    onFileRemove={handleFileRemove}
                                    isUploading={isProcessing}
                                />

                                {error && (
                                    <div className="mt-4 flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg border border-rose-200 dark:border-rose-900">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="mt-6 flex justify-end">
                                    <Button
                                        variant="import"
                                        onClick={handleParseFiles}
                                        disabled={files.length === 0 || isProcessing}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                Continue
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'preview' && (
                            <motion.div
                                key="preview"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="h-full"
                            >
                                <ImportPreview
                                    conversations={conversations}
                                    onSelectionChange={handleSelectionChange}
                                    onSelectAll={handleSelectAll}
                                    onDeselectAll={handleDeselectAll}
                                    onImport={handleImport}
                                />

                                <div className="mt-4">
                                    <Button variant="ghost" onClick={handleBack}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back to Upload
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'importing' && (
                            <motion.div
                                key="importing"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-12"
                            >
                                <div className="relative w-20 h-20 mb-6">
                                    <div className="absolute inset-0 rounded-full border-4 border-zinc-200 dark:border-zinc-800" />
                                    <svg
                                        className="absolute inset-0 w-20 h-20 -rotate-90"
                                        role="img"
                                        aria-label="Import progress"
                                    >
                                        <circle
                                            cx="40"
                                            cy="40"
                                            r="36"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            className="text-feature-import"
                                            strokeDasharray={`${(progress.current / progress.total) * 226} 226`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Download className="w-8 h-8 text-feature-import" />
                                    </div>
                                </div>

                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                    Importing conversations...
                                </h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                                    {progress.current} of {progress.total} complete
                                </p>
                                {progress.currentTitle && (
                                    <p className="text-sm text-zinc-400 dark:text-zinc-500 truncate max-w-xs">
                                        {progress.currentTitle}
                                    </p>
                                )}
                            </motion.div>
                        )}

                        {step === 'complete' && (
                            <motion.div
                                key="complete"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-12"
                            >
                                <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                                </div>

                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                    Import Complete!
                                </h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 text-center">
                                    Successfully imported {progress.total} conversations.
                                    <br />
                                    They're now searchable in your YULA memory.
                                </p>

                                <div className="flex items-center gap-3">
                                    <Button variant="outline" onClick={handleClose}>
                                        Close
                                    </Button>
                                    <Button
                                        variant="import"
                                        onClick={() => {
                                            window.location.href = '/memory';
                                        }}
                                    >
                                        View Memory
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Helper function to parse conversations from different formats
function parseConversations(
    data: unknown,
    source: 'CHATGPT' | 'CLAUDE' | 'UNKNOWN',
    fileId: string
): ParsedConversation[] {
    const conversations: ParsedConversation[] = [];

    try {
        if (source === 'CHATGPT' && Array.isArray(data)) {
            // ChatGPT export format
            for (const conv of data) {
                if (conv.mapping && conv.title) {
                    const messages = Object.values(conv.mapping as Record<string, unknown>);
                    const messageCount = messages.filter(
                        (m: unknown) =>
                            m &&
                            typeof m === 'object' &&
                            'message' in m &&
                            (m as { message: unknown }).message
                    ).length;

                    conversations.push({
                        id: `${fileId}-${conv.id || Math.random().toString(36).slice(2)}`,
                        externalId: conv.id || '',
                        title: conv.title,
                        messageCount,
                        createdAt: new Date(conv.create_time * 1000),
                        updatedAt: new Date(conv.update_time * 1000),
                        source: 'CHATGPT',
                        preview: getFirstUserMessage(conv.mapping),
                        selected: true,
                    });
                }
            }
        } else if (source === 'CLAUDE' && Array.isArray(data)) {
            // Claude export format
            for (const conv of data) {
                conversations.push({
                    id: `${fileId}-${conv.uuid || Math.random().toString(36).slice(2)}`,
                    externalId: conv.uuid || '',
                    title: conv.name || 'Untitled',
                    messageCount: conv.chat_messages?.length || 0,
                    createdAt: new Date(conv.created_at),
                    updatedAt: new Date(conv.updated_at),
                    source: 'CLAUDE',
                    preview: conv.chat_messages?.[0]?.text?.slice(0, 200),
                    selected: true,
                });
            }
        }
    } catch {
        // Parsing failed, return empty array
    }

    return conversations;
}

function getFirstUserMessage(mapping: Record<string, unknown>): string | undefined {
    try {
        for (const node of Object.values(mapping)) {
            if (
                node &&
                typeof node === 'object' &&
                'message' in node &&
                node.message &&
                typeof node.message === 'object' &&
                'author' in node.message &&
                (node.message as { author: { role: string } }).author?.role === 'user' &&
                'content' in node.message &&
                (node.message as { content: { parts?: string[] } }).content?.parts?.[0]
            ) {
                return (node.message as { content: { parts: string[] } }).content.parts[0].slice(
                    0,
                    200
                );
            }
        }
    } catch {
        return undefined;
    }
    return undefined;
}

export default ImportFlow;
