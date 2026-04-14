import React, { useState, useRef, useEffect } from 'react'
import { getSettings, saveSettings, getApiKeys } from '../../core/StorageManager.js'
import { PROVIDERS } from '../../core/ModelRouter.js'
import Icons from '../../assets/icons/Icons.jsx'

const MODELS_BY_PROVIDER = {
  groq: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  openrouter: ['mistralai/mistral-7b-instruct', 'mistralai/mixtral-8x7b-instruct', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-70b-instruct', 'google/gemini-flash-1.5'],
  together: ['meta-llama/Llama-3.2-3B-Instruct-Turbo', 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo'],
  fireworks: ['accounts/fireworks/models/llama-v3p1-8b-instruct', 'accounts/fireworks/models/llama-v3p1-70b-instruct', 'accounts/fireworks/models/llama-v3p1-405b-instruct'],
  anthropic: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-6'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'o1-mini'],
}

export default function ChatInput({ onSend, disabled = false, placeholder = 'Message Kizen...', showModelSwitcher = false }) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState([])
  const [showModel, setShowModel] = useState(false)
  const [settings, setSettings] = useState(getSettings())
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const modelRef = useRef(null)

  const keys = getApiKeys()
  const availableProviders = Object.keys(PROVIDERS).filter(p => keys[p])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modelRef.current && !modelRef.current.contains(e.target)) setShowModel(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const autoResize = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    if (disabled || (!text.trim() && attachments.length === 0)) return
    onSend(text.trim(), attachments)
    setText('')
    setAttachments([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || [])
    for (const file of files) {
      const attachment = await processFile(file)
      if (attachment) setAttachments(prev => [...prev, attachment])
    }
    e.target.value = ''
  }

  const processFile = (file) => {
    return new Promise((resolve) => {
      const isImage = file.type.startsWith('image/')
      const reader = new FileReader()

      reader.onload = (e) => {
        const data = e.target.result
        resolve({
          id: Math.random().toString(36).slice(2),
          name: file.name,
          type: file.type,
          size: file.size,
          isImage,
          data: isImage ? data : null, // base64 for images
          text: !isImage ? data : null, // text content for docs
        })
      }

      if (isImage) reader.readAsDataURL(file)
      else reader.readAsText(file)
    })
  }

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const switchModel = (provider, model) => {
    const updated = saveSettings({ active_provider: provider, active_model: model })
    setSettings(updated)
    setShowModel(false)
  }

  const currentProvider = settings.active_provider
  const currentModel = settings.active_model || (currentProvider ? PROVIDERS[currentProvider]?.models[settings.spending_mode || 'balanced'] : null)

  return (
    <div className="relative">
      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-1">
          {attachments.map(att => (
            <div key={att.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border-subtle bg-surface-2 text-sm text-text-secondary group"
              style={{ background: '#14141f' }}>
              {att.isImage ? (
                <div className="flex items-center gap-2">
                  <img src={att.data} alt={att.name} className="w-8 h-8 rounded-lg object-cover" />
                  <span className="text-xs max-w-32 truncate">{att.name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Icons.File size={14} className="text-accent" />
                  <span className="text-xs max-w-32 truncate">{att.name}</span>
                  <span className="text-[10px] text-text-secondary/40">{(att.size / 1024).toFixed(1)}KB</span>
                </div>
              )}
              <button onClick={() => removeAttachment(att.id)}
                className="ml-1 text-text-secondary/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                <Icons.X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input box */}
      <div className="relative rounded-2xl border border-border-default bg-surface-2 overflow-hidden transition-all duration-200 focus-within:border-accent/50"
        style={{ background: '#12121c', borderColor: '#ffffff20' }}>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); autoResize() }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full px-4 pt-4 pb-2 bg-transparent text-text-primary placeholder-text-secondary resize-none outline-none text-sm leading-relaxed disabled:opacity-40"
          style={{ maxHeight: '200px' }}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <div className="flex items-center gap-1">
            {/* File attach */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all disabled:opacity-40"
              title="Attach file or image">
              <Icons.Attach size={17} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.md,.json,.csv,.js,.jsx,.ts,.tsx,.py,.html,.css"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Model switcher */}
            <div className="relative" ref={modelRef}>
              <button
                onClick={() => setShowModel(!showModel)}
                disabled={disabled}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all text-xs disabled:opacity-40">
                <Icons.Cpu size={13} />
                <span className="max-w-32 truncate">
                  {currentModel ? currentModel.split('/').pop() : 'No model'}
                </span>
                <Icons.ChevronDown size={11} />
              </button>

              {showModel && (
                <div className="absolute bottom-full left-0 mb-2 w-72 rounded-2xl border border-border-default bg-[#12121c] shadow-2xl overflow-hidden z-50 animate-fade-in"
                  style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
                  <div className="p-2 max-h-80 overflow-y-auto">
                    {availableProviders.map(provider => (
                      <div key={provider}>
                        <div className="px-2 py-1.5 text-[10px] text-text-secondary/50 uppercase tracking-wider font-medium">
                          {PROVIDERS[provider]?.name}
                        </div>
                        {(MODELS_BY_PROVIDER[provider] || []).map(model => (
                          <button
                            key={model}
                            onClick={() => switchModel(provider, model)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all duration-150
                              ${currentProvider === provider && currentModel === model
                                ? 'bg-accent-dim text-accent'
                                : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}>
                            {model.split('/').pop()}
                          </button>
                        ))}
                      </div>
                    ))}
                    {availableProviders.length === 0 && (
                      <div className="px-3 py-4 text-center text-xs text-text-secondary">
                        No providers configured
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={disabled || (!text.trim() && attachments.length === 0)}
            className="p-2.5 rounded-xl transition-all duration-200 disabled:opacity-30
              bg-accent hover:bg-accent-hover text-white disabled:bg-white/10 disabled:text-text-secondary">
            <Icons.Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
