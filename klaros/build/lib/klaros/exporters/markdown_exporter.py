"""Markdown exporter for Obsidian/Notion compatibility."""

import re
from datetime import datetime
from pathlib import Path
from typing import List

from klaros.models import UniversalChat
from klaros.exporters.base import BaseExporter


class MarkdownExporter(BaseExporter):
    """
    Exports conversations to Obsidian-compatible Markdown files.
    
    Features:
    - YAML frontmatter with metadata (title, date, tags, source)
    - Clean message formatting with role headers
    - Sanitized filenames for cross-platform compatibility
    - Organized folder structure by date (optional)
    """
    
    def __init__(
        self,
        include_frontmatter: bool = True,
        organize_by_date: bool = False,
        include_timestamps: bool = False
    ):
        """
        Initialize the Markdown exporter.
        
        Args:
            include_frontmatter: Add YAML frontmatter for Obsidian
            organize_by_date: Create date-based folder structure
            include_timestamps: Include message timestamps
        """
        self.include_frontmatter = include_frontmatter
        self.organize_by_date = organize_by_date
        self.include_timestamps = include_timestamps
    
    def export(self, chats: List[UniversalChat], output_path: Path) -> None:
        """
        Export conversations to Markdown files.
        
        Args:
            chats: List of conversations to export
            output_path: Directory to write files to
        """
        output_path.mkdir(parents=True, exist_ok=True)
        
        for chat in chats:
            # Determine file path
            file_name = self._sanitize_filename(chat.title) + ".md"
            
            if self.organize_by_date and chat.created_at:
                date_folder = chat.created_at.strftime("%Y/%m")
                file_path = output_path / date_folder / file_name
                file_path.parent.mkdir(parents=True, exist_ok=True)
            else:
                file_path = output_path / file_name
            
            # Handle duplicate filenames
            file_path = self._unique_path(file_path)
            
            # Write content
            content = self.export_single(chat)
            file_path.write_text(content, encoding='utf-8')
    
    def export_single(self, chat: UniversalChat) -> str:
        """
        Export a single conversation to Markdown string.
        
        Args:
            chat: Conversation to export
            
        Returns:
            Markdown formatted string
        """
        parts = []
        
        # YAML Frontmatter
        if self.include_frontmatter:
            parts.append(self._build_frontmatter(chat))
        
        # Title
        parts.append(f"# {chat.title}\n")
        
        # Messages
        for msg in chat.messages:
            role_header = self._format_role(msg.role)
            
            # Add timestamp if enabled
            if self.include_timestamps and msg.timestamp:
                timestamp_str = msg.timestamp.strftime("%Y-%m-%d %H:%M")
                role_header = f"{role_header} ({timestamp_str})"
            
            parts.append(f"## {role_header}\n")
            parts.append(f"{msg.text}\n")
        
        return "\n".join(parts)
    
    def _build_frontmatter(self, chat: UniversalChat) -> str:
        """Build YAML frontmatter block."""
        lines = ["---"]
        
        # Title
        safe_title = chat.title.replace('"', '\\"')
        lines.append(f'title: "{safe_title}"')
        
        # Date
        if chat.created_at:
            lines.append(f"date: {chat.created_at.strftime('%Y-%m-%d')}")
        
        # Source
        lines.append(f"source: {chat.source}")
        
        # Tags
        if chat.tags:
            tag_list = ", ".join(chat.tags)
            lines.append(f"tags: [{tag_list}]")
        
        # Message count
        lines.append(f"messages: {len(chat.messages)}")
        
        lines.append("---\n")
        
        return "\n".join(lines)
    
    def _format_role(self, role: str) -> str:
        """Format role for display."""
        role_map = {
            "user": "👤 User",
            "assistant": "🤖 Assistant",
            "system": "⚙️ System"
        }
        return role_map.get(role, role.title())
    
    def _sanitize_filename(self, title: str) -> str:
        """Sanitize title for use as filename."""
        # Remove/replace invalid characters
        sanitized = re.sub(r'[<>:"/\\|?*]', '', title)
        sanitized = re.sub(r'\s+', ' ', sanitized).strip()
        
        # Limit length
        if len(sanitized) > 100:
            sanitized = sanitized[:100].rsplit(' ', 1)[0]
        
        # Fallback for empty titles
        if not sanitized:
            sanitized = "Untitled"
        
        return sanitized
    
    def _unique_path(self, path: Path) -> Path:
        """Ensure path is unique by adding suffix if needed."""
        if not path.exists():
            return path
        
        counter = 1
        stem = path.stem
        suffix = path.suffix
        
        while path.exists():
            path = path.with_name(f"{stem}_{counter}{suffix}")
            counter += 1
        
        return path
