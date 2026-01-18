"""Exporters for various output formats."""

from klaros.exporters.base import BaseExporter
from klaros.exporters.markdown_exporter import MarkdownExporter
from klaros.exporters.json_exporter import JSONExporter
from klaros.exporters.aspendos_exporter import AspendosExporter


def get_exporter(format: str) -> BaseExporter:
    """
    Factory function to get the appropriate exporter for an output format.
    
    Args:
        format: Output format name (markdown, json, aspendos)
        
    Returns:
        Exporter instance for the specified format
        
    Raises:
        ValueError: If the format is not supported
    """
    exporters = {
        'markdown': MarkdownExporter,
        'md': MarkdownExporter,
        'json': JSONExporter,
        'aspendos': AspendosExporter,
    }
    
    exporter_class = exporters.get(format.lower())
    if not exporter_class:
        raise ValueError(
            f"Unsupported export format: {format}. "
            f"Supported formats: {', '.join(exporters.keys())}"
        )
    
    return exporter_class()


__all__ = [
    'BaseExporter',
    'MarkdownExporter',
    'JSONExporter',
    'AspendosExporter',
    'get_exporter',
]
