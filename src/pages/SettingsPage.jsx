import React, { useState, useEffect } from 'react'
import {
  getSettings, saveSettings, getApiKeys, saveApiKey, removeApiKey,
  getMemory, saveMemory, clearAllConversations, clearAllData,
  exportAllData, getUsage
} from '../core/StorageManager.js'
import { PROVIDERS } from '../core/ModelRouter.js'
import Icons from '../assets/icons/Icons.jsx'

const PROVIDER_LIST = [
  { id: 'groq', label: 'Groq', url: 'console.groq.com' },
  { id: 'openrouter', label: 'OpenRouter', url: 'openrouter.ai/keys' },
  { id: 'together', label: 'Together AI', url: 'api.together.ai' },
  { id: 'fireworks', label: 'Fireworks AI', url: 'fireworks.ai' },
  { id: 'anthropic', label: 'Anthropic', url: 'console.anthropic.com' },
  { id: 'openai', label: 'OpenAI', url: 'platform.openai.com' },
]

const MODELS_BY_PROVIDER = {
  groq: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  openrouter: ['mistralai/mistral-7b-instruct', 'mistralai/mixtral-8x7b-instruct', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-70b-instruct', 'google/gemini-flash-1.5'],
  together: ['meta-llama/Llama-3.2-3B-Instruct-Turbo', 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo'],
  fireworks: ['accounts/fireworks/models/llama-v3p1-8b-instruct', 'accounts/fireworks/models/llama-v3p1-70b-instruct', 'accounts/fireworks/models/llama-v3p1-405b-instruct'],
  anthropic: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-6'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'o1-mini'],
}

const Section = ({ title, icon: Icon, children }) => (
  <div className="mb-8">
    <div className="flex items-center gap-2.5 mb-4">
      <Icon size={16} className="text-accent" />
      <h2 className="font-display font-semibold text-text-primary">{title}</h2>
    </div>
    <div className="rounded-2xl border border-border-subtle overflow-hidden" style={{ background: '#0f0f1a' }}>
      {children}
    </div>
  </div>
)

const Row = ({ label, desc, children, noBorder = false }) => (
  <div className={`flex items-center justify-between px-5 py-4 ${!noBorder ? 'border-b border-border-subtle' : ''}`}>
    <div className="flex-1 pr-6">
      <div className="text-sm font-medium text-text-primary">{label}</div>
      {desc && <div className="text-xs text-text-secondary mt-0.5">{desc}</div>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
)

const Toggle = ({ value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    className={`relative w-11 h-6 rounded-full transition-all duration-200 ${value ? 'bg-accent' : 'bg-white/10'}`}>
    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${value ? 'left-[22px]' : 'left-0.5'}`} />
  </button>
)

const PingStatus = ({ status }) => {
  if (!status) return null
  return (
    <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg
      ${status === 'ok' ? 'text-green-400 bg-green-400/10' :
        status === 'error' ? 'text-red-400 bg-red-400/10' : 'text-yellow-400 bg-yellow-400/10'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'ok' ? 'bg-green-400' : status === 'error' ? 'bg-red-400' : 'bg-yellow-400'}`} />
      {status === 'ok' ? 'Connected' : status === 'error' ? 'Failed' : 'Testing...'}
    </span>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(getSettings())
  const [keys, setKeys] = useState(getApiKeys())
  const [showKeys, setShowKeys] = useState({})
  const [pingStatus, setPingStatus] = useState({})
  const [memory, setMemory] = useState(getMemory())
  const [activeSection, setActiveSection] = useState('providers')
  const [saved, setSaved] = useState(false)
  const [confirmClear, setConfirmClear] = useState(null)

  const updateSetting = (key, value) => {
    const updated = saveSettings({ [key]: value })
    setSettings(updated)
    flashSaved()
  }

  const updateNestedSetting = (parent, key, value) => {
    const updated = saveSettings({ [parent]: { ...settings[parent], [key]: value } })
    setSettings(updated)
    flashSaved()
  }

  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleKeyChange = (provider, val) => {
    setKeys(prev => ({ ...prev, [provider]: val }))
  }

  const handleKeySave = (provider) => {
    const val = keys[provider]?.trim()
    if (val) saveApiKey(provider, val)
    else removeApiKey(provider)
    flashSaved()
  }

  const toggleKeyVisibility = (id) => setShowKeys(prev => ({ ...prev, [id]: !prev[id] }))

  const testConnection = async (provider) => {
    const key = keys[provider]?.trim()
    if (!key) return
    setPingStatus(prev => ({ ...prev, [provider]: 'testing' }))

    try {
      const config = PROVIDERS[provider]
      const headers = { 'Content-Type': 'application/json' }

      if (config.isAnthropic) {
        headers['x-api-key'] = key
        headers['anthropic-version'] = '2023-06-01'
      } else {
        headers['Authorization'] = `Bearer ${key}`
        if (config.extraHeaders) Object.assign(headers, config.extraHeaders)
      }

      const model = config.models.economy
      let body, url

      if (config.isAnthropic) {
        url = 'https://api.anthropic.com/v1/messages'
        body = { model, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }
      } else {
        url = config.baseUrl
        body = { model, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }
      }

      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
      setPingStatus(prev => ({ ...prev, [provider]: res.ok ? 'ok' : 'error' }))
    } catch {
      setPingStatus(prev => ({ ...prev, [provider]: 'error' }))
    }
  }

  const clearMemory = () => {
    saveMemory({ facts: [], summary: '', last_updated: null })
    setMemory(getMemory())
    flashSaved()
  }

  const sections = [
    { id: 'providers', label: 'API Keys', icon: Icons.Key },
    { id: 'model', label: 'Model', icon: Icons.Cpu },
    { id: 'spending', label: 'Spending', icon: Icons.Zap },
    { id: 'behaviour', label: 'AI Behaviour', icon: Icons.Brain },
    { id: 'memory', label: 'Memory', icon: Icons.Memory },
    { id: 'advanced', label: 'Advanced', icon: Icons.Settings },
    { id: 'data', label: 'Data & Privacy', icon: Icons.Trash },
  ]

  return (
    <div className="h-full flex overflow-hidden">
      {/* Settings sidebar */}
      <div className="w-52 flex-shrink-0 border-r border-border-subtle py-4 px-3" style={{ background: '#0d0d16' }}>
        <div className="text-xs text-text-secondary/50 uppercase tracking-wider font-medium px-2 mb-3">Settings</div>
        {sections.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveSection(id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm mb-0.5 transition-all
              ${activeSection === id
                ? 'text-text-primary bg-accent-dim border border-accent/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}>
            <Icon size={14} className={activeSection === id ? 'text-accent' : ''} />
            {label}
          </button>
        ))}

        {/* Saved indicator */}
        {saved && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-green-400/10 border border-green-400/20 text-green-400 text-xs animate-fade-in">
            <Icons.Check size={12} />
            Saved
          </div>
        )}
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">

        {/* ── API Keys ── */}
        {activeSection === 'providers' && (
          <div>
            <h1 className="font-display font-bold text-2xl text-text-primary mb-1">API Keys</h1>
            <p className="text-text-secondary text-sm mb-6">Keys are stored only in your browser. Never sent to us.</p>

            <Section title="AI Providers" icon={Icons.Cpu}>
              {PROVIDER_LIST.map(({ id, label, url }, i) => (
                <div key={id} className={`px-5 py-4 ${i < PROVIDER_LIST.length - 1 ? 'border-b border-border-subtle' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-text-primary">{label}</span>
                      <a href={`https://${url}`} target="_blank" rel="noopener noreferrer"
                        className="ml-2 text-xs text-accent hover:text-accent-hover">
                        {url}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <PingStatus status={pingStatus[id]} />
                      <button onClick={() => testConnection(id)}
                        className="text-xs text-text-secondary hover:text-text-primary px-2.5 py-1 rounded-lg hover:bg-white/5 transition-all border border-border-subtle">
                        Test
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKeys[id] ? 'text' : 'password'}
                        value={keys[id] || ''}
                        onChange={(e) => handleKeyChange(id, e.target.value)}
                        placeholder={`${label} API key`}
                        className="kizen-input pr-10 font-mono text-xs"
                      />
                      <button onClick={() => toggleKeyVisibility(id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                        {showKeys[id] ? <Icons.EyeOff size={13} /> : <Icons.Eye size={13} />}
                      </button>
                    </div>
                    <button onClick={() => handleKeySave(id)}
                      className="kizen-btn-ghost border border-border-subtle px-3 text-xs">
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </Section>

            <Section title="Search Provider" icon={Icons.Search}>
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium text-text-primary">Serper</span>
                    <a href="https://serper.dev" target="_blank" rel="noopener noreferrer"
                      className="ml-2 text-xs text-accent">serper.dev</a>
                    <span className="ml-2 text-[10px] text-accent bg-accent-dim px-1.5 py-0.5 rounded">Optional</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKeys['serper'] ? 'text' : 'password'}
                      value={keys['serper'] || ''}
                      onChange={(e) => handleKeyChange('serper', e.target.value)}
                      placeholder="Serper API key"
                      className="kizen-input pr-10 font-mono text-xs"
                    />
                    <button onClick={() => toggleKeyVisibility('serper')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                      {showKeys['serper'] ? <Icons.EyeOff size={13} /> : <Icons.Eye size={13} />}
                    </button>
                  </div>
                  <button onClick={() => handleKeySave('serper')}
                    className="kizen-btn-ghost border border-border-subtle px-3 text-xs">Save</button>
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* ── Model ── */}
        {activeSection === 'model' && (
          <div>
            <h1 className="font-display font-bold text-2xl text-text-primary mb-1">Model Selection</h1>
            <p className="text-text-secondary text-sm mb-6">Set your active provider and model, and override models for specific functions.</p>

            <Section title="Active Provider & Model" icon={Icons.Cpu}>
              <Row label="Active Provider" desc="Which AI provider to use for general chat">
                <select
                  value={settings.active_provider || ''}
                  onChange={(e) => updateSetting('active_provider', e.target.value)}
                  className="kizen-input w-48 text-xs">
                  <option value="">Select provider</option>
                  {PROVIDER_LIST.filter(p => keys[p.id]).map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </Row>
              <Row label="Active Model" desc="Model to use for the active provider" noBorder>
                <select
                  value={settings.active_model || ''}
                  onChange={(e) => updateSetting('active_model', e.target.value)}
                  className="kizen-input w-48 text-xs">
                  <option value="">Auto (spending mode)</option>
                  {(settings.active_provider ? MODELS_BY_PROVIDER[settings.active_provider] || [] : []).map(m => (
                    <option key={m} value={m}>{m.split('/').pop()}</option>
                  ))}
                </select>
              </Row>
            </Section>

            <Section title="Function Model Overrides" icon={Icons.Lightning}>
              {[
                { key: 'vision', label: 'Vision / Image Analysis', desc: 'Model used when images are attached' },
                { key: 'code', label: 'Code Analysis', desc: 'Model used for code-heavy tasks' },
                { key: 'document', label: 'Document Processing', desc: 'Model used when files are attached' },
              ].map(({ key, label, desc }, i, arr) => (
                <Row key={key} label={label} desc={desc} noBorder={i === arr.length - 1}>
                  <select
                    value={settings.model_overrides?.[key] || ''}
                    onChange={(e) => updateNestedSetting('model_overrides', key, e.target.value)}
                    className="kizen-input w-48 text-xs">
                    <option value="">Follow active model</option>
                    {Object.entries(MODELS_BY_PROVIDER).flatMap(([provider, models]) =>
                      keys[provider] ? models.map(m => (
                        <option key={`${provider}:${m}`} value={m}>{m.split('/').pop()} ({PROVIDERS[provider]?.name})</option>
                      )) : []
                    )}
                  </select>
                </Row>
              ))}
            </Section>
          </div>
        )}

        {/* ── Spending ── */}
        {activeSection === 'spending' && (
          <div>
            <h1 className="font-display font-bold text-2xl text-text-primary mb-1">Spending Controls</h1>
            <p className="text-text-secondary text-sm mb-6">Control how many tokens Kizen uses and which model tiers are available.</p>

            <Section title="Spending Mode" icon={Icons.Zap}>
              {[
                { id: 'economy', label: 'Economy', icon: Icons.Zap, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30', desc: 'Smallest models · 512 token cap · lowest cost' },
                { id: 'balanced', label: 'Balanced', icon: Icons.Cpu, color: 'text-accent', bg: 'bg-accent-dim', border: 'border-accent/30', desc: 'Mid-tier models · 2048 token cap · recommended' },
                { id: 'max', label: 'Max', icon: Icons.Lightning, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', desc: 'Best models · 8192 token cap · highest quality' },
              ].map(({ id, label, icon: Icon, color, bg, border, desc }) => (
                <button key={id} onClick={() => updateSetting('spending_mode', id)}
                  className={`w-full flex items-center gap-4 px-5 py-4 text-left border-b border-border-subtle last:border-0 transition-all hover:bg-white/2
                    ${settings.spending_mode === id ? `${bg}` : ''}`}>
                  <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
                    <Icon size={16} className={color} />
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium text-sm ${settings.spending_mode === id ? color : 'text-text-primary'}`}>{label}</div>
                    <div className="text-xs text-text-secondary">{desc}</div>
                  </div>
                  {settings.spending_mode === id && <Icons.Check size={16} className={color} />}
                </button>
              ))}
            </Section>

            <Section title="Token Overrides" icon={Icons.Settings}>
              <Row label="Max Tokens" desc="Override spending mode token limit (0 = use mode default)">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.max_tokens || ''}
                    onChange={(e) => updateSetting('max_tokens', parseInt(e.target.value) || 0)}
                    placeholder="Auto"
                    className="kizen-input w-28 text-xs text-right"
                    min="0" max="32000" step="256"
                  />
                  <span className="text-xs text-text-secondary">tokens</span>
                </div>
              </Row>
              <Row label="Temperature" desc="Creativity vs. precision (0 = deterministic, 1 = creative)" noBorder>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0" max="1" step="0.05"
                    value={settings.temperature ?? 0.7}
                    onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
                    className="w-28 accent-[#7c6aff]"
                  />
                  <span className="text-xs text-text-secondary w-8 text-right font-mono">
                    {(settings.temperature ?? 0.7).toFixed(2)}
                  </span>
                </div>
              </Row>
            </Section>
          </div>
        )}

        {/* ── AI Behaviour ── */}
        {activeSection === 'behaviour' && (
          <div>
            <h1 className="font-display font-bold text-2xl text-text-primary mb-1">AI Behaviour</h1>
            <p className="text-text-secondary text-sm mb-6">Fine-tune how Kizen communicates and responds.</p>

            <Section title="Personality & Tone" icon={Icons.Brain}>
              <Row label="Tone" desc="How Kizen speaks to you">
                <select value={settings.behaviour?.tone || 'balanced'}
                  onChange={(e) => updateNestedSetting('behaviour', 'tone', e.target.value)}
                  className="kizen-input w-40 text-xs">
                  <option value="balanced">Balanced</option>
                  <option value="friendly">Friendly</option>
                  <option value="technical">Technical</option>
                  <option value="formal">Formal</option>
                </select>
              </Row>
              <Row label="Response Style" desc="How detailed responses should be">
                <select value={settings.behaviour?.response_style || 'balanced'}
                  onChange={(e) => updateNestedSetting('behaviour', 'response_style', e.target.value)}
                  className="kizen-input w-40 text-xs">
                  <option value="balanced">Balanced</option>
                  <option value="concise">Concise</option>
                  <option value="detailed">Detailed</option>
                </select>
              </Row>
              <Row label="Personality Mode" desc="How Kizen positions itself in conversation" noBorder>
                <select value={settings.behaviour?.personality || 'assistant'}
                  onChange={(e) => updateNestedSetting('behaviour', 'personality', e.target.value)}
                  className="kizen-input w-40 text-xs">
                  <option value="assistant">Assistant</option>
                  <option value="mentor">Mentor</option>
                  <option value="peer">Peer</option>
                </select>
              </Row>
            </Section>

            <Section title="Global System Prompt" icon={Icons.Settings}>
              <div className="p-5">
                <p className="text-xs text-text-secondary mb-3">Injected into every conversation after Kizen's default instructions.</p>
                <textarea
                  value={settings.system_prompt || ''}
                  onChange={(e) => updateSetting('system_prompt', e.target.value)}
                  placeholder="e.g. Always reply in Tamil. Prefer short answers. You are helping me build a SaaS product..."
                  rows={5}
                  className="kizen-input resize-none text-sm font-mono w-full"
                />
              </div>
            </Section>

            <Section title="Response Options" icon={Icons.Lightning}>
              <Row label="Stream Responses" desc="Show response as it's generated (real-time)">
                <Toggle value={settings.stream_enabled !== false} onChange={(v) => updateSetting('stream_enabled', v)} />
              </Row>
              <Row label="Response Language" desc="Language for Kizen's responses" noBorder>
                <select value={settings.response_language || 'en'}
                  onChange={(e) => updateSetting('response_language', e.target.value)}
                  className="kizen-input w-40 text-xs">
                  <option value="en">English</option>
                  <option value="ta">Tamil</option>
                  <option value="hi">Hindi</option>
                  <option value="ml">Malayalam</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ja">Japanese</option>
                  <option value="zh">Chinese</option>
                </select>
              </Row>
            </Section>
          </div>
        )}

        {/* ── Memory ── */}
        {activeSection === 'memory' && (
          <div>
            <h1 className="font-display font-bold text-2xl text-text-primary mb-1">Memory</h1>
            <p className="text-text-secondary text-sm mb-6">Kizen learns about you across conversations and injects that context into every chat.</p>

            <Section title="Memory Settings" icon={Icons.Brain}>
              <Row label="Enable Memory" desc="Inject remembered facts into every conversation">
                <Toggle value={settings.memory_enabled !== false} onChange={(v) => updateSetting('memory_enabled', v)} />
              </Row>
              <Row label="Web Search" desc="Enable Serper web search (requires Serper API key)" noBorder>
                <Toggle value={settings.search_enabled === true} onChange={(v) => updateSetting('search_enabled', v)} />
              </Row>
            </Section>

            <Section title="Memory Contents" icon={Icons.Memory}>
              <div className="p-5">
                {memory.facts?.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {memory.facts.map((fact, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-white/3 border border-border-subtle text-sm">
                        <Icons.Pin size={13} className="text-accent flex-shrink-0 mt-0.5" />
                        <span className="text-text-secondary">{fact.content}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-text-secondary text-sm">
                    <Icons.Brain size={28} className="mx-auto mb-3 text-text-secondary/30" />
                    No memories yet. Have some conversations and Kizen will start remembering things about you.
                  </div>
                )}

                {memory.facts?.length > 0 && (
                  <button onClick={clearMemory}
                    className="kizen-btn-ghost border border-red-500/20 text-red-400 hover:text-red-300 text-xs">
                    <Icons.Trash size={13} />
                    Clear all memories
                  </button>
                )}
              </div>
            </Section>
          </div>
        )}

        {/* ── Advanced ── */}
        {activeSection === 'advanced' && (
          <div>
            <h1 className="font-display font-bold text-2xl text-text-primary mb-1">Advanced</h1>
            <p className="text-text-secondary text-sm mb-6">Low-level controls for power users.</p>

            <Section title="Context Window" icon={Icons.Memory}>
              <Row label="Context Memory" desc="Include conversation history in every message">
                <Toggle value={settings.memory_enabled !== false} onChange={(v) => updateSetting('memory_enabled', v)} />
              </Row>
              <Row label="Context Messages" desc={`Messages sent as context (set by spending mode: ${settings.spending_mode === 'economy' ? '5' : settings.spending_mode === 'max' ? '50' : '15'})`} noBorder>
                <span className="text-xs text-text-secondary font-mono px-3 py-1.5 bg-white/5 rounded-lg border border-border-subtle">
                  {settings.spending_mode === 'economy' ? '5' : settings.spending_mode === 'max' ? '50' : '15'} messages
                </span>
              </Row>
            </Section>

            <Section title="Debug" icon={Icons.Analysis}>
              <div className="px-5 py-4">
                <div className="font-mono text-xs text-text-secondary space-y-1 leading-relaxed">
                  <div>Provider: <span className="text-accent">{settings.active_provider || 'none'}</span></div>
                  <div>Model: <span className="text-accent">{settings.active_model || 'auto'}</span></div>
                  <div>Mode: <span className="text-accent">{settings.spending_mode}</span></div>
                  <div>Temperature: <span className="text-accent">{settings.temperature ?? 0.7}</span></div>
                  <div>Max tokens: <span className="text-accent">{settings.max_tokens || 'auto'}</span></div>
                  <div>Stream: <span className="text-accent">{String(settings.stream_enabled !== false)}</span></div>
                  <div>Search: <span className="text-accent">{String(settings.search_enabled === true)}</span></div>
                  <div>Memory: <span className="text-accent">{String(settings.memory_enabled !== false)}</span></div>
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* ── Data & Privacy ── */}
        {activeSection === 'data' && (
          <div>
            <h1 className="font-display font-bold text-2xl text-text-primary mb-1">Data & Privacy</h1>
            <p className="text-text-secondary text-sm mb-6">All your data lives in this browser. Nothing is sent to our servers.</p>

            <Section title="Export" icon={Icons.Export}>
              <div className="px-5 py-4 flex flex-col gap-3">
                <button onClick={exportAllData}
                  className="kizen-btn-ghost border border-border-subtle text-sm w-fit">
                  <Icons.Download size={15} />
                  Export all data (JSON)
                </button>
                <p className="text-xs text-text-secondary">Exports all conversations, settings, and memory as a JSON file.</p>
              </div>
            </Section>

            <Section title="Danger Zone" icon={Icons.Trash}>
              <div className="px-5 py-4 space-y-4">
                {/* Clear conversations */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-text-primary">Clear conversation history</div>
                    <div className="text-xs text-text-secondary">Deletes all saved conversations. Irreversible.</div>
                  </div>
                  {confirmClear === 'convos' ? (
                    <div className="flex gap-2">
                      <button onClick={() => { clearAllConversations(); setConfirmClear(null); window.dispatchEvent(new Event('kizen:conversations-updated')) }}
                        className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 transition-all">Confirm</button>
                      <button onClick={() => setConfirmClear(null)}
                        className="text-xs text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg border border-border-subtle transition-all">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmClear('convos')}
                      className="kizen-btn-ghost border border-red-500/20 text-red-400 hover:text-red-300 text-xs">
                      <Icons.Trash size={13} />
                      Clear history
                    </button>
                  )}
                </div>

                <div className="h-px bg-border-subtle" />

                {/* Nuclear */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-red-400">Reset everything</div>
                    <div className="text-xs text-text-secondary">Deletes all data including API keys. Returns to onboarding.</div>
                  </div>
                  {confirmClear === 'all' ? (
                    <div className="flex gap-2">
                      <button onClick={() => { clearAllData(); window.location.href = '/onboarding' }}
                        className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 transition-all">Confirm reset</button>
                      <button onClick={() => setConfirmClear(null)}
                        className="text-xs text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg border border-border-subtle transition-all">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmClear('all')}
                      className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 border transition-all flex items-center gap-1.5">
                      <Icons.Trash size={13} />
                      Reset app
                    </button>
                  )}
                </div>
              </div>
            </Section>
          </div>
        )}

      </div>
    </div>
  )
}
