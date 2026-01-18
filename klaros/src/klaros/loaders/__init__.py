"""Loaders for AI platform conversation exports."""

from klaros.loaders.base import BaseLoader
from klaros.loaders.claude_loader import ClaudeLoader
from klaros.loaders.chatgpt_loader import ChatGPTLoader
from klaros.models import SourcePlatform


def get_loader(source: SourcePlatform) -> BaseLoader:
    """
    Factory function to get the appropriate loader for a source platform.
    
    Args:
        source: The platform to get a loader for
        
    Returns:
        Loader instance for the specified platform
        
    Raises:
        ValueError: If the platform is not supported
    """
    loaders = {
        SourcePlatform.CLAUDE: ClaudeLoader,
        SourcePlatform.CHATGPT: ChatGPTLoader,
    }
    
    loader_class = loaders.get(source)
    if not loader_class:
        raise ValueError(f"Unsupported source platform: {source}")
    
    return loader_class()


__all__ = [
    'BaseLoader',
    'ClaudeLoader', 
    'ChatGPTLoader',
    'get_loader',
]
