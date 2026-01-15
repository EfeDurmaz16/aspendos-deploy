"""
Aspendos Model Registry
Complete model catalog with routing metadata.
"""
from typing import Literal, Optional
from dataclasses import dataclass
from enum import Enum


class Provider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    META = "meta-llama"
    XAI = "x-ai"
    MISTRAL = "mistralai"
    QWEN = "qwen"
    DEEPSEEK = "deepseek"
    MOONSHOT = "moonshotai"
    MINIMAX = "minimax"
    PERPLEXITY = "perplexity"


class ModelCategory(str, Enum):
    FLAGSHIP = "flagship"       # Most advanced
    FAST = "fast"              # Optimized for speed
    COST_EFFICIENT = "cost"    # Best cost/performance
    CODE = "code"              # Code specialized
    REASONING = "reasoning"    # Deep reasoning/thinking
    SEARCH = "search"          # Web search/research
    OPEN_SOURCE = "open_source"
    VISION = "vision"          # Multimodal vision


@dataclass
class ModelConfig:
    """Configuration for a single model."""
    id: str                          # Full model ID (provider/model)
    display_name: str                # Human-readable name
    provider: Provider
    category: ModelCategory
    context_window: int              # Max context tokens
    supports_streaming: bool = True
    supports_tools: bool = True
    supports_vision: bool = False
    supports_thinking: bool = False  # Chain of thought
    is_pinned: bool = False          # Show in main selector
    cost_per_1k_input: float = 0.0   # USD per 1k input tokens
    cost_per_1k_output: float = 0.0  # USD per 1k output tokens


# ============================================
# COMPLETE MODEL REGISTRY
# ============================================

MODEL_REGISTRY: dict[str, ModelConfig] = {
    # ============================================
    # OPENAI MODELS
    # ============================================
    "openai/gpt-5.2-pro": ModelConfig(
        id="openai/gpt-5.2-pro",
        display_name="GPT-5.2 Pro",
        provider=Provider.OPENAI,
        category=ModelCategory.FLAGSHIP,
        context_window=256000,
        supports_thinking=True,
        is_pinned=True,
        cost_per_1k_input=0.15,
        cost_per_1k_output=0.60,
    ),
    "openai/gpt-5.2": ModelConfig(
        id="openai/gpt-5.2",
        display_name="GPT-5.2",
        provider=Provider.OPENAI,
        category=ModelCategory.FLAGSHIP,
        context_window=256000,
        is_pinned=True,
        cost_per_1k_input=0.10,
        cost_per_1k_output=0.40,
    ),
    "openai/gpt-5.2-chat": ModelConfig(
        id="openai/gpt-5.2-chat",
        display_name="GPT-5.2 Chat",
        provider=Provider.OPENAI,
        category=ModelCategory.FAST,
        context_window=128000,
        is_pinned=True,
        cost_per_1k_input=0.005,
        cost_per_1k_output=0.015,
    ),
    "openai/gpt-5.2-codex": ModelConfig(
        id="openai/gpt-5.2-codex",
        display_name="GPT-5.2 Codex",
        provider=Provider.OPENAI,
        category=ModelCategory.CODE,
        context_window=128000,
        cost_per_1k_input=0.08,
        cost_per_1k_output=0.32,
    ),
    "openai/gpt-5.1": ModelConfig(
        id="openai/gpt-5.1",
        display_name="GPT-5.1",
        provider=Provider.OPENAI,
        category=ModelCategory.FLAGSHIP,
        context_window=128000,
        cost_per_1k_input=0.08,
        cost_per_1k_output=0.32,
    ),
    "openai/gpt-5.1-chat": ModelConfig(
        id="openai/gpt-5.1-chat",
        display_name="GPT-5.1 Chat",
        provider=Provider.OPENAI,
        category=ModelCategory.FAST,
        context_window=128000,
        cost_per_1k_input=0.003,
        cost_per_1k_output=0.012,
    ),
    "openai/gpt-5.1-codex": ModelConfig(
        id="openai/gpt-5.1-codex",
        display_name="GPT-5.1 Codex",
        provider=Provider.OPENAI,
        category=ModelCategory.CODE,
        context_window=128000,
        cost_per_1k_input=0.06,
        cost_per_1k_output=0.24,
    ),
    "openai/gpt-5-nano": ModelConfig(
        id="openai/gpt-5-nano",
        display_name="GPT-5 Nano",
        provider=Provider.OPENAI,
        category=ModelCategory.COST_EFFICIENT,
        context_window=64000,
        cost_per_1k_input=0.0003,
        cost_per_1k_output=0.0012,
    ),
    "openai/gpt-oss-120b": ModelConfig(
        id="openai/gpt-oss-120b",
        display_name="GPT OSS 120B",
        provider=Provider.OPENAI,
        category=ModelCategory.OPEN_SOURCE,
        context_window=64000,
        cost_per_1k_input=0.001,
        cost_per_1k_output=0.004,
    ),
    "openai/o3-pro": ModelConfig(
        id="openai/o3-pro",
        display_name="o3 Pro",
        provider=Provider.OPENAI,
        category=ModelCategory.REASONING,
        context_window=200000,
        supports_thinking=True,
        cost_per_1k_input=0.20,
        cost_per_1k_output=0.80,
    ),
    
    # ============================================
    # ANTHROPIC MODELS
    # ============================================
    "anthropic/claude-opus-4.5": ModelConfig(
        id="anthropic/claude-opus-4.5",
        display_name="Claude Opus 4.5",
        provider=Provider.ANTHROPIC,
        category=ModelCategory.FLAGSHIP,
        context_window=200000,
        supports_thinking=True,
        is_pinned=True,
        cost_per_1k_input=0.15,
        cost_per_1k_output=0.75,
    ),
    "anthropic/claude-sonnet-4.5": ModelConfig(
        id="anthropic/claude-sonnet-4.5",
        display_name="Claude Sonnet 4.5",
        provider=Provider.ANTHROPIC,
        category=ModelCategory.FLAGSHIP,
        context_window=200000,
        is_pinned=True,
        cost_per_1k_input=0.003,
        cost_per_1k_output=0.015,
    ),
    "anthropic/claude-haiku-4.5": ModelConfig(
        id="anthropic/claude-haiku-4.5",
        display_name="Claude Haiku 4.5",
        provider=Provider.ANTHROPIC,
        category=ModelCategory.FAST,
        context_window=200000,
        cost_per_1k_input=0.0008,
        cost_per_1k_output=0.004,
    ),
    "anthropic/claude-opus-4.1": ModelConfig(
        id="anthropic/claude-opus-4.1",
        display_name="Claude Opus 4.1",
        provider=Provider.ANTHROPIC,
        category=ModelCategory.FLAGSHIP,
        context_window=200000,
        cost_per_1k_input=0.12,
        cost_per_1k_output=0.60,
    ),
    "anthropic/claude-opus-4": ModelConfig(
        id="anthropic/claude-opus-4",
        display_name="Claude Opus 4",
        provider=Provider.ANTHROPIC,
        category=ModelCategory.FLAGSHIP,
        context_window=200000,
        cost_per_1k_input=0.10,
        cost_per_1k_output=0.50,
    ),
    "anthropic/claude-sonnet-4": ModelConfig(
        id="anthropic/claude-sonnet-4",
        display_name="Claude Sonnet 4",
        provider=Provider.ANTHROPIC,
        category=ModelCategory.FLAGSHIP,
        context_window=200000,
        cost_per_1k_input=0.003,
        cost_per_1k_output=0.015,
    ),
    
    # ============================================
    # GOOGLE MODELS
    # ============================================
    "google/gemini-3-pro-preview": ModelConfig(
        id="google/gemini-3-pro-preview",
        display_name="Gemini 3 Pro",
        provider=Provider.GOOGLE,
        category=ModelCategory.FLAGSHIP,
        context_window=2000000,
        supports_vision=True,
        is_pinned=True,
        cost_per_1k_input=0.00125,
        cost_per_1k_output=0.005,
    ),
    "google/gemini-3-flash-preview": ModelConfig(
        id="google/gemini-3-flash-preview",
        display_name="Gemini 3 Flash",
        provider=Provider.GOOGLE,
        category=ModelCategory.FAST,
        context_window=1000000,
        supports_vision=True,
        is_pinned=True,
        cost_per_1k_input=0.000075,
        cost_per_1k_output=0.0003,
    ),
    "google/gemini-2.5-flash-lite-preview-09-2025": ModelConfig(
        id="google/gemini-2.5-flash-lite-preview-09-2025",
        display_name="Gemini 2.5 Flash Lite",
        provider=Provider.GOOGLE,
        category=ModelCategory.COST_EFFICIENT,
        context_window=1000000,
        cost_per_1k_input=0.000025,
        cost_per_1k_output=0.0001,
    ),
    "google/gemini-2.5-flash-preview-09-2025": ModelConfig(
        id="google/gemini-2.5-flash-preview-09-2025",
        display_name="Gemini 2.5 Flash",
        provider=Provider.GOOGLE,
        category=ModelCategory.FAST,
        context_window=1000000,
        cost_per_1k_input=0.00005,
        cost_per_1k_output=0.0002,
    ),
    "google/gemini-2.5-pro": ModelConfig(
        id="google/gemini-2.5-pro",
        display_name="Gemini 2.5 Pro",
        provider=Provider.GOOGLE,
        category=ModelCategory.FLAGSHIP,
        context_window=2000000,
        supports_vision=True,
        cost_per_1k_input=0.00125,
        cost_per_1k_output=0.005,
    ),
    
    # ============================================
    # META LLAMA MODELS
    # ============================================
    "meta-llama/llama-guard-4-12b": ModelConfig(
        id="meta-llama/llama-guard-4-12b",
        display_name="Llama Guard 4",
        provider=Provider.META,
        category=ModelCategory.OPEN_SOURCE,
        context_window=128000,
        cost_per_1k_input=0.0002,
        cost_per_1k_output=0.0002,
    ),
    "meta-llama/llama-4-maverick": ModelConfig(
        id="meta-llama/llama-4-maverick",
        display_name="Llama 4 Maverick",
        provider=Provider.META,
        category=ModelCategory.OPEN_SOURCE,
        context_window=256000,
        cost_per_1k_input=0.0005,
        cost_per_1k_output=0.0005,
    ),
    "meta-llama/llama-4-scout": ModelConfig(
        id="meta-llama/llama-4-scout",
        display_name="Llama 4 Scout",
        provider=Provider.META,
        category=ModelCategory.OPEN_SOURCE,
        context_window=256000,
        cost_per_1k_input=0.0002,
        cost_per_1k_output=0.0002,
    ),
    
    # ============================================
    # X-AI GROK MODELS
    # ============================================
    "x-ai/grok-4.1-fast": ModelConfig(
        id="x-ai/grok-4.1-fast",
        display_name="Grok 4.1 Fast",
        provider=Provider.XAI,
        category=ModelCategory.FAST,
        context_window=131072,
        is_pinned=True,
        cost_per_1k_input=0.005,
        cost_per_1k_output=0.015,
    ),
    "x-ai/grok-4-fast": ModelConfig(
        id="x-ai/grok-4-fast",
        display_name="Grok 4 Fast",
        provider=Provider.XAI,
        category=ModelCategory.FAST,
        context_window=131072,
        cost_per_1k_input=0.005,
        cost_per_1k_output=0.015,
    ),
    "x-ai/grok-code-fast-1": ModelConfig(
        id="x-ai/grok-code-fast-1",
        display_name="Grok Code Fast",
        provider=Provider.XAI,
        category=ModelCategory.CODE,
        context_window=131072,
        cost_per_1k_input=0.005,
        cost_per_1k_output=0.015,
    ),
    "x-ai/grok-4": ModelConfig(
        id="x-ai/grok-4",
        display_name="Grok 4",
        provider=Provider.XAI,
        category=ModelCategory.FLAGSHIP,
        context_window=131072,
        cost_per_1k_input=0.01,
        cost_per_1k_output=0.03,
    ),
    
    # ============================================
    # MISTRAL MODELS
    # ============================================
    "mistralai/mistral-large-2512": ModelConfig(
        id="mistralai/mistral-large-2512",
        display_name="Mistral Large",
        provider=Provider.MISTRAL,
        category=ModelCategory.FLAGSHIP,
        context_window=128000,
        cost_per_1k_input=0.002,
        cost_per_1k_output=0.006,
    ),
    "mistralai/devstral-2512:free": ModelConfig(
        id="mistralai/devstral-2512:free",
        display_name="Devstral (Free)",
        provider=Provider.MISTRAL,
        category=ModelCategory.CODE,
        context_window=128000,
        cost_per_1k_input=0.0,
        cost_per_1k_output=0.0,
    ),
    "mistralai/ministral-14b-2512": ModelConfig(
        id="mistralai/ministral-14b-2512",
        display_name="Ministral 14B",
        provider=Provider.MISTRAL,
        category=ModelCategory.COST_EFFICIENT,
        context_window=128000,
        cost_per_1k_input=0.0003,
        cost_per_1k_output=0.0003,
    ),
    "mistralai/ministral-8b-2512": ModelConfig(
        id="mistralai/ministral-8b-2512",
        display_name="Ministral 8B",
        provider=Provider.MISTRAL,
        category=ModelCategory.COST_EFFICIENT,
        context_window=128000,
        cost_per_1k_input=0.0001,
        cost_per_1k_output=0.0001,
    ),
    
    # ============================================
    # QWEN MODELS
    # ============================================
    "qwen/qwen3-vl-32b-instruct": ModelConfig(
        id="qwen/qwen3-vl-32b-instruct",
        display_name="Qwen3 VL 32B",
        provider=Provider.QWEN,
        category=ModelCategory.VISION,
        context_window=128000,
        supports_vision=True,
        cost_per_1k_input=0.0002,
        cost_per_1k_output=0.0002,
    ),
    "qwen/qwen3-vl-8b-thinking": ModelConfig(
        id="qwen/qwen3-vl-8b-thinking",
        display_name="Qwen3 VL Thinking",
        provider=Provider.QWEN,
        category=ModelCategory.REASONING,
        context_window=128000,
        supports_vision=True,
        supports_thinking=True,
        cost_per_1k_input=0.0001,
        cost_per_1k_output=0.0001,
    ),
    "qwen/qwen3-max": ModelConfig(
        id="qwen/qwen3-max",
        display_name="Qwen3 Max",
        provider=Provider.QWEN,
        category=ModelCategory.FLAGSHIP,
        context_window=128000,
        cost_per_1k_input=0.001,
        cost_per_1k_output=0.001,
    ),
    "qwen/qwen3-coder-plus": ModelConfig(
        id="qwen/qwen3-coder-plus",
        display_name="Qwen3 Coder Plus",
        provider=Provider.QWEN,
        category=ModelCategory.CODE,
        context_window=128000,
        cost_per_1k_input=0.0005,
        cost_per_1k_output=0.0005,
    ),
    
    # ============================================
    # DEEPSEEK MODELS
    # ============================================
    "deepseek/deepseek-v3.2-speciale": ModelConfig(
        id="deepseek/deepseek-v3.2-speciale",
        display_name="DeepSeek V3.2 Speciale",
        provider=Provider.DEEPSEEK,
        category=ModelCategory.FLAGSHIP,
        context_window=128000,
        supports_thinking=True,
        cost_per_1k_input=0.0005,
        cost_per_1k_output=0.002,
    ),
    "deepseek/deepseek-v3.2": ModelConfig(
        id="deepseek/deepseek-v3.2",
        display_name="DeepSeek V3.2",
        provider=Provider.DEEPSEEK,
        category=ModelCategory.FLAGSHIP,
        context_window=128000,
        cost_per_1k_input=0.00027,
        cost_per_1k_output=0.0011,
    ),
    "deepseek/deepseek-r1-distill-qwen-7b": ModelConfig(
        id="deepseek/deepseek-r1-distill-qwen-7b",
        display_name="DeepSeek R1 Distill",
        provider=Provider.DEEPSEEK,
        category=ModelCategory.REASONING,
        context_window=64000,
        supports_thinking=True,
        cost_per_1k_input=0.0001,
        cost_per_1k_output=0.0001,
    ),
    
    # ============================================
    # MOONSHOT MODELS
    # ============================================
    "moonshotai/kimi-k2-thinking": ModelConfig(
        id="moonshotai/kimi-k2-thinking",
        display_name="Kimi K2 Thinking",
        provider=Provider.MOONSHOT,
        category=ModelCategory.REASONING,
        context_window=128000,
        supports_thinking=True,
        cost_per_1k_input=0.0005,
        cost_per_1k_output=0.002,
    ),
    "moonshotai/kimi-k2-0905": ModelConfig(
        id="moonshotai/kimi-k2-0905",
        display_name="Kimi K2",
        provider=Provider.MOONSHOT,
        category=ModelCategory.FLAGSHIP,
        context_window=128000,
        cost_per_1k_input=0.0004,
        cost_per_1k_output=0.0016,
    ),
    
    # ============================================
    # MINIMAX MODELS
    # ============================================
    "minimax/minimax-m1": ModelConfig(
        id="minimax/minimax-m1",
        display_name="MiniMax M1",
        provider=Provider.MINIMAX,
        category=ModelCategory.FLAGSHIP,
        context_window=128000,
        cost_per_1k_input=0.0002,
        cost_per_1k_output=0.0008,
    ),
    "minimax/minimax-m2": ModelConfig(
        id="minimax/minimax-m2",
        display_name="MiniMax M2",
        provider=Provider.MINIMAX,
        category=ModelCategory.FLAGSHIP,
        context_window=128000,
        cost_per_1k_input=0.0004,
        cost_per_1k_output=0.0016,
    ),
    
    # ============================================
    # PERPLEXITY SEARCH MODELS
    # ============================================
    "perplexity/sonar-pro-search": ModelConfig(
        id="perplexity/sonar-pro-search",
        display_name="Sonar Pro Search",
        provider=Provider.PERPLEXITY,
        category=ModelCategory.SEARCH,
        context_window=200000,
        supports_tools=False,  # Uses internal search
        cost_per_1k_input=0.003,
        cost_per_1k_output=0.015,
    ),
    "perplexity/sonar-pro": ModelConfig(
        id="perplexity/sonar-pro",
        display_name="Sonar Pro",
        provider=Provider.PERPLEXITY,
        category=ModelCategory.SEARCH,
        context_window=200000,
        supports_tools=False,
        cost_per_1k_input=0.003,
        cost_per_1k_output=0.015,
    ),
    "perplexity/sonar-reasoning-pro": ModelConfig(
        id="perplexity/sonar-reasoning-pro",
        display_name="Sonar Reasoning Pro",
        provider=Provider.PERPLEXITY,
        category=ModelCategory.SEARCH,
        context_window=200000,
        supports_thinking=True,
        supports_tools=False,
        cost_per_1k_input=0.003,
        cost_per_1k_output=0.015,
    ),
}


# ============================================
# DEFAULT PINNED MODELS (shown in main selector)
# ============================================

DEFAULT_PINNED_MODELS = [
    "openai/gpt-5.2-pro",
    "openai/gpt-5.2",
    "openai/gpt-5-nano",
    "anthropic/claude-opus-4.5",
    "anthropic/claude-sonnet-4.5",
    "google/gemini-3-pro-preview",
    "google/gemini-3-flash-preview",
    "x-ai/grok-4.1-fast",
]


def get_pinned_models() -> list[ModelConfig]:
    """Get models that should appear in the main selector."""
    return [MODEL_REGISTRY[m] for m in DEFAULT_PINNED_MODELS if m in MODEL_REGISTRY]


def get_all_models() -> list[ModelConfig]:
    """Get all available models."""
    return list(MODEL_REGISTRY.values())


def get_models_by_category(category: ModelCategory) -> list[ModelConfig]:
    """Get models filtered by category."""
    return [m for m in MODEL_REGISTRY.values() if m.category == category]


def get_models_by_provider(provider: Provider) -> list[ModelConfig]:
    """Get models filtered by provider."""
    return [m for m in MODEL_REGISTRY.values() if m.provider == provider]


def get_search_models() -> list[ModelConfig]:
    """Get models suitable for web search/deep research."""
    return get_models_by_category(ModelCategory.SEARCH)


def get_reasoning_models() -> list[ModelConfig]:
    """Get models with thinking/reasoning capabilities."""
    return [m for m in MODEL_REGISTRY.values() if m.supports_thinking]
