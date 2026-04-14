import React, { useState, useEffect } from 'react'
import {
  getSettings, getApiKeys, getUsage, getMemory,
  getConversations, getStorageSize, trackTokens
} from '../core/StorageManager.js'
import { PROVIDERS } from '../core/ModelRouter.js'
import Icons from '../assets/icons/Icons.jsx'

const COST_PER_1M = {
  'llama-3.1-8b-instant': 0.05,
  'llama-3.3-70b-versatile': 0.59,
  'mixtral-8x7b-32768': 0.27,
  'gpt-4o-mini': 0.15,
  'gpt-4o': 5.0,
  'claude-haiku-4-5-20251001': 0.25,
  'claude-sonnet-4-6': 3.0,
  'claude-opus-4-6': 15.0,
}

const StatCard = ({ icon: Icon, label, value, sub, accent = false }) => (
  <div className="p-5 rounded-2xl border border-border-subtle" style={{ background: '#0f0f1a' }}>
    <div className="flex items-start justify-between mb-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ? 'bg-accent-dim border border-accent/20' : 'bg-white/5 border border-border-subtle'}`}>
        <Icon size={16} className={accent ? 'text-accent' : 'text-text-secondary'} />
      </div>
    </div>
    <div className="font-display font-bold text-2xl text-text-primary">{value}</div>
    <div className="text-sm text-text-secondary mt-0.5">{label}</div>
    {sub && <div className="text-xs text-text-secondary/50 mt-1">{sub}</div>}
  </div>
)

const PingBadge = ({ status }) => {
  const map = {
    ok: { color: 'text-green-400 bg-green-400/10 border-green-400/20', dot: 'bg-green-400', label: 'Connected' },
    error: { color: 'text-red-400 bg-red-400/10 border-red-400/20', dot: 'bg-red-400', label: 'Failed' },
    testing: { color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', dot: 'bg-yellow-400 animate-pulse', label: 'Testing...' },
    idle: { color: 'text-text-secondary bg-white/5 border-border-subtle', dot: 'bg-text-secondary/30', label: 'Not tested' },
  }
  const s = map[status] || map.idle
  return (
    <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

export default function AnalysisPage() {
  const [settings, setSettings] = useState(getSettings())
  const [keys, setKeys] = useState(getApiKeys())
  const [usage, setUsage] = useState(getUsage())
  const [memory, setMemory] = useState(getMemory())
  const [conversations, setConversations] = useState(getConversations())
  const [storageSize, setStorageSize] = useState(getStorageSize())
  const [pingStatus, setPingStatus] = useState({})
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const refresh = () => {
    setSettings(getSettings())
    setKeys(getApiKeys())
    setUsage(getUsage())
    setMemory(getMemory())
    setConversations(getConversations())
    setStorageSize(getStorageSize())
    setLastRefresh(new Date())
  }

  const testProvider = async (provider) => {
    const key = keys[provider]
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
      const body = config.isAnthropic
        ? { model, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }
        : { model, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }

      const start = Date.now()
      const res = await fetch(config.isAnthropic ? 'https://api.anthropic.com/v1/messages' : config.baseUrl, {
        method: 'POST', headers, body: JSON.stringify(body)
      })
      const latency = Date.now() - start

      setPingStatus(prev => ({
        ...prev,
        [provider]: res.ok ? 'ok' : 'error',
        [`${provider}_latency`]: res.ok ? `${latency}ms` : null
      }))
    } catch {
      setPingStatus(prev => ({ ...prev, [provider]: 'error' }))
    }
  }

  const testAll = async () => {
    const providers = Object.keys(PROVIDERS).filter(p => keys[p])
    for (const p of providers) await testProvider(p)
  }

  // Derived stats
  const totalCost = Object.values(usage.estimated_cost || {}).reduce((a, b) => a + b, 0)
  const storageMB = (storageSize / (1024 * 1024)).toFixed(3)
  const storagePercent = Math.min((storageSize / (5 * 1024 * 1024)) * 100, 100).toFixed(1)
  const connectedProviders = Object.keys(PROVIDERS).filter(p => keys[p])

  const spendingColors = {
    economy: 'text-green-400',
    balanced: 'text-accent',
    max: 'text-orange-400',
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary mb-1">Diagnostics</h1>
          <p className="text-text-secondary text-sm">Platform health, usage, and storage at a glance.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary/50">
            Refreshed {lastRefresh.toLocaleTimeString()}
          </span>
          <button onClick={refresh}
            className="kizen-btn-ghost border border-border-subtle text-xs">
            <Icons.Refresh size={13} />
            Refresh
          </button>
          <button onClick={testAll}
            className="kizen-btn-primary text-xs px-4 py-2">
            <Icons.Zap size={13} />
            Test all providers
          </button>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Icons.Cpu}
          label="Active Provider"
          value={settings.active_provider ? PROVIDERS[settings.active_provider]?.name : '—'}
          sub={settings.active_model?.split('/').pop() || 'No model selected'}
          accent
        />
        <StatCard
          icon={Icons.Memory}
          label="Session Tokens"
          value={usage.session_tokens?.toLocaleString() || '0'}
          sub={`${usage.total_tokens?.toLocaleString() || '0'} total`}
        />
        <StatCard
          icon={Icons.Analysis}
          label="Conversations"
          value={conversations.length}
          sub={`${memory.facts?.length || 0} memories saved`}
        />
        <StatCard
          icon={Icons.Globe}
          label="Est. Cost Today"
          value={`$${totalCost.toFixed(4)}`}
          sub="Approximate, varies by model"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">

        {/* API Health */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Icons.Zap size={15} className="text-accent" />
            <h2 className="font-display font-semibold text-text-primary">API Health</h2>
          </div>
          <div className="rounded-2xl border border-border-subtle overflow-hidden" style={{ background: '#0f0f1a' }}>
            {Object.entries(PROVIDERS).map(([id, config], i, arr) => {
              const hasKey = !!keys[id]
              const isActive = settings.active_provider === id
              const latency = pingStatus[`${id}_latency`]

              return (
                <div key={id}
                  className={`flex items-center justify-between px-5 py-3.5 ${i < arr.length - 1 ? 'border-b border-border-subtle' : ''} ${isActive ? 'bg-accent-dim' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${hasKey ? 'bg-green-400' : 'bg-white/10'}`} />
                    <div>
                      <div className="text-sm font-medium text-text-primary flex items-center gap-2">
                        {config.name}
                        {isActive && <span className="text-[10px] text-accent bg-accent-dim px-1.5 py-0.5 rounded border border-accent/20">Active</span>}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {hasKey ? (
                          <span>
                            Key set · {config.models[settings.spending_mode || 'balanced']?.split('/').pop()}
                            {latency && <span className="ml-2 text-green-400">{latency}</span>}
                          </span>
                        ) : 'No key configured'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PingBadge status={hasKey ? (pingStatus[id] || 'idle') : 'idle'} />
                    {hasKey && (
                      <button onClick={() => testProvider(id)}
                        className="text-xs text-text-secondary hover:text-text-primary px-2.5 py-1 rounded-lg hover:bg-white/5 border border-border-subtle transition-all">
                        Ping
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Usage breakdown */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Icons.Analysis size={15} className="text-accent" />
            <h2 className="font-display font-semibold text-text-primary">Usage Breakdown</h2>
          </div>
          <div className="rounded-2xl border border-border-subtle overflow-hidden" style={{ background: '#0f0f1a' }}>
            {/* Tokens by provider */}
            {Object.entries(usage.tokens_by_provider || {}).length > 0 ? (
              Object.entries(usage.tokens_by_provider).map(([provider, tokens], i, arr) => {
                const cost = usage.estimated_cost?.[provider] || 0
                const pct = usage.total_tokens > 0 ? (tokens / usage.total_tokens) * 100 : 0
                return (
                  <div key={provider} className={`px-5 py-3.5 ${i < arr.length - 1 ? 'border-b border-border-subtle' : ''}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-text-primary">{PROVIDERS[provider]?.name || provider}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-secondary font-mono">{tokens.toLocaleString()} tokens</span>
                        <span className="text-xs text-text-secondary font-mono">~${cost.toFixed(4)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="px-5 py-8 text-center text-sm text-text-secondary">
                No usage recorded yet this session.
              </div>
            )}
          </div>

          {/* Search stats */}
          <div className="mt-4 rounded-2xl border border-border-subtle overflow-hidden" style={{ background: '#0f0f1a' }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Icons.Search size={14} className="text-text-secondary" />
                <span className="text-sm text-text-primary">Web Search</span>
              </div>
              <PingBadge status={keys.serper ? 'ok' : 'idle'} />
            </div>
            <div className="px-5 py-3.5 flex items-center justify-between">
              <span className="text-xs text-text-secondary">Search calls this session</span>
              <span className="text-sm font-mono text-text-primary">{usage.search_calls_session || 0}</span>
            </div>
            <div className="px-5 py-3.5 border-t border-border-subtle flex items-center justify-between">
              <span className="text-xs text-text-secondary">Total search calls</span>
              <span className="text-sm font-mono text-text-primary">{usage.search_calls_total || 0}</span>
            </div>
          </div>
        </div>

        {/* Storage */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Icons.Memory size={15} className="text-accent" />
            <h2 className="font-display font-semibold text-text-primary">Storage</h2>
          </div>
          <div className="rounded-2xl border border-border-subtle overflow-hidden" style={{ background: '#0f0f1a' }}>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-primary">localStorage usage</span>
                <span className="text-sm font-mono text-text-primary">{storageMB} MB / 5 MB</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${parseFloat(storagePercent) > 80 ? 'bg-red-400' : parseFloat(storagePercent) > 50 ? 'bg-yellow-400' : 'bg-accent'}`}
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              <div className="space-y-2 text-xs text-text-secondary">
                <div className="flex justify-between">
                  <span>Conversations</span>
                  <span className="font-mono">{conversations.length} saved</span>
                </div>
                <div className="flex justify-between">
                  <span>Memories</span>
                  <span className="font-mono">{memory.facts?.length || 0} facts</span>
                </div>
                <div className="flex justify-between">
                  <span>Usage</span>
                  <span className="font-mono">{storagePercent}% used</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Session info */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Icons.Lightning size={15} className="text-accent" />
            <h2 className="font-display font-semibold text-text-primary">Session Info</h2>
          </div>
          <div className="rounded-2xl border border-border-subtle overflow-hidden" style={{ background: '#0f0f1a' }}>
            {[
              ['Spending Mode', <span className={`font-mono text-sm ${spendingColors[settings.spending_mode] || 'text-text-primary'}`}>{settings.spending_mode}</span>],
              ['Temperature', <span className="font-mono text-sm text-text-primary">{settings.temperature ?? 0.7}</span>],
              ['Max Tokens', <span className="font-mono text-sm text-text-primary">{settings.max_tokens || 'auto'}</span>],
              ['Streaming', <span className={`font-mono text-sm ${settings.stream_enabled !== false ? 'text-green-400' : 'text-text-secondary'}`}>{settings.stream_enabled !== false ? 'on' : 'off'}</span>],
              ['Memory', <span className={`font-mono text-sm ${settings.memory_enabled !== false ? 'text-green-400' : 'text-text-secondary'}`}>{settings.memory_enabled !== false ? 'on' : 'off'}</span>],
              ['Web Search', <span className={`font-mono text-sm ${settings.search_enabled ? 'text-green-400' : 'text-text-secondary'}`}>{settings.search_enabled ? 'on' : 'off'}</span>],
              ['Connected Providers', <span className="font-mono text-sm text-text-primary">{connectedProviders.length} / 6</span>],
            ].map(([label, value], i, arr) => (
              <div key={label} className={`flex items-center justify-between px-5 py-3 ${i < arr.length - 1 ? 'border-b border-border-subtle' : ''}`}>
                <span className="text-xs text-text-secondary">{label}</span>
                {value}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
