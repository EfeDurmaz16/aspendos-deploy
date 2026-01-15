"""
Aspendos Providers Package
"""
from providers.llm import get_llm, list_available_models
from providers.models import (
    MODEL_REGISTRY, 
    ModelConfig, 
    ModelCategory, 
    Provider,
    get_pinned_models,
    get_all_models,
    get_models_by_category,
    get_models_by_provider,
    get_search_models,
    get_reasoning_models,
    DEFAULT_PINNED_MODELS,
)
from providers.router import (
    ModelRouter, 
    router, 
    RoutingMode, 
    RoutingConfig, 
    RoutingResult,
)

__all__ = [
    # LLM
    "get_llm", 
    "list_available_models",
    # Models
    "MODEL_REGISTRY",
    "ModelConfig",
    "ModelCategory",
    "Provider",
    "get_pinned_models",
    "get_all_models",
    "get_models_by_category",
    "get_models_by_provider",
    "get_search_models",
    "get_reasoning_models",
    "DEFAULT_PINNED_MODELS",
    # Router
    "ModelRouter",
    "router",
    "RoutingMode",
    "RoutingConfig",
    "RoutingResult",
]
