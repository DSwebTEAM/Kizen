import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { isOnboarded } from '../core/StorageManager.js'
import Icons from '../assets/icons/Icons.jsx'

export default function Landing() {
  const navigate = useNavigate()
  const [dark, setDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true)
  const [scrollY, setScrollY] = useState(0)
  const scrollRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const fn = () => setScrollY(el.scrollTop)
    el.addEventListener('scroll', fn)
    return () => el.removeEventListener('scroll', fn)
  }, [])

  const go = () => navigate(isOnboarded() ? '/app' : '/onboarding')

  // Design tokens
  const bg    = dark ? '#0c0c0e' : '#ffffff'
  const bg2   = dark ? '#111114' : '#f5f5f5'
  const bg3   = dark ? '#18181c' : '#ebebeb'
  const bdr   = dark ? '#262629' : '#e0e0e0'
  const t1    = dark ? '#f0f0f0' : '#0a0a0a'
  const t2    = dark ? '#a0a0a8' : '#444444'
  const t3    = dark ? '#606068' : '#888888'
  const acc   = dark ? '#7c6aff' : '#5b4fff'
  const red   = dark ? '#ff4444' : '#e53535'
  const rule  = `1px solid ${bdr}`

  const flex = (gap=0, align='center', justify='flex-start') =>
    ({ display:'flex', alignItems:align, justifyContent:justify, gap })

  const features = [
    { icon: Icons.Cpu,       title: 'Multi-Provider AI',        body: 'Connect Groq, OpenRouter, Together AI, Fireworks AI, or Anthropic. One key is all you need — Kizen handles model selection internally.' },
    { icon: Icons.Lightning, title: 'Intra-Provider Routing',   body: 'Vision tasks auto-route to vision-capable models within your provider. Code to code-optimised ones. No extra keys required.' },
    { icon: Icons.Brain,     title: 'Cross-Chat Memory',        body: 'Facts about you are extracted after every conversation and injected into future chats automatically. It gets smarter over time.' },
    { icon: Icons.Globe,     title: 'Web Search',               body: 'Add a Serper key and Kizen searches the web in real time, returning cited answers with source cards below the response.' },
    { icon: Icons.Analysis,  title: 'Diagnostics Dashboard',    body: 'Live API ping latency, token burn rate, cost estimates per provider, and storage usage. Full platform visibility in one panel.' },
    { icon: Icons.Incognito, title: 'Incognito Mode',           body: 'Nothing is written to storage. Session is wiped on close. Memory still reads so Kizen stays contextual even in private mode.' },
    { icon: Icons.Zap,       title: 'Overdrive Mode',           body: "Forces your provider's strongest model. 16,000 token context window. Maximum reasoning depth. No compromises on quality." },
    { icon: Icons.Gauge,     title: 'Afterburn Panel',          body: 'Per-slider fine-tuning of reasoning depth, outside-the-box intensity, self-critique loop, time awareness, and context strategy.' },
    { icon: Icons.Clock,     title: 'Time Awareness',           body: 'Kizen knows the current time and date. Every response is temporally grounded — deadlines, context, and relevance all accounted for.' },
  ]

  const specs = [
    ['Providers',    'Groq · OpenRouter · Together · Fireworks · Anthropic'],
    ['API model',    'BYOK — direct browser-to-provider, no middleman'],
    ['Storage',      'localStorage only — nothing on our servers'],
    ['Memory',       'Cross-chat, auto-extracted, compressed on overflow'],
    ['Modes',        'Economy · Balanced · Max · Overdrive'],
    ['Web search',   'Serper API (optional, user-supplied key)'],
    ['Routing',      'Rule-based intent detection, intra-provider'],
    ['Theme',        'System adaptive · Manual toggle'],
    ['Hosting',      'Cloudflare Pages global CDN'],
    ['Source',       'github.com/DSwebTEAM/Kizen'],
  ]

  const Btn = ({ children, primary, onClick, style = {} }) => (
    <button onClick={onClick} style={{
      padding: '9px 22px', borderRadius: 4, fontSize: 13, fontWeight: 500,
      cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 7,
      background: primary ? acc : 'transparent',
      color: primary ? '#fff' : t2,
      border: primary ? 'none' : `1px solid ${bdr}`,
      ...style,
    }}>{children}</button>
  )

  const Tag = ({ children, color }) => (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase',
      color, background: `${color}18`, padding: '2px 8px', borderRadius: 3,
      display: 'inline-block', marginBottom: 14,
    }}>{children}</span>
  )

  return (
    <div ref={scrollRef} style={{ height: '100vh', overflowY: 'auto', background: bg, color: t1, fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>

      {/* ── Navbar ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        ...flex(0, 'center', 'space-between'),
        padding: '0 40px', height: 52,
        background: scrollY > 30 ? bg : 'transparent',
        borderBottom: scrollY > 30 ? rule : '1px solid transparent',
        transition: 'background 0.2s, border-color 0.2s',
      }}>
        <div style={flex(10)}>
          <Icons.Logo size={28} />
          <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:t1, letterSpacing:-0.3 }}>Kizen</span>
        </div>
        <div style={flex(8)}>
          {[['#features','Features'],['#specs','Specs']].map(([href,label]) => (
            <a key={href} href={href} style={{ fontSize:12, color:t3, textDecoration:'none', padding:'4px 2px' }}>{label}</a>
          ))}
          <button onClick={() => setDark(d => !d)} style={{ padding:'5px 7px', border:`1px solid ${bdr}`, borderRadius:4, background:'transparent', cursor:'pointer', color:t2, display:'flex', alignItems:'center' }}>
            {dark ? <Icons.Sun size={14} /> : <Icons.Moon size={14} />}
          </button>
          <Btn primary onClick={go}>Launch app <Icons.ArrowRight size={12} /></Btn>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ maxWidth:960, margin:'0 auto', padding:'72px 40px 60px' }}>
        <div style={{ ...flex(8), marginBottom:20 }}>
          <span style={{ fontSize:11, fontWeight:600, letterSpacing:1.5, textTransform:'uppercase', color:t3, border:`1px solid ${bdr}`, padding:'3px 10px', borderRadius:3 }}>
            v0.2 — Early access
          </span>
        </div>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'clamp(36px,6vw,66px)', color:t1, letterSpacing:-2, lineHeight:1.04, marginBottom:24 }}>
          The AI platform<br />
          built for people<br />
          <span style={{ color:acc }}>who build things.</span>
        </h1>
        <p style={{ fontSize:16, color:t2, lineHeight:1.75, maxWidth:520, marginBottom:32 }}>
          Kizen is a multi-provider AI research and development platform. Bring one API key, pick your provider, and get a research assistant with persistent memory, automatic model routing, optional web search, and full diagnostic visibility — entirely in your browser.
        </p>
        <div style={flex(12)}>
          <Btn primary onClick={go}>Get started free <Icons.ArrowRight size={13} /></Btn>
          <Btn><a href="#features" style={{ color:'inherit', textDecoration:'none' }}>See features</a></Btn>
        </div>

        {/* Stats */}
        <div style={{ marginTop:52, paddingTop:32, borderTop:rule, display:'grid', gridTemplateColumns:'repeat(4,1fr)' }}>
          {[['BYOK','Your keys, your data'],['6+','AI providers'],['0','Bytes on our servers'],['Free','No subscriptions']].map(([v,l]) => (
            <div key={l}>
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:22, color:t1 }}>{v}</div>
              <div style={{ fontSize:12, color:t3, marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <div id="features" style={{ borderTop:rule }}>
        <div style={{ maxWidth:960, margin:'0 auto', padding:'52px 40px' }}>
          <div style={{ marginBottom:32 }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:1.5, textTransform:'uppercase', color:t3, marginBottom:6 }}>Features</div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:26, color:t1, letterSpacing:-0.5, margin:0 }}>Everything you need. Nothing you don't.</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', border:rule }}>
            {features.map((f,i) => (
              <div key={f.title} style={{
                padding:'22px',
                borderRight: (i+1)%3===0 ? 'none' : rule,
                borderBottom: i<6 ? rule : 'none',
                background: bg,
              }}>
                <div style={{ marginBottom:10 }}><f.icon size={14} style={{ color:acc }} /></div>
                <div style={{ fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:13, color:t1, marginBottom:5 }}>{f.title}</div>
                <div style={{ fontSize:12, color:t3, lineHeight:1.65 }}>{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <div style={{ borderTop:rule }}>
        <div style={{ maxWidth:960, margin:'0 auto', padding:'52px 40px' }}>
          <div style={{ marginBottom:32 }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:1.5, textTransform:'uppercase', color:t3, marginBottom:6 }}>Setup</div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:26, color:t1, letterSpacing:-0.5, margin:0 }}>Up and running in 60 seconds.</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', border:rule }}>
            {[
              { n:'01', t:'Get an API key',   b:'Groq has a generous free tier. Visit console.groq.com, create an account, and copy your API key.' },
              { n:'02', t:'Set up Kizen',     b:'Enter your key during onboarding. Pick a spending mode. Kizen is ready in under a minute with no configuration.' },
              { n:'03', t:'Start building',   b:'Chat, debug code, analyse files, search the web. Kizen automatically routes each task to the right model.' },
            ].map((row,i) => (
              <div key={row.n} style={{ padding:'26px', borderRight:i<2?rule:'none' }}>
                <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:30, color:bdr, fontWeight:700, marginBottom:14, lineHeight:1 }}>{row.n}</div>
                <div style={{ fontFamily:'Syne,sans-serif', fontWeight:600, fontSize:13, color:t1, marginBottom:7 }}>{row.t}</div>
                <div style={{ fontSize:12, color:t3, lineHeight:1.65 }}>{row.b}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Overdrive + Afterburn ── */}
      <div style={{ borderTop:rule }}>
        <div style={{ maxWidth:960, margin:'0 auto', padding:'52px 40px' }}>
          <div style={{ marginBottom:32 }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:1.5, textTransform:'uppercase', color:t3, marginBottom:6 }}>Power features</div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:26, color:t1, letterSpacing:-0.5, margin:0 }}>When balanced isn't enough.</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', border:rule }}>
            <div style={{ padding:'32px', borderRight:rule }}>
              <Tag color={red}>Mode</Tag>
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:20, color:red, marginBottom:10, letterSpacing:-0.3 }}>Overdrive</div>
              <div style={{ fontSize:13, color:t2, lineHeight:1.75, marginBottom:14 }}>
                Forces your provider's strongest available model. Sets context window to 16,000 tokens. Activates maximum reasoning depth and outside-the-box thinking at full intensity. Use when quality is the only metric that matters.
              </div>
              <div style={{ fontSize:11, color:t3, fontFamily:'JetBrains Mono,monospace' }}>16,384 tokens · Full context · Max tier model</div>
            </div>
            <div style={{ padding:'32px' }}>
              <Tag color={acc}>Settings panel</Tag>
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:20, color:acc, marginBottom:10, letterSpacing:-0.3 }}>Afterburn</div>
              <div style={{ fontSize:13, color:t2, lineHeight:1.75, marginBottom:14 }}>
                The performance tuning panel. Live ping latency gauge and token burn rate gauge at the top. Per-slider control over reasoning depth, creative divergence, self-critique intensity, and context strategy — designed like a GPU overclocking tool for AI.
              </div>
              <div style={{ fontSize:11, color:t3, fontFamily:'JetBrains Mono,monospace' }}>Ping gauge · Token/s gauge · 6 control sliders</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Specs ── */}
      <div id="specs" style={{ borderTop:rule }}>
        <div style={{ maxWidth:960, margin:'0 auto', padding:'52px 40px' }}>
          <div style={{ marginBottom:32 }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:1.5, textTransform:'uppercase', color:t3, marginBottom:6 }}>Specifications</div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:26, color:t1, letterSpacing:-0.5, margin:0 }}>Technical details.</h2>
          </div>
          <div style={{ border:rule }}>
            {specs.map(([k,v],i) => (
              <div key={k} style={{ display:'grid', gridTemplateColumns:'200px 1fr', borderBottom:i<specs.length-1?rule:'none', padding:'11px 16px', background: i%2===0 ? bg : bg2 }}>
                <div style={{ fontSize:12, color:t3, fontWeight:500 }}>{k}</div>
                <div style={{ fontSize:12, color:t2, fontFamily:'JetBrains Mono,monospace' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ borderTop:rule }}>
        <div style={{ maxWidth:960, margin:'0 auto', padding:'60px 40px', textAlign:'center' }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:30, color:t1, letterSpacing:-0.8, marginBottom:10 }}>Ready to start?</h2>
          <p style={{ fontSize:13, color:t3, marginBottom:26 }}>One key. No backend. All intelligence.</p>
          <Btn primary onClick={go} style={{ padding:'10px 28px', fontSize:14 }}>
            Launch Kizen <Icons.ArrowRight size={14} />
          </Btn>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop:rule, padding:'18px 40px', ...flex(0,'center','space-between') }}>
        <div style={flex(8)}>
          <Icons.Logo size={18} />
          <span style={{ fontSize:12, color:t3 }}>Kizen — built by DSwebTEAM</span>
        </div>
        <div style={flex(16)}>
          <a href="https://github.com/DSwebTEAM/Kizen" target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:t3, textDecoration:'none' }}>GitHub</a>
          <span style={{ fontSize:12, color:t3 }}>All data stays in your browser</span>
        </div>
      </div>
    </div>
  )
}
