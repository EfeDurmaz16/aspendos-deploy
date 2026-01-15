"""
Multi-Provider LLM Factory
Supports OpenAI, Anthropic, and Google models via LangChain.
"""
from typing import Literal, Optional
from langchain_core.language_models import BaseChatModel
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI

from core.config import get_settings

Provider = Literal["openai", "anthropic", "google"]

# Model mappings per provider
MODEL_REGISTRY: dict[str, dict] = {
    # OpenAI models
    "gpt-4o": {"provider": "openai", "model": "gpt-4o"},
    "gpt-4o-mini": {"provider": "openai", "model": "gpt-4o-mini"},
    "gpt-4-turbo": {"provider": "openai", "model": "gpt-4-turbo"},
    "o1": {"provider": "openai", "model": "o1"},
    "o1-mini": {"provider": "openai", "model": "o1-mini"},
    
    # Anthropic models
    "claude-3-5-sonnet": {"provider": "anthropic", "model": "claude-3-5-sonnet-20241022"},
    "claude-3-5-haiku": {"provider": "anthropic", "model": "claude-3-5-haiku-20241022"},
    "claude-3-opus": {"provider": "anthropic", "model": "claude-3-opus-20240229"},
    
    # Google models
    "gemini-2.0-flash": {"provider": "google", "model": "gemini-2.0-flash-exp"},
    "gemini-1.5-pro": {"provider": "google", "model": "gemini-1.5-pro"},
    "gemini-1.5-flash": {"provider": "google", "model": "gemini-1.5-flash"},
}


def get_llm(
    model_id: str = "gpt-4o",
    temperature: float = 0.7,
    streaming: bool = True,
    max_tokens: Optional[int] = None,
) -> BaseChatModel:
    """
    Get a LangChain chat model instance for the specified model.
    
    Args:
        model_id: Model identifier (e.g., "gpt-4o", "claude-3-5-sonnet")
        temperature: Sampling temperature
        streaming: Enable streaming responses
        max_tokens: Maximum tokens to generate
    
    Returns:
        LangChain BaseChatModel instance
    """
    settings = get_settings()
    
    if model_id not in MODEL_REGISTRY:
        raise ValueError(f"Unknown model: {model_id}. Available: {list(MODEL_REGISTRY.keys())}")
    
    config = MODEL_REGISTRY[model_id]
    provider = config["provider"]
    model_name = config["model"]
    
    common_kwargs = {
        "temperature": temperature,
        "streaming": streaming,
    }
    if max_tokens:
        common_kwargs["max_tokens"] = max_tokens
    
    if provider == "openai":
        return ChatOpenAI(
            model=model_name,
            api_key=settings.openai_api_key,
            **common_kwargs
        )
    
    elif provider == "anthropic":
        return ChatAnthropic(
            model=model_name,
            api_key=settings.anthropic_api_key,
            **common_kwargs
        )
    
    elif provider == "google":
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=settings.google_api_key,
            **common_kwargs
        )
    
    else:
        raise ValueError(f"Unknown provider: {provider}")


def list_available_models() -> list[dict]:
    """List all available models with their providers."""
    return [
        {"id": model_id, **config}
        for model_id, config in MODEL_REGISTRY.items()
    ]
