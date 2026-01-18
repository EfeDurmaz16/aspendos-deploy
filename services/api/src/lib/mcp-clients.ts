/**
 * MCP Client Manager
 * Manages connections to Model Context Protocol servers with:
 * - Automatic reconnection
 * - Health checks
 * - Connection timeout handling
 * - Graceful degradation
 */
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';

type MCPClient = Awaited<ReturnType<typeof createMCPClient>>;

// Configuration
const CONFIG = {
    connectionTimeout: 10000, // 10 seconds
    healthCheckInterval: 60000, // 1 minute
    maxReconnectAttempts: 3,
    reconnectDelay: 5000, // 5 seconds
};

// MCP Server configuration
interface MCPServerConfig {
    name: string;
    url: string;
    enabled: boolean;
}

// Client state
interface MCPClientState {
    client: MCPClient | null;
    config: MCPServerConfig;
    isConnected: boolean;
    lastHealthCheck: Date | null;
    reconnectAttempts: number;
}

// Store for MCP client states
const mcpStates: Map<string, MCPClientState> = new Map();

// Health check interval handle
let healthCheckIntervalId: NodeJS.Timeout | null = null;

/**
 * Get MCP server configurations from environment
 */
function getMCPServerConfigs(): MCPServerConfig[] {
    const configs: MCPServerConfig[] = [];

    // Memory MCP Server
    const memoryMCPUrl = process.env.MEMORY_MCP_URL;
    if (memoryMCPUrl) {
        configs.push({
            name: 'memory',
            url: memoryMCPUrl,
            enabled: true,
        });
    }

    // Figma MCP Server
    const figmaMCPUrl = process.env.FIGMA_MCP_URL;
    if (figmaMCPUrl) {
        configs.push({
            name: 'figma',
            url: figmaMCPUrl,
            enabled: true,
        });
    }

    // Notion MCP Server
    const notionMCPUrl = process.env.NOTION_MCP_URL;
    if (notionMCPUrl) {
        configs.push({
            name: 'notion',
            url: notionMCPUrl,
            enabled: true,
        });
    }

    // Slack MCP Server
    const slackMCPUrl = process.env.SLACK_MCP_URL;
    if (slackMCPUrl) {
        configs.push({
            name: 'slack',
            url: slackMCPUrl,
            enabled: true,
        });
    }

    // GitHub MCP Server
    const githubMCPUrl = process.env.GITHUB_MCP_URL;
    if (githubMCPUrl) {
        configs.push({
            name: 'github',
            url: githubMCPUrl,
            enabled: true,
        });
    }

    return configs;
}

/**
 * Connect to a single MCP server with timeout
 */
async function connectToMCPServer(config: MCPServerConfig): Promise<MCPClient | null> {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.warn(`[MCP] Connection to ${config.name} timed out`);
            resolve(null);
        }, CONFIG.connectionTimeout);

        createMCPClient({
            transport: {
                type: 'sse',
                url: config.url,
            },
        })
            .then((client) => {
                clearTimeout(timeout);
                console.log(`[MCP] Connected to ${config.name}`);
                resolve(client);
            })
            .catch((error) => {
                clearTimeout(timeout);
                console.error(`[MCP] Failed to connect to ${config.name}:`, error);
                resolve(null);
            });
    });
}

/**
 * Attempt to reconnect to a disconnected server
 */
async function reconnectMCPServer(name: string): Promise<boolean> {
    const state = mcpStates.get(name);
    if (!state) return false;

    if (state.reconnectAttempts >= CONFIG.maxReconnectAttempts) {
        console.warn(`[MCP] Max reconnect attempts reached for ${name}`);
        return false;
    }

    state.reconnectAttempts++;
    console.log(
        `[MCP] Attempting to reconnect to ${name} (attempt ${state.reconnectAttempts}/${CONFIG.maxReconnectAttempts})`
    );

    // Close existing client if any
    if (state.client) {
        try {
            await state.client.close();
        } catch {
            // Ignore close errors
        }
    }

    const client = await connectToMCPServer(state.config);
    if (client) {
        state.client = client;
        state.isConnected = true;
        state.reconnectAttempts = 0;
        state.lastHealthCheck = new Date();
        console.log(`[MCP] Successfully reconnected to ${name}`);
        return true;
    }

    return false;
}

/**
 * Initialize MCP clients based on environment configuration
 */
export async function initializeMCPClients(): Promise<void> {
    const configs = getMCPServerConfigs();

    if (configs.length === 0) {
        console.log('[MCP] No MCP servers configured');
        return;
    }

    console.log(`[MCP] Initializing ${configs.length} MCP client(s)...`);

    // Connect to all servers in parallel
    const connectionPromises = configs.map(async (config) => {
        const client = await connectToMCPServer(config);

        mcpStates.set(config.name, {
            client,
            config,
            isConnected: client !== null,
            lastHealthCheck: client ? new Date() : null,
            reconnectAttempts: 0,
        });
    });

    await Promise.all(connectionPromises);

    const connectedCount = Array.from(mcpStates.values()).filter((s) => s.isConnected).length;
    console.log(`[MCP] Initialized ${connectedCount}/${configs.length} MCP client(s)`);

    // Start health check interval
    startHealthCheckInterval();
}

/**
 * Start periodic health checks
 */
function startHealthCheckInterval(): void {
    if (healthCheckIntervalId) {
        clearInterval(healthCheckIntervalId);
    }

    healthCheckIntervalId = setInterval(async () => {
        await performHealthChecks();
    }, CONFIG.healthCheckInterval);
}

/**
 * Perform health checks on all MCP connections
 */
async function performHealthChecks(): Promise<void> {
    for (const [name, state] of mcpStates) {
        if (!state.isConnected) {
            // Try to reconnect disconnected servers
            await reconnectMCPServer(name);
            continue;
        }

        try {
            // Attempt to get tools as a health check
            await state.client!.tools();
            state.lastHealthCheck = new Date();
        } catch (error) {
            console.warn(`[MCP] Health check failed for ${name}:`, error);
            state.isConnected = false;

            // Schedule reconnection
            setTimeout(() => {
                reconnectMCPServer(name);
            }, CONFIG.reconnectDelay);
        }
    }
}

/**
 * Get tools from all connected MCP servers
 */
export async function getMCPTools(): Promise<Record<string, unknown>> {
    const allTools: Record<string, unknown> = {};

    for (const [name, state] of mcpStates) {
        if (!state.isConnected || !state.client) continue;

        try {
            const tools = await state.client.tools();
            // Prefix tool names with MCP server name to avoid conflicts
            for (const [toolName, tool] of Object.entries(tools)) {
                allTools[`mcp_${name}_${toolName}`] = tool;
            }
        } catch (error) {
            console.error(`[MCP] Failed to get tools from ${name}:`, error);
            state.isConnected = false;
        }
    }

    return allTools;
}

/**
 * Get a specific MCP client by name
 */
export function getMCPClient(name: string): MCPClient | undefined {
    const state = mcpStates.get(name);
    return state?.isConnected ? (state.client ?? undefined) : undefined;
}

/**
 * Check if any MCP clients are initialized and connected
 */
export function isMCPInitialized(): boolean {
    return Array.from(mcpStates.values()).some((s) => s.isConnected);
}

/**
 * Get list of connected MCP servers
 */
export function getConnectedMCPServers(): string[] {
    return Array.from(mcpStates.entries())
        .filter(([, state]) => state.isConnected)
        .map(([name]) => name);
}

/**
 * Get detailed status of all MCP servers
 */
export function getMCPStatus(): Record<
    string,
    {
        connected: boolean;
        lastHealthCheck: string | null;
        reconnectAttempts: number;
    }
> {
    const status: Record<
        string,
        {
            connected: boolean;
            lastHealthCheck: string | null;
            reconnectAttempts: number;
        }
    > = {};

    for (const [name, state] of mcpStates) {
        status[name] = {
            connected: state.isConnected,
            lastHealthCheck: state.lastHealthCheck?.toISOString() ?? null,
            reconnectAttempts: state.reconnectAttempts,
        };
    }

    return status;
}

/**
 * Close all MCP client connections
 */
export async function closeMCPClients(): Promise<void> {
    console.log('[MCP] Closing MCP clients...');

    // Stop health check interval
    if (healthCheckIntervalId) {
        clearInterval(healthCheckIntervalId);
        healthCheckIntervalId = null;
    }

    const closePromises = Array.from(mcpStates.entries()).map(async ([name, state]) => {
        if (state.client) {
            try {
                await state.client.close();
                console.log(`[MCP] Closed ${name} client`);
            } catch (error) {
                console.error(`[MCP] Error closing ${name} client:`, error);
            }
        }
    });

    await Promise.all(closePromises);
    mcpStates.clear();

    console.log('[MCP] All MCP clients closed');
}

/**
 * Health check for MCP connections (public API)
 */
export async function checkMCPHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    for (const [name, state] of mcpStates) {
        if (!state.isConnected || !state.client) {
            health[name] = false;
            continue;
        }

        try {
            await state.client.tools();
            health[name] = true;
        } catch {
            health[name] = false;
        }
    }

    return health;
}

/**
 * Force reconnection to a specific MCP server
 */
export async function forceReconnect(name: string): Promise<boolean> {
    const state = mcpStates.get(name);
    if (!state) {
        console.warn(`[MCP] Unknown server: ${name}`);
        return false;
    }

    // Reset reconnect attempts to allow forced reconnection
    state.reconnectAttempts = 0;
    return reconnectMCPServer(name);
}
