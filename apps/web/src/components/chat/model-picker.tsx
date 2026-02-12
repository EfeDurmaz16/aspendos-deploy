import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';

export interface Model {
    id: string;
    name: string;
    provider: string;
    description: string;
    isTopModel?: boolean;
}

interface ModelPickerProps {
    selectedModel: string;
    onSelectModel: (modelId: string) => void;
    onOpenAddModels: () => void;
    enabledModels: string[];
}

export function ModelPicker({
    selectedModel,
    onSelectModel,
    onOpenAddModels,
    enabledModels,
}: ModelPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [autoMode, setAutoMode] = useState(false);
    const [maxMode, setMaxMode] = useState(false);
    const [multipleModels, setMultipleModels] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const topModels: Model[] = [
        {
            id: 'openai/gpt-5.2',
            name: 'OpenAI GPT-5.2',
            provider: 'openai',
            description: 'General-purpose, strong reasoning & coding.',
            isTopModel: true,
        },
        {
            id: 'anthropic/claude-opus-4.5',
            name: 'Claude 4.5 Opus',
            provider: 'anthropic',
            description: 'Deep reasoning, careful, long-form writing.',
            isTopModel: true,
        },
        {
            id: 'anthropic/claude-sonnet-4.5',
            name: 'Claude 4.5 Sonnet',
            provider: 'anthropic',
            description: 'Balanced speed and quality for most tasks.',
            isTopModel: true,
        },
        {
            id: 'openai/gpt-5-nano',
            name: 'OpenAI GPT-5 Nano',
            provider: 'openai',
            description: 'Cost-efficient for simple everyday queries.',
            isTopModel: true,
        },
        {
            id: 'google/gemini-3-pro-preview',
            name: 'Gemini 3 Pro',
            provider: 'google',
            description: 'Multimodal, strong on web and reasoning.',
            isTopModel: true,
        },
        {
            id: 'x-ai/grok-4.1-fast',
            name: 'Grok 4.1 Fast',
            provider: 'xai',
            description: 'Fast, opinionated, good for web content.',
            isTopModel: true,
        },
        {
            id: 'moonshotai/kimi-k2-thinking',
            name: 'Kimi K2',
            provider: 'moonshot',
            description: 'Chinese/English reasoning, long-context chats.',
            isTopModel: true,
        },
        {
            id: 'meta-llama/llama-4-maverick',
            name: 'Llama 4',
            provider: 'meta',
            description: 'Open-weight, versatile general-purpose model.',
            isTopModel: true,
        },
        {
            id: 'qwen/qwen3-max',
            name: 'Qwen 3 Max',
            provider: 'qwen',
            description: 'Strong multilingual and coding performance.',
            isTopModel: true,
        },
        {
            id: 'deepseek/deepseek-v3.2',
            name: 'DeepSeek V3.2',
            provider: 'deepseek',
            description: 'Reasoning-focused, great for math and code.',
            isTopModel: true,
        },
        {
            id: 'mistral/mistral-7b-instruct',
            name: 'Mistral 7B Instruct',
            provider: 'mistral',
            description: 'High-quality, versatile language model.',
            isTopModel: true,
        },
        {
            id: 'perplexity/perplexity-70b-instruct',
            name: 'Perplexity 70B Instruct',
            provider: 'perplexity',
            description: 'Advanced, high-capacity language model.',
            isTopModel: true,
        },
    ];

    const enabledSet = new Set(enabledModels);
    const availableTopModels =
        enabledModels.length > 0 ? topModels.filter((m) => enabledSet.has(m.id)) : topModels;

    const selectedModelData =
        availableTopModels.find((m) => m.id === selectedModel) ||
        topModels.find((m) => m.id === selectedModel);

    const filteredModels = availableTopModels.filter(
        (model) =>
            model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            model.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const getProviderIcon = (provider: string) => {
        const iconName =
            provider === 'anthropic'
                ? 'claude'
                : provider === 'meta'
                  ? 'meta'
                  : provider === 'mistral'
                    ? 'mistral'
                    : provider === 'google'
                      ? 'gemini'
                      : provider === 'xai'
                        ? 'grok'
                        : provider === 'perplexity'
                          ? 'perplexity'
                          : provider === 'moonshot'
                            ? 'moonshot'
                            : provider === 'qwen'
                              ? 'openrouter'
                              : provider === 'deepseek'
                                ? 'openrouter'
                                : 'openai';

        return `/icons/models/${iconName}.svg`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-2 bg-muted hover:bg-muted/80 border border-border rounded-lg text-foreground transition-colors"
            >
                {selectedModelData && (
                    <ImageWithFallback
                        src={getProviderIcon(selectedModelData.provider)}
                        alt={selectedModelData.provider}
                        className="w-5 h-5 object-contain grayscale opacity-80"
                    />
                )}
                <span className="text-sm font-medium">
                    {selectedModelData ? selectedModelData.name : 'Select Model'}
                </span>
                <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full mt-2 left-0 w-[420px] max-h-[600px] overflow-hidden z-50 rounded-xl border border-border bg-popover shadow-lg">
                    <div className="p-4 space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search models"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-ring outline-none transition-colors"
                            />
                        </div>

                        {/* Toggles */}
                        <div className="space-y-2">
                            <ToggleRow label="Auto" checked={autoMode} onChange={setAutoMode} />
                            <ToggleRow label="MAX Mode" checked={maxMode} onChange={setMaxMode} />
                            <ToggleRow
                                label="Use Multiple Models"
                                checked={multipleModels}
                                onChange={setMultipleModels}
                            />
                        </div>

                        {/* Divider */}
                        <div className="border-t border-border" />

                        {/* Top Models List */}
                        <div className="max-h-[350px] overflow-y-auto pr-2 space-y-1">
                            {filteredModels.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => {
                                        onSelectModel(model.id);
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-left group"
                                >
                                    <ImageWithFallback
                                        src={getProviderIcon(model.provider)}
                                        alt={model.provider}
                                        className="w-6 h-6 object-contain grayscale opacity-60 mt-0.5 flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-foreground mb-0.5">
                                            {model.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground leading-relaxed">
                                            {model.description}
                                        </div>
                                    </div>
                                    {selectedModel === model.id && (
                                        <Check className="w-4 h-4 text-foreground flex-shrink-0 mt-1" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Add Models Button */}
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onOpenAddModels();
                            }}
                            className="w-full flex items-center justify-between px-3 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors border border-border"
                        >
                            <span className="text-sm font-medium text-foreground">Add Models</span>
                            <Plus className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ToggleRow({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">{label}</span>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/20'}`}
            >
                <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${checked ? 'left-5' : 'left-0.5'}`}
                />
            </button>
        </div>
    );
}
