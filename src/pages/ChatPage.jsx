import React, { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import {
  getConversation, saveConversation, addMessageToConversation,
  getSettings, getApiKeys, getMemory, getMemoryContext,
  trackTokens, extractMemoryFromConversation, addMemoryFact, updateMemorySummary
} from '../core/StorageManager.js'
import {
  PROVIDERS, SPENDING_LIMITS, detectIntent, selectModel,
  buildSystemPrompt, buildContext, callProvider, searchWeb, estimateCost
} from '../core/ModelRouter.js'
import { MessageBubble, TypingIndicator } from '../components/chat/MessageBubble.jsx'
import ChatInput from '../components/chat/ChatInput.jsx'
import Icons from '../assets/icons/Icons.jsx'

export default function ChatPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { incognito } = useOutletContext()

  const [conversation, setConversation] = useState(null)
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const messagesEndRef = useRef(null)
  const abortRef = useRef(false)

  // Load or create conversation
  useEffect(() => {
    const newConvo = location.state?.newConvo
    if (newConvo) {
      setConversation(newConvo)
      // Auto-send the first message
      if (newConvo.messages?.length > 0) {
        sendMessage(newConvo, newConvo.messages[0])
      }
    } else {
      const existing = getConversation(id)
      if (existing) setConversation(existing)
      else navigate('/app')
    }
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages, streamingContent])

  // Extract memory when leaving
  useEffect(() => {
    return () => {
      if (!incognito && conversation?.messages?.length >= 4) {
        extractAndSaveMemory(conversation)
      }
    }
  }, [conversation])

  const extractAndSaveMemory = async (convo) => {
    const settings = getSettings()
    const keys = getApiKeys()
    const provider = settings.active_provider
    const model = settings.active_model || PROVIDERS[provider]?.models[settings.spending_mode || 'balanced']
    if (!provider || !keys[provider]) return

    try {
      const { extractMemoryFromConversation: extract } = await import('../core/ModelRouter.js')
      const facts = await extract(convo.messages, provider, model, settings)
      for (const fact of facts) {
        if (fact && typeof fact === 'string') {
          addMemoryFact(fact, convo.id)
        }
      }
    } catch (e) {
      console.warn('Memory extraction failed:', e)
    }
  }

  const sendMessage = async (convo, userMessage) => {
    const settings = getSettings()
    const keys = getApiKeys()
    const provider = settings.active_provider
    const spendingMode = settings.spending_mode || 'balanced'
    const model = settings.active_model || PROVIDERS[provider]?.models[spendingMode]

    if (!provider || !keys[provider]) {
      setError('No active provider. Please set up API keys in Settings.')
      return
    }

    setStreaming(true)
    setStreamingContent('')
    setError('')
    abortRef.current = false

    try {
      // Detect intent
      const hasImages = userMessage.attachments?.some(a => a.isImage)
      const hasFiles = userMessage.attachments?.some(a => !a.isImage)
      const messageText = typeof userMessage.content === 'string' ? userMessage.content : ''
      const intent = detectIntent(messageText, hasImages, hasFiles)

      // Web search if enabled
      let searchContext = ''
      if (settings.search_enabled && keys.serper && intent === 'search') {
        try {
          const results = await searchWeb(messageText, keys.serper)
          setSearchResults(results)
          searchContext = '\n\nSearch results:\n' + results.map(r =>
            `[${r.index}] ${r.title}\n${r.snippet}\nSource: ${r.url}`
          ).join('\n\n')
        } catch (e) {
          console.warn('Search failed:', e)
        }
      }

      // Build context (chunked)
      const allMessages = convo.messages || []
      const contextMessages = buildContext(allMessages.slice(0, -1), spendingMode)

      // Memory context
      const memoryCtx = settings.memory_enabled ? getMemoryContext() : ''

      // System prompt
      const systemPrompt = buildSystemPrompt(memoryCtx, settings)

      // Build messages for API
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...contextMessages.map(m => ({
          role: m.role,
          content: buildMessageContent(m),
        })),
        {
          role: 'user',
          content: buildMessageContent(userMessage, searchContext),
        }
      ]

      // Spending limits
      const limits = SPENDING_LIMITS[spendingMode]
      const callSettings = {
        ...settings,
        max_tokens: settings.max_tokens || limits.max_tokens,
      }

      // Stream response
      let fullResponse = ''
      await callProvider(provider, model, apiMessages, callSettings, (chunk) => {
        if (abortRef.current) return
        fullResponse += chunk
        setStreamingContent(fullResponse)
      })

      if (abortRef.current) return

      // Save assistant message
      const assistantMsg = {
        id: uuid(),
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now(),
        tokens_used: Math.ceil(fullResponse.length / 4),
        provider,
        model,
        search_results: searchResults,
      }

      const updatedConvo = {
        ...convo,
        messages: [...(convo.messages || []), assistantMsg],
        updated_at: Date.now(),
      }

      setConversation(updatedConvo)
      if (!incognito) {
        saveConversation(updatedConvo)
        window.dispatchEvent(new Event('kizen:conversations-updated'))
      }

      // Track usage
      trackTokens(provider, assistantMsg.tokens_used, estimateCost(model, assistantMsg.tokens_used))

    } catch (err) {
      setError(err.message || 'Something went wrong. Check your API key and try again.')
    } finally {
      setStreaming(false)
      setStreamingContent('')
      setSearchResults([])
    }
  }

  const buildMessageContent = (message, extraContext = '') => {
    const text = (typeof message.content === 'string' ? message.content : '') + extraContext
    const images = message.attachments?.filter(a => a.isImage) || []
    const files = message.attachments?.filter(a => !a.isImage) || []

    // Build file context
    let fileContext = ''
    for (const f of files) {
      if (f.text) fileContext += `\n\nFile: ${f.name}\n\`\`\`\n${f.text.slice(0, 8000)}\n\`\`\``
    }

    const fullText = text + fileContext

    if (images.length === 0) return fullText

    // Multi-modal content for vision
    return [
      { type: 'text', text: fullText },
      ...images.map(img => ({
        type: 'image_url',
        image_url: { url: img.data }
      }))
    ]
  }

  const handleUserSend = async (content, attachments) => {
    const userMsg = {
      id: uuid(),
      role: 'user',
      content,
      attachments,
      timestamp: Date.now(),
    }

    const updatedConvo = {
      ...conversation,
      messages: [...(conversation.messages || []), userMsg],
      updated_at: Date.now(),
    }

    setConversation(updatedConvo)
    if (!incognito) saveConversation(updatedConvo)

    await sendMessage(updatedConvo, userMsg)
  }

  const handleStop = () => {
    abortRef.current = true
    setStreaming(false)
    setStreamingContent('')
  }

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <TypingIndicator />
      </div>
    )
  }

  const messages = conversation.messages || []

  return (
    <div className="h-full flex flex-col">
      {/* Conversation header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle">
        <h2 className="font-medium text-text-primary text-sm truncate max-w-md">
          {conversation.title || 'New conversation'}
        </h2>
        <div className="flex items-center gap-2">
          {conversation.provider && (
            <span className="text-xs text-text-secondary bg-white/5 px-2.5 py-1 rounded-lg border border-border-subtle">
              {PROVIDERS[conversation.provider]?.name} · {(conversation.model || '').split('/').pop()}
            </span>
          )}
          {incognito && (
            <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
              <Icons.Incognito size={11} />
              Incognito
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming message */}
        {streaming && (
          <MessageBubble
            message={{ id: 'streaming', role: 'assistant', content: streamingContent }}
            isStreaming={!streamingContent}
          />
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm animate-fade-in">
            <Icons.X size={16} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Search results bar */}
      {searchResults.length > 0 && (
        <div className="px-6 py-3 border-t border-border-subtle">
          <div className="flex items-center gap-2 mb-2">
            <Icons.Search size={13} className="text-text-secondary" />
            <span className="text-xs text-text-secondary">Sources</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {searchResults.map(r => (
              <a key={r.index} href={r.url} target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border border-border-subtle bg-surface-2 hover:border-accent/30 transition-all text-xs text-text-secondary hover:text-text-primary"
                style={{ background: '#12121c' }}>
                <Icons.Globe size={11} />
                <div>
                  <div className="font-medium text-text-primary">{r.domain}</div>
                  <div className="text-text-secondary/60">{r.title.slice(0, 40)}...</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-6 pb-6 pt-3">
        <ChatInput
          onSend={handleUserSend}
          disabled={streaming}
          placeholder={streaming ? 'Generating...' : 'Message Kizen...'}
        />
        {streaming && (
          <button onClick={handleStop}
            className="mt-2 flex items-center gap-2 text-xs text-text-secondary hover:text-red-400 transition-colors mx-auto">
            <Icons.Stop size={12} />
            Stop generating
          </button>
        )}
      </div>
    </div>
  )
}
