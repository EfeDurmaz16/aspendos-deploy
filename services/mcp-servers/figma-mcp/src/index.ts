/**
 * Figma MCP Server
 *
 * Provides Model Context Protocol tools for Figma integration:
 * - list_figma_files: List user's Figma files
 * - get_design_tokens: Extract design tokens from a file
 * - get_component_specs: Get component specifications
 * - post_design_comment: Post comments on designs
 * - export_assets: Export assets from designs
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Figma API configuration
const FIGMA_API_URL = 'https://api.figma.com/v1';
const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;

// Tool input schemas
const ListFilesSchema = z.object({
    teamId: z.string().optional().describe('Team ID to list files from'),
    projectId: z.string().optional().describe('Project ID to list files from'),
});

const GetFileSchema = z.object({
    fileKey: z.string().describe('The Figma file key'),
    nodeIds: z.array(z.string()).optional().describe('Specific node IDs to retrieve'),
});

const GetDesignTokensSchema = z.object({
    fileKey: z.string().describe('The Figma file key'),
    nodeId: z.string().optional().describe('Specific node to extract tokens from'),
});

const GetComponentSpecsSchema = z.object({
    fileKey: z.string().describe('The Figma file key'),
    componentName: z.string().optional().describe('Filter by component name'),
});

const PostCommentSchema = z.object({
    fileKey: z.string().describe('The Figma file key'),
    message: z.string().describe('Comment message'),
    nodeId: z.string().optional().describe('Node to attach comment to'),
    x: z.number().optional().describe('X coordinate for comment'),
    y: z.number().optional().describe('Y coordinate for comment'),
});

const ExportAssetsSchema = z.object({
    fileKey: z.string().describe('The Figma file key'),
    nodeIds: z.array(z.string()).describe('Node IDs to export'),
    format: z.enum(['png', 'svg', 'jpg', 'pdf']).default('png'),
    scale: z.number().min(0.01).max(4).default(1),
});

// Figma API helper
async function figmaFetch(endpoint: string, options: RequestInit = {}) {
    if (!FIGMA_ACCESS_TOKEN) {
        throw new Error('FIGMA_ACCESS_TOKEN environment variable is required');
    }

    const response = await fetch(`${FIGMA_API_URL}${endpoint}`, {
        ...options,
        headers: {
            'X-Figma-Token': FIGMA_ACCESS_TOKEN,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Figma API error: ${response.status} - ${error}`);
    }

    return response.json();
}

// Tool implementations
async function listFigmaFiles(input: z.infer<typeof ListFilesSchema>) {
    if (input.projectId) {
        const data = await figmaFetch(`/projects/${input.projectId}/files`);
        return {
            files: data.files.map((f: { key: string; name: string; last_modified: string }) => ({
                key: f.key,
                name: f.name,
                lastModified: f.last_modified,
            })),
        };
    }

    if (input.teamId) {
        const data = await figmaFetch(`/teams/${input.teamId}/projects`);
        return {
            projects: data.projects.map((p: { id: string; name: string }) => ({
                id: p.id,
                name: p.name,
            })),
        };
    }

    // Get user's files from their teams
    const meData = await figmaFetch('/me');
    return {
        user: {
            id: meData.id,
            email: meData.email,
            handle: meData.handle,
        },
        message: 'Provide a teamId or projectId to list files',
    };
}

async function getDesignTokens(input: z.infer<typeof GetDesignTokensSchema>) {
    const endpoint = input.nodeId
        ? `/files/${input.fileKey}/nodes?ids=${input.nodeId}`
        : `/files/${input.fileKey}`;

    const data = await figmaFetch(endpoint);
    const document = input.nodeId ? data.nodes[input.nodeId].document : data.document;

    // Extract design tokens from styles
    const tokens: {
        colors: Record<string, { hex: string; rgba: string }>;
        typography: Record<string, { fontFamily: string; fontSize: number; fontWeight: number }>;
        spacing: number[];
        effects: Record<string, unknown>;
    } = {
        colors: {},
        typography: {},
        spacing: [],
        effects: {},
    };

    // Extract color styles
    if (data.styles) {
        for (const [styleId, style] of Object.entries(data.styles) as [string, { name: string; styleType: string }][]) {
            if (style.styleType === 'FILL') {
                tokens.colors[style.name] = {
                    hex: `#${styleId.slice(0, 6)}`, // Placeholder - real impl needs node lookup
                    rgba: 'rgba(0,0,0,1)',
                };
            }
            if (style.styleType === 'TEXT') {
                tokens.typography[style.name] = {
                    fontFamily: 'Inter', // Placeholder
                    fontSize: 16,
                    fontWeight: 400,
                };
            }
        }
    }

    // Traverse document for design values
    function extractTokens(node: { type?: string; children?: unknown[]; fills?: { color?: { r: number; g: number; b: number; a: number } }[]; style?: { fontFamily?: string; fontSize?: number; fontWeight?: number } }) {
        if (node.type === 'RECTANGLE' || node.type === 'FRAME') {
            // Extract fill colors
            if (node.fills && Array.isArray(node.fills)) {
                node.fills.forEach((fill: { color?: { r: number; g: number; b: number; a: number } }) => {
                    if (fill.color) {
                        const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
                        tokens.colors[hex] = {
                            hex,
                            rgba: `rgba(${Math.round(fill.color.r * 255)}, ${Math.round(fill.color.g * 255)}, ${Math.round(fill.color.b * 255)}, ${fill.color.a})`,
                        };
                    }
                });
            }
        }

        if (node.type === 'TEXT' && node.style) {
            const styleName = `${node.style.fontFamily}-${node.style.fontSize}`;
            tokens.typography[styleName] = {
                fontFamily: node.style.fontFamily || 'Inter',
                fontSize: node.style.fontSize || 16,
                fontWeight: node.style.fontWeight || 400,
            };
        }

        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(child => extractTokens(child as typeof node));
        }
    }

    extractTokens(document);

    return tokens;
}

async function getComponentSpecs(input: z.infer<typeof GetComponentSpecsSchema>) {
    const data = await figmaFetch(`/files/${input.fileKey}/components`);

    interface FigmaComponent {
        key: string;
        name: string;
        description: string;
        node_id: string;
        containing_frame?: { name: string };
    }

    let components: FigmaComponent[] = data.meta?.components || [];

    if (input.componentName) {
        components = components.filter((c: FigmaComponent) =>
            c.name.toLowerCase().includes(input.componentName!.toLowerCase())
        );
    }

    return {
        components: components.map((c: FigmaComponent) => ({
            key: c.key,
            name: c.name,
            description: c.description,
            nodeId: c.node_id,
            containingFrame: c.containing_frame?.name,
        })),
    };
}

async function postComment(input: z.infer<typeof PostCommentSchema>) {
    const body: {
        message: string;
        client_meta?: { node_id?: string; x?: number; y?: number };
    } = {
        message: input.message,
    };

    if (input.nodeId) {
        body.client_meta = {
            node_id: input.nodeId,
            x: input.x,
            y: input.y,
        };
    }

    const data = await figmaFetch(`/files/${input.fileKey}/comments`, {
        method: 'POST',
        body: JSON.stringify(body),
    });

    return {
        commentId: data.id,
        message: data.message,
        createdAt: data.created_at,
    };
}

async function exportAssets(input: z.infer<typeof ExportAssetsSchema>) {
    const ids = input.nodeIds.join(',');
    const data = await figmaFetch(
        `/images/${input.fileKey}?ids=${ids}&format=${input.format}&scale=${input.scale}`
    );

    return {
        images: Object.entries(data.images).map(([nodeId, url]) => ({
            nodeId,
            url: url as string,
            format: input.format,
            scale: input.scale,
        })),
    };
}

// Helper functions
function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) =>
        Math.round(n * 255)
            .toString(16)
            .padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Create MCP Server
const server = new Server(
    {
        name: 'figma-mcp',
        version: '0.1.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'list_figma_files',
                description: 'List Figma files from a team or project',
                inputSchema: {
                    type: 'object',
                    properties: {
                        teamId: {
                            type: 'string',
                            description: 'Team ID to list files from',
                        },
                        projectId: {
                            type: 'string',
                            description: 'Project ID to list files from',
                        },
                    },
                },
            },
            {
                name: 'get_design_tokens',
                description: 'Extract design tokens (colors, typography, spacing) from a Figma file',
                inputSchema: {
                    type: 'object',
                    properties: {
                        fileKey: {
                            type: 'string',
                            description: 'The Figma file key',
                        },
                        nodeId: {
                            type: 'string',
                            description: 'Specific node to extract tokens from',
                        },
                    },
                    required: ['fileKey'],
                },
            },
            {
                name: 'get_component_specs',
                description: 'Get component specifications from a Figma file',
                inputSchema: {
                    type: 'object',
                    properties: {
                        fileKey: {
                            type: 'string',
                            description: 'The Figma file key',
                        },
                        componentName: {
                            type: 'string',
                            description: 'Filter by component name',
                        },
                    },
                    required: ['fileKey'],
                },
            },
            {
                name: 'post_design_comment',
                description: 'Post a comment on a Figma design',
                inputSchema: {
                    type: 'object',
                    properties: {
                        fileKey: {
                            type: 'string',
                            description: 'The Figma file key',
                        },
                        message: {
                            type: 'string',
                            description: 'Comment message',
                        },
                        nodeId: {
                            type: 'string',
                            description: 'Node to attach comment to',
                        },
                        x: {
                            type: 'number',
                            description: 'X coordinate for comment',
                        },
                        y: {
                            type: 'number',
                            description: 'Y coordinate for comment',
                        },
                    },
                    required: ['fileKey', 'message'],
                },
            },
            {
                name: 'export_assets',
                description: 'Export assets from a Figma file',
                inputSchema: {
                    type: 'object',
                    properties: {
                        fileKey: {
                            type: 'string',
                            description: 'The Figma file key',
                        },
                        nodeIds: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Node IDs to export',
                        },
                        format: {
                            type: 'string',
                            enum: ['png', 'svg', 'jpg', 'pdf'],
                            default: 'png',
                        },
                        scale: {
                            type: 'number',
                            minimum: 0.01,
                            maximum: 4,
                            default: 1,
                        },
                    },
                    required: ['fileKey', 'nodeIds'],
                },
            },
        ],
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case 'list_figma_files': {
                const input = ListFilesSchema.parse(args);
                const result = await listFigmaFiles(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'get_design_tokens': {
                const input = GetDesignTokensSchema.parse(args);
                const result = await getDesignTokens(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'get_component_specs': {
                const input = GetComponentSpecsSchema.parse(args);
                const result = await getComponentSpecs(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'post_design_comment': {
                const input = PostCommentSchema.parse(args);
                const result = await postComment(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'export_assets': {
                const input = ExportAssetsSchema.parse(args);
                const result = await exportAssets(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
            content: [{ type: 'text', text: `Error: ${message}` }],
            isError: true,
        };
    }
});

// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Figma MCP Server running on stdio');
}

main().catch(console.error);
