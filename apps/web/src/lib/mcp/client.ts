// ============================================
// MCP (Model Context Protocol) Client
// ============================================
// This module provides a structure for connecting external tools
// following the Model Context Protocol specification.

export interface MCPTool {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, { type: string; description?: string }>;
        required?: string[];
    };
    execute: (params: Record<string, unknown>) => Promise<MCPToolResult>;
}

export interface MCPToolResult {
    success: boolean;
    content: string | Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export interface MCPServer {
    name: string;
    version: string;
    description?: string;
    tools: MCPTool[];
}

// ============================================
// MCP TOOL REGISTRY
// ============================================

class MCPClient {
    private servers: Map<string, MCPServer> = new Map();
    private tools: Map<string, MCPTool> = new Map();

    /**
     * Register an MCP server and its tools
     */
    registerServer(server: MCPServer): void {
        this.servers.set(server.name, server);

        for (const tool of server.tools) {
            const toolId = `${server.name}:${tool.name}`;
            this.tools.set(toolId, tool);
        }
    }

    /**
     * Unregister an MCP server
     */
    unregisterServer(serverName: string): void {
        const server = this.servers.get(serverName);
        if (!server) return;

        for (const tool of server.tools) {
            this.tools.delete(`${serverName}:${tool.name}`);
        }
        this.servers.delete(serverName);
    }

    /**
     * Get all available tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get tool by ID
     */
    getTool(toolId: string): MCPTool | undefined {
        return this.tools.get(toolId);
    }

    /**
     * Execute a tool
     */
    async executeTool(toolId: string, params: Record<string, unknown>): Promise<MCPToolResult> {
        const tool = this.tools.get(toolId);
        if (!tool) {
            return {
                success: false,
                content: `Tool not found: ${toolId}`,
            };
        }

        try {
            return await tool.execute(params);
        } catch (error) {
            return {
                success: false,
                content: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Get tool schemas for AI function calling
     */
    getToolSchemas(): Array<{
        type: 'function';
        function: {
            name: string;
            description: string;
            parameters: MCPTool['inputSchema'];
        };
    }> {
        return this.getTools().map((tool) => ({
            type: 'function' as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema,
            },
        }));
    }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const mcpClient = new MCPClient();

// ============================================
// BUILT-IN TOOLS
// ============================================

// Web Search Tool
const webSearchTool: MCPTool = {
    name: 'web_search',
    description: 'Search the web for current information',
    inputSchema: {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Search query' },
            num_results: { type: 'number', description: 'Number of results to return (default: 5)' },
        },
        required: ['query'],
    },
    execute: async (params) => {
        // Placeholder - integrate with actual search API
        return {
            success: true,
            content: `[Web search placeholder] Query: ${params.query}`,
            metadata: { resultsCount: 0 },
        };
    },
};

// DateTime Tool
const dateTimeTool: MCPTool = {
    name: 'get_datetime',
    description: 'Get current date and time in various timezones',
    inputSchema: {
        type: 'object',
        properties: {
            timezone: { type: 'string', description: 'Timezone (e.g., "America/New_York")' },
        },
    },
    execute: async (params) => {
        const tz = (params.timezone as string) || 'UTC';
        try {
            const now = new Date().toLocaleString('en-US', { timeZone: tz });
            return {
                success: true,
                content: { datetime: now, timezone: tz },
            };
        } catch {
            return {
                success: false,
                content: `Invalid timezone: ${tz}`,
            };
        }
    },
};

// Calculator Tool
const calculatorTool: MCPTool = {
    name: 'calculate',
    description: 'Perform mathematical calculations',
    inputSchema: {
        type: 'object',
        properties: {
            expression: { type: 'string', description: 'Mathematical expression to evaluate' },
        },
        required: ['expression'],
    },
    execute: async (params) => {
        try {
            const expression = String(params.expression);
            // Strict allowlist: only digits, operators, parentheses, decimal points, spaces
            if (!/^[\d\s+\-*/().%]+$/.test(expression)) {
                throw new Error('Invalid characters in expression');
            }
            // Safe arithmetic evaluation without Function/eval
            const tokens = expression.match(/(\d+\.?\d*|[+\-*/()%])/g);
            if (!tokens) throw new Error('Empty expression');
            // Use a simple recursive descent parser for safety
            let pos = 0;
            const peek = () => tokens[pos];
            const consume = () => tokens[pos++];
            const parseNum = (): number => {
                if (peek() === '(') { consume(); const v = parseExpr(); consume(); return v; }
                if (peek() === '-') { consume(); return -parseNum(); }
                return parseFloat(consume());
            };
            const parseTerm = (): number => {
                let v = parseNum();
                while (peek() === '*' || peek() === '/' || peek() === '%') {
                    const op = consume();
                    const r = parseNum();
                    if (op === '*') v *= r; else if (op === '/') v = r !== 0 ? v / r : NaN; else v %= r;
                }
                return v;
            };
            const parseExpr = (): number => {
                let v = parseTerm();
                while (peek() === '+' || peek() === '-') {
                    const op = consume();
                    const r = parseTerm();
                    if (op === '+') v += r; else v -= r;
                }
                return v;
            };
            const result = parseExpr();
            return {
                success: true,
                content: { expression, result },
            };
        } catch (error) {
            return {
                success: false,
                content: `Calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    },
};

// ============================================
// REGISTER BUILT-IN SERVER
// ============================================

const builtInServer: MCPServer = {
    name: 'aspendos',
    version: '1.0.0',
    description: 'Built-in Aspendos tools',
    tools: [webSearchTool, dateTimeTool, calculatorTool],
};

mcpClient.registerServer(builtInServer);

export default mcpClient;
