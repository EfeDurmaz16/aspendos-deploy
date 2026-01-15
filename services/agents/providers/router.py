"""
Aspendos Model Router
Handles Auto routing, MAX mode, and Multi-Model Batch.
"""
from typing import Literal, Optional
from dataclasses import dataclass
from enum import Enum
import asyncio

from providers.models import (
    MODEL_REGISTRY, 
    ModelConfig, 
    ModelCategory,
    get_pinned_models,
    get_reasoning_models,
    get_search_models,
)
from providers.llm import get_llm


class RoutingMode(str, Enum):
    """Routing mode for model selection."""
    AUTO = "auto"              # Intelligent auto-selection
    MAX = "max"                # Maximum capability mode
    MULTI = "multi"            # Multi-model batch (ULTRA only)
    MANUAL = "manual"          # User-selected specific model


@dataclass
class RoutingConfig:
    """Configuration for a routing request."""
    mode: RoutingMode = RoutingMode.MANUAL
    preferred_model: Optional[str] = None
    models_for_multi: list[str] | None = None  # For MULTI mode
    enable_thinking: bool = False               # For MAX mode
    temperature: float = 0.7
    max_tokens: Optional[int] = None


@dataclass
class RoutingResult:
    """Result of model routing."""
    selected_model: str
    model_config: ModelConfig
    temperature: float
    enable_thinking: bool
    reason: str


class ModelRouter:
    """
    Intelligent model router for Aspendos.
    
    Modes:
    - AUTO: Selects best model based on query complexity
    - MAX: Uses high temperature + thinking mode with best available model
    - MULTI: Runs query on multiple models in parallel (ULTRA only)
    - MANUAL: Uses user-specified model
    """
    
    def __init__(self):
        self.fallback_chain = [
            "openai/gpt-5.2",
            "anthropic/claude-sonnet-4.5",
            "google/gemini-3-flash-preview",
        ]
    
    def route(
        self,
        query: str,
        config: RoutingConfig,
        user_tier: str = "pro",  # pro, ultra, enterprise
    ) -> RoutingResult:
        """
        Route a query to the appropriate model.
        
        Args:
            query: The user's query
            config: Routing configuration
            user_tier: User's subscription tier
        
        Returns:
            RoutingResult with selected model and settings
        """
        if config.mode == RoutingMode.MANUAL and config.preferred_model:
            return self._route_manual(config)
        
        elif config.mode == RoutingMode.MAX:
            return self._route_max(query, config)
        
        elif config.mode == RoutingMode.AUTO:
            return self._route_auto(query, config)
        
        else:
            # Default to auto
            return self._route_auto(query, config)
    
    def _route_manual(self, config: RoutingConfig) -> RoutingResult:
        """Route to user-specified model."""
        model_id = config.preferred_model
        
        if model_id not in MODEL_REGISTRY:
            # Fallback to default
            model_id = "openai/gpt-5.2"
        
        model_config = MODEL_REGISTRY[model_id]
        
        return RoutingResult(
            selected_model=model_id,
            model_config=model_config,
            temperature=config.temperature,
            enable_thinking=config.enable_thinking and model_config.supports_thinking,
            reason="User selected model",
        )
    
    def _route_max(self, query: str, config: RoutingConfig) -> RoutingResult:
        """
        MAX mode: Use best available model with high temperature and thinking.
        """
        # Priority order for MAX mode
        max_models = [
            "openai/gpt-5.2-pro",
            "openai/o3-pro",
            "anthropic/claude-opus-4.5",
            "google/gemini-3-pro-preview",
        ]
        
        selected = None
        for model_id in max_models:
            if model_id in MODEL_REGISTRY:
                selected = model_id
                break
        
        if not selected:
            selected = "openai/gpt-5.2"
        
        model_config = MODEL_REGISTRY[selected]
        
        return RoutingResult(
            selected_model=selected,
            model_config=model_config,
            temperature=min(config.temperature + 0.3, 1.0),  # Higher temp for MAX
            enable_thinking=model_config.supports_thinking,
            reason="MAX mode: Using most capable model with enhanced settings",
        )
    
    def _route_auto(self, query: str, config: RoutingConfig) -> RoutingResult:
        """
        AUTO mode: Intelligently select model based on query.
        """
        query_lower = query.lower()
        
        # Detect query type
        is_code_query = any(kw in query_lower for kw in [
            "code", "function", "class", "debug", "python", "javascript",
            "typescript", "implement", "fix", "error", "bug"
        ])
        
        is_search_query = any(kw in query_lower for kw in [
            "search", "find", "latest", "news", "current", "today",
            "research", "look up", "what is happening"
        ])
        
        is_reasoning_query = any(kw in query_lower for kw in [
            "analyze", "compare", "why", "explain", "reason",
            "think through", "step by step", "plan"
        ])
        
        is_simple_query = len(query.split()) < 20 and not any([
            is_code_query, is_search_query, is_reasoning_query
        ])
        
        # Select model based on query type
        if is_search_query:
            selected = "perplexity/sonar-pro-search"
            reason = "Web search query detected"
        
        elif is_code_query:
            selected = "openai/gpt-5.2-codex"
            reason = "Code-related query detected"
        
        elif is_reasoning_query:
            selected = "openai/o3-pro"
            reason = "Complex reasoning query detected"
        
        elif is_simple_query:
            selected = "openai/gpt-5.2-chat"
            reason = "Simple query - using fast model"
        
        else:
            selected = "openai/gpt-5.2"
            reason = "General query - using balanced model"
        
        # Fallback if model not available
        if selected not in MODEL_REGISTRY:
            selected = self.fallback_chain[0]
            reason += " (fallback)"
        
        model_config = MODEL_REGISTRY[selected]
        
        return RoutingResult(
            selected_model=selected,
            model_config=model_config,
            temperature=config.temperature,
            enable_thinking=config.enable_thinking and model_config.supports_thinking,
            reason=reason,
        )
    
    async def route_multi(
        self,
        query: str,
        messages: list[dict],
        models: list[str],
        config: RoutingConfig,
    ) -> list[dict]:
        """
        Multi-Model Batch: Run query on multiple models in parallel.
        ULTRA tier only.
        
        Args:
            query: The user's query
            messages: Full message history
            models: List of model IDs to use
            config: Routing configuration
        
        Returns:
            List of responses from each model
        """
        from graphs.chat_agent import run_agent
        
        # Limit to 5 models max
        models = models[:5]
        
        # Create tasks for parallel execution
        async def run_model(model_id: str) -> dict:
            try:
                result = await run_agent(
                    messages=messages,
                    model_id=model_id,
                    include_mcp_tools=False,  # Disable tools for multi-model
                )
                return {
                    "model_id": model_id,
                    "model_name": MODEL_REGISTRY.get(model_id, {}).display_name if model_id in MODEL_REGISTRY else model_id,
                    "content": result.get("content", ""),
                    "status": "success",
                }
            except Exception as e:
                return {
                    "model_id": model_id,
                    "model_name": model_id,
                    "content": f"Error: {str(e)}",
                    "status": "error",
                }
        
        # Run all models in parallel
        tasks = [run_model(model_id) for model_id in models]
        results = await asyncio.gather(*tasks)
        
        return list(results)


# Global router instance
router = ModelRouter()
