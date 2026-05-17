'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/contexts/AuthContext'

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
      <div className="ws-switch">
        <div className="av">PM</div>
        <div className="info">
          <div className="t">PMO İş sahəsi</div>
          <div className="s">Bütün layihələr</div>
        </div>
        <span className="material-symbols-rounded chev" style={{ fontSize: 16 }}>unfold_more</span>
      </div>

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
