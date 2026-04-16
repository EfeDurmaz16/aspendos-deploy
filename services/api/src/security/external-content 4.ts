export function wrapExternalContent(content: string, source: string): string {
    return `<external_content trust_level="untrusted" source="${escapeXml(source)}">\n${content}\n</external_content>`;
}

export function stripExternalTags(content: string): string {
    return content
        .replace(/<external_content[^>]*>/g, '')
        .replace(/<\/external_content>/g, '')
        .trim();
}

export function isExternalContent(content: string): boolean {
    return content.includes('<external_content');
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
