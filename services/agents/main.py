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
from typing import Optional, Literal
import json

from core.config import get_settings
from providers.llm import list_available_models
from providers.models import get_pinned_models, get_all_models, ModelCategory
from providers.router import router as model_router, RoutingMode, RoutingConfig
from graphs.chat_agent import run_agent, stream_agent
from tools.mcp_handler import mcp_registry


app = FastAPI(
    title="Aspendos Agent Service",
    description="LangGraph-based agent orchestration with multi-provider LLM and MCP support",
    version="0.3.0"
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
    model_id: str = "openai/gpt-5.2"
    user_id: str = "anonymous"
    chat_id: str = "default"
    include_mcp_tools: bool = True
    stream: bool = False
    # Routing options
    routing_mode: Literal["auto", "max", "multi", "manual"] = "manual"
    enable_thinking: bool = False
    temperature: float = 0.7


class MultiModelRequest(BaseModel):
    """Request for multi-model batch (ULTRA only)."""
    messages: list[Message]
    models: list[str]  # Up to 5 models
    user_id: str = "anonymous"
    chat_id: str = "default"


class MCPServerRequest(BaseModel):
    name: str
    url: str


# ============================================
# Health & Info Endpoints
# ============================================

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "agents", "version": "0.3.0"}


# ============================================
# Model Endpoints
# ============================================

@app.get("/models")
async def list_models():
    """List all available LLM models."""
    return {"models": list_available_models()}


@app.get("/models/pinned")
async def list_pinned_models():
    """List pinned models for the main selector."""
    pinned = get_pinned_models()
    return {
        "models": [
            {
                "id": m.id,
                "display_name": m.display_name,
                "provider": m.provider.value,
                "category": m.category.value,
                "supports_thinking": m.supports_thinking,
            }
            for m in pinned
        ]
    }


@app.get("/models/by-category/{category}")
async def list_models_by_category(category: str):
    """List models by category."""
    try:
        cat = ModelCategory(category)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
    
    from providers.models import get_models_by_category
    models = get_models_by_category(cat)
    return {
        "category": category,
        "models": [
            {"id": m.id, "display_name": m.display_name, "provider": m.provider.value}
            for m in models
        ]
    }


# ============================================
# Chat Endpoints
# ============================================

@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Run chat agent with given messages.
    Supports Auto, MAX, and Manual routing modes.
    Returns full response or streams tokens.
    """
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    
    # Determine model via routing
    routing_config = RoutingConfig(
        mode=RoutingMode(request.routing_mode),
        preferred_model=request.model_id,
        enable_thinking=request.enable_thinking,
        temperature=request.temperature,
    )
    
    # Get last user message for routing decision
    last_user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
    routing_result = model_router.route(last_user_msg, routing_config)
    
    selected_model = routing_result.selected_model
    
    if request.stream:
        async def generate():
            # Send routing info first
            yield f"data: {json.dumps({'type': 'routing', 'model': selected_model, 'reason': routing_result.reason})}\n\n"
            
            async for event in stream_agent(
                messages=messages,
                model_id=selected_model,
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
            model_id=selected_model,
            user_id=request.user_id,
            chat_id=request.chat_id,
            include_mcp_tools=request.include_mcp_tools,
        )
        result["routing"] = {
            "selected_model": selected_model,
            "reason": routing_result.reason,
        }
        return result


@app.post("/chat/multi")
async def chat_multi_model(request: MultiModelRequest):
    """
    Multi-Model Batch: Run query on multiple models in parallel.
    ULTRA tier only. Returns responses from all models.
    """
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    
    # Limit to 5 models
    models = request.models[:5]
    
    if len(models) < 2:
        raise HTTPException(status_code=400, detail="At least 2 models required for multi-model mode")
    
    # Run multi-model routing
    results = await model_router.route_multi(
        query=messages[-1]["content"] if messages else "",
        messages=messages,
        models=models,
        config=RoutingConfig(mode=RoutingMode.MULTI),
    )
    
    return {
        "models_used": models,
        "responses": results,
    }


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
