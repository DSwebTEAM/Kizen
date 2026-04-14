// ModelRouter — Rule-based intent detection + model routing
// Detects intent from user message, routes to specialized model,
// feeds result back to main model for unified response.

import { getSettings, getApiKeys } from './StorageManager.js'

// ─── Provider configs ─────────────────────────────────────────
export const PROVIDERS = {
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    models: {
      economy: 'llama-3.1-8b-instant',
      balanced: 'llama-3.3-70b-versatile',
      max: 'llama-3.3-70b-versatile',
    },
    supportsVision: false,
    supportsStreaming: true,
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    models: {
      economy: 'mistralai/mistral-7b-instruct',
      balanced: 'mistralai/mixtral-8x7b-instruct',
      max: 'anthropic/claude-3.5-sonnet',
    },
    supportsVision: true,
    supportsStreaming: true,
    extraHeaders: {
      'HTTP-Referer': 'https://kizen.app',
      'X-Title': 'Kizen',
    }
  },
  together: {
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1/chat/completions',
    models: {
      economy: 'meta-llama/Llama-3.2-3B-Instruct-Turbo',
      balanced: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      max: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
    },
    supportsVision: false,
    supportsStreaming: true,
  },
  fireworks: {
    name: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1/chat/completions',
    models: {
      economy: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
      balanced: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
      max: 'accounts/fireworks/models/llama-v3p1-405b-instruct',
    },
    supportsVision: false,
    supportsStreaming: true,
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    models: {
      economy: 'claude-haiku-4-5-20251001',
      balanced: 'claude-sonnet-4-6',
      max: 'claude-opus-4-6',
    },
    supportsVision: true,
    supportsStreaming: true,
    isAnthropic: true,
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    models: {
      economy: 'gpt-4o-mini',
      balanced: 'gpt-4o',
      max: 'gpt-4o',
    },
    supportsVision: true,
    supportsStreaming: true,
  },
}

// Spending mode token limits
export const SPENDING_LIMITS = {
  economy: { max_tokens: 512, context_messages: 5 },
  balanced: { max_tokens: 2048, context_messages: 15 },
  max: { max_tokens: 8192, context_messages: 50 },
}

// ─── Intent Detection ─────────────────────────────────────────
const INTENT_PATTERNS = {
  vision: [
    /\b(image|photo|picture|screenshot|diagram|chart|graph|logo|visual|see|look at|analyze.*image|what.*in.*image)\b/i,
  ],
  code: [
    /\b(code|debug|function|error|bug|fix|script|program|syntax|compile|runtime|exception|stack trace|refactor|implement)\b/i,
    /```[\w]*\n/,
    /\b(python|javascript|typescript|rust|go|java|c\+\+|html|css|sql|bash|shell)\b/i,
  ],
  document: [
    /\b(document|pdf|file|summarize|extract|read.*file|analyze.*doc|text from)\b/i,
  ],
  search: [
    /\b(search|latest|recent|news|today|current|2024|2025|2026|what.*happening|who.*is|when.*did)\b/i,
  ],
  math: [
    /\b(calculate|compute|solve|equation|formula|math|algebra|calculus|statistics)\b/i,
    /[\d]+\s*[\+\-\*\/\^]\s*[\d]+/,
  ],
}

export const detectIntent = (message, hasImages = false, hasFiles = false) => {
  if (hasImages) return 'vision'
  if (hasFiles) return 'document'

  const text = typeof message === 'string' ? message : ''
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some(p => p.test(text))) return intent
  }
  return 'chat'
}

// ─── Model Selection ──────────────────────────────────────────
export const selectModel = (provider, spendingMode, intent = 'chat') => {
  const settings = getSettings()
  const providerConfig = PROVIDERS[provider]
  if (!providerConfig) return null

  // Check for user-defined override for this intent
  const override = settings.model_overrides?.[intent]
  if (override) return override

  // For vision intent, check if provider supports it
  if (intent === 'vision' && !providerConfig.supportsVision) {
    // Find a vision-capable provider
    const keys = getApiKeys()
    const visionProviders = ['anthropic', 'openai', 'openrouter']
    for (const vp of visionProviders) {
      if (keys[vp]) return { provider: vp, model: PROVIDERS[vp].models[spendingMode] }
    }
  }

  return providerConfig.models[spendingMode] || providerConfig.models.balanced
}

// ─── Context Chunker ──────────────────────────────────────────
export const buildContext = (messages, spendingMode) => {
  const limit = SPENDING_LIMITS[spendingMode] || SPENDING_LIMITS.balanced
  const { context_messages } = limit

  if (messages.length <= context_messages) return messages

  // Recent messages: full content
  const recent = messages.slice(-5)
  // Middle messages: summarize
  const older = messages.slice(0, -5)

  // Build compressed older context
  const compressedOlder = older
    .filter((_, i) => i % 2 === 0) // keep every other for summary feel
    .slice(-(context_messages - 5))
    .map(m => ({
      ...m,
      content: typeof m.content === 'string'
        ? m.content.slice(0, 200) + (m.content.length > 200 ? '...' : '')
        : m.content,
    }))

  return [...compressedOlder, ...recent]
}

// ─── System Prompt Builder ────────────────────────────────────
export const buildSystemPrompt = (memoryContext = '', settings = {}) => {
  const behaviour = settings.behaviour || {}
  const toneMap = {
    formal: 'You are a professional, precise AI assistant. Use formal language.',
    friendly: 'You are a warm, approachable tech friend. Be conversational and encouraging.',
    technical: 'You are a highly technical AI assistant. Use precise technical language and go deep.',
    balanced: 'You are a smart, helpful AI assistant. Balance friendliness with precision.',
  }
  const styleMap = {
    concise: 'Keep responses brief and to the point. Avoid padding.',
    detailed: 'Provide thorough, comprehensive responses with context and examples.',
    balanced: 'Match response length to the complexity of the question.',
  }
  const personalityMap = {
    assistant: 'You assist efficiently and professionally.',
    mentor: 'You guide and teach, explaining the "why" behind answers.',
    peer: 'You engage as a knowledgeable peer — collaborative, not hierarchical.',
  }

  const parts = [
    `You are Kizen, an advanced AI research and development assistant.`,
    toneMap[behaviour.tone] || toneMap.balanced,
    styleMap[behaviour.response_style] || styleMap.balanced,
    personalityMap[behaviour.personality] || personalityMap.assistant,
    `Format code in markdown code blocks with language tags.`,
    `Today's date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`,
  ]

  if (settings.system_prompt) {
    parts.push(`\nUser-defined instructions:\n${settings.system_prompt}`)
  }

  if (memoryContext) {
    parts.push(`\n${memoryContext}`)
  }

  return parts.join(' ')
}

// ─── Cost Estimation ──────────────────────────────────────────
const COST_PER_1M = {
  // Input / Output cost per 1M tokens (averaged)
  'llama-3.1-8b-instant': 0.05,
  'llama-3.3-70b-versatile': 0.59,
  'gpt-4o-mini': 0.15,
  'gpt-4o': 5.0,
  'claude-haiku-4-5-20251001': 0.25,
  'claude-sonnet-4-6': 3.0,
  'claude-opus-4-6': 15.0,
}

export const estimateCost = (model, tokens) => {
  const rate = COST_PER_1M[model] || 1.0
  return (tokens / 1_000_000) * rate
}

// ─── API Call ─────────────────────────────────────────────────
export const callProvider = async (provider, model, messages, settings, onChunk = null) => {
  const keys = getApiKeys()
  const apiKey = keys[provider]
  if (!apiKey) throw new Error(`No API key for ${provider}`)

  const config = PROVIDERS[provider]
  const { max_tokens, stream_enabled, temperature } = settings
  const stream = stream_enabled && onChunk !== null

  // Anthropic has a different API format
  if (config.isAnthropic) {
    return callAnthropic(apiKey, model, messages, { max_tokens, temperature, stream }, onChunk)
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    ...(config.extraHeaders || {}),
  }

  const body = {
    model,
    messages,
    max_tokens: max_tokens || 2048,
    temperature: temperature ?? 0.7,
    stream,
  }

  const res = await fetch(config.baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `${provider} API error: ${res.status}`)
  }

  if (stream && onChunk) {
    return streamResponse(res, onChunk)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

const callAnthropic = async (apiKey, model, messages, options, onChunk) => {
  // Extract system from messages
  const systemMsg = messages.find(m => m.role === 'system')
  const chatMessages = messages.filter(m => m.role !== 'system')

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  }

  const body = {
    model,
    messages: chatMessages,
    max_tokens: options.max_tokens || 2048,
    temperature: options.temperature ?? 0.7,
    stream: options.stream,
    ...(systemMsg ? { system: systemMsg.content } : {}),
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Anthropic API error: ${res.status}`)
  }

  if (options.stream && onChunk) {
    return streamAnthropicResponse(res, onChunk)
  }

  const data = await res.json()
  return data.content?.[0]?.text || ''
}

const streamResponse = async (res, onChunk) => {
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

    for (const line of lines) {
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        const text = parsed.choices?.[0]?.delta?.content || ''
        if (text) { full += text; onChunk(text) }
      } catch {}
    }
  }
  return full
}

const streamAnthropicResponse = async (res, onChunk) => {
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line.slice(6))
        if (parsed.type === 'content_block_delta') {
          const text = parsed.delta?.text || ''
          if (text) { full += text; onChunk(text) }
        }
      } catch {}
    }
  }
  return full
}

// ─── Serper Search ────────────────────────────────────────────
export const searchWeb = async (query, serperKey) => {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': serperKey,
    },
    body: JSON.stringify({ q: query, num: 5 }),
  })

  if (!res.ok) throw new Error('Search failed')
  const data = await res.json()

  return (data.organic || []).map((r, i) => ({
    index: i + 1,
    title: r.title,
    url: r.link,
    snippet: r.snippet,
    domain: new URL(r.link).hostname.replace('www.', ''),
  }))
}

// ─── Memory Extractor ─────────────────────────────────────────
export const extractMemoryFromConversation = async (messages, provider, model, settings) => {
  if (messages.length < 2) return []

  const conversationText = messages
    .slice(-20) // Last 20 messages
    .map(m => `${m.role}: ${typeof m.content === 'string' ? m.content.slice(0, 300) : '[attachment]'}`)
    .join('\n')

  const extractPrompt = `Extract important facts about the USER from this conversation that would be useful to remember in future conversations. Focus on: name, profession, projects, preferences, technical skills, goals, location. Return ONLY a JSON array of short fact strings. Max 5 facts. If nothing important, return [].

Conversation:
${conversationText}`

  try {
    const result = await callProvider(provider, model, [
      { role: 'user', content: extractPrompt }
    ], { ...settings, stream_enabled: false, max_tokens: 256 })

    const clean = result.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return []
  }
}
