import React, { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import { getSettings, getApiKeys, createConversation, saveConversation } from '../core/StorageManager.js'
import { PROVIDERS, SPENDING_LIMITS, detectIntent, selectModel, buildSystemPrompt, buildContext, callProvider } from '../core/ModelRouter.js'
import ChatInput from '../components/chat/ChatInput.jsx'
import Icons from '../assets/icons/Icons.jsx'

const SUGGESTIONS = [
  { icon: Icons.Cpu, text: 'Debug my Python code' },
  { icon: Icons.Globe, text: 'Explain how WebSockets work' },
  { icon: Icons.Brain, text: 'Help me design a database schema' },
  { icon: Icons.Search, text: 'What is the difference between REST and GraphQL?' },
]

export default function Home() {
  const navigate = useNavigate()
  const { incognito } = useOutletContext()
  const settings = getSettings()
  const keys = getApiKeys()

  const providerName = settings.active_provider
    ? PROVIDERS[settings.active_provider]?.name
    : 'No provider set'

  const handleSend = async (content, attachments = []) => {
    const provider = settings.active_provider
    if (!provider || !keys[provider]) {
      navigate('/app/settings')
      return
    }

    const spendingMode = settings.spending_mode || 'balanced'
    const model = settings.active_model || PROVIDERS[provider]?.models[spendingMode]
    const id = uuid()

    const convo = {
      id,
      title: typeof content === 'string' ? content.slice(0, 60) : 'New conversation',
      created_at: Date.now(),
      updated_at: Date.now(),
      provider,
      model,
      incognito,
      messages: [
        {
          id: uuid(),
          role: 'user',
          content,
          attachments,
          timestamp: Date.now(),
        }
      ]
    }

    if (!incognito) saveConversation(convo)

    navigate(`/app/chat/${id}`, { state: { newConvo: convo } })
  }

  const activeProvider = settings.active_provider
  const hasKey = activeProvider && keys[activeProvider]

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-12">
      {/* Hero text */}
      <div className="text-center mb-10 animate-fade-in">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Icons.Logo size={40} />
        </div>
        <h1 className="font-display font-bold text-4xl text-text-primary mb-2">
          Good to have you back.
        </h1>
        <p className="text-text-secondary">
          {hasKey
            ? `Using ${PROVIDERS[activeProvider]?.name} · ${settings.active_model || PROVIDERS[activeProvider]?.models[settings.spending_mode || 'balanced']}`
            : 'Set up a provider in Settings to get started.'}
        </p>
      </div>

      {/* Suggestions */}
      {hasKey && (
        <div className="grid grid-cols-2 gap-3 mb-8 w-full max-w-xl animate-slide-up">
          {SUGGESTIONS.map(({ icon: Icon, text }) => (
            <button
              key={text}
              onClick={() => handleSend(text)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border-subtle bg-surface-1 hover:border-accent/30 hover:bg-accent-dim text-left text-sm text-text-secondary hover:text-text-primary transition-all duration-200 group"
              style={{ background: '#0f0f1a' }}>
              <Icon size={15} className="text-text-secondary group-hover:text-accent transition-colors flex-shrink-0" />
              {text}
            </button>
          ))}
        </div>
      )}

      {!hasKey && (
        <button
          onClick={() => navigate('/app/settings')}
          className="kizen-btn-primary mb-8">
          <Icons.Key size={16} />
          Set up API keys
        </button>
      )}

      {/* Input */}
      <div className="w-full max-w-2xl animate-slide-up">
        <ChatInput
          onSend={handleSend}
          disabled={!hasKey}
          placeholder={hasKey ? 'Ask anything...' : 'Add an API key in Settings to start'}
        />
      </div>
    </div>
  )
}
