"""JSON exporter for universal format."""

import json
from datetime import datetime
from pathlib import Path
from typing import List, Any

from klaros.models import UniversalChat
from klaros.exporters.base import BaseExporter


class JSONExporter(BaseExporter):
    """
    Exports conversations to universal JSON format.
    
    Features:
    - Clean JSON output using the UniversalChat schema
    - Optional pretty printing
    - Single file or directory output
    """
    
    def __init__(
        self,
        pretty: bool = True,
        single_file: bool = True
    ):
        """
        Initialize the JSON exporter.
        
        Args:
            pretty: Pretty print JSON output
            single_file: Export all conversations to single file
        """
        self.pretty = pretty
        self.single_file = single_file
    
    def export(self, chats: List[UniversalChat], output_path: Path) -> None:
        """
        Export conversations to JSON.
        
        Args:
            chats: List of conversations to export
            output_path: Path to write output
        """
        if self.single_file:
            self._export_single_file(chats, output_path)
        else:
            self._export_multiple_files(chats, output_path)
    
    def _export_single_file(self, chats: List[UniversalChat], output_path: Path) -> None:
        """Export all chats to a single JSON file."""
        # Ensure .json extension
        if output_path.suffix.lower() != '.json':
            output_path = output_path.with_suffix('.json')
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        data = [self._chat_to_dict(chat) for chat in chats]
        
        with open(output_path, 'w', encoding='utf-8') as f:
            if self.pretty:
                json.dump(data, f, indent=2, default=self._json_serializer)
            else:
                json.dump(data, f, default=self._json_serializer)
    
    def _export_multiple_files(self, chats: List[UniversalChat], output_path: Path) -> None:
        """Export each chat to a separate JSON file."""
        output_path.mkdir(parents=True, exist_ok=True)
        
        for chat in chats:
            file_name = f"{chat.id}.json"
            file_path = output_path / file_name
            
            data = self._chat_to_dict(chat)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                if self.pretty:
                    json.dump(data, f, indent=2, default=self._json_serializer)
                else:
                    json.dump(data, f, default=self._json_serializer)
    
    def export_single(self, chat: UniversalChat) -> str:
        """
        Export a single conversation to JSON string.
        
        Args:
            chat: Conversation to export
            
        Returns:
            JSON formatted string
        """
        data = self._chat_to_dict(chat)
        
        if self.pretty:
            return json.dumps(data, indent=2, default=self._json_serializer)
        else:
            return json.dumps(data, default=self._json_serializer)
    
    def _chat_to_dict(self, chat: UniversalChat) -> dict[str, Any]:
        """Convert UniversalChat to serializable dict."""
        return {
            "id": chat.id,
            "source": chat.source,
            "source_file": chat.source_file,
            "title": chat.title,
            "created_at": chat.created_at.isoformat() if chat.created_at else None,
            "updated_at": chat.updated_at.isoformat() if chat.updated_at else None,
            "messages": [
                {
                    "id": msg.id,
                    "role": msg.role,
                    "text": msg.text,
                    "timestamp": msg.timestamp.isoformat() if msg.timestamp else None,
                    "metadata": msg.metadata
                }
                for msg in chat.messages
            ],
            "tags": chat.tags,
            "token_count": chat.token_count
        }
    
    def _json_serializer(self, obj: Any) -> Any:
        """Custom JSON serializer for special types."""
        if isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
