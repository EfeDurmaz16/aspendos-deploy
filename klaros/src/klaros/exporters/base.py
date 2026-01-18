"""Base exporter interface for output formats."""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import List

from klaros.models import UniversalChat


class BaseExporter(ABC):
    """
    Abstract base class for conversation exporters.
    
    Exporters are responsible for converting UniversalChat objects
    into various output formats.
    """
    
    @abstractmethod
    def export(self, chats: List[UniversalChat], output_path: Path) -> None:
        """
        Export conversations to the specified path.
        
        Args:
            chats: List of conversations to export
            output_path: Path to write output (file or directory)
        """
        pass
    
    @abstractmethod
    def export_single(self, chat: UniversalChat) -> str:
        """
        Export a single conversation to string format.
        
        Args:
            chat: Conversation to export
            
        Returns:
            String representation of the exported conversation
        """
        pass
