/**
 * MCP Client Manager
 * Manages connections to Model Context Protocol servers.
 */
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';

type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;

// Store for MCP clients
const mcpClients: Map<string, MCPClient> = new Map();

// Track initialization state
let initialized = false;

/**
 * Initialize MCP clients based on environment configuration
 */
export async function initializeMCPClients(): Promise<void> {
    if (initialized) {
        console.log('[MCP] Already initialized, skipping...');
        return;
    }

    console.log('[MCP] Initializing MCP clients...');

    try {
        // Memory MCP Server (if configured)
        const memoryMCPUrl = process.env.MEMORY_MCP_URL;
        if (memoryMCPUrl) {
            console.log(`[MCP] Connecting to Memory MCP at ${memoryMCPUrl}...`);
            const memoryClient = await createMCPClient({
                transport: {
                    type: 'sse',
                    url: memoryMCPUrl,
                },
            });
            mcpClients.set('memory', memoryClient);
            console.log('[MCP] Memory MCP client connected');
        }

        // Add more MCP servers here as needed
        // Example: File system MCP, Search MCP, etc.

        initialized = true;
        console.log(`[MCP] Initialized ${mcpClients.size} MCP client(s)`);
    } catch (error) {
        console.error('[MCP] Failed to initialize MCP clients:', error);
        // Don't throw - MCP is optional, app should still work without it
    }
}

/**
 * Get tools from all connected MCP servers
 */
export async function getMCPTools(): Promise<Record<string, unknown>> {
    const allTools: Record<string, unknown> = {};

    for (const [name, client] of mcpClients) {
        try {
            const tools = await client.tools();
            // Prefix tool names with MCP server name to avoid conflicts
            for (const [toolName, tool] of Object.entries(tools)) {
                allTools[`mcp_${name}_${toolName}`] = tool;
            }
        } catch (error) {
            console.error(`[MCP] Failed to get tools from ${name}:`, error);
        }
    }

    return allTools;
}

/**
 * Get a specific MCP client by name
 */
export function getMCPClient(name: string): MCPClient | undefined {
    return mcpClients.get(name);
}

/**
 * Check if MCP clients are initialized
 */
export function isMCPInitialized(): boolean {
    return initialized;
}

/**
 * Get list of connected MCP servers
 */
export function getConnectedMCPServers(): string[] {
    return Array.from(mcpClients.keys());
}

/**
 * Close all MCP client connections
 */
export async function closeMCPClients(): Promise<void> {
    console.log('[MCP] Closing MCP clients...');

    const closePromises = Array.from(mcpClients.entries()).map(async ([name, client]) => {
        try {
            await client.close();
            console.log(`[MCP] Closed ${name} client`);
        } catch (error) {
            console.error(`[MCP] Error closing ${name} client:`, error);
        }
    });

    await Promise.all(closePromises);
    mcpClients.clear();
    initialized = false;

    console.log('[MCP] All MCP clients closed');
}

/**
 * Health check for MCP connections
 */
export async function checkMCPHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    for (const [name, client] of mcpClients) {
        try {
            // Try to get tools as a health check
            await client.tools();
            health[name] = true;
        } catch {
            health[name] = false;
        }
    }

    return health;
}
