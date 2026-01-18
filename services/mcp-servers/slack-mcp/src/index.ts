/**
 * Slack MCP Server
 *
 * Provides Model Context Protocol tools for Slack integration:
 * - list_channels: List channels in workspace
 * - send_message: Send a message to a channel
 * - get_channel_history: Get message history from a channel
 * - search_messages: Search messages across workspace
 * - get_user_info: Get information about a user
 * - upload_file: Upload a file to a channel
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { WebClient } from '@slack/web-api';
import { z } from 'zod';

// Initialize Slack client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Tool input schemas
const ListChannelsSchema = z.object({
    types: z
        .array(z.enum(['public_channel', 'private_channel', 'mpim', 'im']))
        .default(['public_channel', 'private_channel']),
    excludeArchived: z.boolean().default(true),
    limit: z.number().min(1).max(1000).default(100),
});

const SendMessageSchema = z.object({
    channel: z.string().describe('Channel ID or name'),
    text: z.string().describe('Message text'),
    blocks: z.array(z.record(z.unknown())).optional().describe('Block Kit blocks'),
    threadTs: z.string().optional().describe('Thread timestamp for replies'),
    unfurlLinks: z.boolean().default(true),
    unfurlMedia: z.boolean().default(true),
});

const GetChannelHistorySchema = z.object({
    channel: z.string().describe('Channel ID'),
    limit: z.number().min(1).max(1000).default(20),
    oldest: z.string().optional().describe('Start of time range (timestamp)'),
    latest: z.string().optional().describe('End of time range (timestamp)'),
    inclusive: z.boolean().default(true),
});

const SearchMessagesSchema = z.object({
    query: z.string().describe('Search query'),
    sort: z.enum(['score', 'timestamp']).default('score'),
    sortDir: z.enum(['asc', 'desc']).default('desc'),
    count: z.number().min(1).max(100).default(20),
});

const GetUserInfoSchema = z.object({
    userId: z.string().describe('User ID'),
    includeLocale: z.boolean().default(false),
});

const UploadFileSchema = z.object({
    channels: z.array(z.string()).describe('Channel IDs to share file'),
    content: z.string().describe('File content'),
    filename: z.string().describe('Filename'),
    title: z.string().optional().describe('File title'),
    initialComment: z.string().optional().describe('Initial comment'),
    filetype: z.string().optional().describe('File type'),
});

const AddReactionSchema = z.object({
    channel: z.string().describe('Channel ID'),
    timestamp: z.string().describe('Message timestamp'),
    name: z.string().describe('Emoji name (without colons)'),
});

const GetThreadRepliesSchema = z.object({
    channel: z.string().describe('Channel ID'),
    threadTs: z.string().describe('Thread parent timestamp'),
    limit: z.number().min(1).max(1000).default(100),
});

// Tool implementations
async function listChannels(input: z.infer<typeof ListChannelsSchema>) {
    const response = await slack.conversations.list({
        types: input.types.join(','),
        exclude_archived: input.excludeArchived,
        limit: input.limit,
    });

    return {
        channels:
            response.channels?.map((ch) => ({
                id: ch.id,
                name: ch.name,
                isPrivate: ch.is_private,
                isArchived: ch.is_archived,
                memberCount: ch.num_members,
                topic: ch.topic?.value,
                purpose: ch.purpose?.value,
            })) || [],
    };
}

async function sendMessage(input: z.infer<typeof SendMessageSchema>) {
    const response = await slack.chat.postMessage({
        channel: input.channel,
        text: input.text,
        blocks: input.blocks as Parameters<typeof slack.chat.postMessage>[0]['blocks'],
        thread_ts: input.threadTs,
        unfurl_links: input.unfurlLinks,
        unfurl_media: input.unfurlMedia,
    });

    return {
        ok: response.ok,
        channel: response.channel,
        ts: response.ts,
        message: {
            text: response.message?.text,
            user: response.message?.user,
            ts: response.message?.ts,
        },
    };
}

async function getChannelHistory(input: z.infer<typeof GetChannelHistorySchema>) {
    const response = await slack.conversations.history({
        channel: input.channel,
        limit: input.limit,
        oldest: input.oldest,
        latest: input.latest,
        inclusive: input.inclusive,
    });

    return {
        messages:
            response.messages?.map((msg) => ({
                ts: msg.ts,
                user: msg.user,
                text: msg.text,
                threadTs: msg.thread_ts,
                replyCount: msg.reply_count,
                reactions: msg.reactions?.map((r) => ({
                    name: r.name,
                    count: r.count,
                })),
            })) || [],
        hasMore: response.has_more,
    };
}

async function searchMessages(input: z.infer<typeof SearchMessagesSchema>) {
    const response = await slack.search.messages({
        query: input.query,
        sort: input.sort,
        sort_dir: input.sortDir,
        count: input.count,
    });

    return {
        total: response.messages?.total || 0,
        messages:
            response.messages?.matches?.map((match) => ({
                ts: match.ts,
                text: match.text,
                user: match.user,
                channel: {
                    id: match.channel?.id,
                    name: match.channel?.name,
                },
                permalink: match.permalink,
            })) || [],
    };
}

async function getUserInfo(input: z.infer<typeof GetUserInfoSchema>) {
    const response = await slack.users.info({
        user: input.userId,
        include_locale: input.includeLocale,
    });

    const user = response.user;
    return {
        id: user?.id,
        name: user?.name,
        realName: user?.real_name,
        displayName: user?.profile?.display_name,
        email: user?.profile?.email,
        title: user?.profile?.title,
        statusText: user?.profile?.status_text,
        statusEmoji: user?.profile?.status_emoji,
        isBot: user?.is_bot,
        isAdmin: user?.is_admin,
        timezone: user?.tz,
        locale: user?.locale,
    };
}

async function uploadFile(input: z.infer<typeof UploadFileSchema>) {
    const response = await slack.files.uploadV2({
        channels: input.channels.join(','),
        content: input.content,
        filename: input.filename,
        title: input.title,
        initial_comment: input.initialComment,
        filetype: input.filetype,
    });

    const file = response.files?.[0]?.files?.[0];
    return {
        ok: response.ok,
        file: file
            ? {
                  id: file.id,
                  name: file.name,
                  title: file.title,
                  mimetype: file.mimetype,
                  size: file.size,
                  url: file.url_private,
                  permalink: file.permalink,
              }
            : null,
    };
}

async function addReaction(input: z.infer<typeof AddReactionSchema>) {
    const response = await slack.reactions.add({
        channel: input.channel,
        timestamp: input.timestamp,
        name: input.name,
    });

    return { ok: response.ok };
}

async function getThreadReplies(input: z.infer<typeof GetThreadRepliesSchema>) {
    const response = await slack.conversations.replies({
        channel: input.channel,
        ts: input.threadTs,
        limit: input.limit,
    });

    return {
        messages:
            response.messages?.map((msg) => ({
                ts: msg.ts,
                user: msg.user,
                text: msg.text,
                threadTs: msg.thread_ts,
            })) || [],
        hasMore: response.has_more,
    };
}

// Create MCP Server
const server = new Server(
    {
        name: 'slack-mcp',
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
                name: 'list_channels',
                description: 'List channels in the Slack workspace',
                inputSchema: {
                    type: 'object',
                    properties: {
                        types: {
                            type: 'array',
                            items: {
                                type: 'string',
                                enum: ['public_channel', 'private_channel', 'mpim', 'im'],
                            },
                            default: ['public_channel', 'private_channel'],
                        },
                        excludeArchived: {
                            type: 'boolean',
                            default: true,
                        },
                        limit: {
                            type: 'number',
                            minimum: 1,
                            maximum: 1000,
                            default: 100,
                        },
                    },
                },
            },
            {
                name: 'send_message',
                description: 'Send a message to a Slack channel',
                inputSchema: {
                    type: 'object',
                    properties: {
                        channel: {
                            type: 'string',
                            description: 'Channel ID or name',
                        },
                        text: {
                            type: 'string',
                            description: 'Message text',
                        },
                        blocks: {
                            type: 'array',
                            description: 'Block Kit blocks',
                        },
                        threadTs: {
                            type: 'string',
                            description: 'Thread timestamp for replies',
                        },
                        unfurlLinks: {
                            type: 'boolean',
                            default: true,
                        },
                        unfurlMedia: {
                            type: 'boolean',
                            default: true,
                        },
                    },
                    required: ['channel', 'text'],
                },
            },
            {
                name: 'get_channel_history',
                description: 'Get message history from a Slack channel',
                inputSchema: {
                    type: 'object',
                    properties: {
                        channel: {
                            type: 'string',
                            description: 'Channel ID',
                        },
                        limit: {
                            type: 'number',
                            minimum: 1,
                            maximum: 1000,
                            default: 20,
                        },
                        oldest: {
                            type: 'string',
                            description: 'Start of time range (timestamp)',
                        },
                        latest: {
                            type: 'string',
                            description: 'End of time range (timestamp)',
                        },
                        inclusive: {
                            type: 'boolean',
                            default: true,
                        },
                    },
                    required: ['channel'],
                },
            },
            {
                name: 'search_messages',
                description: 'Search messages across the Slack workspace',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query',
                        },
                        sort: {
                            type: 'string',
                            enum: ['score', 'timestamp'],
                            default: 'score',
                        },
                        sortDir: {
                            type: 'string',
                            enum: ['asc', 'desc'],
                            default: 'desc',
                        },
                        count: {
                            type: 'number',
                            minimum: 1,
                            maximum: 100,
                            default: 20,
                        },
                    },
                    required: ['query'],
                },
            },
            {
                name: 'get_user_info',
                description: 'Get information about a Slack user',
                inputSchema: {
                    type: 'object',
                    properties: {
                        userId: {
                            type: 'string',
                            description: 'User ID',
                        },
                        includeLocale: {
                            type: 'boolean',
                            default: false,
                        },
                    },
                    required: ['userId'],
                },
            },
            {
                name: 'upload_file',
                description: 'Upload a file to Slack channels',
                inputSchema: {
                    type: 'object',
                    properties: {
                        channels: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Channel IDs to share file',
                        },
                        content: {
                            type: 'string',
                            description: 'File content',
                        },
                        filename: {
                            type: 'string',
                            description: 'Filename',
                        },
                        title: {
                            type: 'string',
                            description: 'File title',
                        },
                        initialComment: {
                            type: 'string',
                            description: 'Initial comment',
                        },
                        filetype: {
                            type: 'string',
                            description: 'File type',
                        },
                    },
                    required: ['channels', 'content', 'filename'],
                },
            },
            {
                name: 'add_reaction',
                description: 'Add an emoji reaction to a message',
                inputSchema: {
                    type: 'object',
                    properties: {
                        channel: {
                            type: 'string',
                            description: 'Channel ID',
                        },
                        timestamp: {
                            type: 'string',
                            description: 'Message timestamp',
                        },
                        name: {
                            type: 'string',
                            description: 'Emoji name (without colons)',
                        },
                    },
                    required: ['channel', 'timestamp', 'name'],
                },
            },
            {
                name: 'get_thread_replies',
                description: 'Get replies in a message thread',
                inputSchema: {
                    type: 'object',
                    properties: {
                        channel: {
                            type: 'string',
                            description: 'Channel ID',
                        },
                        threadTs: {
                            type: 'string',
                            description: 'Thread parent timestamp',
                        },
                        limit: {
                            type: 'number',
                            minimum: 1,
                            maximum: 1000,
                            default: 100,
                        },
                    },
                    required: ['channel', 'threadTs'],
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
            case 'list_channels': {
                const input = ListChannelsSchema.parse(args);
                const result = await listChannels(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'send_message': {
                const input = SendMessageSchema.parse(args);
                const result = await sendMessage(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'get_channel_history': {
                const input = GetChannelHistorySchema.parse(args);
                const result = await getChannelHistory(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'search_messages': {
                const input = SearchMessagesSchema.parse(args);
                const result = await searchMessages(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'get_user_info': {
                const input = GetUserInfoSchema.parse(args);
                const result = await getUserInfo(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'upload_file': {
                const input = UploadFileSchema.parse(args);
                const result = await uploadFile(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'add_reaction': {
                const input = AddReactionSchema.parse(args);
                const result = await addReaction(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'get_thread_replies': {
                const input = GetThreadRepliesSchema.parse(args);
                const result = await getThreadReplies(input);
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
    console.error('Slack MCP Server running on stdio');
}

main().catch(console.error);
