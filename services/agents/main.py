"""
Aspendos Agent Service
FastAPI-based service for LangGraph agent orchestration with MCP support.
"""
import os
import sys

# Add the service root to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import json

from core.config import get_settings
from providers.llm import list_available_models
from graphs.chat_agent import run_agent, stream_agent
from tools.mcp_handler import mcp_registry


app = FastAPI(
    title="Aspendos Agent Service",
    description="LangGraph-based agent orchestration with multi-provider LLM and MCP support",
    version="0.2.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://aspendos.net"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Request/Response Models
# ============================================

class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    model_id: str = "gpt-4o"
    user_id: str = "anonymous"
    chat_id: str = "default"
    include_mcp_tools: bool = True
    stream: bool = False


class MCPServerRequest(BaseModel):
    name: str
    url: str


# ============================================
# Health & Info Endpoints
# ============================================

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "agents", "version": "0.2.0"}


@app.get("/models")
async def list_models():
    """List available LLM models."""
    return {"models": list_available_models()}


# ============================================
# Chat Endpoints
# ============================================

@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Run chat agent with given messages.
    Returns full response or streams tokens.
    """
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    
    if request.stream:
        async def generate():
            async for event in stream_agent(
                messages=messages,
                model_id=request.model_id,
                user_id=request.user_id,
                chat_id=request.chat_id,
                include_mcp_tools=request.include_mcp_tools,
            ):
                yield f"data: {json.dumps(event)}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
        )
    
    else:
        result = await run_agent(
            messages=messages,
            model_id=request.model_id,
            user_id=request.user_id,
            chat_id=request.chat_id,
            include_mcp_tools=request.include_mcp_tools,
        )
        return result


# ============================================
# MCP Server Management Endpoints
# ============================================

@app.get("/mcp/servers")
async def list_mcp_servers():
    """List connected MCP servers."""
    return {"servers": mcp_registry.list_servers()}


@app.post("/mcp/connect")
async def connect_mcp_server(request: MCPServerRequest):
    """Connect to an MCP server."""
    try:
        server = await mcp_registry.connect_server(request.name, request.url)
        return {
            "connected": True,
            "name": server.name,
            "url": server.url,
            "tools_count": len(server.tools)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/mcp/disconnect/{server_name}")
async def disconnect_mcp_server(server_name: str):
    """Disconnect from an MCP server."""
    success = await mcp_registry.disconnect_server(server_name)
    if not success:
        raise HTTPException(status_code=404, detail=f"Server '{server_name}' not found")
    return {"disconnected": True, "name": server_name}


@app.get("/mcp/tools")
async def list_mcp_tools(server_name: Optional[str] = None):
    """List available MCP tools."""
    tools = mcp_registry.get_langchain_tools(server_name=server_name)
    return {
        "tools": [
            {"name": t.name, "description": t.description}
            for t in tools
        ]
    }


# ============================================
# Run Server
# ============================================

if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(app, host="0.0.0.0", port=settings.port)
