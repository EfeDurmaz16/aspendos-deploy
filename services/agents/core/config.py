"""
Aspendos Agent Service Configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Keys
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    google_api_key: str = ""
    openrouter_api_key: str = ""  # For xAI, Meta, Mistral, Qwen, DeepSeek, etc.
    
    # Service configuration
    port: int = 8082
    debug: bool = False
    
    # Qdrant (Vector DB)
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    
    # Default model preferences
    default_model: str = "gpt-4o"
    default_provider: str = "openai"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
