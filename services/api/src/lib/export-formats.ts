/**
 * Multi-format data export system for user data portability
 * Increases switching costs and user lock-in by providing comprehensive export options
 */

export interface ExportResult {
    content: string;
    mimeType: string;
    filename: string;
}

export interface ExportMetadata {
    version: string;
    exportedAt: string;
    userId: string;
    itemCount: number;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    model?: string;
    timestamp?: string;
}

export interface Chat {
    id: string;
    title?: string;
    createdAt: string;
    messages: ChatMessage[];
}

/**
 * Export data as JSON with metadata header
 */
export function exportToJSON(data: unknown, userId: string): ExportResult {
    const metadata: ExportMetadata = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        userId,
        itemCount: Array.isArray(data) ? data.length : 1,
    };

    const exportData = {
        metadata,
        data,
    };

    const content = JSON.stringify(exportData, null, 2);
    const timestamp = new Date().toISOString().split('T')[0];

    return {
        content,
        mimeType: 'application/json',
        filename: `yula-export-${userId}-${timestamp}.json`,
    };
}

/**
 * Escape CSV field value
 */
function escapeCSVField(value: string): string {
    // Convert to string and handle null/undefined
    const str = value == null ? '' : String(value);

    // Check if escaping is needed
    const needsEscaping =
        str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r');

    if (!needsEscaping) {
        return str;
    }

    // Escape double quotes by doubling them
    const escaped = str.replace(/"/g, '""');

    // Wrap in double quotes
    return `"${escaped}"`;
}

/**
 * Export data as CSV with proper escaping
 */
export function exportToCSV(
    data: Record<string, unknown>[],
    columns: string[],
    userId: string
): ExportResult {
    if (!data || data.length === 0) {
        const timestamp = new Date().toISOString().split('T')[0];
        return {
            content: columns.join(','),
            mimeType: 'text/csv',
            filename: `yula-export-${userId}-${timestamp}.csv`,
        };
    }

    // Create header row
    const header = columns.map(escapeCSVField).join(',');

    // Create data rows
    const rows = data.map((row) => {
        return columns
            .map((col) => {
                const value = row[col];
                return escapeCSVField(String(value ?? ''));
            })
            .join(',');
    });

    const content = [header, ...rows].join('\n');
    const timestamp = new Date().toISOString().split('T')[0];

    return {
        content,
        mimeType: 'text/csv',
        filename: `yula-export-${userId}-${timestamp}.csv`,
    };
}

/**
 * Export chat history as readable Markdown
 */
export function exportToMarkdown(chats: Chat[], userId: string): ExportResult {
    if (!chats || chats.length === 0) {
        const content = '# YULA Chat Export\n\nNo chats found.';
        const timestamp = new Date().toISOString().split('T')[0];
        return {
            content,
            mimeType: 'text/markdown',
            filename: `yula-chats-${userId}-${timestamp}.md`,
        };
    }

    const lines: string[] = [];
    lines.push('# YULA Chat Export');
    lines.push('');
    lines.push(`Exported: ${new Date().toISOString()}`);
    lines.push(`User ID: ${userId}`);
    lines.push(`Total Chats: ${chats.length}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    for (const chat of chats) {
        const date = new Date(chat.createdAt).toLocaleDateString();
        const title = chat.title || 'Untitled Chat';
        lines.push(`## ${title} (${date})`);
        lines.push('');

        for (const message of chat.messages) {
            if (message.role === 'system') continue;

            const speaker =
                message.role === 'user'
                    ? '**User:**'
                    : `**AI${message.model ? ` (${message.model})` : ''}:**`;

            lines.push(`${speaker} ${message.content}`);
            lines.push('');
        }

        lines.push('---');
        lines.push('');
    }

    const content = lines.join('\n');
    const timestamp = new Date().toISOString().split('T')[0];

    return {
        content,
        mimeType: 'text/markdown',
        filename: `yula-chats-${userId}-${timestamp}.md`,
    };
}

/**
 * Export chat history as styled HTML
 */
export function exportToHTML(chats: Chat[], userId: string): ExportResult {
    const styles = `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      background: #1a1a1a;
      color: #e5e5e5;
      line-height: 1.6;
    }
    .header {
      border-bottom: 2px solid #333;
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    h1 {
      color: #fff;
      margin: 0;
    }
    .metadata {
      color: #999;
      font-size: 0.9rem;
      margin-top: 0.5rem;
    }
    .chat {
      margin-bottom: 3rem;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1.5rem;
      background: #222;
    }
    .chat-title {
      color: #fff;
      font-size: 1.2rem;
      margin: 0 0 1rem 0;
    }
    .chat-date {
      color: #999;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
    .message {
      margin: 1rem 0;
      padding: 1rem;
      border-radius: 8px;
    }
    .message.user {
      background: #2563eb;
      color: #fff;
      margin-left: 2rem;
    }
    .message.assistant {
      background: #333;
      color: #e5e5e5;
      margin-right: 2rem;
    }
    .message-role {
      font-weight: 600;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }
    .message-content {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    code {
      background: #1a1a1a;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
    }
    pre {
      background: #1a1a1a;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
    }
    pre code {
      background: none;
      padding: 0;
    }
  `.trim();

    const escapedUserId = userId.replace(/[<>"'&]/g, (char) => {
        const escapes: Record<string, string> = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '&': '&amp;',
        };
        return escapes[char] || char;
    });

    const lines: string[] = [];
    lines.push('<!DOCTYPE html>');
    lines.push('<html lang="en">');
    lines.push('<head>');
    lines.push('  <meta charset="UTF-8">');
    lines.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    lines.push('  <title>YULA Chat Export</title>');
    lines.push('  <style>');
    lines.push(styles);
    lines.push('  </style>');
    lines.push('</head>');
    lines.push('<body>');
    lines.push('  <div class="header">');
    lines.push('    <h1>YULA Chat Export</h1>');
    lines.push('    <div class="metadata">');
    lines.push(`      Exported: ${new Date().toISOString()}<br>`);
    lines.push(`      User ID: ${escapedUserId}<br>`);
    lines.push(`      Total Chats: ${chats.length}`);
    lines.push('    </div>');
    lines.push('  </div>');

    if (!chats || chats.length === 0) {
        lines.push('  <p>No chats found.</p>');
    } else {
        for (const chat of chats) {
            const date = new Date(chat.createdAt).toLocaleDateString();
            const title = chat.title || 'Untitled Chat';

            lines.push('  <div class="chat">');
            lines.push(`    <h2 class="chat-title">${title}</h2>`);
            lines.push(`    <div class="chat-date">${date}</div>`);

            for (const message of chat.messages) {
                if (message.role === 'system') continue;

                const roleClass = message.role;
                const roleName =
                    message.role === 'user'
                        ? 'User'
                        : `AI${message.model ? ` (${message.model})` : ''}`;

                // Basic HTML escaping for content
                const escapedContent = message.content
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');

                lines.push(`    <div class="message ${roleClass}">`);
                lines.push(`      <div class="message-role">${roleName}</div>`);
                lines.push(`      <div class="message-content">${escapedContent}</div>`);
                lines.push('    </div>');
            }

            lines.push('  </div>');
        }
    }

    lines.push('</body>');
    lines.push('</html>');

    const content = lines.join('\n');
    const timestamp = new Date().toISOString().split('T')[0];

    return {
        content,
        mimeType: 'text/html',
        filename: `yula-chats-${userId}-${timestamp}.html`,
    };
}

/**
 * Export chats in provider-specific format
 */
export function exportChatsForProvider(
    chats: Chat[],
    format: 'chatgpt' | 'claude' | 'generic',
    userId: string
): ExportResult {
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'chatgpt') {
        // OpenAI conversation format
        const conversations = chats.map((chat) => ({
            id: chat.id,
            title: chat.title || 'Untitled',
            create_time: new Date(chat.createdAt).getTime() / 1000,
            update_time: new Date(chat.createdAt).getTime() / 1000,
            mapping: chat.messages.reduce(
                (acc, msg, idx) => {
                    const nodeId = `node_${idx}`;
                    acc[nodeId] = {
                        id: nodeId,
                        message: {
                            id: `msg_${idx}`,
                            author: { role: msg.role },
                            content: {
                                content_type: 'text',
                                parts: [msg.content],
                            },
                            create_time: msg.timestamp
                                ? new Date(msg.timestamp).getTime() / 1000
                                : new Date(chat.createdAt).getTime() / 1000,
                        },
                        parent: idx > 0 ? `node_${idx - 1}` : null,
                        children: idx < chat.messages.length - 1 ? [`node_${idx + 1}`] : [],
                    };
                    return acc;
                },
                {} as Record<string, unknown>
            ),
        }));

        return {
            content: JSON.stringify(conversations, null, 2),
            mimeType: 'application/json',
            filename: `yula-chatgpt-format-${userId}-${timestamp}.json`,
        };
    }

    if (format === 'claude') {
        // Anthropic conversation format
        const conversations = chats.map((chat) => ({
            uuid: chat.id,
            name: chat.title || 'Untitled',
            created_at: chat.createdAt,
            updated_at: chat.createdAt,
            chat_messages: chat.messages.map((msg, idx) => ({
                uuid: `msg_${chat.id}_${idx}`,
                text: msg.content,
                sender: msg.role === 'user' ? 'human' : 'assistant',
                created_at:
                    msg.timestamp ||
                    new Date(new Date(chat.createdAt).getTime() + idx * 1000).toISOString(),
            })),
        }));

        return {
            content: JSON.stringify(conversations, null, 2),
            mimeType: 'application/json',
            filename: `yula-claude-format-${userId}-${timestamp}.json`,
        };
    }

    // Generic format
    const exportData = chats.map((chat) => ({
        id: chat.id,
        title: chat.title || 'Untitled',
        timestamp: chat.createdAt,
        messages: chat.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            model: msg.model,
            timestamp: msg.timestamp,
        })),
    }));

    return {
        content: JSON.stringify(exportData, null, 2),
        mimeType: 'application/json',
        filename: `yula-generic-format-${userId}-${timestamp}.json`,
    };
}
