"""
Klaros CLI - Liberate your digital context.

A local-first CLI tool to convert AI chat exports into universal formats.
"""

import time
from pathlib import Path
from typing import Optional
from enum import Enum

import typer
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.table import Table
from rich import print as rprint

from klaros import __version__
from klaros.models import SourcePlatform, ConversionStats
from klaros.loaders import get_loader
from klaros.processors import CleanerService, PrivacyService, TaggerService
from klaros.exporters import get_exporter


app = typer.Typer(
    name="klaros",
    help="🔓 Klaros - Liberate your digital context.\n\n"
         "Convert AI chat exports from ChatGPT, Claude, and more into "
         "universal formats like Markdown, JSON, or Aspendos-ready imports.",
    add_completion=False,
    rich_markup_mode="rich"
)

console = Console()


class OutputFormat(str, Enum):
    """Supported output formats."""
    MARKDOWN = "markdown"
    JSON = "json"
    ASPENDOS = "aspendos"


class SourceType(str, Enum):
    """Supported source platforms."""
    CHATGPT = "chatgpt"
    CLAUDE = "claude"


@app.command()
def convert(
    input_file: Path = typer.Argument(
        ...,
        help="Path to the conversation export file (JSON)",
        exists=True,
        readable=True
    ),
    source: SourceType = typer.Option(
        ...,
        "--source", "-s",
        help="Source platform (chatgpt or claude)"
    ),
    output: Path = typer.Option(
        "./klaros-output",
        "--output", "-o",
        help="Output path (directory for markdown, file for json/aspendos)"
    ),
    format: OutputFormat = typer.Option(
        OutputFormat.MARKDOWN,
        "--format", "-f",
        help="Output format"
    ),
    redact_pii: bool = typer.Option(
        False,
        "--redact-pii",
        help="Redact emails, phones, and other PII"
    ),
    extract_tags: bool = typer.Option(
        True,
        "--tags/--no-tags",
        help="Extract keyword tags from conversations"
    ),
    clean: bool = typer.Option(
        True,
        "--clean/--no-clean",
        help="Remove boilerplate and normalize whitespace"
    )
):
    """
    🔄 Convert AI chat exports to universal formats.
    
    Examples:
    
        klaros convert conversations.json -s claude -f markdown -o ./obsidian-vault/
        
        klaros convert chatgpt-export.json -s chatgpt -f aspendos --redact-pii -o ./import.json
    """
    start_time = time.time()
    
    console.print(f"\n[bold blue]🔓 Klaros v{__version__}[/bold blue]")
    console.print(f"   [dim]Liberating your digital context...[/dim]\n")
    
    # Initialize loader
    try:
        platform = SourcePlatform(source.value)
        loader = get_loader(platform)
    except ValueError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1)
    
    # Initialize processors
    processors = []
    
    if clean:
        processors.append(CleanerService())
    
    if redact_pii:
        processors.append(PrivacyService())
    
    if extract_tags:
        processors.append(TaggerService())
    
    # Initialize exporter
    try:
        exporter = get_exporter(format.value)
    except ValueError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1)
    
    # Count conversations for progress bar
    console.print(f"[dim]📂 Reading {input_file.name}...[/dim]")
    try:
        total_conversations = loader.count_conversations(input_file)
    except Exception as e:
        console.print(f"[red]Error reading file:[/red] {e}")
        raise typer.Exit(1)
    
    console.print(f"[green]✓[/green] Found {total_conversations} conversations\n")
    
    # Process conversations
    processed_chats = []
    stats = ConversionStats(source_platform=platform, output_format=format.value)
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console
    ) as progress:
        task = progress.add_task("Processing...", total=total_conversations)
        
        for chat in loader.load(input_file):
            stats.total_conversations += 1
            
            # Apply processors
            for processor in processors:
                chat = processor.process(chat)
            
            # Skip empty chats after processing
            if not chat.messages:
                stats.skipped_empty += 1
                progress.advance(task)
                continue
            
            stats.total_messages += len(chat.messages)
            processed_chats.append(chat)
            progress.advance(task)
    
    # Export
    console.print(f"\n[dim]💾 Exporting to {format.value}...[/dim]")
    
    try:
        exporter.export(processed_chats, output)
        console.print(f"[green]✓[/green] Exported to {output}")
    except Exception as e:
        console.print(f"[red]Error exporting:[/red] {e}")
        raise typer.Exit(1)
    
    # Stats
    stats.processing_time_seconds = time.time() - start_time
    
    console.print("\n[bold]📊 Summary[/bold]")
    table = Table(show_header=False, box=None)
    table.add_row("Conversations processed:", str(stats.total_conversations))
    table.add_row("Messages exported:", str(stats.total_messages))
    table.add_row("Skipped (empty):", str(stats.skipped_empty))
    table.add_row("Processing time:", f"{stats.processing_time_seconds:.2f}s")
    console.print(table)
    
    # Aspendos promotion for aspendos format
    if format == OutputFormat.ASPENDOS:
        console.print(
            "\n[dim]💡 This export is pre-optimized for Aspendos Memory Cloud.[/dim]"
            "\n[dim]   Import processing time reduced by ~90%.[/dim]"
            "\n[dim]   → [link=https://aspendos.ai]https://aspendos.ai[/link][/dim]"
        )
    
    console.print()


@app.command()
def info(
    input_file: Path = typer.Argument(
        ...,
        help="Path to the conversation export file (JSON)",
        exists=True,
        readable=True
    ),
    source: SourceType = typer.Option(
        ...,
        "--source", "-s",
        help="Source platform (chatgpt or claude)"
    )
):
    """
    ℹ️  Display information about an export file.
    
    Shows conversation count, message stats, and date range.
    """
    console.print(f"\n[bold blue]🔓 Klaros v{__version__}[/bold blue]\n")
    
    # Initialize loader
    try:
        platform = SourcePlatform(source.value)
        loader = get_loader(platform)
    except ValueError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1)
    
    console.print(f"[dim]📂 Analyzing {input_file.name}...[/dim]\n")
    
    # Gather stats
    total_conversations = 0
    total_messages = 0
    earliest_date = None
    latest_date = None
    
    for chat in loader.load(input_file):
        total_conversations += 1
        total_messages += len(chat.messages)
        
        if chat.created_at:
            if earliest_date is None or chat.created_at < earliest_date:
                earliest_date = chat.created_at
            if latest_date is None or chat.created_at > latest_date:
                latest_date = chat.created_at
    
    # Display results
    table = Table(title="Export File Analysis", show_header=False)
    table.add_row("📁 File", str(input_file.name))
    table.add_row("📦 Size", f"{input_file.stat().st_size / 1024 / 1024:.2f} MB")
    table.add_row("🏷️  Source", source.value)
    table.add_row("💬 Conversations", str(total_conversations))
    table.add_row("✉️  Messages", str(total_messages))
    
    if earliest_date:
        table.add_row("📅 Date Range", 
                      f"{earliest_date.strftime('%Y-%m-%d')} → {latest_date.strftime('%Y-%m-%d')}")
    
    console.print(table)
    console.print()


@app.command()
def version():
    """Show version information."""
    console.print(f"[bold blue]🔓 Klaros[/bold blue] v{__version__}")
    console.print("[dim]Liberate your digital context.[/dim]")


if __name__ == "__main__":
    app()
