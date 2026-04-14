import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { getConversations, getSettings, deleteConversation, exportConversation } from '../../core/StorageManager.js'
import Icons from '../../assets/icons/Icons.jsx'

export default function AppShell() {
  const [conversations, setConversations] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [incognito, setIncognito] = useState(false)
  const [activeMenu, setActiveMenu] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const load = () => setConversations(getConversations())
    load()
    window.addEventListener('kizen:conversations-updated', load)
    return () => window.removeEventListener('kizen:conversations-updated', load)
  }, [])

  const isActive = (path) => location.pathname.includes(path)

  const handleNewChat = () => {
    navigate('/app')
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    deleteConversation(id)
    setConversations(getConversations())
    setActiveMenu(null)
    if (location.pathname.includes(id)) navigate('/app')
  }

  const handleExport = (e, id) => {
    e.stopPropagation()
    exportConversation(id)
    setActiveMenu(null)
  }

  const groupConversations = (convos) => {
    const now = Date.now()
    const day = 86400000
    const groups = { Today: [], Yesterday: [], 'This Week': [], Older: [] }
    for (const c of convos) {
      const age = now - c.updated_at
      if (age < day) groups.Today.push(c)
      else if (age < 2 * day) groups.Yesterday.push(c)
      else if (age < 7 * day) groups['This Week'].push(c)
      else groups.Older.push(c)
    }
    return groups
  }

  const grouped = groupConversations(conversations)

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Sidebar */}
      <aside className={`flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'} border-r border-border-subtle bg-surface-1 flex-shrink-0`}
        style={{ background: '#0d0d18' }}>

        {/* Sidebar Header */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border-subtle">
          <Icons.Logo size={28} />
          <span className="font-display font-bold text-lg text-text-primary tracking-tight">Kizen</span>
          {incognito && (
            <span className="ml-auto flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
              <Icons.Incognito size={12} />
              Incognito
            </span>
          )}
        </div>

        {/* New Chat Button */}
        <div className="px-3 py-3">
          <button onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 border border-border-subtle transition-all duration-200 group">
            <Icons.Plus size={16} />
            New chat
          </button>
        </div>

        {/* Nav Links */}
        <nav className="px-3 pb-2">
          {[
            { to: '/app', icon: Icons.Home, label: 'Home', exact: true },
            { to: '/app/analysis', icon: Icons.Analysis, label: 'Diagnostics' },
            { to: '/app/settings', icon: Icons.Settings, label: 'Settings' },
          ].map(({ to, icon: Icon, label, exact }) => {
            const active = exact ? location.pathname === to : isActive(to.replace('/app', ''))
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 mb-0.5
                  ${active ? 'text-text-primary bg-accent-dim border border-accent/20' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}>
                <Icon size={16} className={active ? 'text-accent' : ''} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {Object.entries(grouped).map(([group, convos]) => convos.length > 0 && (
            <div key={group} className="mb-4">
              <div className="text-xs text-text-secondary/50 font-medium uppercase tracking-wider px-2 py-1.5">{group}</div>
              {convos.map(convo => (
                <div key={convo.id} className="relative group">
                  <button
                    onClick={() => navigate(`/app/chat/${convo.id}`)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all duration-200 truncate
                      ${location.pathname.includes(convo.id)
                        ? 'text-text-primary bg-white/8'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}>
                    {convo.title || 'New conversation'}
                  </button>
                  {/* Context menu */}
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
                    <button onClick={(e) => handleExport(e, convo.id)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors">
                      <Icons.Export size={13} />
                    </button>
                    <button onClick={(e) => handleDelete(e, convo.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition-colors">
                      <Icons.Trash size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {conversations.length === 0 && (
            <div className="text-center py-8 text-text-secondary/40 text-sm">
              No conversations yet
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="px-3 py-3 border-t border-border-subtle">
          <button
            onClick={() => setIncognito(!incognito)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200
              ${incognito ? 'text-amber-400 bg-amber-400/10' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}>
            <Icons.Incognito size={16} />
            {incognito ? 'Incognito on' : 'Incognito mode'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors">
            <Icons.Menu size={18} />
          </button>
          {!sidebarOpen && (
            <div className="flex items-center gap-2">
              <Icons.Logo size={22} />
              <span className="font-display font-bold text-text-primary">Kizen</span>
            </div>
          )}
          {incognito && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              <Icons.Incognito size={13} />
              Incognito — nothing is saved this session
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          <Outlet context={{ incognito }} />
        </main>
      </div>
    </div>
  )
}
