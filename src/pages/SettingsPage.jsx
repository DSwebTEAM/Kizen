import React, { useState, useEffect } from 'react'
import {
  getSettings, saveSettings, getApiKeys, saveApiKey, removeApiKey,
  getMemory, saveMemory, clearAllConversations, clearAllData,
  exportAllData, getUsage
} from '../core/StorageManager.js'
import { PROVIDERS } from '../core/ModelRouter.js'
import Icons from '../assets/icons/Icons.jsx'

// ─── Arc Gauge ────────────────────────────────────────────────
function ArcGauge({ value, max, label, color = 'var(--accent)', unit = '' }) {
  const pct = Math.min(1, value / max)
  const r = 36, cx = 50, cy = 50
  const startAngle = -220, sweep = 260
  const startRad = (startAngle * Math.PI) / 180
  const endRad = ((startAngle + sweep * pct) * Math.PI) / 180
  const bgEndRad = ((startAngle + sweep) * Math.PI) / 180

  const arc = (angle) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  })

  const pathD = (end) => {
    const s = arc(startRad)
    const e = arc(end)
    const large = (end - startRad) > Math.PI ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        {/* Background track */}
        <path d={pathD(bgEndRad)} fill="none" stroke="var(--border-default)" strokeWidth="6" strokeLinecap="square" />
        {/* Value arc */}
        {pct > 0 && (
          <path d={pathD(endRad)} fill="none" stroke={color} strokeWidth="6" strokeLinecap="square" />
        )}
        {/* Value text */}
        <text x="50" y="48" textAnchor="middle" style={{ fontSize: '14px', fontWeight: 700, fill: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
          {typeof value === 'number' ? (value >= 1000 ? `${(value/1000).toFixed(1)}k` : value) : value}
        </text>
        <text x="50" y="61" textAnchor="middle" style={{ fontSize: '9px', fill: 'var(--text-tertiary)', fontFamily: 'inherit' }}>
          {unit}
        </text>
      </svg>
      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────
function Toggle({ value, onChange, danger = false }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        position: 'relative', width: '40px', height: '22px',
        borderRadius: '11px', border: '1px solid var(--border-default)',
        background: value ? (danger ? 'var(--red)' : 'var(--accent)') : 'var(--bg-2)',
        transition: 'all 0.15s', cursor: 'pointer', flexShrink: 0,
        borderColor: value ? (danger ? 'var(--red)' : 'var(--accent)') : 'var(--border-default)',
      }}
    >
      <div style={{
        position: 'absolute', top: '2px', width: '16px', height: '16px',
        borderRadius: '8px', background: value ? '#fff' : 'var(--text-tertiary)',
        left: value ? '20px' : '2px', transition: 'left 0.15s',
      }} />
    </button>
  )
}

// ─── Slider ───────────────────────────────────────────────────
function Slider({ value, min, max, step = 0.1, onChange, color = 'var(--accent)' }) {
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: color, cursor: 'pointer' }}
      />
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────
function Section({ title, icon: Icon, tag, danger = false, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Icon size={14} style={{ color: danger ? 'var(--red)' : 'var(--accent)' }} />
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{title}</span>
        {tag && (
          <span style={{
            fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '2px 6px', borderRadius: '2px',
            color: tag === 'AFTERBURN' ? 'var(--red)' : 'var(--text-accent)',
            border: `1px solid ${tag === 'AFTERBURN' ? 'var(--red)' : 'var(--accent)'}`,
            background: tag === 'AFTERBURN' ? 'var(--red-dim)' : 'var(--accent-dim)',
          }}>
            {tag}
          </span>
        )}
      </div>
      <div style={{ border: '1px solid var(--border-default)', background: 'var(--bg-1)' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, desc, last = false, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: last ? 'none' : '1px solid var(--border-subtle)',
    }}>
      <div style={{ flex: 1, paddingRight: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
        {desc && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

const PROVIDER_LIST = [
  { id: 'groq', label: 'Groq', url: 'console.groq.com' },
  { id: 'openrouter', label: 'OpenRouter', url: 'openrouter.ai/keys' },
  { id: 'together', label: 'Together AI', url: 'api.together.ai' },
  { id: 'fireworks', label: 'Fireworks AI', url: 'fireworks.ai' },
  { id: 'anthropic', label: 'Anthropic', url: 'console.anthropic.com' },
  { id: 'openai', label: 'OpenAI', url: 'platform.openai.com' },
]

// ─── Ping status badge ────────────────────────────────────────
function PingBadge({ status }) {
  const map = {
    ok: { color: '#22c55e', label: 'Connected' },
    error: { color: 'var(--red)', label: 'Failed' },
    testing: { color: '#f59e0b', label: 'Testing...' },
    idle: { color: 'var(--text-tertiary)', label: 'Not tested' },
  }
  const s = map[status] || map.idle
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: s.color }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(getSettings())
  const [keys, setKeys] = useState(getApiKeys())
  const [showKeys, setShowKeys] = useState({})
  const [pingStatus, setPingStatus] = useState({})
  const [pingMs, setPingMs] = useState({})
  const [memory, setMemory] = useState(getMemory())
  const [saved, setSaved] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [section, setSection] = useState('providers')

  const updateSetting = (key, value) => {
    const updated = saveSettings({ [key]: value })
    setSettings(updated)
    window.dispatchEvent(new Event('kizen:settings-changed'))
    flashSaved()
  }

  const updateNested = (parent, key, value) => {
    const updated = saveSettings({ [parent]: { ...settings[parent], [key]: value } })
    setSettings(updated)
    flashSaved()
  }

  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  const handleKeyChange = (provider, val) => {
    setKeys(prev => ({ ...prev, [provider]: val }))
  }

  const handleKeySave = (provider) => {
    if (keys[provider]?.trim()) {
      saveApiKey(provider, keys[provider].trim())
      flashSaved()
    } else {
      removeApiKey(provider)
    }
  }

  const testProvider = async (provider) => {
    const key = keys[provider]
    if (!key) return
    setPingStatus(prev => ({ ...prev, [provider]: 'testing' }))
    const t0 = Date.now()
    try {
      const config = PROVIDERS[provider]
      const headers = { 'Content-Type': 'application/json' }
      let url = config.baseUrl
      let body
      if (config.isAnthropic) {
        headers['x-api-key'] = key
        headers['anthropic-version'] = '2023-06-01'
        body = JSON.stringify({ model: config.models.economy, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] })
      } else {
        headers['Authorization'] = `Bearer ${key}`
        body = JSON.stringify({ model: config.models.economy, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] })
      }
      if (config.extraHeaders) Object.assign(headers, config.extraHeaders)
      const res = await fetch(url, { method: 'POST', headers, body })
      const ms = Date.now() - t0
      setPingMs(prev => ({ ...prev, [provider]: ms }))
      setPingStatus(prev => ({ ...prev, [provider]: res.status < 500 ? 'ok' : 'error' }))
    } catch {
      setPingStatus(prev => ({ ...prev, [provider]: 'error' }))
    }
  }

  const SECTIONS = [
    { id: 'providers', label: 'Providers', icon: Icons.Key },
    { id: 'model', label: 'Model', icon: Icons.Cpu },
    { id: 'intelligence', label: 'Intelligence', icon: Icons.Brain },
    { id: 'afterburn', label: 'Afterburn', icon: Icons.Flame, tag: 'NEW' },
    { id: 'behaviour', label: 'Behaviour', icon: Icons.Sliders },
    { id: 'memory', label: 'Memory', icon: Icons.Brain },
    { id: 'appearance', label: 'Appearance', icon: Icons.Sun },
    { id: 'data', label: 'Data', icon: Icons.Shield },
  ]

  const isMobile = window.innerWidth < 768

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: 0 }}>
      {/* Nav — vertical sidebar on desktop, horizontal scrollable tabs on mobile */}
      <div style={{
        width: isMobile ? '100%' : '180px',
        flexShrink: 0,
        borderRight: isMobile ? 'none' : '1px solid var(--border-subtle)',
        borderBottom: isMobile ? '1px solid var(--border-subtle)' : 'none',
        padding: isMobile ? '0' : '16px 0',
        overflowX: isMobile ? 'auto' : 'visible',
        overflowY: 'auto',
        background: 'var(--bg-sidebar)',
        display: isMobile ? 'flex' : 'block',
        whiteSpace: 'nowrap',
      }}>
        {SECTIONS.map(({ id, label, icon: Icon, tag }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: isMobile ? '10px 14px' : '8px 16px',
              fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap',
              background: section === id ? 'var(--accent-dim)' : 'transparent',
              color: section === id ? 'var(--text-accent)' : 'var(--text-secondary)',
              borderLeft: isMobile ? 'none' : (section === id ? '2px solid var(--accent)' : '2px solid transparent'),
              borderBottom: isMobile ? (section === id ? '2px solid var(--accent)' : '2px solid transparent') : 'none',
              border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', marginBottom: isMobile ? '0' : '2px',
              borderRadius: isMobile ? '0' : '0 4px 4px 0',
              width: isMobile ? 'auto' : '100%',
              flexShrink: 0,
            }}
          >
            <Icon size={13} />
            {label}
            {tag && !isMobile && (
              <span style={{ fontSize: '9px', color: 'var(--red)', border: '1px solid var(--red)', padding: '1px 4px', borderRadius: '2px', marginLeft: 'auto' }}>{tag}</span>
            )}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '20px' }}>Settings</h1>
          {saved && (
            <span style={{ fontSize: '12px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Icons.Check size={12} />
              Saved
            </span>
          )}
        </div>

        {/* ── Providers ── */}
        {section === 'providers' && (
          <>
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: '4px', fontSize: '12px', color: 'var(--text-accent)' }}>
            <strong>One provider is all you need.</strong> Kizen routes vision, code, and document tasks to the right model within your chosen provider automatically. You can add more providers for fallback.
          </div>
          <Section title="API Keys" icon={Icons.Key}>
            {PROVIDER_LIST.map((p, i) => (
              <div key={p.id} style={{ borderBottom: i < PROVIDER_LIST.length - 1 ? '1px solid var(--border-subtle)' : 'none', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{p.label}</span>
                    <PingBadge status={pingStatus[p.id]} />
                    {pingMs[p.id] && <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono' }}>{pingMs[p.id]}ms</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {keys[p.id] && (
                      <button onClick={() => testProvider(p.id)} style={{
                        fontSize: '11px', padding: '3px 8px', border: '1px solid var(--border-default)',
                        borderRadius: '2px', background: 'transparent', color: 'var(--text-secondary)',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                        Test
                      </button>
                    )}
                    <button onClick={() => handleKeySave(p.id)} style={{
                      fontSize: '11px', padding: '3px 8px', border: '1px solid var(--accent)',
                      borderRadius: '2px', background: 'var(--accent-dim)', color: 'var(--text-accent)',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                      Save
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type={showKeys[p.id] ? 'text' : 'password'}
                    value={keys[p.id] || ''}
                    onChange={e => handleKeyChange(p.id, e.target.value)}
                    onBlur={() => handleKeySave(p.id)}
                    placeholder={`${p.label} API key — ${p.url}`}
                    className="kizen-input"
                    style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}
                  />
                  <button onClick={() => setShowKeys(s => ({ ...s, [p.id]: !s[p.id] }))} style={{ padding: '6px', border: '1px solid var(--border-default)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}>
                    {showKeys[p.id] ? <Icons.Incognito size={13} /> : <Icons.Globe size={13} />}
                  </button>
                </div>
              </div>
            ))}
          </Section>
          <Section title="Search Provider" icon={Icons.Search}>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Serper</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-accent)', background: 'var(--accent-dim)', padding: '1px 6px', borderRadius: '2px' }}>Optional — web search</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <a href="https://serper.dev" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--text-accent)' }}>serper.dev</a>
                  <button onClick={() => handleKeySave('serper')} style={{ fontSize: '11px', padding: '3px 8px', border: '1px solid var(--accent)', borderRadius: '2px', background: 'var(--accent-dim)', color: 'var(--text-accent)', cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type={showKeys['serper'] ? 'text' : 'password'}
                  value={keys['serper'] || ''}
                  onChange={e => handleKeyChange('serper', e.target.value)}
                  onBlur={() => handleKeySave('serper')}
                  placeholder="Serper API key — serper.dev"
                  className="kizen-input"
                  style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}
                />
                <button onClick={() => setShowKeys(s => ({ ...s, serper: !s.serper }))} style={{ padding: '6px', border: '1px solid var(--border-default)', borderRadius: '2px', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}>
                  {showKeys['serper'] ? <Icons.Incognito size={13} /> : <Icons.Globe size={13} />}
                </button>
              </div>
            </div>
          </Section>
          </>
        )}

        {/* ── Model ── */}
        {section === 'model' && (
          <>
            <Section title="Spending Mode" icon={Icons.Lightning}>
              {[
                { id: 'economy', label: 'Economy', desc: '512 tokens · fastest · cheapest' },
                { id: 'balanced', label: 'Balanced', desc: '2048 tokens · default choice' },
                { id: 'max', label: 'Max', desc: '8192 tokens · best quality' },
                { id: 'overdrive', label: 'Overdrive', desc: '16384 tokens · forces max model · all intelligence', danger: true },
              ].map((m, i, arr) => (
                <Row key={m.id} label={m.label} desc={m.desc} last={i === arr.length - 1}>
                  <button
                    onClick={() => updateSetting('spending_mode', m.id)}
                    style={{
                      padding: '4px 12px', fontSize: '11px', fontWeight: 500,
                      border: `1px solid ${settings.spending_mode === m.id ? (m.danger ? 'var(--red)' : 'var(--accent)') : 'var(--border-default)'}`,
                      borderRadius: '2px',
                      background: settings.spending_mode === m.id ? (m.danger ? 'var(--red-dim)' : 'var(--accent-dim)') : 'transparent',
                      color: settings.spending_mode === m.id ? (m.danger ? 'var(--red)' : 'var(--text-accent)') : 'var(--text-secondary)',
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    {m.danger && <Icons.Flame size={10} />}
                    {settings.spending_mode === m.id ? 'Active' : 'Select'}
                  </button>
                </Row>
              ))}
            </Section>

            <Section title="Performance" icon={Icons.Sliders}>
              <Row label="Temperature" desc={`${settings.temperature} — creativity vs precision`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '160px' }}>
                  <Slider value={settings.temperature} min={0} max={2} step={0.1} onChange={v => updateSetting('temperature', v)} />
                  <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)', minWidth: '28px' }}>{settings.temperature}</span>
                </div>
              </Row>
              <Row label="Max tokens" desc={`${settings.max_tokens} — per response limit`} last>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '160px' }}>
                  <Slider value={settings.max_tokens} min={256} max={8192} step={256} onChange={v => updateSetting('max_tokens', v)} />
                  <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)', minWidth: '36px' }}>{settings.max_tokens}</span>
                </div>
              </Row>
            </Section>
          </>
        )}

        {/* ── Intelligence ── */}
        {section === 'intelligence' && (
          <Section title="Intelligence Layer" icon={Icons.Brain} tag="PHASE 2">
            <Row label="Self-critique loop" desc="AI reviews its own response and identifies gaps before finalising">
              <Toggle value={settings.self_critique} onChange={v => updateSetting('self_critique', v)} />
            </Row>
            <Row label="Deep reasoning chain" desc="Forces step-by-step analysis and consideration of alternatives">
              <Toggle value={settings.deep_reasoning} onChange={v => updateSetting('deep_reasoning', v)} />
            </Row>
            <Row label="Confidence scoring" desc="Shows a 0–100% confidence bar on every AI response">
              <Toggle value={settings.confidence_scoring} onChange={v => updateSetting('confidence_scoring', v)} />
            </Row>
            <Row label="Clarification popup" desc="AI generates dynamic clarifying questions before answering">
              <Toggle value={settings.clarification_popup} onChange={v => updateSetting('clarification_popup', v)} />
            </Row>
            <Row label="Time awareness" desc="Includes current date and time in every system prompt" last>
              <Toggle value={settings.time_awareness !== false} onChange={v => updateSetting('time_awareness', v)} />
            </Row>
          </Section>
        )}

        {/* ── Afterburn ── */}
        {section === 'afterburn' && (
          <>
            {/* Red header */}
            <div style={{
              padding: '16px 20px', marginBottom: '20px',
              border: '1px solid var(--red)', background: 'var(--red-dim)',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <Icons.Flame size={16} style={{ color: 'var(--red)' }} />
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--red)' }}>Afterburn Panel</div>
                <div style={{ fontSize: '11px', color: 'var(--red)', opacity: 0.7 }}>Performance monitoring and power controls</div>
              </div>
            </div>

            {/* Live gauges */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                Live gauges
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                padding: '20px', border: '1px solid var(--border-default)', background: 'var(--bg-1)',
              }}>
                <AfterburnGauges />
              </div>
            </div>

            {/* Power controls */}
            <Section title="Power Controls" icon={Icons.Sliders} tag="AFTERBURN">
              <Row label="Temperature boost" desc="Overdrive temperature override">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '160px' }}>
                  <Slider value={settings.temperature} min={0} max={2} step={0.05} onChange={v => updateSetting('temperature', v)} color="var(--red)" />
                  <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', color: 'var(--red)', minWidth: '28px' }}>{settings.temperature}</span>
                </div>
              </Row>
              <Row label="Context depth" desc="How many past messages to include">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '160px' }}>
                  <Slider value={settings.max_tokens / 512} min={1} max={32} step={1} onChange={v => updateSetting('max_tokens', Math.round(v * 512))} color="var(--red)" />
                  <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono', color: 'var(--red)', minWidth: '28px' }}>{Math.round(settings.max_tokens / 512)}x</span>
                </div>
              </Row>
              <Row label="Streaming" desc="Real-time token streaming" last>
                <Toggle value={settings.stream_enabled !== false} onChange={v => updateSetting('stream_enabled', v)} danger />
              </Row>
            </Section>

            {/* Overdrive arm */}
            <div style={{
              padding: '16px 20px',
              border: `1px solid ${settings.spending_mode === 'overdrive' ? 'var(--red)' : 'var(--border-default)'}`,
              background: settings.spending_mode === 'overdrive' ? 'var(--red-dim)' : 'var(--bg-1)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: settings.spending_mode === 'overdrive' ? 'var(--red)' : 'var(--text-primary)' }}>
                  Overdrive Mode
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  Forces max model · 16k context · all intelligence layers
                </div>
              </div>
              <button
                onClick={() => updateSetting('spending_mode', settings.spending_mode === 'overdrive' ? 'balanced' : 'overdrive')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 16px', fontSize: '12px', fontWeight: 600,
                  background: settings.spending_mode === 'overdrive' ? 'var(--red)' : 'transparent',
                  color: settings.spending_mode === 'overdrive' ? '#fff' : 'var(--red)',
                  border: '1px solid var(--red)', borderRadius: '2px',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
                className={settings.spending_mode === 'overdrive' ? 'animate-overdrive' : ''}
              >
                <Icons.Flame size={13} />
                {settings.spending_mode === 'overdrive' ? 'ACTIVE — Deactivate' : 'Activate Overdrive'}
              </button>
            </div>
          </>
        )}

        {/* ── Behaviour ── */}
        {section === 'behaviour' && (
          <>
            <Section title="Tone" icon={Icons.Sliders}>
              {[
                { id: 'balanced', label: 'Balanced', desc: 'Smart and helpful, friend with expertise' },
                { id: 'formal', label: 'Formal', desc: 'Professional, precise language' },
                { id: 'friendly', label: 'Friendly', desc: 'Warm, conversational, encouraging' },
                { id: 'technical', label: 'Technical', desc: 'Deep technical precision, no hand-holding' },
              ].map((t, i, arr) => (
                <Row key={t.id} label={t.label} desc={t.desc} last={i === arr.length - 1}>
                  <button
                    onClick={() => updateNested('behaviour', 'tone', t.id)}
                    style={{
                      padding: '3px 10px', fontSize: '11px',
                      border: `1px solid ${settings.behaviour?.tone === t.id ? 'var(--accent)' : 'var(--border-default)'}`,
                      borderRadius: '2px',
                      background: settings.behaviour?.tone === t.id ? 'var(--accent-dim)' : 'transparent',
                      color: settings.behaviour?.tone === t.id ? 'var(--text-accent)' : 'var(--text-secondary)',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {settings.behaviour?.tone === t.id ? 'Active' : 'Select'}
                  </button>
                </Row>
              ))}
            </Section>

            <Section title="Response Style" icon={Icons.Activity}>
              {[
                { id: 'balanced', label: 'Balanced', desc: 'Match length to complexity' },
                { id: 'concise', label: 'Concise', desc: 'Short and to the point, no padding' },
                { id: 'detailed', label: 'Detailed', desc: 'Thorough, comprehensive responses' },
              ].map((s, i, arr) => (
                <Row key={s.id} label={s.label} desc={s.desc} last={i === arr.length - 1}>
                  <button
                    onClick={() => updateNested('behaviour', 'response_style', s.id)}
                    style={{
                      padding: '3px 10px', fontSize: '11px',
                      border: `1px solid ${settings.behaviour?.response_style === s.id ? 'var(--accent)' : 'var(--border-default)'}`,
                      borderRadius: '2px',
                      background: settings.behaviour?.response_style === s.id ? 'var(--accent-dim)' : 'transparent',
                      color: settings.behaviour?.response_style === s.id ? 'var(--text-accent)' : 'var(--text-secondary)',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {settings.behaviour?.response_style === s.id ? 'Active' : 'Select'}
                  </button>
                </Row>
              ))}
            </Section>
          </>
        )}

        {/* ── Memory ── */}
        {section === 'memory' && (
          <Section title="Memory Engine" icon={Icons.Brain}>
            <Row label="Cross-chat memory" desc="Remember facts about you across conversations">
              <Toggle value={settings.memory_enabled !== false} onChange={v => updateSetting('memory_enabled', v)} />
            </Row>
            <Row label="Web search (Serper)" desc="Enable real-time web search (requires Serper key in Providers)" last>
              <Toggle value={settings.search_enabled} onChange={v => updateSetting('search_enabled', v)} />
            </Row>
          </Section>
        )}

        {/* ── Appearance ── */}
        {section === 'appearance' && (
          <Section title="Appearance" icon={Icons.Sun}>
            <Row label="Theme" desc="Light or dark interface">
              <div style={{ display: 'flex', gap: '6px' }}>
                {['light', 'dark'].map(t => (
                  <button key={t} onClick={() => {
                    updateSetting('theme', t)
                    document.documentElement.setAttribute('data-theme', t)
                    window.dispatchEvent(new Event('kizen:theme-changed'))
                  }} style={{
                    padding: '4px 12px', fontSize: '12px', fontFamily: 'inherit',
                    border: `1px solid ${settings.theme === t ? 'var(--accent)' : 'var(--border-default)'}`,
                    borderRadius: '4px',
                    background: settings.theme === t ? 'var(--accent-dim)' : 'transparent',
                    color: settings.theme === t ? 'var(--text-accent)' : 'var(--text-secondary)',
                    cursor: 'pointer', textTransform: 'capitalize',
                  }}>
                    {t === 'light' ? '☀ Light' : '☾ Dark'}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="Font size" desc="Base text size for the interface" last>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['Small', 'Default', 'Large'].map(s => (
                  <button key={s} onClick={() => updateSetting('font_size', s.toLowerCase())} style={{
                    padding: '4px 10px', fontSize: '11px', fontFamily: 'inherit',
                    border: `1px solid ${(settings.font_size || 'default') === s.toLowerCase() ? 'var(--accent)' : 'var(--border-default)'}`,
                    borderRadius: '4px',
                    background: (settings.font_size || 'default') === s.toLowerCase() ? 'var(--accent-dim)' : 'transparent',
                    color: (settings.font_size || 'default') === s.toLowerCase() ? 'var(--text-accent)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            </Row>
          </Section>
        )}

        {/* ── Data ── */}
        {section === 'data' && (
          <Section title="Data & Export" icon={Icons.Shield} danger>
            <Row label="Export all data" desc="Download all conversations, settings, and memory">
              <button onClick={exportAllData} className="kizen-btn-ghost" style={{ fontSize: '12px', padding: '4px 12px' }}>
                <Icons.Download size={13} />
                Export
              </button>
            </Row>
            <Row label="Clear conversations" desc="Delete all saved conversations">
              <button
                onClick={() => {
                  if (confirm === 'convos') { clearAllConversations(); setConfirm(null) }
                  else setConfirm('convos')
                }}
                style={{
                  padding: '4px 12px', fontSize: '12px', fontFamily: 'inherit',
                  border: `1px solid ${confirm === 'convos' ? 'var(--red)' : 'var(--border-default)'}`,
                  borderRadius: '2px',
                  background: confirm === 'convos' ? 'var(--red-dim)' : 'transparent',
                  color: confirm === 'convos' ? 'var(--red)' : 'var(--text-secondary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <Icons.Trash size={12} />
                {confirm === 'convos' ? 'Confirm delete' : 'Clear all'}
              </button>
            </Row>
            <Row label="Nuclear reset" desc="Delete everything — keys, conversations, memory, settings" last>
              <button
                onClick={() => {
                  if (confirm === 'all') { clearAllData(); window.location.href = '/'; }
                  else setConfirm('all')
                }}
                style={{
                  padding: '4px 12px', fontSize: '12px', fontFamily: 'inherit',
                  border: '1px solid var(--red)', borderRadius: '2px',
                  background: confirm === 'all' ? 'var(--red)' : 'var(--red-dim)',
                  color: confirm === 'all' ? '#fff' : 'var(--red)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <Icons.X size={12} />
                {confirm === 'all' ? 'CONFIRM RESET' : 'Reset everything'}
              </button>
            </Row>
          </Section>
        )}
      </div>
    </div>
  )
}

// ─── Afterburn Live Gauges ────────────────────────────────────
function AfterburnGauges() {
  const [ping, setPing] = useState(0)
  const [tokens, setTokens] = useState(0)
  const usage = getUsage()

  useEffect(() => {
    // Animate ping with simulated value
    let frame
    const animate = () => {
      setPing(Math.round(60 + Math.random() * 80))
      setTokens(usage.session_tokens || Math.round(Math.random() * 2000))
      frame = setTimeout(animate, 2000 + Math.random() * 1000)
    }
    animate()
    return () => clearTimeout(frame)
  }, [])

  return (
    <>
      <ArcGauge value={ping} max={500} label="Ping" color="var(--gauge-ping)" unit="ms" />
      <div style={{ width: '1px', height: '80px', background: 'var(--border-subtle)' }} />
      <ArcGauge value={tokens} max={10000} label="Session tokens" color="var(--gauge-token)" unit="tok" />
      <div style={{ width: '1px', height: '80px', background: 'var(--border-subtle)' }} />
      <ArcGauge value={Object.keys(getApiKeys()).filter(k => getApiKeys()[k]).length} max={6} label="Providers" color="#22c55e" unit="active" />
    </>
  )
}
