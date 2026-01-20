
import { useState } from "react";
import { X, Search, RotateCcw, Check } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { motion, AnimatePresence } from "framer-motion";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

export interface Model {
    id: string;
    name: string;
    provider: string;
    description: string;
    category?: string;
}

interface AddModelsModalProps {
    isOpen: boolean;
    onClose: () => void;
    enabledModels: string[];
    onToggleModel: (modelId: string) => void;
}

export function AddModelsModal({
    isOpen,
    onClose,
    enabledModels,
    onToggleModel,
}: AddModelsModalProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const allModels: Model[] = [
        // OpenAI
        { id: "openai/gpt-5.2-pro", name: "GPT-5.2 Pro", provider: "openai", description: "Most advanced GPT-5.2, best quality." },
        { id: "openai/gpt-5.2", name: "GPT-5.2", provider: "openai", description: "General-purpose, strong reasoning & coding." },
        { id: "openai/gpt-5.2-codex", name: "GPT-5.2 Codex", provider: "openai", description: "Optimized for code generation and edits." },
        { id: "openai/gpt-5.1", name: "GPT-5.1", provider: "openai", description: "Reliable chat model for everyday work." },
        { id: "openai/gpt-5.1-chat", name: "GPT-5.1 Chat", provider: "openai", description: "Instant responses, good default chat." },
        { id: "openai/gpt-5.1-codex", name: "GPT-5.1 Codex", provider: "openai", description: "Faster code-focused GPT-5.1 variant." },
        { id: "openai/gpt-5-nano", name: "GPT-5 Nano", provider: "openai", description: "Ultra cost-efficient for simple tasks." },
        { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B", provider: "openai", description: "Open-source style large language model." },
        { id: "openai/o3-pro", name: "O3 Pro", provider: "openai", description: "High-end reasoning, complex problem solving." },

        // Anthropic (Claude)
        { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5", provider: "anthropic", description: "Premier Claude for deep reasoning & writing." },
        { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", provider: "anthropic", description: "Fast, lightweight Claude for quick tasks." },
        { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "anthropic", description: "Balanced speed and quality, daily driver." },
        { id: "anthropic/claude-opus-4.1", name: "Claude Opus 4.1", provider: "anthropic", description: "Earlier Opus, still strong for analysis." },
        { id: "anthropic/claude-opus-4", name: "Claude Opus 4", provider: "anthropic", description: "Legacy Opus for compatibility use cases." },
        { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "anthropic", description: "Previous Sonnet, stable and reliable." },

        // Google (Gemini)
        { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro", provider: "google", description: "Newest Gemini Pro, advanced multimodal." },
        { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash", provider: "google", description: "Very fast Gemini for low-latency tasks." },
        { id: "google/gemini-2.5-flash-lite-preview-09-2025", name: "Gemini 2.5 Flash Lite", provider: "google", description: "Extremely cost-efficient Gemini Flash." },
        { id: "google/gemini-2.5-flash-preview-09-2025", name: "Gemini 2.5 Flash", provider: "google", description: "Fast Gemini with good quality tradeoff." },
        { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google", description: "Strong reasoning and multimodal for production." },

        // Meta (Llama)
        { id: "meta-llama/llama-guard-4-12b", name: "Llama Guard 4 12B", provider: "meta", description: "Safety and content-filtering guardrail model." },
        { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", provider: "meta", description: "Flagship Llama 4 for general tasks." },
        { id: "meta-llama/llama-4-scout", name: "Llama 4 Scout", provider: "meta", description: "Lightweight Llama, exploration and routing." },

        // xAI (Grok)
        { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast", provider: "xai", description: "Fast Grok for webby, up-to-date answers." },
        { id: "x-ai/grok-4-fast", name: "Grok 4 Fast", provider: "xai", description: "Speed-optimized Grok for general chat." },
        { id: "x-ai/grok-code-fast-1", name: "Grok Code Fast 1", provider: "xai", description: "Grok variant optimized for coding tasks." },
        { id: "x-ai/grok-4", name: "Grok 4", provider: "xai", description: "Full Grok 4 for richer reasoning." },

        // Mistral
        { id: "mistral/mistral-large-2512", name: "Mistral Large 2512", provider: "mistral", description: "Large Mistral for high-quality outputs." },
        { id: "mistral/devstral-2512:free", name: "Devstral 2512", provider: "mistral", description: "Developer-tuned, great for coding & tools." },
        { id: "mistral/ministral-14b-2512", name: "Ministral 14B", provider: "mistral", description: "Mid-size, good balance of speed and cost." },
        { id: "mistral/ministral-8b-2512", name: "Ministral 8B", provider: "mistral", description: "Smaller, cheap model for lightweight tasks." },

        // Qwen
        { id: "qwen/qwen3-vl-32b-instruct", name: "Qwen3 VL 32B", provider: "qwen", description: "Vision-language, strong multimodal reasoning." },
        { id: "qwen/qwen3-vl-8b-thinking", name: "Qwen3 VL 8B Thinking", provider: "qwen", description: "Smaller VL model focused on reasoning." },
        { id: "qwen/qwen3-max", name: "Qwen3 Max", provider: "qwen", description: "Flagship Qwen 3, strong at everything." },
        { id: "qwen/qwen3-coder-plus", name: "Qwen3 Coder Plus", provider: "qwen", description: "Code-oriented Qwen, debugging and generation." },

        // DeepSeek
        { id: "deepseek/deepseek-v3.2-speciale", name: "DeepSeek V3.2 Speciale", provider: "deepseek", description: "Experimental DeepSeek, advanced reasoning tests." },
        { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2", provider: "deepseek", description: "Core DeepSeek model for reasoning & math." },
        { id: "deepseek/deepseek-r1-distill-qwen-7b", name: "DeepSeek R1 Distill", provider: "deepseek", description: "Smaller distilled reasoning model (Qwen-based)." },

        // MoonshotAI / MiniMax
        { id: "moonshotai/kimi-k2-thinking", name: "Kimi K2 Thinking", provider: "moonshot", description: "Kimi K2 for long, thoughtful sessions." },
        { id: "moonshotai/kimi-k2-0905", name: "Kimi K2 0905", provider: "moonshot", description: "Kimi K2 stable release, general chat." },
        { id: "minimax/minimax-m1", name: "MiniMax M1", provider: "minimax", description: "MiniMax model for fast everyday use." },
        { id: "minimax/minimax-m2", name: "MiniMax M2", provider: "minimax", description: "Stronger MiniMax for heavier workloads." },

        // Perplexity (Search & Research)
        { id: "perplexity/sonar-pro-search", name: "Sonar Pro Search", provider: "perplexity", description: "Agentic Pro Search for multi-step web research.", category: "search" },
        { id: "perplexity/sonar-pro", name: "Sonar Pro", provider: "perplexity", description: "Advanced search model with large context.", category: "search" },
        { id: "perplexity/sonar-reasoning-pro", name: "Sonar Reasoning Pro", provider: "perplexity", description: "Deep reasoning search model (CoT, long context).", category: "search" },
    ];

    const filteredModels = allModels.filter(
        (model) =>
            model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            model.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            model.provider.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const regularModels = filteredModels.filter((m) => m.category !== "search");
    const searchModels = filteredModels.filter((m) => m.category === "search");

    // TODO: Replace with real assets or proper provider icons
    const getProviderIcon = (provider: string) => ``;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GlassCard
                            padding="none"
                            className="w-full max-w-3xl max-h-[85vh] bg-zinc-900/95 border-white/20 flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <h2 className="text-2xl font-semibold text-white">Models</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-5 h-5 text-white/60" />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="p-6 border-b border-white/10">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                    <input
                                        type="text"
                                        placeholder="Add or search model"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-12 py-3 text-base bg-white/5 border border-white/10 rounded-[20px] text-white placeholder:text-white/40 focus:bg-white/10 focus:border-white/20 outline-none transition-all duration-300"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
                                        >
                                            <RotateCcw className="w-4 h-4 text-white/60" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Models List */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-2">
                                {/* Regular Models */}
                                {regularModels.map((model) => (
                                    <ModelRow
                                        key={model.id}
                                        model={model}
                                        isEnabled={enabledModels.includes(model.id)}
                                        onToggle={() => onToggleModel(model.id)}
                                        getProviderIcon={getProviderIcon}
                                    />
                                ))}

                                {/* Search Models Section */}
                                {searchModels.length > 0 && (
                                    <>
                                        <div className="pt-6 pb-3">
                                            <h3 className="text-sm font-semibold text-white/80 mb-1">
                                                Search & research models (tools only)
                                            </h3>
                                            <p className="text-xs text-white/50">
                                                These models are used for web search and deep research tasks, not for general chat.
                                            </p>
                                        </div>
                                        {searchModels.map((model) => (
                                            <ModelRow
                                                key={model.id}
                                                model={model}
                                                isEnabled={enabledModels.includes(model.id)}
                                                onToggle={() => onToggleModel(model.id)}
                                                getProviderIcon={getProviderIcon}
                                                isSearchModel
                                            />
                                        ))}
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-white/10">
                                <GlassButton
                                    variant="primary"
                                    size="lg"
                                    onClick={onClose}
                                    className="w-full"
                                >
                                    Done
                                </GlassButton>
                            </div>
                        </GlassCard>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

interface ModelRowProps {
    model: Model;
    isEnabled: boolean;
    onToggle: () => void;
    getProviderIcon: (provider: string) => string;
    isSearchModel?: boolean;
}

function ModelRow({
    model,
    isEnabled,
    onToggle,
    getProviderIcon,
    isSearchModel = false,
}: ModelRowProps) {
    return (
        <div className="flex items-center justify-between px-4 py-3 rounded-[12px] hover:bg-white/5 transition-colors group">
            <div className="flex items-start gap-3 flex-1 min-w-0">
                <ImageWithFallback
                    src={getProviderIcon(model.provider)}
                    alt={model.provider}
                    className="w-6 h-6 object-contain grayscale opacity-60 mt-0.5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">
                            {model.name}
                        </span>
                        {isSearchModel && (
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300">
                                Search
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">
                        {model.description}
                    </p>
                </div>
            </div>
            <button
                onClick={onToggle}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ml-4 ${isEnabled ? "bg-green-500/40" : "bg-white/10"
                    }`}
            >
                <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ${isEnabled ? "left-5" : "left-0.5"
                        }`}
                />
            </button>
        </div>
    );
}
