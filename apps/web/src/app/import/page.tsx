'use client';

import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Download,
    Eye,
    History,
    Loader2,
    Search,
    Sparkles,
    Upload,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import {
    ImportPreview,
    ImportUploader,
    type ParsedConversation,
    type UploadedFile,
} from '@/components/import';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * YULA OS Import Page
 * Design System v2.0 - Monolith Aesthetic
 *
 * Feature color: Electric Blue (#2563EB)
 * Full-page import experience
 */

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

interface ImportProgress {
    current: number;
    total: number;
    currentTitle?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type ImportPreviewEntity = {
    id: string;
    externalId: string;
    title: string;
    messageCount: number;
    source: string;
    createdAt?: string;
    updatedAt?: string;
    selected: boolean;
};

function normalizePreviewSource(source: string): ParsedConversation['source'] {
    if (source === 'CHATGPT' || source === 'CLAUDE' || source === 'GEMINI' || source === 'PERPLEXITY') {
        return source;
    }
    return 'CHATGPT';
}

export default function ImportPage() {
    const [step, setStep] = React.useState<ImportStep>('upload');
    const [files, setFiles] = React.useState<UploadedFile[]>([]);
    const [conversations, setConversations] = React.useState<ParsedConversation[]>([]);
    const [entityToJob, setEntityToJob] = React.useState<Record<string, string>>({});
    const [progress, setProgress] = React.useState<ImportProgress>({ current: 0, total: 0 });
    const [error, setError] = React.useState<string | null>(null);
    const [isProcessing, setIsProcessing] = React.useState(false);

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
            setFiles((prev) => prev.map((f) => ({ ...f, status: 'validating' as const })));

            const parsedConversations: ParsedConversation[] = [];
            const entityJobMap: Record<string, string> = {};

            for (const uploadedFile of files) {
                try {
                    const contentText = await uploadedFile.file.text();
                    const content = JSON.parse(contentText);
                    const response = await fetch(`${API_BASE}/api/import/jobs`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            ...(uploadedFile.source !== 'UNKNOWN' ? { source: uploadedFile.source } : {}),
                            fileName: uploadedFile.file.name,
                            fileSize: uploadedFile.file.size,
                            content,
                        }),
                    });

                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({})) as { error?: string };
                        throw new Error(errData.error || `Import failed (${response.status})`);
                    }

                    const data = (await response.json()) as {
                        job: { id: string };
                        preview: ImportPreviewEntity[];
                    };

                    const convs: ParsedConversation[] = (data.preview || []).map((entity) => {
                        entityJobMap[entity.id] = data.job.id;
                        return {
                            id: entity.id,
                            externalId: entity.externalId || '',
                            title: entity.title || 'Untitled Conversation',
                            messageCount: entity.messageCount || 0,
                            createdAt: entity.createdAt ? new Date(entity.createdAt) : new Date(),
                            updatedAt: entity.updatedAt ? new Date(entity.updatedAt) : new Date(),
                            source: normalizePreviewSource(entity.source),
                            selected: entity.selected !== false,
                        };
                    });

                    parsedConversations.push(...convs);

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
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'Failed to parse file';
                    setFiles((prev) =>
                        prev.map((f) =>
                            f.id === uploadedFile.id
                                ? {
                                      ...f,
                                      status: 'invalid' as const,
                                      error: message,
                                  }
                                : f
                        )
                    );
                }
            }

            if (parsedConversations.length > 0) {
                setConversations(parsedConversations);
                setEntityToJob(entityJobMap);
                setStep('preview');
            } else {
                setError('No conversations found in the uploaded files');
            }
        } catch {
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
            const selectedIdsByJob = selectedConvs.reduce<Record<string, string[]>>((acc, conv) => {
                const jobId = entityToJob[conv.id];
                if (!jobId) return acc;
                if (!acc[jobId]) acc[jobId] = [];
                acc[jobId].push(conv.id);
                return acc;
            }, {});

            // Start import - polling effect will update progress in parallel
            for (const [jobId, selectedIds] of Object.entries(selectedIdsByJob)) {
                const res = await fetch(`${API_BASE}/api/import/jobs/${jobId}/execute`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ selectedIds }),
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({})) as { error?: string; upgradeRequired?: boolean };
                    if (errData.upgradeRequired) {
                        throw new Error('Import limit reached on your plan. Please upgrade.');
                    }
                    throw new Error(errData.error || `Failed to import (${res.status})`);
                }

                const data = (await res.json()) as { result?: { imported?: number } };
                const imported = data.result?.imported || 0;

                if (imported === 0 && selectedConvs.length > 0) {
                    throw new Error('No conversations were imported');
                }

                setProgress({ current: imported, total: selectedConvs.length });
            }

            setProgress({ current: selectedConvs.length, total: selectedConvs.length });
            setStep('complete');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed. Please try again.');
            setStep('preview');
        }
    }, [conversations, entityToJob]);

    // Poll import job progress while importing
    React.useEffect(() => {
        if (step !== 'importing') return;

        const jobIds = [...new Set(Object.values(entityToJob))];
        if (jobIds.length === 0) return;

        const interval = setInterval(async () => {
            try {
                for (const jobId of jobIds) {
                    const res = await fetch(`${API_BASE}/api/import/jobs/${jobId}`, {
                        credentials: 'include',
                    });
                    if (!res.ok) continue;
                    const data = (await res.json()) as {
                        job: { importedItems: number; totalItems: number; status: string };
                    };
                    setProgress((prev) => ({
                        ...prev,
                        current: data.job.importedItems || prev.current,
                        total: data.job.totalItems || prev.total,
                    }));
                }
            } catch {
                // Ignore polling errors
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [step, entityToJob]);

    // Celebrate on import complete
    React.useEffect(() => {
        if (step !== 'complete') return;
        const colors = ['#2563EB', '#10B981', '#7C3AED', '#F59E0B'];
        const end = Date.now() + 1500;
        (function frame() {
            confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
            confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
            if (Date.now() < end) requestAnimationFrame(frame);
        })();
    }, [step]);

    const handleBack = React.useCallback(() => {
        if (step === 'preview') {
            setStep('upload');
            setConversations([]);
            setEntityToJob({});
        }
    }, [step]);

    const steps = [
        { id: 'upload', label: 'Upload', icon: Upload },
        { id: 'preview', label: 'Preview', icon: Eye },
        { id: 'importing', label: 'Import', icon: Download },
    ];

    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Header */}
            <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/chat"
                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-[6px] bg-feature-import/10 flex items-center justify-center">
                                <Download className="w-4 h-4 text-feature-import" />
                            </div>
                            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                Import Chat History
                            </h1>
                        </div>
                    </div>

                    {/* Step Indicator */}
                    {step !== 'complete' && (
                        <div className="hidden sm:flex items-center gap-2">
                            {steps.map((s, i) => {
                                const Icon = s.icon;
                                const isActive = s.id === step;
                                const isPast = steps.findIndex((x) => x.id === step) > i;

                                return (
                                    <React.Fragment key={s.id}>
                                        <div
                                            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors ${
                                                isActive
                                                    ? 'bg-feature-import text-white'
                                                    : isPast
                                                      ? 'bg-feature-import/10 text-feature-import'
                                                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                            }`}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            <span className="font-medium">{s.label}</span>
                                        </div>
                                        {i < steps.length - 1 && (
                                            <div
                                                className={`w-8 h-0.5 rounded ${
                                                    isPast
                                                        ? 'bg-feature-import'
                                                        : 'bg-zinc-200 dark:bg-zinc-800'
                                                }`}
                                            />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}
                </div>
            </header>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                {step === 'upload' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                    >
                        {/* Info Cards */}
                        <div className="grid sm:grid-cols-3 gap-4">
                            <Card className="bg-white dark:bg-zinc-900">
                                <CardContent className="pt-5">
                                    <div className="w-10 h-10 rounded-[8px] bg-feature-import/10 flex items-center justify-center mb-3">
                                        <History className="w-5 h-5 text-feature-import" />
                                    </div>
                                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                                        Keep Your History
                                    </h3>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        Bring all your past conversations with you to Yula
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white dark:bg-zinc-900">
                                <CardContent className="pt-5">
                                    <div className="w-10 h-10 rounded-[8px] bg-feature-import/10 flex items-center justify-center mb-3">
                                        <Search className="w-5 h-5 text-feature-import" />
                                    </div>
                                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                                        Searchable Memory
                                    </h3>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        All imported chats become searchable in your memory
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white dark:bg-zinc-900">
                                <CardContent className="pt-5">
                                    <div className="w-10 h-10 rounded-[8px] bg-feature-import/10 flex items-center justify-center mb-3">
                                        <Sparkles className="w-5 h-5 text-feature-import" />
                                    </div>
                                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                                        Smarter AI
                                    </h3>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        Yula learns from your history to provide better responses
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Upload Card */}
                        <Card className="bg-white dark:bg-zinc-900">
                            <CardHeader>
                                <CardTitle>Upload Files</CardTitle>
                                <CardDescription>
                                    Export your data from ChatGPT or Claude and upload it here
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
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
                                        size="lg"
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
                                                Continue to Preview
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Export Instructions */}
                        <Card className="bg-white dark:bg-zinc-900">
                            <CardHeader>
                                <CardTitle>How to Export Your Data</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center">
                                            <span className="text-xs font-bold text-emerald-600">
                                                G
                                            </span>
                                        </div>
                                        <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                                            ChatGPT
                                        </h4>
                                    </div>
                                    <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-600 dark:text-zinc-400 ml-8">
                                        <li>Go to Settings &gt; Data Controls &gt; Export data</li>
                                        <li>Click "Export" and wait for the email</li>
                                        <li>Download the ZIP file and extract it</li>
                                        <li>
                                            Upload the{' '}
                                            <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">
                                                conversations.json
                                            </code>{' '}
                                            file
                                        </li>
                                    </ol>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-orange-500/10 flex items-center justify-center">
                                            <span className="text-xs font-bold text-orange-600">
                                                C
                                            </span>
                                        </div>
                                        <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                                            Claude
                                        </h4>
                                    </div>
                                    <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-600 dark:text-zinc-400 ml-8">
                                        <li>Go to your Claude account settings</li>
                                        <li>Navigate to Privacy &gt; Export Data</li>
                                        <li>Download the exported JSON file</li>
                                        <li>Upload the file directly here</li>
                                    </ol>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center">
                                            <span className="text-xs font-bold text-blue-600">
                                                G
                                            </span>
                                        </div>
                                        <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                                            Google Gemini
                                        </h4>
                                    </div>
                                    <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-600 dark:text-zinc-400 ml-8">
                                        <li>Go to Google Takeout (takeout.google.com)</li>
                                        <li>Select only "Gemini Apps" data</li>
                                        <li>Export and download the archive</li>
                                        <li>Extract and upload the conversations JSON file</li>
                                    </ol>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center">
                                            <span className="text-xs font-bold text-purple-600">
                                                P
                                            </span>
                                        </div>
                                        <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                                            Perplexity
                                        </h4>
                                    </div>
                                    <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-600 dark:text-zinc-400 ml-8">
                                        <li>Go to Perplexity Settings &gt; Account</li>
                                        <li>Click "Export Data" to request your data</li>
                                        <li>Download the JSON export file</li>
                                        <li>Upload the file directly here</li>
                                    </ol>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {step === 'preview' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="bg-white dark:bg-zinc-900">
                            <CardContent className="pt-6">
                                <ImportPreview
                                    conversations={conversations}
                                    onSelectionChange={handleSelectionChange}
                                    onSelectAll={handleSelectAll}
                                    onDeselectAll={handleDeselectAll}
                                    onImport={handleImport}
                                />

                                <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                    <Button variant="ghost" onClick={handleBack}>
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back to Upload
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {step === 'importing' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <Card className="bg-white dark:bg-zinc-900">
                            <CardContent className="py-16">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="relative w-24 h-24 mb-8">
                                        <div className="absolute inset-0 rounded-full border-4 border-zinc-200 dark:border-zinc-800" />
                                        <svg className="absolute inset-0 w-24 h-24 -rotate-90">
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r="44"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                strokeLinecap="round"
                                                className="text-feature-import"
                                                strokeDasharray={`${progress.total > 0 ? (progress.current / progress.total) * 276 : 0} 276`}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Download className="w-10 h-10 text-feature-import" />
                                        </div>
                                    </div>

                                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                        Importing conversations...
                                    </h2>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                                        {progress.current} of {progress.total} complete
                                    </p>
                                    {progress.currentTitle && (
                                        <p className="text-sm text-zinc-400 dark:text-zinc-500 truncate max-w-md">
                                            {progress.currentTitle}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {step === 'complete' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <Card className="bg-white dark:bg-zinc-900">
                            <CardContent className="py-16">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-8">
                                        <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                                    </div>

                                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                        Import Complete!
                                    </h2>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 text-center max-w-md">
                                        Successfully imported {progress.total} conversations.
                                        They're now searchable in your Yula memory and will help
                                        provide more personalized responses.
                                    </p>

                                    <div className="flex items-center gap-4">
                                        <Button variant="outline" asChild>
                                            <Link href="/memory">View Memory</Link>
                                        </Button>
                                        <Button variant="import" asChild>
                                            <Link href="/chat">
                                                Start Chatting
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </div>
        </main>
    );
}
