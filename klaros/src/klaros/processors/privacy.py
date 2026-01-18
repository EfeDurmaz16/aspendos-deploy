"""
Privacy processor - PII redaction using regex patterns.

This processor is designed to work locally without any LLM API calls.
All pattern matching is done with standard Python regex.
"""

import re
from typing import List, Optional, Set

from klaros.models import UniversalChat, Message


# PII detection patterns
PII_PATTERNS = {
    'email': re.compile(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    ),
    'phone': re.compile(
        r'\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b|'
        r'\b\+?[0-9]{1,3}[-.\s]?\(?[0-9]{2,4}\)?[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}\b'
    ),
    'ip_address': re.compile(
        r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}'
        r'(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
    ),
    'credit_card': re.compile(
        r'\b(?:4[0-9]{12}(?:[0-9]{3})?|'  # Visa
        r'5[1-5][0-9]{14}|'               # MasterCard
        r'3[47][0-9]{13}|'                # Amex
        r'6(?:011|5[0-9]{2})[0-9]{12})\b' # Discover
    ),
    'ssn': re.compile(
        r'\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b'
    ),
    'api_key': re.compile(
        r'\b(?:sk-|pk_|api[_-]?key[=:\s]*)[A-Za-z0-9_-]{20,}\b',
        re.IGNORECASE
    ),
    'jwt': re.compile(
        r'\beyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\b'
    ),
}

# Default replacement format
DEFAULT_REPLACEMENT = "[REDACTED_{type}]"


class PrivacyService:
    """
    Redacts personally identifiable information (PII) from conversations.
    
    Uses regex patterns to identify and mask:
    - Email addresses
    - Phone numbers
    - IP addresses
    - Credit card numbers
    - Social Security Numbers
    - API keys and tokens
    - JWTs
    """
    
    def __init__(
        self,
        redact_types: Optional[Set[str]] = None,
        replacement_format: str = DEFAULT_REPLACEMENT
    ):
        """
        Initialize the privacy service.
        
        Args:
            redact_types: Set of PII types to redact. If None, redacts all.
                         Valid types: email, phone, ip_address, credit_card, 
                                     ssn, api_key, jwt
            replacement_format: Format string for replacements. 
                               Use {type} for the PII type.
        """
        self.redact_types = redact_types or set(PII_PATTERNS.keys())
        self.replacement_format = replacement_format
        
        # Validate redact types
        invalid_types = self.redact_types - set(PII_PATTERNS.keys())
        if invalid_types:
            raise ValueError(f"Unknown PII types: {invalid_types}")
    
    def process(self, chat: UniversalChat) -> UniversalChat:
        """
        Redact PII from a conversation.
        
        Args:
            chat: The conversation to process
            
        Returns:
            Conversation with PII redacted (new object)
        """
        redacted_messages = []
        
        for msg in chat.messages:
            redacted_text = self._redact_text(msg.text)
            
            redacted_messages.append(Message(
                id=msg.id,
                role=msg.role,
                text=redacted_text,
                timestamp=msg.timestamp,
                metadata=msg.metadata
            ))
        
        # Also redact title if needed
        redacted_title = self._redact_text(chat.title)
        
        return UniversalChat(
            id=chat.id,
            source=chat.source,
            source_file=chat.source_file,
            title=redacted_title,
            created_at=chat.created_at,
            updated_at=chat.updated_at,
            messages=redacted_messages,
            tags=chat.tags,
            token_count=chat.token_count
        )
    
    def _redact_text(self, text: str) -> str:
        """Apply PII redaction to text."""
        if not text:
            return ""
        
        result = text
        
        for pii_type in self.redact_types:
            pattern = PII_PATTERNS.get(pii_type)
            if pattern:
                replacement = self.replacement_format.format(type=pii_type.upper())
                result = pattern.sub(replacement, result)
        
        return result
    
    def detect(self, text: str) -> dict[str, List[str]]:
        """
        Detect PII in text without redacting.
        
        Args:
            text: Text to scan
            
        Returns:
            Dict mapping PII type to list of found matches
        """
        findings = {}
        
        for pii_type in self.redact_types:
            pattern = PII_PATTERNS.get(pii_type)
            if pattern:
                matches = pattern.findall(text)
                if matches:
                    findings[pii_type] = matches
        
        return findings
    
    def process_batch(self, chats: List[UniversalChat]) -> List[UniversalChat]:
        """Process multiple conversations."""
        return [self.process(chat) for chat in chats]
