
import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check, Plus } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { motion, AnimatePresence } from "framer-motion";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

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
    const [searchQuery, setSearchQuery] = useState("");
    const [autoMode, setAutoMode] = useState(false);
    const [maxMode, setMaxMode] = useState(false);
    const [multipleModels, setMultipleModels] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const topModels: Model[] = [
        {
            id: "openai/gpt-5.2",
            name: "OpenAI GPT-5.2",
            provider: "openai",
            description: "General-purpose, strong reasoning & coding.",
            isTopModel: true,
        },
        {
            id: "anthropic/claude-opus-4.5",
            name: "Claude 4.5 Opus",
            provider: "anthropic",
            description: "Deep reasoning, careful, long-form writing.",
            isTopModel: true,
        },
        {
            id: "anthropic/claude-sonnet-4.5",
            name: "Claude 4.5 Sonnet",
            provider: "anthropic",
            description: "Balanced speed and quality for most tasks.",
            isTopModel: true,
        },
        {
            id: "openai/gpt-5-nano",
            name: "OpenAI GPT-5 Nano",
            provider: "openai",
            description: "Cost-efficient for simple everyday queries.",
            isTopModel: true,
        },
        {
            id: "google/gemini-3-pro-preview",
            name: "Gemini 3 Pro",
            provider: "google",
            description: "Multimodal, strong on web and reasoning.",
            isTopModel: true,
        },
        {
            id: "x-ai/grok-4.1-fast",
            name: "Grok 4.1 Fast",
            provider: "xai",
            description: "Fast, opinionated, good for web content.",
            isTopModel: true,
        },
        {
            id: "moonshotai/kimi-k2-thinking",
            name: "Kimi K2",
            provider: "moonshot",
            description: "Chinese/English reasoning, long-context chats.",
            isTopModel: true,
        },
        {
            id: "meta-llama/llama-4-maverick",
            name: "Llama 4",
            provider: "meta",
            description: "Open-weight, versatile general-purpose model.",
            isTopModel: true,
        },
        {
            id: "qwen/qwen3-max",
            name: "Qwen 3 Max",
            provider: "qwen",
            description: "Strong multilingual and coding performance.",
            isTopModel: true,
        },
        {
            id: "deepseek/deepseek-v3.2",
            name: "DeepSeek V3.2",
            provider: "deepseek",
            description: "Reasoning-focused, great for math and code.",
            isTopModel: true,
        },
        {
            id: "mistral/mistral-7b-instruct",
            name: "Mistral 7B Instruct",
            provider: "mistral",
            description: "High-quality, versatile language model.",
            isTopModel: true,
        },
        {
            id: "perplexity/perplexity-70b-instruct",
            name: "Perplexity 70B Instruct",
            provider: "perplexity",
            description: "Advanced, high-capacity language model.",
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
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const getProviderIcon = (provider: string) => {
        const iconName = provider === 'anthropic' ? 'claude'
            : provider === 'meta' ? 'meta'
                : provider === 'mistral' ? 'mistral'
                    : provider === 'google' ? 'gemini'
                        : provider === 'xai' ? 'grok'
                            : provider === 'perplexity' ? 'perplexity'
                                : provider === 'moonshot' ? 'moonshot'
                                    : provider === 'qwen' ? 'openrouter' // Fallback for qwen if needed
                                        : provider === 'deepseek' ? 'openrouter' // Fallback for deepseek if needed
                                            : 'openai';

        return `/icons/models/${iconName}.svg`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 transition-all duration-300"
            >
                {selectedModelData && (
                    <ImageWithFallback
                        src={getProviderIcon(selectedModelData.provider)}
                        alt={selectedModelData.provider}
                        className="w-5 h-5 object-contain grayscale opacity-80"
                    />
                )}
                <span className="text-sm font-medium">
                    {selectedModelData
                        ? selectedModelData.name
                        : "Select Model"}
                </span>
                <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""
                        }`}
                />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full mt-2 left-0 w-[420px] max-h-[600px] overflow-hidden z-50"
                    >
                        <GlassCard padding="none" className="bg-zinc-900/95 border-white/20">
                            <div className="p-4 space-y-4">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                    <input
                                        type="text"
                                        placeholder="Search models"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-[16px] text-white placeholder:text-white/40 focus:bg-white/10 focus:border-white/20 outline-none transition-all duration-300"
                                    />
                                </div>

                                {/* Toggles */}
                                <div className="space-y-2">
                                    <ToggleRow
                                        label="Auto"
                                        checked={autoMode}
                                        onChange={setAutoMode}
                                    />
                                    <ToggleRow
                                        label="MAX Mode"
                                        checked={maxMode}
                                        onChange={setMaxMode}
                                    />
                                    <ToggleRow
                                        label="Use Multiple Models"
                                        checked={multipleModels}
                                        onChange={setMultipleModels}
                                    />
                                </div>

                                {/* Divider */}
                                <div className="border-t border-white/10" />

                                {/* Top Models List */}
                                <div className="max-h-[350px] overflow-y-auto pr-2 space-y-1">
                                    {filteredModels.map((model) => (
                                        <button
                                            key={model.id}
                                            onClick={() => {
                                                onSelectModel(model.id);
                                                setIsOpen(false);
                                            }}
                                            className="w-full flex items-start gap-3 px-3 py-3 rounded-[12px] hover:bg-white/10 transition-all duration-200 text-left group"
                                        >
                                            <ImageWithFallback
                                                src={getProviderIcon(model.provider)}
                                                alt={model.provider}
                                                className="w-6 h-6 object-contain grayscale opacity-60 mt-0.5 flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-white mb-0.5">
                                                    {model.name}
                                                </div>
                                                <div className="text-xs text-white/60 leading-relaxed">
                                                    {model.description}
                                                </div>
                                            </div>
                                            {selectedModel === model.id && (
                                                <Check className="w-4 h-4 text-white/80 flex-shrink-0 mt-1" />
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
                                    className="w-full flex items-center justify-between px-3 py-3 rounded-[12px] bg-white/5 hover:bg-white/10 transition-all duration-200 border border-white/10"
                                >
                                    <span className="text-sm font-medium text-white">
                                        Add Models
                                    </span>
                                    <Plus className="w-4 h-4 text-white/60" />
                                </button>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
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
            <span className="text-sm text-white/80">{label}</span>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-10 h-5 rounded-full transition-all duration-300 ${checked ? "bg-white/30" : "bg-white/10"
                    }`}
            >
                <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 ${checked ? "left-5" : "left-0.5"
                        }`}
                />
            </button>
        </div>
    );
}
