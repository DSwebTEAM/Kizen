import React, { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { getConversations, deleteConversation, exportConversation } from '../../core/StorageManager.js'
import Icons from '../../assets/icons/Icons.jsx'

// ── Sidebar content (shared between desktop + mobile) ────────
function SidebarContent({ conversations, location, navigate, incognito, setIncognito, onClose }) {
  const isActive = (path, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path)

  const grouped = (() => {
    const now = Date.now(), day = 86400000
    const g = { Today: [], Yesterday: [], 'This Week': [], Older: [] }
    for (const c of conversations) {
      const age = now - c.updated_at
      if (age < day) g.Today.push(c)
      else if (age < 2 * day) g.Yesterday.push(c)
      else if (age < 7 * day) g['This Week'].push(c)
      else g.Older.push(c)
    }
    return g
  })()

  const handleDelete = (e, id) => {
    e.stopPropagation()
    deleteConversation(id)
    window.dispatchEvent(new Event('kizen:conversations-updated'))
    if (location.pathname.includes(id)) navigate('/app')
  }

  const handleExport = (e, id) => {
    e.stopPropagation()
    exportConversation(id)
  }

  const go = (path) => { navigate(path); onClose?.() }

  const NAV = [
    { to: '/app', label: 'Home', icon: Icons.Home, exact: true },
    { to: '/app/analysis', label: 'Diagnostics', icon: Icons.Analysis },
    { to: '/app/settings', label: 'Settings', icon: Icons.Settings },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-sidebar)' }}>

      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '0 16px', height: '56px', flexShrink: 0,
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <Icons.Logo size={32} />
        <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>Kizen</span>
        {incognito && (
          <span style={{
            marginLeft: 'auto', fontSize: '10px', padding: '2px 7px',
            color: '#d97706', background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.25)',
            borderRadius: '3px', display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <Icons.Incognito size={9} /> Incognito
          </span>
        )}
      </div>

      {/* New chat */}
      <div style={{ padding: '10px 12px', flexShrink: 0 }}>
        <button onClick={() => go('/app')} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px', fontSize: '13px', fontWeight: 500,
          color: 'var(--text-secondary)', background: 'transparent',
          border: '1px solid var(--border-default)', borderRadius: '4px',
          cursor: 'pointer', transition: 'all 0.12s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <Icons.Plus size={14} /> New chat
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding: '0 12px 8px', flexShrink: 0 }}>
        {NAV.map(({ to, label, icon: Icon, exact }) => {
          const active = isActive(to, exact)
          return (
            <Link key={to} to={to} onClick={() => onClose?.()} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '7px 10px', marginBottom: '2px', fontSize: '13px',
              color: active ? 'var(--text-accent)' : 'var(--text-secondary)',
              background: active ? 'var(--accent-dim)' : 'transparent',
              borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
              borderRadius: '0 4px 4px 0', textDecoration: 'none', transition: 'all 0.12s',
            }}>
              <Icon size={14} /> {label}
            </Link>
          )
        })}
      </nav>

      <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0 12px', flexShrink: 0 }} />

      {/* Conversation list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {Object.entries(grouped).map(([group, convos]) => convos.length > 0 && (
          <div key={group} style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', padding: '4px 10px 2px', fontWeight: 500 }}>
              {group}
            </div>
            {convos.map(convo => {
              const active = location.pathname.includes(convo.id)
              return (
                <div key={convo.id} style={{ position: 'relative' }}
                  onMouseEnter={e => e.currentTarget.querySelector('.conv-act').style.display = 'flex'}
                  onMouseLeave={e => e.currentTarget.querySelector('.conv-act').style.display = 'none'}
                >
                  <button onClick={() => go(`/app/chat/${convo.id}`)} style={{
                    width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: '12px',
                    borderRadius: '4px', border: 'none', cursor: 'pointer',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: active ? 'var(--bg-2)' : 'transparent',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    display: 'block', transition: 'all 0.12s',
                  }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-2)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    {convo.title || 'New conversation'}
                  </button>
                  <div className="conv-act" style={{
                    display: 'none', position: 'absolute', right: '4px', top: '50%',
                    transform: 'translateY(-50%)', gap: '2px', background: 'var(--bg-2)',
                  }}>
                    <button onClick={e => handleExport(e, convo.id)} style={{ padding: '3px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
                      <Icons.Export size={11} />
                    </button>
                    <button onClick={e => handleDelete(e, convo.id)} style={{ padding: '3px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
                      <Icons.Trash size={11} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        {conversations.length === 0 && (
          <div style={{ padding: '20px 10px', fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
            No conversations yet
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-subtle)', padding: '8px 12px' }}>
        <button onClick={() => setIncognito(v => !v)} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 10px', fontSize: '12px', borderRadius: '4px',
          color: incognito ? '#d97706' : 'var(--text-secondary)',
          background: incognito ? 'rgba(217,119,6,0.08)' : 'transparent',
          border: 'none', cursor: 'pointer', transition: 'all 0.12s',
        }}>
          <Icons.Incognito size={13} />
          {incognito ? 'Incognito on' : 'Incognito mode'}
        </button>
      </div>
    </div>
  )
}

// ── Main AppShell ────────────────────────────────────────────
export default function AppShell({ theme, toggleTheme }) {
  const [conversations, setConversations] = useState([])
  const [incognito, setIncognito] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // Desktop: hover-expand sidebar
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [sidebarPinned, setSidebarPinned] = useState(true)
  const hoverTimer = useRef(null)

  // Mobile: drawers
  const [leftDrawer, setLeftDrawer] = useState(false)  // recent chats
  const [rightDrawer, setRightDrawer] = useState(false) // settings
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const load = () => setConversations(getConversations())
    load()
    window.addEventListener('kizen:conversations-updated', load)
    return () => window.removeEventListener('kizen:conversations-updated', load)
  }, [])

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  // Swipe detection for mobile
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (dy > 50) return // mostly vertical — ignore
    if (dx > 60) setLeftDrawer(true)   // swipe right → open left drawer
    if (dx < -60) setRightDrawer(true) // swipe left → open right drawer
    touchStartX.current = null
  }

  const sidebarVisible = sidebarPinned || sidebarHovered

  // ── Mobile layout ─────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg-0)', overflow: 'hidden' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mobile top bar */}
        <header style={{
          display: 'flex', alignItems: 'center', padding: '0 16px', height: '52px', flexShrink: 0,
          background: 'var(--bg-1)', borderBottom: '1px solid var(--border-subtle)',
        }}>
          <button onClick={() => setLeftDrawer(true)} style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', marginRight: '8px' }}>
            <Icons.Menu size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <Icons.Logo size={28} />
            <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>Kizen</span>
          </div>
          <button onClick={toggleTheme} style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
            {theme === 'dark' ? <Icons.Sun size={16} /> : <Icons.Moon size={16} />}
          </button>
          <button onClick={() => setRightDrawer(true)} style={{ padding: '6px', marginLeft: '4px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
            <Icons.Settings size={17} />
          </button>
        </header>

        {/* Page */}
        <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Outlet context={{ incognito }} />
        </main>

        {/* Left drawer — recent chats */}
        {leftDrawer && (
          <>
            <div onClick={() => setLeftDrawer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
            <div className="mobile-drawer-left" style={{
              position: 'fixed', left: 0, top: 0, bottom: 0, width: '80vw', maxWidth: '300px',
              zIndex: 50, overflow: 'hidden', borderRight: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-md)',
            }}>
              <SidebarContent
                conversations={conversations}
                location={location}
                navigate={navigate}
                incognito={incognito}
                setIncognito={setIncognito}
                onClose={() => setLeftDrawer(false)}
              />
            </div>
          </>
        )}

        {/* Right drawer — settings shortcut */}
        {rightDrawer && (
          <>
            <div onClick={() => setRightDrawer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
            <div className="mobile-drawer-right" style={{
              position: 'fixed', right: 0, top: 0, bottom: 0, width: '72vw', maxWidth: '260px',
              zIndex: 50, background: 'var(--bg-sidebar)', borderLeft: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-md)', padding: '20px 16px',
            }}>
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '20px', color: 'var(--text-primary)' }}>Quick settings</div>
              {[
                { to: '/app/settings', label: 'Settings', icon: Icons.Settings },
                { to: '/app/analysis', label: 'Diagnostics', icon: Icons.Analysis },
              ].map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} onClick={() => setRightDrawer(false)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 0', borderBottom: '1px solid var(--border-subtle)',
                  fontSize: '14px', color: 'var(--text-secondary)', textDecoration: 'none',
                }}>
                  <Icon size={16} /> {label}
                </Link>
              ))}
              <div style={{ marginTop: '20px' }}>
                <button onClick={() => { toggleTheme(); setRightDrawer(false) }} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '12px 0', fontSize: '14px', color: 'var(--text-secondary)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: '1px solid var(--border-subtle)',
                }}>
                  {theme === 'dark' ? <Icons.Sun size={16} /> : <Icons.Moon size={16} />}
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <button onClick={() => { setIncognito(v => !v); setRightDrawer(false) }} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '12px 0', fontSize: '14px', color: incognito ? '#d97706' : 'var(--text-secondary)',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}>
                  <Icons.Incognito size={16} />
                  {incognito ? 'Incognito on' : 'Incognito off'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Desktop layout ────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-0)' }}>

      {/* Sidebar — hover-expand */}
      <div
        style={{
          width: sidebarVisible ? '240px' : '0px',
          flexShrink: 0, overflow: 'hidden',
          transition: 'width 0.2s cubic-bezier(.16,1,.3,1)',
          borderRight: sidebarVisible ? '1px solid var(--border-subtle)' : 'none',
        }}
        onMouseEnter={() => {
          clearTimeout(hoverTimer.current)
          if (!sidebarPinned) setSidebarHovered(true)
        }}
        onMouseLeave={() => {
          if (!sidebarPinned) {
            hoverTimer.current = setTimeout(() => setSidebarHovered(false), 180)
          }
        }}
      >
        <SidebarContent
          conversations={conversations}
          location={location}
          navigate={navigate}
          incognito={incognito}
          setIncognito={setIncognito}
        />
      </div>

      {/* Hover trigger strip — always present when sidebar pinned is off */}
      {!sidebarPinned && !sidebarHovered && (
        <div
          style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '8px', zIndex: 10, cursor: 'ew-resize' }}
          onMouseEnter={() => setSidebarHovered(true)}
        />
      )}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Header */}
        <header style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '0 18px', height: '56px', flexShrink: 0,
          background: 'var(--bg-1)', borderBottom: '1px solid var(--border-subtle)',
        }}>
          {/* Sidebar toggle */}
          <button
            onClick={() => { setSidebarPinned(v => !v); setSidebarHovered(false) }}
            title={sidebarPinned ? 'Collapse sidebar' : 'Pin sidebar'}
            style={{
              width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border-default)', borderRadius: '4px',
              background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            <Icons.Menu size={14} />
          </button>

          {!sidebarVisible && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icons.Logo size={28} />
              <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>Kizen</span>
            </div>
          )}

          {incognito && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px',
              color: '#d97706', background: 'rgba(217,119,6,0.08)',
              border: '1px solid rgba(217,119,6,0.25)', padding: '3px 9px', borderRadius: '3px',
            }}>
              <Icons.Incognito size={11} /> Incognito — not saving
            </div>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              style={{
                width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--border-default)', borderRadius: '4px',
                background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
              }}>
              {theme === 'dark' ? <Icons.Sun size={14} /> : <Icons.Moon size={14} />}
            </button>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Outlet context={{ incognito }} />
        </main>
      </div>
    </div>
  )
}
