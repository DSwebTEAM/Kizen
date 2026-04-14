// StorageManager — Kizen's platform controller
// All localStorage access goes through here. Cloud-ready abstraction.

const KEYS = {
  SETTINGS: 'kizen_settings',
  API_KEYS: 'kizen_api_keys',
  CONVERSATIONS: 'kizen_conversations',
  MEMORY: 'kizen_memory',
  USAGE: 'kizen_usage',
  ONBOARDED: 'kizen_onboarded',
}

const DEFAULT_SETTINGS = {
  theme: 'dark',
  spending_mode: 'balanced',
  active_provider: null,
  active_model: null,
  temperature: 0.7,
  max_tokens: 2048,
  stream_enabled: true,
  memory_enabled: true,
  search_enabled: false,
  response_language: 'en',
  system_prompt: '',
  // Per-function model overrides
  model_overrides: {
    vision: null,
    code: null,
    document: null,
    search: null,
  },
  // AI behaviour fine-tuning
  behaviour: {
    tone: 'balanced', // formal | friendly | technical | balanced
    response_style: 'balanced', // concise | detailed | balanced
    personality: 'assistant', // assistant | mentor | peer
  }
}

const DEFAULT_USAGE = {
  total_tokens: 0,
  session_tokens: 0,
  tokens_by_provider: {},
  search_calls_total: 0,
  search_calls_session: 0,
  estimated_cost: {},
  last_reset: Date.now(),
}

// Safe JSON parse
const parse = (str, fallback) => {
  try { return JSON.parse(str) ?? fallback }
  catch { return fallback }
}

// Safe JSON stringify
const serialize = (val) => JSON.stringify(val)

// Get localStorage size in bytes
export const getStorageSize = () => {
  let total = 0
  for (const key of Object.values(KEYS)) {
    const val = localStorage.getItem(key)
    if (val) total += val.length * 2 // UTF-16
  }
  return total
}

// ─── Settings ────────────────────────────────────────────────
export const getSettings = () => {
  const stored = parse(localStorage.getItem(KEYS.SETTINGS), {})
  return { ...DEFAULT_SETTINGS, ...stored }
}

export const saveSettings = (updates) => {
  const current = getSettings()
  const next = deepMerge(current, updates)
  localStorage.setItem(KEYS.SETTINGS, serialize(next))
  return next
}

// ─── API Keys ────────────────────────────────────────────────
export const getApiKeys = () => {
  return parse(localStorage.getItem(KEYS.API_KEYS), {})
}

export const saveApiKey = (provider, key) => {
  const keys = getApiKeys()
  keys[provider] = key
  localStorage.setItem(KEYS.API_KEYS, serialize(keys))
}

export const removeApiKey = (provider) => {
  const keys = getApiKeys()
  delete keys[provider]
  localStorage.setItem(KEYS.API_KEYS, serialize(keys))
}

export const hasAnyApiKey = () => {
  const keys = getApiKeys()
  const aiProviders = ['groq', 'openrouter', 'together', 'fireworks', 'anthropic', 'openai']
  return aiProviders.some(p => keys[p] && keys[p].trim().length > 0)
}

export const isOnboarded = () => {
  return localStorage.getItem(KEYS.ONBOARDED) === 'true'
}

export const setOnboarded = () => {
  localStorage.setItem(KEYS.ONBOARDED, 'true')
}

// ─── Conversations ────────────────────────────────────────────
export const getConversations = () => {
  return parse(localStorage.getItem(KEYS.CONVERSATIONS), [])
}

export const getConversation = (id) => {
  const convos = getConversations()
  return convos.find(c => c.id === id) ?? null
}

export const saveConversation = (conversation) => {
  const convos = getConversations()
  const idx = convos.findIndex(c => c.id === conversation.id)
  if (idx >= 0) {
    convos[idx] = { ...convos[idx], ...conversation, updated_at: Date.now() }
  } else {
    convos.unshift({ ...conversation, updated_at: Date.now() })
  }
  localStorage.setItem(KEYS.CONVERSATIONS, serialize(convos))
  return conversation
}

export const deleteConversation = (id) => {
  const convos = getConversations().filter(c => c.id !== id)
  localStorage.setItem(KEYS.CONVERSATIONS, serialize(convos))
}

export const clearAllConversations = () => {
  localStorage.setItem(KEYS.CONVERSATIONS, serialize([]))
}

export const addMessageToConversation = (convId, message) => {
  const convo = getConversation(convId)
  if (!convo) return null
  convo.messages = [...(convo.messages || []), message]
  if (!convo.title && message.role === 'user') {
    convo.title = generateTitle(message.content)
  }
  return saveConversation(convo)
}

export const createConversation = (id, provider, model) => {
  const convo = {
    id,
    title: null,
    created_at: Date.now(),
    updated_at: Date.now(),
    provider,
    model,
    messages: [],
    incognito: false,
  }
  saveConversation(convo)
  return convo
}

// ─── Memory Engine ────────────────────────────────────────────
export const getMemory = () => {
  return parse(localStorage.getItem(KEYS.MEMORY), {
    facts: [],           // extracted facts [{content, source_conv, timestamp, importance}]
    summary: '',         // compressed overall memory summary
    last_updated: null,
  })
}

export const saveMemory = (memory) => {
  // Keep memory under 50KB
  const serialized = serialize(memory)
  if (serialized.length > 50000) {
    memory = compressMemory(memory)
  }
  localStorage.setItem(KEYS.MEMORY, serialize(memory))
}

export const addMemoryFact = (fact, sourceConvId) => {
  const memory = getMemory()
  memory.facts.push({
    content: fact,
    source_conv: sourceConvId,
    timestamp: Date.now(),
    importance: 1,
  })
  memory.last_updated = Date.now()
  saveMemory(memory)
}

export const updateMemorySummary = (summary) => {
  const memory = getMemory()
  memory.summary = summary
  memory.last_updated = Date.now()
  saveMemory(memory)
}

export const getMemoryContext = () => {
  const memory = getMemory()
  if (!memory.facts.length && !memory.summary) return ''
  
  const factsText = memory.facts
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 30)
    .map(f => `- ${f.content}`)
    .join('\n')

  return [
    memory.summary ? `## What I know about you:\n${memory.summary}` : '',
    memory.facts.length ? `## Remembered facts:\n${factsText}` : '',
  ].filter(Boolean).join('\n\n')
}

// ─── Usage Stats ──────────────────────────────────────────────
export const getUsage = () => {
  return parse(localStorage.getItem(KEYS.USAGE), DEFAULT_USAGE)
}

export const trackTokens = (provider, tokensUsed, costEstimate = 0) => {
  const usage = getUsage()
  usage.total_tokens += tokensUsed
  usage.session_tokens += tokensUsed
  usage.tokens_by_provider[provider] = (usage.tokens_by_provider[provider] || 0) + tokensUsed
  usage.estimated_cost[provider] = (usage.estimated_cost[provider] || 0) + costEstimate
  localStorage.setItem(KEYS.USAGE, serialize(usage))
}

export const trackSearchCall = () => {
  const usage = getUsage()
  usage.search_calls_total += 1
  usage.search_calls_session += 1
  localStorage.setItem(KEYS.USAGE, serialize(usage))
}

export const resetSessionStats = () => {
  const usage = getUsage()
  usage.session_tokens = 0
  usage.search_calls_session = 0
  localStorage.setItem(KEYS.USAGE, serialize(usage))
}

// ─── Nuclear reset ────────────────────────────────────────────
export const clearAllData = () => {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}

// ─── Export ───────────────────────────────────────────────────
export const exportAllData = () => {
  const data = {
    exported_at: new Date().toISOString(),
    settings: getSettings(),
    conversations: getConversations(),
    memory: getMemory(),
    usage: getUsage(),
  }
  const blob = new Blob([serialize(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kizen-export-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export const exportConversation = (id) => {
  const convo = getConversation(id)
  if (!convo) return
  const lines = [`# ${convo.title || 'Untitled'}\n`, `> Exported from Kizen on ${new Date().toLocaleString()}\n`]
  for (const msg of convo.messages) {
    lines.push(`\n### ${msg.role === 'user' ? 'You' : 'Kizen'}\n${msg.content}`)
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${convo.title || 'conversation'}-${id.slice(0, 6)}.md`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Helpers ──────────────────────────────────────────────────
const generateTitle = (content) => {
  if (typeof content !== 'string') return 'New conversation'
  return content.slice(0, 60).trim() + (content.length > 60 ? '...' : '')
}

const compressMemory = (memory) => {
  // Keep only top 20 facts by importance, drop the rest
  memory.facts = memory.facts
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 20)
  return memory
}

const deepMerge = (target, source) => {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

export { KEYS }
