'use client';

import { AlertCircle, Check, Download, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useLocalAI } from '@/hooks/use-local-ai';
import type { ModelId } from '@/lib/offline/local-ai';

/**
 * Local AI Model Selector
 *
 * Allows users to download and manage local AI models for offline use.
 */
export function LocalAIModelSelector() {
    const {
        isSupported,
        isLoading,
        isReady,
        loadProgress,
        loadingText,
        currentModel,
        error,
        availableModels,
        loadModel,
        unloadModel,
    } = useLocalAI();

    if (!isSupported) {
        return (
            <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-foreground">WebGPU Not Available</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Your browser doesn't support WebGPU, which is required for local AI. Try
                            using Chrome 113+ or Edge 113+.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-medium text-foreground">Local AI (Offline Mode)</h3>
            </div>

            {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {isLoading && (
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm font-medium">Downloading model...</span>
                    </div>
                    <div className="space-y-2">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${loadProgress}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">{loadingText}</p>
                    </div>
                </div>
            )}

            {isReady && currentModel && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                                {availableModels.find((m) => m.id === currentModel)?.name}
                            </span>
                        </div>
                        <button
                            onClick={unloadModel}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                            <Trash2 className="h-3 w-3" />
                            Unload
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Local AI is ready. You can chat offline using this model.
                    </p>
                </div>
            )}

            {!isLoading && !isReady && (
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        Download a model to use AI features when offline.
                    </p>
                    <div className="grid gap-2">
                        {availableModels.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => loadModel(model.id as ModelId)}
                                disabled={isLoading}
                                className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-accent/50 transition-colors text-left"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{model.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {model.size}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {model.description}
                                    </p>
                                </div>
                                <Download className="h-4 w-4 text-muted-foreground" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
