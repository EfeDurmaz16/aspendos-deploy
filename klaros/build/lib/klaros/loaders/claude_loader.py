"""Loader for Claude (Anthropic) conversation exports."""

import json
from datetime import datetime
from pathlib import Path
from typing import Generator, Any

from klaros.models import UniversalChat, Message, MessageRole, SourcePlatform
from klaros.loaders.base import BaseLoader


class ClaudeLoader(BaseLoader):
    """
    Parser for Claude conversation exports.
    
    Claude exports use a flat list structure where each conversation
    contains a `chat_messages` array with linear message ordering.
    
    Expected format:
    [
        {
            "uuid": "...",
            "name": "Conversation Title",
            "created_at": "ISO-8601",
            "updated_at": "ISO-8601",
            "chat_messages": [
                {
                    "uuid": "...",
                    "text": "...",
                    "sender": "human" | "assistant",
                    "created_at": "...",
                    "content": [{"type": "text", "text": "..."}]
                }
            ]
        }
    ]
    """
    
    def load(self, file_path: Path) -> Generator[UniversalChat, None, None]:
        """
        Parse Claude export file and yield UniversalChat objects.
        
        Args:
            file_path: Path to the Claude conversations.json file
            
        Yields:
            UniversalChat for each conversation
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for conv in data:
            chat = self._parse_conversation(conv, str(file_path))
            if chat and chat.messages:  # Skip empty conversations
                yield chat
    
    def count_conversations(self, file_path: Path) -> int:
        """Count conversations in file."""
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return len(data)
    
    def _parse_conversation(self, conv: dict[str, Any], source_file: str) -> UniversalChat | None:
        """Parse a single conversation dict into UniversalChat."""
        try:
            messages = self._parse_messages(conv.get('chat_messages', []))
            
            # Parse timestamps
            created_at = None
            updated_at = None
            
            if conv.get('created_at'):
                try:
                    created_at = datetime.fromisoformat(
                        conv['created_at'].replace('Z', '+00:00')
                    )
                except (ValueError, TypeError):
                    pass
            
            if conv.get('updated_at'):
                try:
                    updated_at = datetime.fromisoformat(
                        conv['updated_at'].replace('Z', '+00:00')
                    )
                except (ValueError, TypeError):
                    pass
            
            return UniversalChat(
                id=conv.get('uuid', ''),
                source=SourcePlatform.CLAUDE,
                source_file=source_file,
                title=conv.get('name') or 'Untitled Conversation',
                created_at=created_at,
                updated_at=updated_at,
                messages=messages
            )
        except Exception as e:
            # Log error but continue processing other conversations
            print(f"Warning: Failed to parse conversation {conv.get('uuid', 'unknown')}: {e}")
            return None
    
    def _parse_messages(self, chat_messages: list[dict]) -> list[Message]:
        """Parse the chat_messages array into Message objects."""
        messages = []
        
        for msg in chat_messages:
            # Extract text content
            text = msg.get('text', '')
            
            # If text is empty, try to get from content array
            if not text:
                content_list = msg.get('content', [])
                for content_item in content_list:
                    if isinstance(content_item, dict) and content_item.get('type') == 'text':
                        text = content_item.get('text', '')
                        break
            
            # Skip empty messages
            if not text or not text.strip():
                continue
            
            # Map sender to role
            sender = msg.get('sender', '')
            if sender == 'human':
                role = MessageRole.USER
            elif sender == 'assistant':
                role = MessageRole.ASSISTANT
            else:
                role = MessageRole.SYSTEM
            
            # Parse timestamp
            timestamp = None
            if msg.get('created_at'):
                try:
                    timestamp = datetime.fromisoformat(
                        msg['created_at'].replace('Z', '+00:00')
                    )
                except (ValueError, TypeError):
                    pass
            
            messages.append(Message(
                id=msg.get('uuid', ''),
                role=role,
                text=text.strip(),
                timestamp=timestamp,
                metadata={}
            ))
        
        return messages
