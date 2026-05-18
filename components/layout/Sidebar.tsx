'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { Workspace } from '@/lib/types'
import { NotificationBell } from '@/components/ui/NotificationBell'

const NAV_MAIN = [
  { href: '/',           label: 'İdarə Paneli', icon: 'space_dashboard' },
  { href: '/projects',   label: 'Layihələr',    icon: 'folder' },
  { href: '/tasks',      label: 'Tapşırıqlar',  icon: 'check_box' },
  { href: '/calendar',   label: 'Təqvim',       icon: 'calendar_month' },
  { href: '/roadmap',    label: 'Yol Xəritəsi', icon: 'route' },
  { href: '/recurring',  label: 'Təkrarlanan',  icon: 'autorenew' },
  { href: '/analytics',  label: 'Analitika',    icon: 'analytics' },
]

const NAV_ADMIN = [
  { href: '/team',       label: 'Komanda',      icon: 'groups' },
  { href: '/activity',   label: 'Aktivlik',     icon: 'bolt' },
  { href: '/settings',   label: 'Parametrlər',  icon: 'settings' },
]

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Menecer',
  member: 'Üzv',
  viewer: 'İzləyici',
}

const WS_COLORS = [
  '#5B5BF5', '#E85C7A', '#0EA5E9', '#10B981', '#F59E0B',
  '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16', '#F97316',
]

function wsColor(ws: Workspace): string {
  return ws.color || WS_COLORS[ws.name.charCodeAt(0) % WS_COLORS.length]
}

function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace, setCurrentWorkspace, createWorkspace, loading } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    await createWorkspace({ name: newName.trim() })
    setSaving(false)
    setNewName('')
    setCreating(false)
    setOpen(false)
  }

  const color = currentWorkspace ? wsColor(currentWorkspace) : '#5B5BF5'
  const label = currentWorkspace?.name || 'İş sahəsi'

  return (
    <div className="ws-switch-wrap" ref={ref} style={{ position: 'relative' }}>
      <button
        className="ws-switch"
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', textAlign: 'left' }}
      >
        <div className="av" style={{ background: color, color: '#fff' }}>
          {initials(label)}
        </div>
        <div className="info">
          <div className="t">{label}</div>
          <div className="s">{workspaces.length} iş sahəsi</div>
        </div>
        <span className="material-symbols-rounded chev" style={{ fontSize: 16 }}>
          {open ? 'expand_less' : 'unfold_more'}
        </span>
      </button>

      {open && (
        <div className="ws-dropdown" style={{
          position: 'absolute',
          top: '100%',
          left: 8,
          right: 8,
          zIndex: 200,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 12px 32px rgba(15,17,41,0.15)',
          padding: '6px',
          marginTop: 4,
        }}>
          {workspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => { setCurrentWorkspace(ws); setOpen(false) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                background: currentWorkspace?.id === ws.id ? 'var(--primary-soft)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: wsColor(ws), color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {initials(ws.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ws.name}
                </div>
                {ws.description && (
                  <div style={{ fontSize: 11, color: 'var(--muted-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ws.description}
                  </div>
                )}
              </div>
              {currentWorkspace?.id === ws.id && (
                <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--primary)' }}>check</span>
              )}
            </button>
          ))}

          <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0' }} />

          {creating ? (
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Yeni İş Sahəsi
              </div>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName('') } }}
                placeholder="İş sahəsinin adı..."
                style={{
                  width: '100%', fontSize: 13, padding: '9px 12px',
                  borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface)', color: 'var(--ink)', outline: 'none',
                  fontFamily: 'inherit', fontWeight: 500,
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={handleCreate}
                  disabled={saving || !newName.trim()}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer',
                    opacity: saving || !newName.trim() ? 0.5 : 1, fontFamily: 'inherit',
                  }}
                >
                  {saving ? 'Yaradılır...' : 'Yarat'}
                </button>
                <button
                  onClick={() => { setCreating(false); setNewName('') }}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: 'var(--surface-2)', color: 'var(--ink-2)', border: '1px solid var(--border)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Ləğv et
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 10px', borderRadius: 8,
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--primary)', fontWeight: 600,
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add</span>
              Yeni iş sahəsi
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()

  const displayName = user?.displayName || user?.username || 'İstifadəçi'
  const roleLabel = user?.role ? ROLE_LABELS[user.role] || user.role : ''

  return (
    <aside className="sideM">
      {/* Brand */}
      <div className="brandM">
        <div className="logo">b</div>
        <div>
          <div className="nm">Birtask</div>
          <div className="ws">Layihə İdarəetmə</div>
        </div>
      </div>

      {/* Workspace switcher */}
      <WorkspaceSwitcher />

      <div className="sec-lbl">Menyu</div>

      <nav className="navM">
        {NAV_MAIN.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={'navM-item' + (active ? ' active' : '')}
            >
              <span className="ico">
                <span className="material-symbols-rounded">{icon}</span>
              </span>
              <span>{label}</span>
            </Link>
          )
        })}

        <div className="sec-lbl">İdarəetmə</div>

        {NAV_ADMIN.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={'navM-item' + (active ? ' active' : '')}
            >
              <span className="ico">
                <span className="material-symbols-rounded">{icon}</span>
              </span>
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="side-foot">
        {/* Notification bell */}
        <NotificationBell />

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="navM-item"
          style={{ width: '100%', textAlign: 'left' }}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          <span className="ico">
            <span className="material-symbols-rounded">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </span>
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* User card */}
        {user && (
          <div className="user-card" onClick={logout} title="Çıxış et">
            <div className="av">{initials(displayName)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="nm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
              <div className="rl">{roleLabel} · çıxış</div>
            </div>
            <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--muted-2)' }}>
              logout
            </span>
          </div>
        )}
      </div>
    </aside>
  )
}
