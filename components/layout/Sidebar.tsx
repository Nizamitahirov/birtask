'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  Users, Settings, ChevronLeft, ChevronRight,
  Zap, Sun, Moon, Map, CalendarDays, LogOut,
  Shield, UserCog, UserCheck, Eye, Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/lib/types'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { GlobalSearchTrigger } from '@/components/ui/GlobalSearch'

const navItems = [
  { href: '/',          label: 'İdarə Paneli', icon: LayoutDashboard },
  { href: '/projects',  label: 'Layihələr',    icon: FolderKanban },
  { href: '/tasks',     label: 'Tapşırıqlar',  icon: CheckSquare },
  { href: '/calendar',  label: 'Təqvim',       icon: CalendarDays },
  { href: '/roadmap',   label: 'Yol Xəritəsi', icon: Map },
  { href: '/team',      label: 'Komanda',      icon: Users },
  { href: '/activity',  label: 'Aktivlik',     icon: Activity },
  { href: '/settings',  label: 'Parametrlər',  icon: Settings },
]

const ROLE_LABELS: Record<string, string> = {
  admin:   'Admin',
  manager: 'Menecer',
  member:  'Üzv',
  viewer:  'İzləyici',
}

const ROLE_ICONS: Record<string, typeof Shield> = {
  admin:   Shield,
  manager: UserCog,
  member:  UserCheck,
  viewer:  Eye,
}

const ROLE_COLORS: Record<string, string> = {
  admin:   'text-accent-purple',
  manager: 'text-accent-blue',
  member:  'text-accent-green',
  viewer:  'text-text-muted',
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()

  const roleIcon = user?.role ? ROLE_ICONS[user.role] || UserCheck : UserCheck
  const RoleIcon = roleIcon
  const roleColor = user?.role ? ROLE_COLORS[user.role] || 'text-text-muted' : 'text-text-muted'
  const roleLabel = user?.role ? ROLE_LABELS[user.role] || user.role : ''

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full border-r transition-all duration-300 ease-in-out z-50',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
      style={{ background: 'rgb(var(--bg-secondary))', borderColor: 'var(--border)' }}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-5',
          collapsed && 'justify-center px-0'
        )}
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center flex-shrink-0 shadow-glow-blue">
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="font-bold text-text-primary text-sm tracking-wide">BirTask</span>
            <p className="text-[10px] text-text-muted">Layihə İdarəetmə</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="section-label px-2 mb-3">Menyü</p>
        )}
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                active
                  ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                  : 'text-text-secondary hover:text-text-primary',
                collapsed && 'justify-center px-0 mx-auto w-10 h-10'
              )}
              style={!active ? { ':hover': { background: 'var(--surface-2)' } } as React.CSSProperties : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
              {active && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-blue" />
              )}
              {collapsed && (
                <div
                  className="absolute left-full ml-3 px-2 py-1 rounded-lg text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                  style={{ background: 'rgb(var(--bg-card))', border: '1px solid var(--border)' }}
                >
                  {label}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Global search trigger */}
      <div className="px-2 pb-1">
        <GlobalSearchTrigger collapsed={collapsed} />
      </div>

      {/* Notification bell */}
      <div className="px-2 pb-1">
        <NotificationBell collapsed={collapsed} />
      </div>

      {/* Theme toggle */}
      <div className="px-2 pb-2">
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-text-secondary hover:text-text-primary w-full',
            collapsed && 'justify-center px-0 mx-auto w-10 h-10'
          )}
          style={{ background: 'var(--surface-1)' }}
        >
          {theme === 'dark'
            ? <Sun size={18} className="flex-shrink-0 text-accent-yellow" />
            : <Moon size={18} className="flex-shrink-0 text-accent-blue" />}
          {!collapsed && (
            <span className="text-sm font-medium">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>
      </div>

      {/* User info + logout */}
      {user && (
        <div
          className="px-2 pb-3 pt-2"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {collapsed ? (
            /* Collapsed: just avatar + logout button stacked */
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                title={user.displayName || user.username}
              >
                {(user.displayName || user.username).charAt(0).toUpperCase()}
              </div>
              <button
                onClick={logout}
                title="Çıxış"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-all"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            /* Expanded: full user card */
            <div
              className="rounded-xl p-3 flex items-center gap-2.5 group"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {(user.displayName || user.username).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-text-primary text-xs font-semibold truncate">
                  {user.displayName || user.username}
                </div>
                <div className={cn('flex items-center gap-1 text-[10px] mt-0.5', roleColor)}>
                  <RoleIcon size={9} />
                  <span>{roleLabel}</span>
                </div>
              </div>
              <button
                onClick={logout}
                title="Çıxış"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Collapse btn */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary transition-all duration-200 z-10"
        style={{ background: 'rgb(var(--bg-card))', border: '1px solid var(--border)' }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
