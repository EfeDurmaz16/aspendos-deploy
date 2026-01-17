'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import { useState, useCallback } from 'react'
import 'katex/dist/katex.min.css'

// ============================================
// TYPES
// ============================================

interface MessageRendererProps {
    content: string
    streaming?: boolean
    className?: string
}

interface CodeBlockProps {
    language: string
    code: string
}

// ============================================
// CODE BLOCK COMPONENT
// ============================================

function CodeBlock({ language, code }: CodeBlockProps) {
    const [copied, setCopied] = useState(false)

    const copyToClipboard = useCallback(() => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [code])

    return (
        <div className="relative group my-4">
            {/* Header */}
            <div className="flex items-center justify-between bg-zinc-800 dark:bg-zinc-900 text-zinc-300 px-4 py-2 rounded-t-lg text-sm">
                <span className="font-mono">{language || 'plaintext'}</span>
                <button
                    onClick={copyToClipboard}
                    className="text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                    {copied ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Code content */}
            <pre className="bg-zinc-900 dark:bg-zinc-950 p-4 rounded-b-lg overflow-x-auto">
                <code className={`language-${language} text-sm`}>{code}</code>
            </pre>
        </div>
    )
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * MessageRenderer - Renders markdown with math, code highlighting, and GFM
 * 
 * Features:
 * - GitHub Flavored Markdown (tables, strikethrough, etc)
 * - KaTeX math rendering ($inline$ and $$block$$)
 * - Syntax highlighted code blocks
 * - Copy to clipboard for code
 * - Streaming cursor indicator
 */
export function MessageRenderer({ content, streaming = false, className = '' }: MessageRendererProps) {
    return (
        <div className={`prose prose-zinc dark:prose-invert max-w-none ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, [rehypeHighlight, { detect: true }]]}
                components={{
                    // Custom code block renderer
                    code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        const isInline = !match

                        if (isInline) {
                            return (
                                <code
                                    className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono"
                                    {...props}
                                >
                                    {children}
                                </code>
                            )
                        }

                        const language = match?.[1] || 'plaintext'
                        const code = String(children).replace(/\n$/, '')

                        return <CodeBlock language={language} code={code} />
                    },

                    // Custom pre to prevent double wrapping
                    pre({ children }) {
                        return <>{children}</>
                    },

                    // Custom table styles
                    table({ children }) {
                        return (
                            <div className="overflow-x-auto my-4">
                                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                                    {children}
                                </table>
                            </div>
                        )
                    },

                    th({ children }) {
                        return (
                            <th className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-left text-sm font-semibold">
                                {children}
                            </th>
                        )
                    },

                    td({ children }) {
                        return (
                            <td className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-700 text-sm">
                                {children}
                            </td>
                        )
                    },

                    // Custom link styles
                    a({ href, children }) {
                        return (
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                {children}
                            </a>
                        )
                    },

                    // Custom blockquote styles
                    blockquote({ children }) {
                        return (
                            <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 italic text-zinc-600 dark:text-zinc-400">
                                {children}
                            </blockquote>
                        )
                    },

                    // Custom heading styles
                    h1({ children }) {
                        return <h1 className="text-2xl font-serif font-semibold mt-6 mb-3">{children}</h1>
                    },
                    h2({ children }) {
                        return <h2 className="text-xl font-serif font-semibold mt-5 mb-2">{children}</h2>
                    },
                    h3({ children }) {
                        return <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>
                    },

                    // Custom list styles
                    ul({ children }) {
                        return <ul className="list-disc list-outside ml-6 space-y-1">{children}</ul>
                    },
                    ol({ children }) {
                        return <ol className="list-decimal list-outside ml-6 space-y-1">{children}</ol>
                    },

                    // Horizontal rule
                    hr() {
                        return <hr className="my-6 border-zinc-200 dark:border-zinc-700" />
                    },
                }}
            >
                {content}
            </ReactMarkdown>

            {/* Streaming cursor */}
            {streaming && (
                <span className="inline-block w-2 h-5 bg-zinc-900 dark:bg-zinc-50 animate-pulse ml-0.5" />
            )}
        </div>
    )
}

export default MessageRenderer
