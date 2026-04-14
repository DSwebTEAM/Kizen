import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveApiKey, saveSettings, setOnboarded, getApiKeys } from '../core/StorageManager.js'
import { PROVIDERS } from '../core/ModelRouter.js'
import Icons from '../assets/icons/Icons.jsx'

const PROVIDER_LIST = [
  { id: 'groq', label: 'Groq', hint: 'console.groq.com', required: false },
  { id: 'openrouter', label: 'OpenRouter', hint: 'openrouter.ai/keys', required: false },
  { id: 'together', label: 'Together AI', hint: 'api.together.ai', required: false },
  { id: 'fireworks', label: 'Fireworks AI', hint: 'fireworks.ai', required: false },
  { id: 'anthropic', label: 'Anthropic', hint: 'console.anthropic.com', required: false },
  { id: 'openai', label: 'OpenAI', hint: 'platform.openai.com', required: false },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [keys, setKeys] = useState({})
  const [serperKey, setSerperKey] = useState('')
  const [showKeys, setShowKeys] = useState({})
  const [spendingMode, setSpendingMode] = useState('balanced')
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')

  const setKey = (provider, val) => setKeys(prev => ({ ...prev, [provider]: val }))
  const toggleShow = (id) => setShowKeys(prev => ({ ...prev, [id]: !prev[id] }))

  const hasAtLeastOneKey = () => Object.values(keys).some(v => v && v.trim().length > 0)

  const handleFinish = () => {
    if (!hasAtLeastOneKey()) {
      setError('Add at least one AI provider key to continue.')
      return
    }
    // Save all keys
    for (const [provider, key] of Object.entries(keys)) {
      if (key && key.trim()) saveApiKey(provider, key.trim())
    }
    if (serperKey.trim()) saveApiKey('serper', serperKey.trim())

    // Save initial settings
    saveSettings({ spending_mode: spendingMode })

    setOnboarded()
    navigate('/app')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #7c6aff, transparent)' }} />
      </div>

      <div className="relative w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Icons.Logo size={36} />
            <span className="font-display font-bold text-2xl text-text-primary">Kizen</span>
          </div>
          <h1 className="font-display font-bold text-3xl text-text-primary mb-2">
            {step === 1 ? 'Connect your AI providers' : 'Choose your spending mode'}
          </h1>
          <p className="text-text-secondary">
            {step === 1
              ? 'Your API keys are stored only in your browser. We never see them.'
              : 'This controls which models Kizen uses and how many tokens it spends.'}
          </p>
        </div>

        <div className="kizen-surface rounded-2xl p-6" style={{ background: '#0f0f1a', border: '1px solid #ffffff12' }}>

          {step === 1 && (
            <div className="space-y-3">
              {PROVIDER_LIST.map(({ id, label, hint }) => (
                <div key={id}>
                  <label className="block text-xs text-text-secondary mb-1.5 flex items-center gap-1.5">
                    <Icons.Key size={11} />
                    {label}
                    <span className="text-text-secondary/40 ml-auto font-mono text-[10px]">{hint}</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys[id] ? 'text' : 'password'}
                      value={keys[id] || ''}
                      onChange={(e) => setKey(id, e.target.value)}
                      placeholder={`${label} API key`}
                      className="kizen-input pr-10 font-mono text-xs"
                    />
                    <button
                      onClick={() => toggleShow(id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors">
                      {showKeys[id] ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
                    </button>
                  </div>
                </div>
              ))}

              {/* Serper */}
              <div className="pt-2 border-t border-border-subtle">
                <label className="block text-xs text-text-secondary mb-1.5 flex items-center gap-1.5">
                  <Icons.Search size={11} />
                  Serper API Key
                  <span className="ml-auto text-[10px] text-accent bg-accent-dim px-1.5 py-0.5 rounded">Optional — enables web search</span>
                </label>
                <div className="relative">
                  <input
                    type={showKeys['serper'] ? 'text' : 'password'}
                    value={serperKey}
                    onChange={(e) => setSerperKey(e.target.value)}
                    placeholder="Serper key from serper.dev"
                    className="kizen-input pr-10 font-mono text-xs"
                  />
                  <button onClick={() => toggleShow('serper')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                    {showKeys['serper'] ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                onClick={() => {
                  if (!hasAtLeastOneKey()) { setError('Add at least one AI provider key.'); return }
                  setError('')
                  setStep(2)
                }}
                className="kizen-btn-primary w-full justify-center mt-2">
                Continue
                <Icons.ArrowRight size={16} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {[
                {
                  id: 'economy',
                  label: 'Economy',
                  icon: Icons.Zap,
                  desc: 'Smallest models, 512 token cap, minimal cost. Great for quick questions.',
                  color: 'text-green-400',
                  bg: 'bg-green-400/10',
                  border: 'border-green-400/30',
                },
                {
                  id: 'balanced',
                  label: 'Balanced',
                  icon: Icons.Cpu,
                  desc: 'Mid-tier models, 2048 token cap. The recommended mode for most use.',
                  color: 'text-accent',
                  bg: 'bg-accent-dim',
                  border: 'border-accent/30',
                },
                {
                  id: 'max',
                  label: 'Max',
                  icon: Icons.Lightning,
                  desc: 'Best models, 8192 token cap, full features. Use when quality matters most.',
                  color: 'text-orange-400',
                  bg: 'bg-orange-400/10',
                  border: 'border-orange-400/30',
                },
              ].map(({ id, label, icon: Icon, desc, color, bg, border }) => (
                <button
                  key={id}
                  onClick={() => setSpendingMode(id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-4
                    ${spendingMode === id ? `${bg} ${border}` : 'border-border-subtle hover:border-border-default hover:bg-white/3'}`}>
                  <div className={`w-9 h-9 rounded-lg ${bg} border ${border} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={16} className={color} />
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${spendingMode === id ? color : 'text-text-primary'}`}>{label}</div>
                    <div className="text-text-secondary text-xs mt-0.5 leading-relaxed">{desc}</div>
                  </div>
                  {spendingMode === id && (
                    <div className="ml-auto flex-shrink-0">
                      <Icons.Check size={16} className={color} />
                    </div>
                  )}
                </button>
              ))}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="kizen-btn-ghost flex-1 justify-center border border-border-subtle">
                  Back
                </button>
                <button onClick={handleFinish} className="kizen-btn-primary flex-1 justify-center">
                  Launch Kizen
                  <Icons.ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-text-secondary/40 mt-4">
          All keys stored locally in your browser. Nothing leaves your device.
        </p>
      </div>
    </div>
  )
}
