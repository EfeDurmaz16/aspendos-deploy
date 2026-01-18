"""
Tagger processor - Extract keywords from conversations using local NLP.

This processor uses RAKE (Rapid Automatic Keyword Extraction) algorithm
to extract tags without any LLM API calls.
"""

from typing import List, Optional
from collections import Counter
import re

from klaros.models import UniversalChat

# Try to import rake_nltk, fall back to simple extraction if not available
try:
    from rake_nltk import Rake
    HAS_RAKE = True
except ImportError:
    HAS_RAKE = False


class TaggerService:
    """
    Extracts keyword tags from conversations using local NLP.
    
    Uses RAKE (Rapid Automatic Keyword Extraction) algorithm when available,
    falls back to simple word frequency analysis otherwise.
    """
    
    def __init__(
        self,
        max_tags: int = 5,
        min_keyword_length: int = 3,
        use_title: bool = True,
        use_user_messages: bool = True,
        use_assistant_messages: bool = False
    ):
        """
        Initialize the tagger.
        
        Args:
            max_tags: Maximum number of tags to extract
            min_keyword_length: Minimum character length for keywords
            use_title: Include conversation title in analysis
            use_user_messages: Include user messages in analysis
            use_assistant_messages: Include assistant messages in analysis
        """
        self.max_tags = max_tags
        self.min_keyword_length = min_keyword_length
        self.use_title = use_title
        self.use_user_messages = use_user_messages
        self.use_assistant_messages = use_assistant_messages
        
        # Initialize RAKE if available
        self._rake = None
        if HAS_RAKE:
            try:
                self._rake = Rake(
                    min_length=1,
                    max_length=3,
                    include_repeated_phrases=False
                )
            except Exception:
                pass
    
    def process(self, chat: UniversalChat) -> UniversalChat:
        """
        Extract tags from a conversation.
        
        Args:
            chat: The conversation to process
            
        Returns:
            Conversation with tags populated (new object)
        """
        # Build text corpus for analysis
        text_parts = []
        
        if self.use_title and chat.title:
            text_parts.append(chat.title)
        
        for msg in chat.messages:
            if msg.role == "user" and self.use_user_messages:
                text_parts.append(msg.text)
            elif msg.role == "assistant" and self.use_assistant_messages:
                text_parts.append(msg.text)
        
        full_text = " ".join(text_parts)
        
        # Extract tags
        if self._rake:
            tags = self._extract_with_rake(full_text)
        else:
            tags = self._extract_simple(full_text)
        
        return UniversalChat(
            id=chat.id,
            source=chat.source,
            source_file=chat.source_file,
            title=chat.title,
            created_at=chat.created_at,
            updated_at=chat.updated_at,
            messages=chat.messages,
            tags=tags,
            token_count=chat.token_count
        )
    
    def _extract_with_rake(self, text: str) -> List[str]:
        """Extract keywords using RAKE algorithm."""
        if not text or not self._rake:
            return []
        
        try:
            self._rake.extract_keywords_from_text(text)
            phrases = self._rake.get_ranked_phrases()
            
            # Filter and clean phrases
            tags = []
            for phrase in phrases:
                # Clean the phrase
                cleaned = phrase.lower().strip()
                
                # Skip too short phrases
                if len(cleaned) < self.min_keyword_length:
                    continue
                
                # Skip phrases with too many words
                if len(cleaned.split()) > 3:
                    continue
                
                tags.append(cleaned)
                
                if len(tags) >= self.max_tags:
                    break
            
            return tags
        except Exception:
            return self._extract_simple(text)
    
    def _extract_simple(self, text: str) -> List[str]:
        """Simple word frequency based extraction (fallback)."""
        if not text:
            return []
        
        # Tokenize and clean
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        
        # Remove common stop words
        stop_words = {
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all',
            'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has',
            'have', 'been', 'were', 'being', 'their', 'there', 'this',
            'that', 'with', 'would', 'could', 'should', 'what', 'from',
            'they', 'will', 'when', 'where', 'which', 'while', 'into',
            'some', 'then', 'than', 'them', 'these', 'your', 'just',
            'like', 'make', 'know', 'think', 'take', 'want', 'does',
            'about', 'also', 'more', 'other', 'only', 'very', 'here',
        }
        
        filtered_words = [w for w in words if w not in stop_words]
        
        # Count frequencies
        word_counts = Counter(filtered_words)
        
        # Get most common
        tags = [word for word, _ in word_counts.most_common(self.max_tags)]
        
        return tags
    
    def process_batch(self, chats: List[UniversalChat]) -> List[UniversalChat]:
        """Process multiple conversations."""
        return [self.process(chat) for chat in chats]
