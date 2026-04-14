import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isOnboarded } from '../core/StorageManager.js'
import Icons from '../assets/icons/Icons.jsx'

const features = [
  {
    icon: Icons.Cpu,
    title: 'Multi-Provider AI',
    desc: 'Groq, OpenRouter, Together AI, Fireworks, Anthropic, OpenAI — bring your own keys, your own models.',
  },
  {
    icon: Icons.Brain,
    title: 'Cross-Chat Memory',
    desc: 'Kizen remembers facts about you across conversations, building context over time like a real collaborator.',
  },
  {
    icon: Icons.Lightning,
    title: 'Smart Model Routing',
    desc: 'Vision tasks route to vision models. Code to code models. Results unified by your main model seamlessly.',
  },
  {
    icon: Icons.Globe,
    title: 'Web Search (Optional)',
    desc: 'Plug in a Serper API key to unlock real-time web search with inline citations and source cards.',
  },
  {
    icon: Icons.Analysis,
    title: 'Diagnostics Dashboard',
    desc: 'Full visibility into API health, token usage, cost estimates, and storage — like htop for your AI stack.',
  },
  {
    icon: Icons.Incognito,
    title: 'Incognito Mode',
    desc: 'Zero writes. Session vanishes on close. Memory reads still work so Kizen stays contextual.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleStart = () => {
    if (isOnboarded()) navigate('/app')
    else navigate('/onboarding')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] overflow-y-auto overflow-x-hidden">

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 transition-all duration-300 ${scrolled ? 'bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-border-subtle' : ''}`}>
        <div className="flex items-center gap-2.5">
          <Icons.Logo size={30} />
          <span className="font-display font-bold text-xl text-text-primary tracking-tight">Kizen</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="https://hibiki-beta.netlify.app" target="_blank" rel="noopener noreferrer"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Try Hibiki
          </a>
          <button onClick={handleStart}
            className="kizen-btn-primary text-sm px-5 py-2">
            Launch App
            <Icons.ArrowRight size={15} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-8 flex flex-col items-center text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(ellipse, #7c6aff 0%, transparent 70%)' }} />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent-dim text-accent text-xs font-medium mb-8 animate-fade-in">
          <Icons.Sparkle size={12} />
          Research-grade AI for builders
        </div>

        <h1 className="font-display font-extrabold text-6xl md:text-7xl text-text-primary leading-none tracking-tight mb-6 animate-slide-up"
          style={{ animationDelay: '0.1s', opacity: 0 }}>
          Your AI stack,<br />
          <span className="text-transparent bg-clip-text animate-gradient"
            style={{ backgroundImage: 'linear-gradient(135deg, #7c6aff, #a78bfa, #7c6aff)' }}>
            unified.
          </span>
        </h1>

        <p className="text-xl text-text-secondary max-w-xl leading-relaxed mb-10 animate-slide-up"
          style={{ animationDelay: '0.2s', opacity: 0 }}>
          Kizen is a power-user AI research platform. Multi-provider, privacy-first, built for developers and builders who know what they're doing.
        </p>

        <div className="flex items-center gap-4 animate-slide-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
          <button onClick={handleStart} className="kizen-btn-primary px-8 py-3 text-base">
            Get Started Free
            <Icons.ArrowRight size={17} />
          </button>
          <a href="#features" className="kizen-btn-ghost px-6 py-3 text-base">
            See features
          </a>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-10 mt-16 text-center animate-fade-in" style={{ animationDelay: '0.5s', opacity: 0 }}>
          {[['6+', 'AI Providers'], ['BYOK', 'Your own keys'], ['0', 'Data sent to us'], ['Free', 'Always']].map(([val, label]) => (
            <div key={label}>
              <div className="font-display font-bold text-2xl text-text-primary">{val}</div>
              <div className="text-xs text-text-secondary mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-8 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display font-bold text-4xl text-text-primary mb-4">Built different.</h2>
          <p className="text-text-secondary text-lg max-w-lg mx-auto">Not another ChatGPT wrapper. Kizen is a platform for people who build things.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={f.title}
              className="p-6 rounded-2xl border border-border-subtle bg-surface-1 hover:border-accent/30 hover:bg-accent-dim transition-all duration-300 group"
              style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="w-10 h-10 rounded-xl bg-accent-dim border border-accent/20 flex items-center justify-center mb-4 group-hover:bg-accent-glow transition-colors">
                <f.icon size={18} className="text-accent" />
              </div>
              <h3 className="font-display font-semibold text-text-primary mb-2">{f.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Hibiki promo */}
      <section className="px-8 py-16 max-w-6xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl border border-border-strong p-10"
          style={{ background: 'linear-gradient(135deg, #14141f, #1a1a2e)' }}>
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #7c6aff, transparent)', transform: 'translate(30%, -30%)' }} />

          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs mb-4">
                <Icons.Sparkle size={11} />
                From the same creator
              </div>
              <h2 className="font-display font-bold text-3xl text-text-primary mb-3">
                Meet Hibiki 響
              </h2>
              <p className="text-text-secondary leading-relaxed max-w-lg">
                A private browser-based AI companion with nine anime character profiles, a Character Studio, and a 5-layer prompt architecture. The spiritual predecessor to Kizen — still running strong.
              </p>
            </div>
            <a href="https://hibiki-beta.netlify.app" target="_blank" rel="noopener noreferrer"
              className="kizen-btn-primary flex-shrink-0 px-7 py-3">
              Try Hibiki
              <Icons.ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-8 py-20 text-center">
        <h2 className="font-display font-bold text-4xl text-text-primary mb-4">Ready to build smarter?</h2>
        <p className="text-text-secondary mb-8">Set up your API keys and start in under a minute.</p>
        <button onClick={handleStart} className="kizen-btn-primary px-10 py-4 text-base">
          Launch Kizen
          <Icons.ArrowRight size={18} />
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle px-8 py-6 flex items-center justify-between text-sm text-text-secondary">
        <div className="flex items-center gap-2">
          <Icons.Logo size={20} />
          <span>Kizen — built by DSwebTEAM</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://hibiki-beta.netlify.app" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">Hibiki</a>
          <span>All data stays in your browser.</span>
        </div>
      </footer>
    </div>
  )
}
