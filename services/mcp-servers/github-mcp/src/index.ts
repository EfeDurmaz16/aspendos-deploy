/**
 * GitHub MCP Server
 *
 * Provides Model Context Protocol tools for GitHub integration:
 * - list_repos: List user's repositories
 * - get_repo: Get repository details
 * - list_issues: List issues in a repository
 * - create_issue: Create a new issue
 * - get_file_content: Get file content from a repository
 * - create_pull_request: Create a pull request
 * - list_pull_requests: List pull requests
 * - search_code: Search code across repositories
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Octokit } from '@octokit/rest';
import { z } from 'zod';

// Initialize GitHub client
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
});

// Tool input schemas
const ListReposSchema = z.object({
    type: z.enum(['all', 'owner', 'public', 'private', 'member']).default('all'),
    sort: z.enum(['created', 'updated', 'pushed', 'full_name']).default('updated'),
    direction: z.enum(['asc', 'desc']).default('desc'),
    perPage: z.number().min(1).max(100).default(30),
});

const GetRepoSchema = z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
});

const ListIssuesSchema = z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    state: z.enum(['open', 'closed', 'all']).default('open'),
    labels: z.string().optional().describe('Comma-separated list of labels'),
    sort: z.enum(['created', 'updated', 'comments']).default('created'),
    direction: z.enum(['asc', 'desc']).default('desc'),
    perPage: z.number().min(1).max(100).default(30),
});

const CreateIssueSchema = z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    title: z.string().describe('Issue title'),
    body: z.string().optional().describe('Issue body'),
    labels: z.array(z.string()).optional().describe('Labels to add'),
    assignees: z.array(z.string()).optional().describe('Assignees'),
    milestone: z.number().optional().describe('Milestone number'),
});

const GetFileContentSchema = z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    path: z.string().describe('File path'),
    ref: z.string().optional().describe('Branch, tag, or commit SHA'),
});

const CreatePullRequestSchema = z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    title: z.string().describe('PR title'),
    body: z.string().optional().describe('PR body'),
    head: z.string().describe('Branch containing changes'),
    base: z.string().describe('Branch to merge into'),
    draft: z.boolean().default(false),
    maintainerCanModify: z.boolean().default(true),
});

const ListPullRequestsSchema = z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    state: z.enum(['open', 'closed', 'all']).default('open'),
    sort: z.enum(['created', 'updated', 'popularity', 'long-running']).default('created'),
    direction: z.enum(['asc', 'desc']).default('desc'),
    perPage: z.number().min(1).max(100).default(30),
});

const SearchCodeSchema = z.object({
    query: z.string().describe('Search query'),
    sort: z.enum(['indexed']).optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
    perPage: z.number().min(1).max(100).default(30),
});

const GetCommitsSchema = z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    sha: z.string().optional().describe('Branch or commit SHA'),
    path: z.string().optional().describe('Only commits containing this file path'),
    perPage: z.number().min(1).max(100).default(30),
});

const CreateBranchSchema = z.object({
    owner: z.string().describe('Repository owner'),
    repo: z.string().describe('Repository name'),
    branch: z.string().describe('New branch name'),
    fromBranch: z.string().default('main').describe('Source branch'),
});

// Tool implementations
async function listRepos(input: z.infer<typeof ListReposSchema>) {
    const response = await octokit.repos.listForAuthenticatedUser({
        type: input.type,
        sort: input.sort,
        direction: input.direction,
        per_page: input.perPage,
    });

    return {
        repos: response.data.map((repo) => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            private: repo.private,
            htmlUrl: repo.html_url,
            language: repo.language,
            stargazersCount: repo.stargazers_count,
            forksCount: repo.forks_count,
            openIssuesCount: repo.open_issues_count,
            defaultBranch: repo.default_branch,
            updatedAt: repo.updated_at,
        })),
    };
}

async function getRepo(input: z.infer<typeof GetRepoSchema>) {
    const response = await octokit.repos.get({
        owner: input.owner,
        repo: input.repo,
    });

    const repo = response.data;
    return {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
        language: repo.language,
        stargazersCount: repo.stargazers_count,
        watchersCount: repo.watchers_count,
        forksCount: repo.forks_count,
        openIssuesCount: repo.open_issues_count,
        defaultBranch: repo.default_branch,
        license: repo.license?.name,
        topics: repo.topics,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at,
    };
}

async function listIssues(input: z.infer<typeof ListIssuesSchema>) {
    const response = await octokit.issues.listForRepo({
        owner: input.owner,
        repo: input.repo,
        state: input.state,
        labels: input.labels,
        sort: input.sort,
        direction: input.direction,
        per_page: input.perPage,
    });

    return {
        issues: response.data.map((issue) => ({
            number: issue.number,
            title: issue.title,
            state: issue.state,
            htmlUrl: issue.html_url,
            user: issue.user?.login,
            labels: issue.labels.map((l) => (typeof l === 'string' ? l : l.name)),
            assignees: issue.assignees?.map((a) => a.login),
            commentsCount: issue.comments,
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            closedAt: issue.closed_at,
            body: issue.body?.substring(0, 500),
        })),
    };
}

async function createIssue(input: z.infer<typeof CreateIssueSchema>) {
    const response = await octokit.issues.create({
        owner: input.owner,
        repo: input.repo,
        title: input.title,
        body: input.body,
        labels: input.labels,
        assignees: input.assignees,
        milestone: input.milestone,
    });

    return {
        number: response.data.number,
        title: response.data.title,
        htmlUrl: response.data.html_url,
        state: response.data.state,
        createdAt: response.data.created_at,
    };
}

async function getFileContent(input: z.infer<typeof GetFileContentSchema>) {
    const response = await octokit.repos.getContent({
        owner: input.owner,
        repo: input.repo,
        path: input.path,
        ref: input.ref,
    });

    const data = response.data;

    if (Array.isArray(data)) {
        // Directory listing
        return {
            type: 'directory',
            items: data.map((item) => ({
                name: item.name,
                path: item.path,
                type: item.type,
                size: item.size,
            })),
        };
    }

    if (data.type === 'file' && 'content' in data) {
        // File content
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return {
            type: 'file',
            name: data.name,
            path: data.path,
            size: data.size,
            sha: data.sha,
            content:
                content.length > 50000
                    ? `${content.substring(0, 50000)}\n... (truncated)`
                    : content,
            encoding: data.encoding,
            htmlUrl: data.html_url,
        };
    }

    return { type: data.type, path: data.path };
}

async function createPullRequest(input: z.infer<typeof CreatePullRequestSchema>) {
    const response = await octokit.pulls.create({
        owner: input.owner,
        repo: input.repo,
        title: input.title,
        body: input.body,
        head: input.head,
        base: input.base,
        draft: input.draft,
        maintainer_can_modify: input.maintainerCanModify,
    });

    return {
        number: response.data.number,
        title: response.data.title,
        htmlUrl: response.data.html_url,
        state: response.data.state,
        draft: response.data.draft,
        createdAt: response.data.created_at,
        headRef: response.data.head.ref,
        baseRef: response.data.base.ref,
    };
}

async function listPullRequests(input: z.infer<typeof ListPullRequestsSchema>) {
    const response = await octokit.pulls.list({
        owner: input.owner,
        repo: input.repo,
        state: input.state,
        sort: input.sort,
        direction: input.direction,
        per_page: input.perPage,
    });

    return {
        pullRequests: response.data.map((pr) => ({
            number: pr.number,
            title: pr.title,
            state: pr.state,
            htmlUrl: pr.html_url,
            user: pr.user?.login,
            draft: pr.draft,
            headRef: pr.head.ref,
            baseRef: pr.base.ref,
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            mergedAt: pr.merged_at,
            closedAt: pr.closed_at,
        })),
    };
}

async function searchCode(input: z.infer<typeof SearchCodeSchema>) {
    const response = await octokit.search.code({
        q: input.query,
        sort: input.sort,
        order: input.order,
        per_page: input.perPage,
    });

    return {
        totalCount: response.data.total_count,
        items: response.data.items.map((item) => ({
            name: item.name,
            path: item.path,
            repository: item.repository.full_name,
            htmlUrl: item.html_url,
            score: item.score,
        })),
    };
}

async function getCommits(input: z.infer<typeof GetCommitsSchema>) {
    const response = await octokit.repos.listCommits({
        owner: input.owner,
        repo: input.repo,
        sha: input.sha,
        path: input.path,
        per_page: input.perPage,
    });

    return {
        commits: response.data.map((commit) => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.commit.author?.name,
            authorEmail: commit.commit.author?.email,
            date: commit.commit.author?.date,
            htmlUrl: commit.html_url,
            committer: commit.commit.committer?.name,
        })),
    };
}

async function createBranch(input: z.infer<typeof CreateBranchSchema>) {
    // Get the SHA of the source branch
    const refResponse = await octokit.git.getRef({
        owner: input.owner,
        repo: input.repo,
        ref: `heads/${input.fromBranch}`,
    });

    const sha = refResponse.data.object.sha;

    // Create the new branch
    const response = await octokit.git.createRef({
        owner: input.owner,
        repo: input.repo,
        ref: `refs/heads/${input.branch}`,
        sha,
    });

    return {
        ref: response.data.ref,
        sha: response.data.object.sha,
        url: response.data.url,
    };
}

// Create MCP Server
const server = new Server(
    {
        name: 'github-mcp',
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
                name: 'list_repos',
                description: 'List repositories for the authenticated user',
                inputSchema: {
                    type: 'object',
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['all', 'owner', 'public', 'private', 'member'],
                            default: 'all',
                        },
                        sort: {
                            type: 'string',
                            enum: ['created', 'updated', 'pushed', 'full_name'],
                            default: 'updated',
                        },
                        direction: {
                            type: 'string',
                            enum: ['asc', 'desc'],
                            default: 'desc',
                        },
                        perPage: {
                            type: 'number',
                            minimum: 1,
                            maximum: 100,
                            default: 30,
                        },
                    },
                },
            },
            {
                name: 'get_repo',
                description: 'Get details of a specific repository',
                inputSchema: {
                    type: 'object',
                    properties: {
                        owner: { type: 'string', description: 'Repository owner' },
                        repo: { type: 'string', description: 'Repository name' },
                    },
                    required: ['owner', 'repo'],
                },
            },
            {
                name: 'list_issues',
                description: 'List issues in a repository',
                inputSchema: {
                    type: 'object',
                    properties: {
                        owner: { type: 'string', description: 'Repository owner' },
                        repo: { type: 'string', description: 'Repository name' },
                        state: {
                            type: 'string',
                            enum: ['open', 'closed', 'all'],
                            default: 'open',
                        },
                        labels: { type: 'string', description: 'Comma-separated labels' },
                        sort: {
                            type: 'string',
                            enum: ['created', 'updated', 'comments'],
                            default: 'created',
                        },
                        direction: {
                            type: 'string',
                            enum: ['asc', 'desc'],
                            default: 'desc',
                        },
                        perPage: {
                            type: 'number',
                            minimum: 1,
                            maximum: 100,
                            default: 30,
                        },
                    },
                    required: ['owner', 'repo'],
                },
            },
            {
                name: 'create_issue',
                description: 'Create a new issue in a repository',
                inputSchema: {
                    type: 'object',
                    properties: {
                        owner: { type: 'string', description: 'Repository owner' },
                        repo: { type: 'string', description: 'Repository name' },
                        title: { type: 'string', description: 'Issue title' },
                        body: { type: 'string', description: 'Issue body' },
                        labels: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Labels',
                        },
                        assignees: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Assignees',
                        },
                        milestone: { type: 'number', description: 'Milestone number' },
                    },
                    required: ['owner', 'repo', 'title'],
                },
            },
            {
                name: 'get_file_content',
                description: 'Get file or directory content from a repository',
                inputSchema: {
                    type: 'object',
                    properties: {
                        owner: { type: 'string', description: 'Repository owner' },
                        repo: { type: 'string', description: 'Repository name' },
                        path: { type: 'string', description: 'File path' },
                        ref: { type: 'string', description: 'Branch, tag, or commit SHA' },
                    },
                    required: ['owner', 'repo', 'path'],
                },
            },
            {
                name: 'create_pull_request',
                description: 'Create a pull request',
                inputSchema: {
                    type: 'object',
                    properties: {
                        owner: { type: 'string', description: 'Repository owner' },
                        repo: { type: 'string', description: 'Repository name' },
                        title: { type: 'string', description: 'PR title' },
                        body: { type: 'string', description: 'PR body' },
                        head: { type: 'string', description: 'Branch with changes' },
                        base: { type: 'string', description: 'Target branch' },
                        draft: { type: 'boolean', default: false },
                        maintainerCanModify: { type: 'boolean', default: true },
                    },
                    required: ['owner', 'repo', 'title', 'head', 'base'],
                },
            },
            {
                name: 'list_pull_requests',
                description: 'List pull requests in a repository',
                inputSchema: {
                    type: 'object',
                    properties: {
                        owner: { type: 'string', description: 'Repository owner' },
                        repo: { type: 'string', description: 'Repository name' },
                        state: {
                            type: 'string',
                            enum: ['open', 'closed', 'all'],
                            default: 'open',
                        },
                        sort: {
                            type: 'string',
                            enum: ['created', 'updated', 'popularity', 'long-running'],
                            default: 'created',
                        },
                        direction: {
                            type: 'string',
                            enum: ['asc', 'desc'],
                            default: 'desc',
                        },
                        perPage: {
                            type: 'number',
                            minimum: 1,
                            maximum: 100,
                            default: 30,
                        },
                    },
                    required: ['owner', 'repo'],
                },
            },
            {
                name: 'search_code',
                description: 'Search code across GitHub repositories',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'Search query' },
                        sort: { type: 'string', enum: ['indexed'] },
                        order: {
                            type: 'string',
                            enum: ['asc', 'desc'],
                            default: 'desc',
                        },
                        perPage: {
                            type: 'number',
                            minimum: 1,
                            maximum: 100,
                            default: 30,
                        },
                    },
                    required: ['query'],
                },
            },
            {
                name: 'get_commits',
                description: 'Get commit history for a repository',
                inputSchema: {
                    type: 'object',
                    properties: {
                        owner: { type: 'string', description: 'Repository owner' },
                        repo: { type: 'string', description: 'Repository name' },
                        sha: { type: 'string', description: 'Branch or commit SHA' },
                        path: { type: 'string', description: 'Filter by file path' },
                        perPage: {
                            type: 'number',
                            minimum: 1,
                            maximum: 100,
                            default: 30,
                        },
                    },
                    required: ['owner', 'repo'],
                },
            },
            {
                name: 'create_branch',
                description: 'Create a new branch in a repository',
                inputSchema: {
                    type: 'object',
                    properties: {
                        owner: { type: 'string', description: 'Repository owner' },
                        repo: { type: 'string', description: 'Repository name' },
                        branch: { type: 'string', description: 'New branch name' },
                        fromBranch: {
                            type: 'string',
                            description: 'Source branch',
                            default: 'main',
                        },
                    },
                    required: ['owner', 'repo', 'branch'],
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
            case 'list_repos': {
                const input = ListReposSchema.parse(args);
                const result = await listRepos(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'get_repo': {
                const input = GetRepoSchema.parse(args);
                const result = await getRepo(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'list_issues': {
                const input = ListIssuesSchema.parse(args);
                const result = await listIssues(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'create_issue': {
                const input = CreateIssueSchema.parse(args);
                const result = await createIssue(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'get_file_content': {
                const input = GetFileContentSchema.parse(args);
                const result = await getFileContent(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'create_pull_request': {
                const input = CreatePullRequestSchema.parse(args);
                const result = await createPullRequest(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'list_pull_requests': {
                const input = ListPullRequestsSchema.parse(args);
                const result = await listPullRequests(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'search_code': {
                const input = SearchCodeSchema.parse(args);
                const result = await searchCode(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'get_commits': {
                const input = GetCommitsSchema.parse(args);
                const result = await getCommits(input);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'create_branch': {
                const input = CreateBranchSchema.parse(args);
                const result = await createBranch(input);
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
    console.error('GitHub MCP Server running on stdio');
}

main().catch(console.error);
