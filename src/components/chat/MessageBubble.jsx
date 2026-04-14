import React, { useState, useEffect } from 'react'
import { marked } from 'marked'
import Icons from '../../assets/icons/Icons.jsx'

// Configure marked
marked.setOptions({ breaks: true, gfm: true })

// Code block with copy button
const CodeBlock = ({ code, lang }) => {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative rounded-xl border border-border-subtle overflow-hidden mb-4" style={{ background: '#0d0d1a' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
        <span className="text-xs text-text-secondary font-mono">{lang || 'code'}</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors">
          {copied ? <Icons.Check size={13} className="text-green-400" /> : <Icons.Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-text-primary">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// Process markdown with custom code blocks
const renderMarkdown = (content) => {
  if (!content) return []

  const parts = []
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'code', lang: match[1], content: match[2].trim() })
    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) })
  }

  return parts.length > 0 ? parts : [{ type: 'text', content }]
}

export function MessageContent({ content }) {
  if (!content || typeof content !== 'string') return null

  const parts = renderMarkdown(content)

  return (
    <div className="prose-kizen">
      {parts.map((part, i) => {
        if (part.type === 'code') {
          return <CodeBlock key={i} code={part.content} lang={part.lang} />
        }
        return (
          <div key={i}
            dangerouslySetInnerHTML={{
              __html: marked.parse(part.content)
            }}
          />
        )
      })}
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <div className="typing-dot w-1.5 h-1.5 rounded-full bg-text-secondary" />
      <div className="typing-dot w-1.5 h-1.5 rounded-full bg-text-secondary" />
      <div className="typing-dot w-1.5 h-1.5 rounded-full bg-text-secondary" />
    </div>
  )
}

export function AttachmentCard({ attachment }) {
  if (attachment.isImage) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden border border-border-subtle inline-block max-w-sm">
        <img src={attachment.data} alt={attachment.name} className="max-w-full max-h-64 object-contain" />
        <div className="px-3 py-1.5 bg-surface-2 border-t border-border-subtle flex items-center gap-2">
          <Icons.Image size={12} className="text-text-secondary" />
          <span className="text-xs text-text-secondary">{attachment.name}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2 flex items-center gap-3 px-4 py-3 rounded-xl border border-border-subtle bg-surface-2 inline-flex max-w-xs">
      <Icons.File size={20} className="text-accent" />
      <div>
        <div className="text-sm text-text-primary">{attachment.name}</div>
        <div className="text-xs text-text-secondary">{(attachment.size / 1024).toFixed(1)} KB</div>
      </div>
    </div>
  )
}

export function MessageBubble({ message, isStreaming = false }) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const copyMessage = async () => {
    const text = typeof message.content === 'string' ? message.content : ''
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex gap-3 group animate-slide-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-accent-dim border border-accent/30 flex items-center justify-center flex-shrink-0 mt-1">
          <Icons.Logo size={18} />
        </div>
      )}

      <div className={`flex flex-col gap-2 max-w-2xl ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Content */}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'bg-accent text-white rounded-tr-sm'
            : 'bg-surface-2 border border-border-subtle text-text-primary rounded-tl-sm'
          }`}
          style={isUser ? {} : { background: '#12121c' }}>

          {isStreaming ? (
            <div className="flex items-center gap-3">
              <TypingIndicator />
              {message.content && (
                <div className="text-text-secondary text-xs">Generating...</div>
              )}
            </div>
          ) : (
            <MessageContent content={typeof message.content === 'string' ? message.content : ''} />
          )}
        </div>

        {/* Attachments */}
        {message.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map(att => (
              <AttachmentCard key={att.id} attachment={att} />
            ))}
          </div>
        )}

        {/* Actions (assistant only) */}
        {!isUser && !isStreaming && message.content && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={copyMessage}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all">
              {copied ? <Icons.Check size={12} className="text-green-400" /> : <Icons.Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {message.tokens_used && (
              <span className="text-xs text-text-secondary/40 px-2">{message.tokens_used} tokens</span>
            )}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-white/10 border border-border-subtle flex items-center justify-center flex-shrink-0 mt-1 text-xs font-medium text-text-primary">
          U
        </div>
      )}
    </div>
  )
}
