"""
MCP (Model Context Protocol) Tool Handler
Enables connection to external MCP servers and tool execution.
"""
import asyncio
from typing import Any, Optional
from dataclasses import dataclass, field
from langchain_core.tools import BaseTool, StructuredTool
from pydantic import BaseModel, Field


@dataclass
class MCPServer:
    """Represents a connected MCP server."""
    name: str
    url: str
    tools: list[dict] = field(default_factory=list)
    connected: bool = False


class MCPToolRegistry:
    """
    Registry for MCP tools from connected servers.
    Converts MCP tools to LangChain tools for use in LangGraph.
    """
    
    def __init__(self):
        self.servers: dict[str, MCPServer] = {}
        self._tools_cache: dict[str, BaseTool] = {}
    
    async def connect_server(self, name: str, url: str) -> MCPServer:
        """
        Connect to an MCP server and discover its tools.
        
        Args:
            name: Friendly name for the server
            url: MCP server URL (stdio:// or sse://)
        
        Returns:
            MCPServer instance with discovered tools
        """
        # TODO: Implement actual MCP client connection
        # For now, return placeholder
        server = MCPServer(name=name, url=url, connected=True)
        
        # In real implementation, this would:
        # 1. Connect to MCP server
        # 2. Call tools/list to get available tools
        # 3. Store tool schemas
        
        self.servers[name] = server
        return server
    
    async def disconnect_server(self, name: str) -> bool:
        """Disconnect from an MCP server."""
        if name in self.servers:
            del self.servers[name]
            # Clear cached tools from this server
            self._tools_cache = {
                k: v for k, v in self._tools_cache.items()
                if not k.startswith(f"{name}:")
            }
            return True
        return False
    
    def get_langchain_tools(self, server_name: Optional[str] = None) -> list[BaseTool]:
        """
        Get LangChain-compatible tools from connected MCP servers.
        
        Args:
            server_name: Optional filter by server name
        
        Returns:
            List of LangChain BaseTool instances
        """
        tools = []
        
        for name, server in self.servers.items():
            if server_name and name != server_name:
                continue
            
            for tool_schema in server.tools:
                tool = self._convert_mcp_to_langchain(name, tool_schema)
                tools.append(tool)
        
        return tools
    
    def _convert_mcp_to_langchain(self, server_name: str, tool_schema: dict) -> BaseTool:
        """Convert MCP tool schema to LangChain tool."""
        tool_name = tool_schema.get("name", "unknown")
        cache_key = f"{server_name}:{tool_name}"
        
        if cache_key in self._tools_cache:
            return self._tools_cache[cache_key]
        
        async def tool_func(**kwargs) -> str:
            """Execute MCP tool."""
            # TODO: Implement actual MCP tool call
            return f"MCP tool {tool_name} executed with args: {kwargs}"
        
        tool = StructuredTool.from_function(
            func=tool_func,
            name=tool_name,
            description=tool_schema.get("description", ""),
            coroutine=tool_func,
        )
        
        self._tools_cache[cache_key] = tool
        return tool
    
    def list_servers(self) -> list[dict]:
        """List all connected MCP servers."""
        return [
            {
                "name": s.name,
                "url": s.url,
                "connected": s.connected,
                "tools_count": len(s.tools)
            }
            for s in self.servers.values()
        ]


# Global registry instance
mcp_registry = MCPToolRegistry()
