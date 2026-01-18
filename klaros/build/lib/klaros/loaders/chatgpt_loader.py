"""Loader for ChatGPT (OpenAI) conversation exports."""

import json
from datetime import datetime
from pathlib import Path
from typing import Generator, Any

from klaros.models import UniversalChat, Message, MessageRole, SourcePlatform
from klaros.loaders.base import BaseLoader


class ChatGPTLoader(BaseLoader):
    """
    Parser for ChatGPT conversation exports.
    
    ChatGPT exports use a complex linked-list/tree structure where messages
    are stored in a `mapping` dict with parent/children references.
    This requires tree traversal to reconstruct linear conversations.
    
    Expected format:
    [
        {
            "title": "Conversation Title",
            "create_time": 1767964319.930,
            "update_time": 1768151469.680,
            "mapping": {
                "node-id-1": {
                    "id": "node-id-1",
                    "parent": null | "parent-id",
                    "children": ["child-id-1", "child-id-2"],
                    "message": {
                        "author": {"role": "user" | "assistant" | "system"},
                        "content": {"content_type": "text", "parts": ["..."]}
                    }
                }
            }
        }
    ]
    """
    
    def load(self, file_path: Path) -> Generator[UniversalChat, None, None]:
        """
        Parse ChatGPT export file and yield UniversalChat objects.
        
        Args:
            file_path: Path to the ChatGPT conversations.json file
            
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
            mapping = conv.get('mapping', {})
            
            # Find the root node (no parent)
            root_id = self._find_root(mapping)
            if not root_id:
                return None
            
            # Traverse the tree to extract messages
            messages = self._traverse_tree(mapping, root_id)
            
            # Parse timestamps (ChatGPT uses Unix timestamps)
            created_at = None
            updated_at = None
            
            if conv.get('create_time'):
                try:
                    created_at = datetime.fromtimestamp(conv['create_time'])
                except (ValueError, TypeError, OSError):
                    pass
            
            if conv.get('update_time'):
                try:
                    updated_at = datetime.fromtimestamp(conv['update_time'])
                except (ValueError, TypeError, OSError):
                    pass
            
            return UniversalChat(
                id=conv.get('id', conv.get('conversation_id', '')),
                source=SourcePlatform.CHATGPT,
                source_file=source_file,
                title=conv.get('title') or 'Untitled Conversation',
                created_at=created_at,
                updated_at=updated_at,
                messages=messages
            )
        except Exception as e:
            # Log error but continue processing other conversations
            print(f"Warning: Failed to parse conversation {conv.get('title', 'unknown')}: {e}")
            return None
    
    def _find_root(self, mapping: dict[str, Any]) -> str | None:
        """Find the root node ID (node with no parent)."""
        for node_id, node in mapping.items():
            if node.get('parent') is None:
                return node_id
        return None
    
    def _traverse_tree(self, mapping: dict[str, Any], node_id: str) -> list[Message]:
        """
        Recursively traverse the message tree to reconstruct linear conversation.
        
        Follows the first child at each level (main thread).
        This handles ChatGPT's branching conversation structure.
        
        Args:
            mapping: The mapping dict containing all nodes
            node_id: Current node ID to process
            
        Returns:
            List of Message objects in chronological order
        """
        node = mapping.get(node_id)
        if not node:
            return []
        
        messages = []
        msg_data = node.get('message')
        
        if msg_data:
            message = self._parse_message(msg_data)
            if message:
                messages.append(message)
        
        # Follow children (take first child for main thread)
        children = node.get('children', [])
        if children:
            # Follow the first child (main conversation thread)
            messages.extend(self._traverse_tree(mapping, children[0]))
        
        return messages
    
    def _parse_message(self, msg_data: dict[str, Any]) -> Message | None:
        """Parse a single message from the mapping structure."""
        try:
            author = msg_data.get('author', {})
            role_str = author.get('role', '')
            
            # Map role string to MessageRole enum
            if role_str == 'user':
                role = MessageRole.USER
            elif role_str == 'assistant':
                role = MessageRole.ASSISTANT
            elif role_str == 'system':
                role = MessageRole.SYSTEM
            else:
                return None  # Skip unknown roles
            
            # Extract text content
            content = msg_data.get('content', {})
            content_type = content.get('content_type', '')
            
            # Skip non-text content types
            if content_type not in ('text', 'user_editable_context'):
                return None
            
            # Get text from parts array
            parts = content.get('parts', [])
            text_parts = []
            for part in parts:
                if isinstance(part, str):
                    text_parts.append(part)
                elif isinstance(part, dict) and part.get('text'):
                    text_parts.append(part['text'])
            
            text = '\n'.join(text_parts).strip()
            
            # Skip empty messages or hidden system messages
            if not text:
                return None
            
            # Skip visually hidden messages
            metadata = msg_data.get('metadata', {})
            if metadata.get('is_visually_hidden_from_conversation'):
                return None
            
            # Parse timestamp
            timestamp = None
            create_time = msg_data.get('create_time')
            if create_time:
                try:
                    timestamp = datetime.fromtimestamp(create_time)
                except (ValueError, TypeError, OSError):
                    pass
            
            return Message(
                id=msg_data.get('id', ''),
                role=role,
                text=text,
                timestamp=timestamp,
                metadata={
                    'model': metadata.get('model_slug'),
                } if metadata.get('model_slug') else None
            )
        except Exception:
            return None
