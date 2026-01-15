"""
Multi-Provider LLM Factory
Supports OpenAI, Anthropic, Google, and more via LangChain.
Updated to use OpenRouter for unified access.
"""
from typing import Optional
from langchain_core.language_models import BaseChatModel
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI

from core.config import get_settings
from providers.models import MODEL_REGISTRY, Provider


def get_llm(
    model_id: str = "openai/gpt-5.2",
    temperature: float = 0.7,
    streaming: bool = True,
    max_tokens: Optional[int] = None,
) -> BaseChatModel:
    """
    Get a LangChain chat model instance for the specified model.
    
    Uses OpenRouter as unified gateway for most providers.
    
    Args:
        model_id: Full model ID (e.g., "openai/gpt-5.2", "anthropic/claude-opus-4.5")
        temperature: Sampling temperature
        streaming: Enable streaming responses
        max_tokens: Maximum tokens to generate
    
    Returns:
        LangChain BaseChatModel instance
    """
    settings = get_settings()
    
    if model_id not in MODEL_REGISTRY:
        raise ValueError(f"Unknown model: {model_id}. Available: {list(MODEL_REGISTRY.keys())[:10]}...")
    
    config = MODEL_REGISTRY[model_id]
    provider = config.provider
    
    common_kwargs = {
        "temperature": temperature,
        "streaming": streaming,
    }
    if max_tokens:
        common_kwargs["max_tokens"] = max_tokens
    
    # Route to appropriate provider
    if provider == Provider.OPENAI:
        # Use OpenAI directly for OpenAI models
        model_name = model_id.replace("openai/", "")
        return ChatOpenAI(
            model=model_name,
            api_key=settings.openai_api_key,
            **common_kwargs
        )
    
    elif provider == Provider.ANTHROPIC:
        # Use Anthropic directly for Claude models
        model_name = model_id.replace("anthropic/", "")
        return ChatAnthropic(
            model=model_name,
            api_key=settings.anthropic_api_key,
            **common_kwargs
        )
    
    elif provider == Provider.GOOGLE:
        # Use Google directly for Gemini models
        model_name = model_id.replace("google/", "")
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=settings.google_api_key,
            **common_kwargs
        )
    
    else:
        # Use OpenRouter for all other providers
        # OpenRouter supports: xAI, Meta, Mistral, Qwen, DeepSeek, Moonshot, MiniMax, Perplexity
        return ChatOpenAI(
            model=model_id,  # OpenRouter uses full model ID
            api_key=settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": "https://aspendos.net",
                "X-Title": "Aspendos AI"
            },
            **common_kwargs
        )


def list_available_models() -> list[dict]:
    """List all available models with their metadata."""
    return [
        {
            "id": config.id,
            "display_name": config.display_name,
            "provider": config.provider.value,
            "category": config.category.value,
            "context_window": config.context_window,
            "supports_vision": config.supports_vision,
            "supports_thinking": config.supports_thinking,
            "supports_tools": config.supports_tools,
            "is_pinned": config.is_pinned,
            "cost_per_1k_input": config.cost_per_1k_input,
            "cost_per_1k_output": config.cost_per_1k_output,
        }
        for config in MODEL_REGISTRY.values()
    ]
