"""
Pydantic models for the Universal Memory Schema.

All AI conversation exports are normalized into these models
before processing or export.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional, Any
from pydantic import BaseModel, Field
import uuid


class SourcePlatform(str, Enum):
    """Supported AI platforms for import."""
    CHATGPT = "chatgpt"
    CLAUDE = "claude"
    GEMINI = "gemini"


class MessageRole(str, Enum):
    """Role of the message sender."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Message(BaseModel):
    """A single message in a conversation."""
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: MessageRole
    text: str
    timestamp: Optional[datetime] = None
    metadata: Optional[dict[str, Any]] = None
    
    class Config:
        use_enum_values = True


class UniversalChat(BaseModel):
    """
    Universal Memory Unit - The canonical representation of a conversation.
    
    All platform-specific exports are normalized into this format
    before processing or export.
    """
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: SourcePlatform
    source_file: str = ""
    title: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    messages: List[Message] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    token_count: Optional[int] = None
    
    # Derived metadata (populated by processors)
    sentiment: Optional[str] = None
    summary: Optional[str] = None
    
    class Config:
        use_enum_values = True
    
    @property
    def message_count(self) -> int:
        """Total number of messages in the conversation."""
        return len(self.messages)
    
    @property
    def user_messages(self) -> List[Message]:
        """Filter to only user messages."""
        return [m for m in self.messages if m.role == MessageRole.USER]
    
    @property
    def assistant_messages(self) -> List[Message]:
        """Filter to only assistant messages."""
        return [m for m in self.messages if m.role == MessageRole.ASSISTANT]
    
    def to_text(self) -> str:
        """Concatenate all message text for processing."""
        return "\n\n".join(m.text for m in self.messages if m.text)


class ConversionStats(BaseModel):
    """Statistics from a conversion operation."""
    
    total_conversations: int = 0
    total_messages: int = 0
    skipped_empty: int = 0
    processing_time_seconds: float = 0.0
    source_platform: Optional[SourcePlatform] = None
    output_format: str = ""
