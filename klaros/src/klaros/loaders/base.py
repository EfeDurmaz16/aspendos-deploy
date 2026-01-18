"""Base loader interface for platform-specific parsers."""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Generator

from klaros.models import UniversalChat


class BaseLoader(ABC):
    """
    Abstract base class for AI platform export loaders.
    
    Loaders are responsible for parsing platform-specific export formats
    and yielding normalized UniversalChat objects.
    """
    
    @abstractmethod
    def load(self, file_path: Path) -> Generator[UniversalChat, None, None]:
        """
        Parse the export file and yield UniversalChat objects.
        
        Uses a generator pattern to support streaming large files
        without loading everything into memory.
        
        Args:
            file_path: Path to the export file
            
        Yields:
            UniversalChat objects for each conversation found
        """
        pass
    
    @abstractmethod
    def count_conversations(self, file_path: Path) -> int:
        """
        Quick count of conversations without full parsing.
        
        Used for progress bars and validation.
        
        Args:
            file_path: Path to the export file
            
        Returns:
            Number of conversations in the file
        """
        pass
    
    def validate(self, file_path: Path) -> bool:
        """
        Validate that a file can be parsed by this loader.
        
        Args:
            file_path: Path to the export file
            
        Returns:
            True if the file appears to be valid for this loader
        """
        if not file_path.exists():
            return False
        if not file_path.suffix.lower() == '.json':
            return False
        return True
