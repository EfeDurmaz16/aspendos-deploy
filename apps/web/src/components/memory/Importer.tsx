'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, Check, Warning, Spinner, DownloadSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type ImportStatus = 'idle' | 'parsing' | 'importing' | 'success' | 'error';
type ExportFormat = 'chatgpt' | 'claude' | 'aspendos' | 'unknown';

interface ImportResult {
    format: ExportFormat;
    conversationCount: number;
    messageCount: number;
    success: number;
    failed: number;
}

export function MemoryImporter() {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState<ImportStatus>('idle');
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleFile = useCallback(async (file: File) => {
        if (!file.name.endsWith('.json')) {
            setError('Please upload a JSON file');
            setStatus('error');
            return;
        }

        setStatus('parsing');
        setError(null);
        setResult(null);

        try {
            const text = await file.text();
            const jsonData = JSON.parse(text);

            // Send to API for processing
            setStatus('importing');

            const response = await fetch('/api/memory/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: jsonData }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Import failed');
            }

            const importResult = await response.json();
            setResult(importResult);
            setStatus('success');
        } catch (err) {
            console.error('[Importer] Error:', err);
            setError(err instanceof Error ? err.message : 'Failed to import file');
            setStatus('error');
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragActive(false);

            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const handleExport = useCallback(async () => {
        try {
            const response = await fetch('/api/memory/export');
            if (!response.ok) throw new Error('Export failed');

            const data = await response.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `aspendos-memories-${new Date().toISOString().split('T')[0]}.json`;
            a.click();

            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('[Export] Error:', err);
            setError('Failed to export memories');
        }
    }, []);

    const reset = useCallback(() => {
        setStatus('idle');
        setResult(null);
        setError(null);
    }, []);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Import Data
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Memory Import/Export</DialogTitle>
                    <DialogDescription>
                        Import your conversation history from ChatGPT or Claude, or export your Aspendos memories.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Import Section */}
                    <div>
                        <h4 className="text-sm font-medium mb-2">Import Conversations</h4>
                        <div
                            onDrop={handleDrop}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragActive(true);
                            }}
                            onDragLeave={() => setDragActive(false)}
                            className={cn(
                                'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                                dragActive
                                    ? 'border-blue-500 bg-blue-500/10'
                                    : 'border-zinc-700 hover:border-zinc-600',
                                status !== 'idle' && status !== 'error' && 'pointer-events-none opacity-50'
                            )}
                        >
                            {status === 'idle' || status === 'error' ? (
                                <>
                                    <FileText className="h-10 w-10 mx-auto mb-3 text-zinc-500" />
                                    <p className="text-sm text-zinc-400 mb-2">
                                        Drag and drop your export file here
                                    </p>
                                    <p className="text-xs text-zinc-500 mb-4">
                                        Supports ChatGPT, Claude, and Aspendos exports
                                    </p>
                                    <label className="cursor-pointer">
                                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-800 text-sm hover:bg-zinc-700 transition-colors">
                                            <Upload className="h-4 w-4" />
                                            Choose File
                                        </span>
                                        <input
                                            type="file"
                                            accept=".json"
                                            onChange={handleFileInput}
                                            className="hidden"
                                        />
                                    </label>
                                </>
                            ) : status === 'parsing' ? (
                                <div className="flex items-center justify-center gap-3">
                                    <Spinner className="h-5 w-5 animate-spin text-blue-500" />
                                    <span className="text-sm">Parsing file...</span>
                                </div>
                            ) : status === 'importing' ? (
                                <div className="flex items-center justify-center gap-3">
                                    <Spinner className="h-5 w-5 animate-spin text-blue-500" />
                                    <span className="text-sm">Importing memories...</span>
                                </div>
                            ) : status === 'success' && result ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center gap-2 text-emerald-500">
                                        <Check className="h-5 w-5" weight="bold" />
                                        <span className="font-medium">Import Complete!</span>
                                    </div>
                                    <div className="text-sm text-zinc-400 space-y-1">
                                        <p>Format: {result.format.toUpperCase()}</p>
                                        <p>Conversations: {result.conversationCount}</p>
                                        <p>Messages: {result.messageCount}</p>
                                        <p className="text-emerald-400">
                                            Successfully imported: {result.success}
                                        </p>
                                        {result.failed > 0 && (
                                            <p className="text-amber-400">Failed: {result.failed}</p>
                                        )}
                                    </div>
                                    <Button variant="outline" size="sm" onClick={reset}>
                                        Import More
                                    </Button>
                                </div>
                            ) : null}
                        </div>

                        {error && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
                                <Warning className="h-4 w-4" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-700" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-zinc-900 px-2 text-zinc-500">or</span>
                        </div>
                    </div>

                    {/* Export Section */}
                    <div>
                        <h4 className="text-sm font-medium mb-2">Export Memories</h4>
                        <p className="text-xs text-zinc-500 mb-3">
                            Download all your Aspendos memories as a JSON file.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            className="w-full gap-2"
                        >
                            <DownloadSimple className="h-4 w-4" />
                            Export All Memories
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default MemoryImporter;
