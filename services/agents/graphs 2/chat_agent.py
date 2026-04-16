"""
Aspendos Chat Agent Graph
LangGraph-based agent with tool calling, guard chain, and budget management.
"""
from typing import Annotated, Sequence, TypedDict, Literal
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver

from providers.llm import get_llm
from tools import BUILTIN_TOOLS, mcp_registry
from core.guards import create_default_guard_chain, GuardContext, DecisionType


class AgentState(TypedDict):
    """State for the chat agent with governance budget fields."""
    messages: Annotated[Sequence[BaseMessage], "The conversation messages"]
    model_id: str
    user_id: str
    chat_id: str
    # Governance: iteration and cost budgets (from Hermes Agent pattern)
    iteration_budget: int       # Max tool calls allowed (default: 25)
    iterations_used: int        # Current tool call count
    cost_budget_usd: float      # Max cost in USD
    cost_used_usd: float        # Current accumulated cost
    guard_warnings: list[str]   # Accumulated guard warnings


def create_chat_agent(
    model_id: str = "gpt-4o",
    include_mcp_tools: bool = True,
    mcp_server_name: str | None = None,
):
    """
    Create a LangGraph chat agent with tool calling capabilities.
    
    Args:
        model_id: The model to use for the agent
        include_mcp_tools: Whether to include MCP tools
        mcp_server_name: Optional specific MCP server to use
    
    Returns:
        Compiled LangGraph StateGraph
    """
    # Get LLM
    llm = get_llm(model_id=model_id)
    
    # Collect tools
    tools = list(BUILTIN_TOOLS)
    
    if include_mcp_tools:
        mcp_tools = mcp_registry.get_langchain_tools(server_name=mcp_server_name)
        tools.extend(mcp_tools)
    
    # Bind tools to LLM
    llm_with_tools = llm.bind_tools(tools) if tools else llm
    
    # Define nodes
    def call_model(state: AgentState) -> dict:
        """Call the LLM with current messages."""
        messages = state["messages"]
        response = llm_with_tools.invoke(messages)
        return {"messages": [response]}
    
    # Guard chain for tool execution governance
    guard_chain = create_default_guard_chain(
        max_iterations=25,
        max_cost_usd=5.0,
    )

    def should_continue(state: AgentState) -> Literal["tools", "end"]:
        """Determine if we should continue to tools or end."""
        last_message = state["messages"][-1]

        # Check iteration budget
        iterations_used = state.get("iterations_used", 0)
        iteration_budget = state.get("iteration_budget", 25)
        if iterations_used >= iteration_budget:
            return "end"

        # If the LLM made a tool call, route to tools node
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"

        # Otherwise, end the conversation turn
        return "end"

    async def guard_check(state: AgentState) -> dict:
        """Evaluate guard chain before tool execution."""
        last_message = state["messages"][-1]
        iterations_used = state.get("iterations_used", 0)
        warnings = list(state.get("guard_warnings", []))

        if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
            return {"iterations_used": iterations_used}

        for tool_call in last_message.tool_calls:
            context = GuardContext(
                tool_name=tool_call.get("name", ""),
                tool_args=tool_call.get("args", {}),
                user_id=state.get("user_id", ""),
                session_id=state.get("chat_id", ""),
                tool_call_count=iterations_used,
            )
            result = await guard_chain.evaluate(context)

            if result.decision.type == DecisionType.BLOCK:
                # Add a message explaining the block
                block_msg = ToolMessage(
                    content=f"[BLOCKED] {result.decision.reason}",
                    tool_call_id=tool_call.get("id", ""),
                )
                return {
                    "messages": [block_msg],
                    "iterations_used": iterations_used + 1,
                    "guard_warnings": warnings + result.warnings,
                }

            warnings.extend(result.warnings)

        return {
            "iterations_used": iterations_used + 1,
            "guard_warnings": warnings,
        }

    # Build the graph
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("agent", call_model)
    workflow.add_node("guard_check", guard_check)
    workflow.add_node("tools", ToolNode(tools))

    # Set entry point
    workflow.set_entry_point("agent")

    # Add conditional edges: agent → should_continue → [guard_check | end]
    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "guard_check",
            "end": END,
        }
    )

    # Guard check always goes to tools (unless it blocked, then back to agent)
    workflow.add_edge("guard_check", "tools")

    # Tools always go back to agent
    workflow.add_edge("tools", "agent")
    
    # Compile with memory checkpointer
    memory = MemorySaver()
    app = workflow.compile(checkpointer=memory)
    
    return app


async def run_agent(
    messages: list[dict],
    model_id: str = "gpt-4o",
    user_id: str = "anonymous",
    chat_id: str = "default",
    include_mcp_tools: bool = True,
) -> dict:
    """
    Run the chat agent with given messages.
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        model_id: Model to use
        user_id: User identifier for memory
        chat_id: Chat identifier for memory
        include_mcp_tools: Whether to include MCP tools
    
    Returns:
        Agent response with messages and metadata
    """
    # Convert to LangChain messages
    langchain_messages = []
    for msg in messages:
        if msg["role"] == "user":
            langchain_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            langchain_messages.append(AIMessage(content=msg["content"]))
    
    # Create and run agent
    agent = create_chat_agent(
        model_id=model_id,
        include_mcp_tools=include_mcp_tools,
    )
    
    config = {"configurable": {"thread_id": f"{user_id}:{chat_id}"}}
    
    initial_state = {
        "messages": langchain_messages,
        "model_id": model_id,
        "user_id": user_id,
        "chat_id": chat_id,
        "iteration_budget": 25,
        "iterations_used": 0,
        "cost_budget_usd": 5.0,
        "cost_used_usd": 0.0,
        "guard_warnings": [],
    }
    
    # Invoke agent
    result = await agent.ainvoke(initial_state, config=config)
    
    # Extract final response
    final_message = result["messages"][-1]
    
    return {
        "content": final_message.content,
        "model_used": model_id,
        "tool_calls": getattr(final_message, "tool_calls", []),
        "messages_count": len(result["messages"]),
    }


async def stream_agent(
    messages: list[dict],
    model_id: str = "gpt-4o",
    user_id: str = "anonymous",
    chat_id: str = "default",
    include_mcp_tools: bool = True,
):
    """
    Stream agent response token by token.
    
    Yields:
        Dict with 'type' and 'content' for each event
    """
    # Convert to LangChain messages
    langchain_messages = []
    for msg in messages:
        if msg["role"] == "user":
            langchain_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            langchain_messages.append(AIMessage(content=msg["content"]))
    
    # Create agent
    agent = create_chat_agent(
        model_id=model_id,
        include_mcp_tools=include_mcp_tools,
    )
    
    config = {"configurable": {"thread_id": f"{user_id}:{chat_id}"}}
    
    initial_state = {
        "messages": langchain_messages,
        "model_id": model_id,
        "user_id": user_id,
        "chat_id": chat_id,
        "iteration_budget": 25,
        "iterations_used": 0,
        "cost_budget_usd": 5.0,
        "cost_used_usd": 0.0,
        "guard_warnings": [],
    }
    
    # Stream events
    async for event in agent.astream_events(initial_state, config=config, version="v2"):
        kind = event["event"]
        
        if kind == "on_chat_model_stream":
            content = event["data"]["chunk"].content
            if content:
                yield {"type": "token", "content": content}
        
        elif kind == "on_tool_start":
            yield {"type": "tool_start", "tool": event["name"]}
        
        elif kind == "on_tool_end":
            yield {"type": "tool_end", "tool": event["name"], "output": str(event["data"]["output"])[:500]}
    
    yield {"type": "end"}
