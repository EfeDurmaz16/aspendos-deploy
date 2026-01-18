"""
Cleaner processor - removes boilerplate and noise from messages.

This processor is designed to work locally without any LLM API calls.
"""

import re
from typing import List

from klaros.models import UniversalChat, Message


# Common AI boilerplate phrases to remove or flag
BOILERPLATE_PATTERNS = [
    r"^I am a large language model.*$",
    r"^I'm an AI language model.*$",
    r"^As an AI,?\s*I.*$",
    r"^I don't have the ability to.*$",
    r"^I'm sorry,?\s*but as an AI.*$",
    r"^I'm unable to.*$",
    r"^As a language model,?\s*I.*$",
]

# HTML/XML tag patterns
HTML_TAG_PATTERN = re.compile(r'<[^>]+>')

# Excessive whitespace patterns
WHITESPACE_PATTERNS = [
    (re.compile(r'\n{3,}'), '\n\n'),  # Multiple newlines -> double newline
    (re.compile(r' {2,}'), ' '),       # Multiple spaces -> single space
    (re.compile(r'\t+'), ' '),         # Tabs -> space
]


class CleanerService:
    """
    Cleans and normalizes conversation text.
    
    Removes:
    - Empty messages
    - HTML artifacts
    - Excessive whitespace
    - Common AI boilerplate disclaimers (optional)
    - System messages (optional)
    """
    
    def __init__(
        self,
        remove_boilerplate: bool = True,
        remove_html: bool = True,
        remove_system_messages: bool = False,
        normalize_whitespace: bool = True
    ):
        """
        Initialize the cleaner.
        
        Args:
            remove_boilerplate: Remove common AI disclaimers
            remove_html: Strip HTML/XML tags
            remove_system_messages: Remove system role messages
            normalize_whitespace: Normalize excessive whitespace
        """
        self.remove_boilerplate = remove_boilerplate
        self.remove_html = remove_html
        self.remove_system_messages = remove_system_messages
        self.normalize_whitespace = normalize_whitespace
        
        # Compile boilerplate patterns
        self._boilerplate_patterns = [
            re.compile(p, re.IGNORECASE | re.MULTILINE)
            for p in BOILERPLATE_PATTERNS
        ]
    
    def process(self, chat: UniversalChat) -> UniversalChat:
        """
        Clean a conversation.
        
        Args:
            chat: The conversation to clean
            
        Returns:
            Cleaned conversation (new object)
        """
        cleaned_messages = []
        
        for msg in chat.messages:
            # Skip system messages if configured
            if self.remove_system_messages and msg.role == "system":
                continue
            
            # Clean the text
            cleaned_text = self._clean_text(msg.text)
            
            # Skip empty messages after cleaning
            if not cleaned_text or not cleaned_text.strip():
                continue
            
            cleaned_messages.append(Message(
                id=msg.id,
                role=msg.role,
                text=cleaned_text,
                timestamp=msg.timestamp,
                metadata=msg.metadata
            ))
        
        return UniversalChat(
            id=chat.id,
            source=chat.source,
            source_file=chat.source_file,
            title=chat.title,
            created_at=chat.created_at,
            updated_at=chat.updated_at,
            messages=cleaned_messages,
            tags=chat.tags,
            token_count=chat.token_count
        )
    
    def _clean_text(self, text: str) -> str:
        """Apply all cleaning operations to text."""
        if not text:
            return ""
        
        result = text
        
        # Remove HTML tags
        if self.remove_html:
            result = HTML_TAG_PATTERN.sub('', result)
        
        # Normalize whitespace
        if self.normalize_whitespace:
            for pattern, replacement in WHITESPACE_PATTERNS:
                result = pattern.sub(replacement, result)
        
        # Remove boilerplate (check first line only to preserve content)
        if self.remove_boilerplate:
            lines = result.split('\n')
            filtered_lines = []
            for line in lines:
                is_boilerplate = any(
                    p.match(line.strip()) 
                    for p in self._boilerplate_patterns
                )
                if not is_boilerplate:
                    filtered_lines.append(line)
            result = '\n'.join(filtered_lines)
        
        return result.strip()
    
    def process_batch(self, chats: List[UniversalChat]) -> List[UniversalChat]:
        """Process multiple conversations."""
        return [self.process(chat) for chat in chats]
