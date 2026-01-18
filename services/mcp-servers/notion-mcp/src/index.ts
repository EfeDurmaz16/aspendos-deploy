/**
 * Notion MCP Server
 *
 * Provides Model Context Protocol tools for Notion integration:
 * - query_database: Query a Notion database
 * - create_page: Create a new page in Notion
 * - update_page: Update an existing page
 * - get_page_content: Get full content of a page
 * - search_content: Search across Notion workspace
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Client } from '@notionhq/client';
import { z } from 'zod';

// Initialize Notion client
const notion = new Client({
    auth: process.env.NOTION_API_KEY,
});

// Tool input schemas
const QueryDatabaseSchema = z.object({
    databaseId: z.string().describe('The Notion database ID'),
    filter: z.record(z.unknown()).optional().describe('Filter object for the query'),
    sorts: z
        .array(
            z.object({
                property: z.string(),
                direction: z.enum(['ascending', 'descending']),
            })
        )
        .optional()
        .describe('Sort criteria'),
    pageSize: z.number().min(1).max(100).default(10),
});

const CreatePageSchema = z.object({
    parentId: z.string().describe('Parent page or database ID'),
    parentType: z.enum(['page', 'database']).default('database'),
    title: z.string().describe('Page title'),
    properties: z.record(z.unknown()).optional().describe('Page properties (for database pages)'),
    content: z.array(z.record(z.unknown())).optional().describe('Page content blocks'),
});

const UpdatePageSchema = z.object({
    pageId: z.string().describe('The page ID to update'),
    properties: z.record(z.unknown()).optional().describe('Properties to update'),
    archived: z.boolean().optional().describe('Archive/unarchive the page'),
});

const GetPageContentSchema = z.object({
    pageId: z.string().describe('The page ID'),
    includeChildren: z.boolean().default(true).describe('Include child blocks'),
});

const SearchContentSchema = z.object({
    query: z.string().describe('Search query'),
    filter: z
        .object({
            value: z.enum(['page', 'database']),
            property: z.literal('object'),
        })
        .optional()
        .describe('Filter by object type'),
    pageSize: z.number().min(1).max(100).default(10),
});

const AppendBlocksSchema = z.object({
    blockId: z.string().describe('Parent block or page ID'),
    children: z.array(z.record(z.unknown())).describe('Blocks to append'),
});

// Tool implementations
async function queryDatabase(input: z.infer<typeof QueryDatabaseSchema>) {
    const response = await notion.databases.query({
        database_id: input.databaseId,
        filter: input.filter as Parameters<typeof notion.databases.query>[0]['filter'],
        sorts: input.sorts as Parameters<typeof notion.databases.query>[0]['sorts'],
        page_size: input.pageSize,
    });

    return {
        results: response.results.map((page) => {
            if ('properties' in page) {
                return {
                    id: page.id,
                    createdTime: page.created_time,
                    lastEditedTime: page.last_edited_time,
                    properties: page.properties,
                    url: page.url,
                };
            }
            return { id: page.id };
        }),
        hasMore: response.has_more,
        nextCursor: response.next_cursor,
    };
}

async function createPage(input: z.infer<typeof CreatePageSchema>) {
    const parent =
        input.parentType === 'database'
            ? { database_id: input.parentId }
            : { page_id: input.parentId };

    // Build properties based on parent type
    const properties: Record<string, unknown> =
        input.parentType === 'database'
            ? {
                  title: {
                      title: [{ text: { content: input.title } }],
                  },
                  ...input.properties,
              }
            : {};

    // For page parent, use title as content
    const children =
        input.parentType === 'page'
            ? [
                  {
                      object: 'block' as const,
                      type: 'heading_1' as const,
                      heading_1: {
                          rich_text: [{ type: 'text' as const, text: { content: input.title } }],
                      },
                  },
                  ...(input.content || []),
              ]
            : input.content || [];

    const response = await notion.pages.create({
        parent: parent as Parameters<typeof notion.pages.create>[0]['parent'],
        properties: properties as Parameters<typeof notion.pages.create>[0]['properties'],
        children: children as Parameters<typeof notion.pages.create>[0]['children'],
    });

    return {
        id: response.id,
        createdTime: response.created_time,
        url: 'url' in response ? response.url : null,
    };
}

async function updatePage(input: z.infer<typeof UpdatePageSchema>) {
    const updateData: Parameters<typeof notion.pages.update>[0] = {
        page_id: input.pageId,
    };

    if (input.properties) {
        updateData.properties = input.properties as Parameters<
            typeof notion.pages.update
        >[0]['properties'];
    }

    if (input.archived !== undefined) {
        updateData.archived = input.archived;
    }

    const response = await notion.pages.update(updateData);

    return {
        id: response.id,
        lastEditedTime: response.last_edited_time,
        archived: 'archived' in response ? response.archived : false,
    };
}

async function getPageContent(input: z.infer<typeof GetPageContentSchema>) {
    // Get page metadata
    const page = await notion.pages.retrieve({ page_id: input.pageId });

    let blocks: unknown[] = [];
    if (input.includeChildren) {
        const blocksResponse = await notion.blocks.children.list({
            block_id: input.pageId,
            page_size: 100,
        });
        blocks = blocksResponse.results;
    }

    return {
        page: {
            id: page.id,
            createdTime: page.created_time,
            lastEditedTime: page.last_edited_time,
            properties: 'properties' in page ? page.properties : {},
            url: 'url' in page ? page.url : null,
        },
        blocks: blocks.map((block) => {
            if ('type' in block) {
                return {
                    id: (block as { id: string }).id,
                    type: (block as { type: string }).type,
                    content: block[(block as { type: string }).type as keyof typeof block],
                };
            }
            return block;
        }),
    };
}

async function searchContent(input: z.infer<typeof SearchContentSchema>) {
    const response = await notion.search({
        query: input.query,
        filter: input.filter,
        page_size: input.pageSize,
    });

    return {
        results: response.results.map((result) => {
            const base = {
                id: result.id,
                object: result.object,
            };

            if (result.object === 'page' && 'properties' in result) {
                return {
                    ...base,
                    title: extractTitle(result.properties),
                    url: result.url,
                    lastEditedTime: result.last_edited_time,
                };
            }

            if (result.object === 'database' && 'title' in result) {
                return {
                    ...base,
                    title: result.title
                        .map((t) => ('plain_text' in t ? t.plain_text : ''))
                        .join(''),
                    url: result.url,
                    lastEditedTime: result.last_edited_time,
                };
            }

            return base;
        }),
        hasMore: response.has_more,
        nextCursor: response.next_cursor,
    };
}

async function appendBlocks(input: z.infer<typeof AppendBlocksSchema>) {
    const response = await notion.blocks.children.append({
        block_id: input.blockId,
        children: input.children as Parameters<typeof notion.blocks.children.append>[0]['children'],
    });

    return {
        results: response.results.map((block) => ({
            id: block.id,
            type: 'type' in block ? block.type : 'unknown',
        })),
    };
}

// Helper to extract title from page properties
function extractTitle(properties: Record<string, unknown>): string {
    for (const prop of Object.values(properties)) {
        if (
            prop &&
            typeof prop === 'object' &&
            'type' in prop &&
            prop.type === 'title' &&
            'title' in prop
        ) {
            const titleProp = prop as { title: Array<{ plain_text?: string }> };
            return titleProp.title.map((t) => t.plain_text || '').join('');
        }
    }
    return 'Untitled';
}

// Create MCP Server
const server = new Server(
    {
        name: 'notion-mcp',
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
                name: 'query_database',
                description: 'Query a Notion database with filters and sorting',
                inputSchema: {
                    type: 'object',
                    properties: {
                        databaseId: {
                            type: 'string',
                            description: 'The Notion database ID',
                        },
                        filter: {
                            type: 'object',
                            description: 'Filter object for the query',
                        },
                        sorts: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    property: { type: 'string' },
                                    direction: {
                                        type: 'string',
                                        enum: ['ascending', 'descending'],
                                    },
                                },
                            },
                            description: 'Sort criteria',
                        },
                        pageSize: {
                            type: 'number',
                            minimum: 1,
                            maximum: 100,
                            default: 10,
                        },
                    },
                    required: ['databaseId'],
                },
            },
            {
                name: 'create_page',
                description: 'Create a new page in Notion',
                inputSchema: {
                    type: 'object',
                    properties: {
                        parentId: {
                            type: 'string',
                            description: 'Parent page or database ID',
                        },
                        parentType: {
                            type: 'string',
                            enum: ['page', 'database'],
                            default: 'database',
                        },
                        title: {
                            type: 'string',
                            description: 'Page title',
                        },
                        properties: {
                            type: 'object',
                            description: 'Page properties (for database pages)',
                        },
                        content: {
                            type: 'array',
                            description: 'Page content blocks',
                        },
                    },
                    required: ['parentId', 'title'],
                },
            },
            {
                name: 'update_page',
                description: 'Update an existing Notion page',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pageId: {
                            type: 'string',
                            description: 'The page ID to update',
                        },
                        properties: {
                            type: 'object',
                            description: 'Properties to update',
                        },
                        archived: {
                            type: 'boolean',
                            description: 'Archive/unarchive the page',
                        },
                    },
                    required: ['pageId'],
                },
            },
            {
                name: 'get_page_content',
                description: 'Get the full content of a Notion page',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pageId: {
                            type: 'string',
                            description: 'The page ID',
                        },
                        includeChildren: {
                            type: 'boolean',
                            default: true,
                            description: 'Include child blocks',
                        },
                    },
                    required: ['pageId'],
                },
            },
            {
                name: 'search_content',
                description: 'Search across your Notion workspace',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query',
                        },
                        filter: {
                            type: 'object',
                            properties: {
                                value: {
                                    type: 'string',
                                    enum: ['page', 'database'],
                                },
                                property: {
                                    type: 'string',
                                    const: 'object',
                                },
                            },
                            description: 'Filter by object type',
                        },
                        pageSize: {
                            type: 'number',
                            minimum: 1,
                            maximum: 100,
                            default: 10,
                        },
                    },
                    required: ['query'],
                },
            },
            {
                name: 'append_blocks',
                description: 'Append content blocks to a page or block',
                inputSchema: {
                    type: 'object',
                    properties: {
                        blockId: {
                            type: 'string',
                            description: 'Parent block or page ID',
                        },
                        children: {
                            type: 'array',
                            description: 'Blocks to append',
                        },
                    },
                    required: ['blockId', 'children'],
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
            case 'query_database': {
                const input = QueryDatabaseSchema.parse(args);
                const result = await queryDatabase(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'create_page': {
                const input = CreatePageSchema.parse(args);
                const result = await createPage(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'update_page': {
                const input = UpdatePageSchema.parse(args);
                const result = await updatePage(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'get_page_content': {
                const input = GetPageContentSchema.parse(args);
                const result = await getPageContent(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'search_content': {
                const input = SearchContentSchema.parse(args);
                const result = await searchContent(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'append_blocks': {
                const input = AppendBlocksSchema.parse(args);
                const result = await appendBlocks(input);
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
    console.error('Notion MCP Server running on stdio');
}

main().catch(console.error);
