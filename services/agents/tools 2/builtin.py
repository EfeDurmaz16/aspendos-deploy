"""
Built-in tools for Aspendos agents.
These are always available regardless of MCP connections.
"""
from langchain_core.tools import tool
from typing import Optional
import httpx


@tool
async def web_search(query: str, num_results: int = 5) -> str:
    """
    Search the web for information.
    
    Args:
        query: Search query
        num_results: Number of results to return
    
    Returns:
        Search results as formatted text
    """
    # TODO: Implement with actual search API (SerpAPI, Tavily, etc.)
    return f"[Web Search Placeholder] Results for: {query}"


@tool
async def code_interpreter(code: str, language: str = "python") -> str:
    """
    Execute code in a sandboxed environment.
    
    Args:
        code: Code to execute
        language: Programming language (python, javascript)
    
    Returns:
        Execution output
    """
    # TODO: Implement with Judge0 or similar
    return f"[Code Interpreter Placeholder] Executed {language} code"


@tool
async def read_url(url: str) -> str:
    """
    Read and extract content from a URL.
    
    Args:
        url: URL to read
    
    Returns:
        Extracted text content
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, follow_redirects=True, timeout=30)
            response.raise_for_status()
            # Simple text extraction - in production use proper HTML parser
            return response.text[:5000]  # Limit content length
    except Exception as e:
        return f"Error reading URL: {str(e)}"


@tool
def calculator(expression: str) -> str:
    """
    Evaluate a mathematical expression.
    
    Args:
        expression: Mathematical expression to evaluate
    
    Returns:
        Result of the calculation
    """
    try:
        # Safe eval with limited scope
        allowed_names = {"__builtins__": {}}
        result = eval(expression, allowed_names, {})
        return str(result)
    except Exception as e:
        return f"Error: {str(e)}"


# Export all built-in tools
BUILTIN_TOOLS = [
    web_search,
    code_interpreter,
    read_url,
    calculator,
]
